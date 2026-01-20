package alerts

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

// AlertType defines the type of alert rule.
type AlertType string

const (
	AlertTypeRestarts AlertType = "restart_threshold"
	AlertTypeCPU      AlertType = "cpu_threshold"
	AlertTypeMemory   AlertType = "mem_threshold"
)

// AlertRule defines an alerting rule.
type AlertRule struct {
	ID         int       `json:"id"`
	Name       string    `json:"name"`
	Type       AlertType `json:"type"`
	Threshold  float64   `json:"threshold"`
	Duration   string    `json:"duration"` // e.g., "5m", "10m"
	Enabled    bool      `json:"enabled"`
	WebhookURL string    `json:"webhookUrl,omitempty"`
	Email      string    `json:"email,omitempty"`
	CreatedAt  string    `json:"createdAt,omitempty"`
}

// Alert represents a triggered alert.
type Alert struct {
	ID          int       `json:"id"`
	RuleID      int       `json:"ruleId"`
	RuleName    string    `json:"ruleName"`
	ContainerID string    `json:"containerId,omitempty"`
	StackName   string    `json:"stackName,omitempty"`
	Message     string    `json:"message"`
	Value       float64   `json:"value"`
	Threshold   float64   `json:"threshold"`
	TriggeredAt time.Time `json:"triggeredAt"`
	Resolved    bool      `json:"resolved"`
	ResolvedAt  *time.Time `json:"resolvedAt,omitempty"`
}

// ContainerStats holds current stats for a container (used for evaluation).
type ContainerStats struct {
	ContainerID string
	StackName   string
	CPU         float64
	Memory      float64
	Restarts    int
}

// Evaluator checks alert conditions.
type Evaluator struct {
	db              *sql.DB
	mu              sync.RWMutex
	rules           []AlertRule
	statsBuffer     map[string][]timedStats // containerID -> recent stats
	alertState      map[string]*Alert       // ruleID-containerID -> active alert
	checkInterval   time.Duration
}

type timedStats struct {
	ts       time.Time
	cpu      float64
	memory   float64
	restarts int
}

// NewEvaluator creates an alert evaluator.
func NewEvaluator(db *sql.DB) (*Evaluator, error) {
	e := &Evaluator{
		db:            db,
		statsBuffer:   make(map[string][]timedStats),
		alertState:    make(map[string]*Alert),
		checkInterval: 10 * time.Second,
	}
	if err := e.initSchema(); err != nil {
		return nil, err
	}
	if err := e.loadRules(); err != nil {
		return nil, err
	}
	return e, nil
}

func (e *Evaluator) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS alerts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		rule_id INTEGER NOT NULL,
		rule_name TEXT NOT NULL,
		container_id TEXT,
		stack_name TEXT,
		message TEXT NOT NULL,
		value REAL NOT NULL,
		threshold REAL NOT NULL,
		triggered_at TEXT NOT NULL,
		resolved INTEGER DEFAULT 0,
		resolved_at TEXT,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_alerts_rule ON alerts(rule_id);
	CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts(triggered_at);
	`
	_, err := e.db.Exec(schema)
	return err
}

func (e *Evaluator) loadRules() error {
	rows, err := e.db.Query(`
		SELECT id, name, type, threshold, duration, enabled, webhook_url, email 
		FROM alert_rules WHERE enabled = 1
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var rules []AlertRule
	for rows.Next() {
		var r AlertRule
		var webhookURL, email sql.NullString
		if err := rows.Scan(&r.ID, &r.Name, &r.Type, &r.Threshold, &r.Duration, &r.Enabled, &webhookURL, &email); err != nil {
			continue
		}
		if webhookURL.Valid {
			r.WebhookURL = webhookURL.String
		}
		if email.Valid {
			r.Email = email.String
		}
		rules = append(rules, r)
	}

	e.mu.Lock()
	e.rules = rules
	e.mu.Unlock()
	return nil
}

