package onboarding

import (
	"database/sql"
	"encoding/json"
	"time"
)

// OnboardingStatus represents the current onboarding state.
type OnboardingStatus struct {
	Completed   bool      `json:"completed"`
	CompletedAt *string   `json:"completedAt,omitempty"`
	Step        int       `json:"step"`
	StackRoots  []string  `json:"stackRoots"`
	Hosts       []Host    `json:"hosts"`
	AlertRules  []AlertRule `json:"alertRules"`
}

// Host represents a remote Docker host.
type Host struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Address  string `json:"address"`
	Port     int    `json:"port"`
	TLSEnabled bool `json:"tlsEnabled"`
}

// AlertRule represents a basic alert configuration.
type AlertRule struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Type        string  `json:"type"` // restart_threshold, cpu_threshold, mem_threshold
	Threshold   float64 `json:"threshold"`
	Duration    string  `json:"duration"` // e.g., "5m", "10m"
	Enabled     bool    `json:"enabled"`
	WebhookURL  string  `json:"webhookUrl,omitempty"`
	Email       string  `json:"email,omitempty"`
}

// Service manages onboarding state.
type Service struct {
	db *sql.DB
}

// NewService creates a new onboarding service.
func NewService(db *sql.DB) (*Service, error) {
	s := &Service{db: db}
	if err := s.initSchema(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Service) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS onboarding (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		completed INTEGER DEFAULT 0,
		completed_at TEXT,
		current_step INTEGER DEFAULT 0,
		stack_roots TEXT DEFAULT '[]',
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE TABLE IF NOT EXISTS remote_hosts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		address TEXT NOT NULL,
		port INTEGER DEFAULT 2376,
		tls_enabled INTEGER DEFAULT 0,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS alert_rules (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		threshold REAL NOT NULL,
		duration TEXT NOT NULL,
		enabled INTEGER DEFAULT 1,
		webhook_url TEXT,
		email TEXT,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	);

	-- Insert default row if not exists
	INSERT OR IGNORE INTO onboarding (id) VALUES (1);
	`
	_, err := s.db.Exec(schema)
	return err
}

// GetStatus returns the current onboarding status.
func (s *Service) GetStatus() (*OnboardingStatus, error) {
	row := s.db.QueryRow(`
		SELECT completed, completed_at, current_step, stack_roots 
		FROM onboarding WHERE id = 1
	`)

	var completed int
	var completedAt sql.NullString
	var step int
	var rootsJSON string

	if err := row.Scan(&completed, &completedAt, &step, &rootsJSON); err != nil {
		return nil, err
	}

	var roots []string
	_ = json.Unmarshal([]byte(rootsJSON), &roots)

	hosts, _ := s.GetHosts()
	rules, _ := s.GetAlertRules()

	status := &OnboardingStatus{
		Completed:  completed == 1,
		Step:       step,
		StackRoots: roots,
		Hosts:      hosts,
		AlertRules: rules,
	}
	if completedAt.Valid {
		status.CompletedAt = &completedAt.String
	}

	return status, nil
}

// SetStackRoots updates the stack root directories.
func (s *Service) SetStackRoots(roots []string) error {
	rootsJSON, _ := json.Marshal(roots)
	_, err := s.db.Exec(`
		UPDATE onboarding SET stack_roots = ?, updated_at = ? WHERE id = 1
	`, string(rootsJSON), time.Now().Format(time.RFC3339))
	return err
}

// SetStep updates the current onboarding step.
func (s *Service) SetStep(step int) error {
	_, err := s.db.Exec(`
		UPDATE onboarding SET current_step = ?, updated_at = ? WHERE id = 1
	`, step, time.Now().Format(time.RFC3339))
	return err
}

// Complete marks onboarding as finished.
func (s *Service) Complete() error {
	now := time.Now().Format(time.RFC3339)
	_, err := s.db.Exec(`
		UPDATE onboarding SET completed = 1, completed_at = ?, updated_at = ? WHERE id = 1
	`, now, now)
	return err
}

// AddHost adds a remote Docker host.
func (s *Service) AddHost(host Host) (int64, error) {
	result, err := s.db.Exec(`
		INSERT INTO remote_hosts (name, address, port, tls_enabled) VALUES (?, ?, ?, ?)
	`, host.Name, host.Address, host.Port, boolToInt(host.TLSEnabled))
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// GetHosts returns all configured remote hosts.
func (s *Service) GetHosts() ([]Host, error) {
	rows, err := s.db.Query(`SELECT id, name, address, port, tls_enabled FROM remote_hosts`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hosts []Host
	for rows.Next() {
		var h Host
		var tls int
		if err := rows.Scan(&h.ID, &h.Name, &h.Address, &h.Port, &tls); err != nil {
			continue
		}
		h.TLSEnabled = tls == 1
		hosts = append(hosts, h)
	}
	return hosts, nil
}

// DeleteHost removes a remote host.
func (s *Service) DeleteHost(id int) error {
	_, err := s.db.Exec(`DELETE FROM remote_hosts WHERE id = ?`, id)
	return err
}

// AddAlertRule adds an alert rule.
func (s *Service) AddAlertRule(rule AlertRule) (int64, error) {
	result, err := s.db.Exec(`
		INSERT INTO alert_rules (name, type, threshold, duration, enabled, webhook_url, email) 
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, rule.Name, rule.Type, rule.Threshold, rule.Duration, boolToInt(rule.Enabled), rule.WebhookURL, rule.Email)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// GetAlertRules returns all configured alert rules.
func (s *Service) GetAlertRules() ([]AlertRule, error) {
	rows, err := s.db.Query(`
		SELECT id, name, type, threshold, duration, enabled, webhook_url, email FROM alert_rules
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []AlertRule
	for rows.Next() {
		var r AlertRule
		var enabled int
		var webhookURL, email sql.NullString
		if err := rows.Scan(&r.ID, &r.Name, &r.Type, &r.Threshold, &r.Duration, &enabled, &webhookURL, &email); err != nil {
			continue
		}
		r.Enabled = enabled == 1
		if webhookURL.Valid {
			r.WebhookURL = webhookURL.String
		}
		if email.Valid {
			r.Email = email.String
		}
		rules = append(rules, r)
	}
	return rules, nil
}

// UpdateAlertRule updates an existing alert rule.
func (s *Service) UpdateAlertRule(rule AlertRule) error {
	_, err := s.db.Exec(`
		UPDATE alert_rules SET name = ?, type = ?, threshold = ?, duration = ?, 
		enabled = ?, webhook_url = ?, email = ? WHERE id = ?
	`, rule.Name, rule.Type, rule.Threshold, rule.Duration, boolToInt(rule.Enabled), 
	   rule.WebhookURL, rule.Email, rule.ID)
	return err
}

// DeleteAlertRule removes an alert rule.
func (s *Service) DeleteAlertRule(id int) error {
	_, err := s.db.Exec(`DELETE FROM alert_rules WHERE id = ?`, id)
	return err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
