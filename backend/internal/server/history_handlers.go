package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gogogadgetscott/stackview/internal/alerts"
	"github.com/gogogadgetscott/stackview/internal/history"
)

// HistoryHandlers provides HTTP handlers for history API.
type HistoryHandlers struct {
	service *history.Service
}

// NewHistoryHandlers creates history handlers.
func NewHistoryHandlers(service *history.Service) *HistoryHandlers {
	return &HistoryHandlers{service: service}
}

// HandleGetStackHistory returns historical stats for a stack.
func (h *HistoryHandlers) HandleGetStackHistory(w http.ResponseWriter, r *http.Request, stackName string) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse range parameter: 24h or 7d
	rangeParam := r.URL.Query().Get("range")
	var duration time.Duration
	switch rangeParam {
	case "7d":
		duration = 7 * 24 * time.Hour
	case "24h", "":
		duration = 24 * time.Hour
	default:
		// Try to parse custom duration
		parsed, err := time.ParseDuration(rangeParam)
		if err != nil {
			duration = 24 * time.Hour
		} else {
			duration = parsed
		}
	}

	history, err := h.service.GetStackHistory(r.Context(), stackName, duration)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// AlertsHandlers provides HTTP handlers for alerts API.
type AlertsHandlers struct {
	evaluator *alerts.Evaluator
}

// NewAlertsHandlers creates alerts handlers.
func NewAlertsHandlers(evaluator *alerts.Evaluator) *AlertsHandlers {
	return &AlertsHandlers{evaluator: evaluator}
}

// HandleGetActiveAlerts returns currently active alerts.
func (h *AlertsHandlers) HandleGetActiveAlerts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	activeAlerts := h.evaluator.GetActiveAlerts()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activeAlerts)
}

// HandleGetAlertHistory returns recent alert history.
func (h *AlertsHandlers) HandleGetAlertHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	history, err := h.evaluator.GetAlertHistory(r.Context(), limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// HandleAlertsRouter routes alerts-related requests.
func (h *AlertsHandlers) HandleAlertsRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	switch {
	case strings.HasSuffix(path, "/active"):
		h.HandleGetActiveAlerts(w, r)
	case strings.HasSuffix(path, "/history"):
		h.HandleGetAlertHistory(w, r)
	default:
		h.HandleGetActiveAlerts(w, r)
	}
}