// ReloadRules refreshes rules from database.
func (e *Evaluator) ReloadRules() error {
	return e.loadRules()
}

// RecordStats records current container stats for evaluation.
func (e *Evaluator) RecordStats(stats ContainerStats) {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now()
	e.statsBuffer[stats.ContainerID] = append(e.statsBuffer[stats.ContainerID], timedStats{
		ts:       now,
		cpu:      stats.CPU,
		memory:   stats.Memory,
		restarts: stats.Restarts,
	})

	// Trim old stats (keep last 15 minutes)
	cutoff := now.Add(-15 * time.Minute)
	for id, points := range e.statsBuffer {
		filtered := points[:0]
		for _, p := range points {
			if p.ts.After(cutoff) {
				filtered = append(filtered, p)
			}
		}
		e.statsBuffer[id] = filtered
	}
}

// Evaluate checks all rules against current stats.
func (e *Evaluator) Evaluate(ctx context.Context) {
	e.mu.RLock()
	rules := e.rules
	statsBuffer := e.statsBuffer
	e.mu.RUnlock()

	now := time.Now()

	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}

		duration := parseDuration(rule.Duration)

		for containerID, stats := range statsBuffer {
			if len(stats) == 0 {
				continue
			}

			// Get stats within duration window
			window := filterStatsWindow(stats, now, duration)
			if len(window) == 0 {
				continue
			}

			var triggered bool
			var value float64

			switch rule.Type {
			case AlertTypeCPU:
				// Check if all samples in window exceed threshold
				allExceed := true
				var sum float64
				for _, s := range window {
					sum += s.cpu
					if s.cpu <= rule.Threshold {
						allExceed = false
					}
				}
				value = sum / float64(len(window))
				triggered = allExceed && len(window) >= int(duration.Seconds()/10) // at least 1 sample per 10s

			case AlertTypeMemory:
				allExceed := true
				var sum float64
				for _, s := range window {
					sum += s.memory
					if s.memory <= rule.Threshold {
						allExceed = false
					}
				}
				value = sum / float64(len(window))
				triggered = allExceed && len(window) >= int(duration.Seconds()/10)

			case AlertTypeRestarts:
				// Sum restarts in window
				var totalRestarts int
				for _, s := range window {
					totalRestarts += s.restarts
				}
				value = float64(totalRestarts)
				triggered = totalRestarts >= int(rule.Threshold)
			}

			alertKey := alertKey(rule.ID, containerID)
			stackName := ""
			if len(stats) > 0 {
				// Stack name would need to be tracked separately
			}

			if triggered {
				e.handleTriggered(ctx, rule, containerID, stackName, value, alertKey)
			} else {
				e.handleResolved(ctx, alertKey)
			}
		}
	}
}

func (e *Evaluator) handleTriggered(ctx context.Context, rule AlertRule, containerID, stackName string, value float64, alertKey string) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Check if already alerting
	if _, exists := e.alertState[alertKey]; exists {
		return
	}

	alert := &Alert{
		RuleID:      rule.ID,
		RuleName:    rule.Name,
		ContainerID: containerID,
		StackName:   stackName,
		Message:     formatAlertMessage(rule, value),
		Value:       value,
		Threshold:   rule.Threshold,
		TriggeredAt: time.Now(),
	}

	// Store in database
	result, err := e.db.ExecContext(ctx, `
		INSERT INTO alerts (rule_id, rule_name, container_id, stack_name, message, value, threshold, triggered_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, alert.RuleID, alert.RuleName, alert.ContainerID, alert.StackName, alert.Message, alert.Value, alert.Threshold, alert.TriggeredAt.Format(time.RFC3339))
	if err != nil {
		log.Printf("alerts: failed to store alert: %v", err)
		return
	}

	id, _ := result.LastInsertId()
	alert.ID = int(id)
	e.alertState[alertKey] = alert

	// Send notification
	go e.sendNotification(rule, alert)
}

func (e *Evaluator) handleResolved(ctx context.Context, alertKey string) {
	e.mu.Lock()
	alert, exists := e.alertState[alertKey]
	if !exists {
		e.mu.Unlock()
		return
	}
	delete(e.alertState, alertKey)
	e.mu.Unlock()

	// Mark as resolved in database
	now := time.Now()
	_, _ = e.db.ExecContext(ctx, `
		UPDATE alerts SET resolved = 1, resolved_at = ? WHERE id = ?
	`, now.Format(time.RFC3339), alert.ID)
}

func (e *Evaluator) sendNotification(rule AlertRule, alert *Alert) {
	if rule.WebhookURL != "" {
		payload, _ := json.Marshal(alert)
		resp, err := http.Post(rule.WebhookURL, "application/json", bytes.NewReader(payload))
		if err != nil {
			log.Printf("alerts: webhook failed: %v", err)
		} else {
			resp.Body.Close()
		}
	}

	// Email would require SMTP configuration - skip for now
	if rule.Email != "" {
		log.Printf("alerts: email notification to %s (not implemented)", rule.Email)
	}
}

// GetActiveAlerts returns currently active alerts.
func (e *Evaluator) GetActiveAlerts() []Alert {
	e.mu.RLock()
	defer e.mu.RUnlock()

	alerts := make([]Alert, 0, len(e.alertState))
	for _, a := range e.alertState {
		alerts = append(alerts, *a)
	}
	return alerts
}

// GetAlertHistory returns recent alerts.
func (e *Evaluator) GetAlertHistory(ctx context.Context, limit int) ([]Alert, error) {
	rows, err := e.db.QueryContext(ctx, `
		SELECT id, rule_id, rule_name, container_id, stack_name, message, value, threshold, triggered_at, resolved, resolved_at
		FROM alerts ORDER BY triggered_at DESC LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var a Alert
		var containerID, stackName, resolvedAt sql.NullString
		var triggeredAtStr string
		var resolved int
		if err := rows.Scan(&a.ID, &a.RuleID, &a.RuleName, &containerID, &stackName, &a.Message, &a.Value, &a.Threshold, &triggeredAtStr, &resolved, &resolvedAt); err != nil {
			continue
		}
		a.ContainerID = containerID.String
		a.StackName = stackName.String
		a.TriggeredAt, _ = time.Parse(time.RFC3339, triggeredAtStr)
		a.Resolved = resolved == 1
		if resolvedAt.Valid {
			t, _ := time.Parse(time.RFC3339, resolvedAt.String)
			a.ResolvedAt = &t
		}
		alerts = append(alerts, a)
	}
	return alerts, nil
}

// StartBackgroundWorker starts periodic evaluation.
func (e *Evaluator) StartBackgroundWorker(ctx context.Context) {
	ticker := time.NewTicker(e.checkInterval)
	reloadTicker := time.NewTicker(time.Minute)

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				e.Evaluate(ctx)
			case <-reloadTicker.C:
				_ = e.ReloadRules()
			}
		}
	}()
}

// Helper functions

func alertKey(ruleID int, containerID string) string {
	return string(rune(ruleID)) + "-" + containerID
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return 5 * time.Minute
	}
	return d
}

func filterStatsWindow(stats []timedStats, now time.Time, duration time.Duration) []timedStats {
	cutoff := now.Add(-duration)
	var result []timedStats
	for _, s := range stats {
		if s.ts.After(cutoff) {
			result = append(result, s)
		}
	}
	return result
}

func formatAlertMessage(rule AlertRule, value float64) string {
	switch rule.Type {
	case AlertTypeCPU:
		return "CPU exceeded threshold"
	case AlertTypeMemory:
		return "Memory exceeded threshold"
	case AlertTypeRestarts:
		return "Container restart threshold exceeded"
	default:
		return "Alert triggered"
	}
}
