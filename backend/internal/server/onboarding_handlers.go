package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gogogadgetscott/stackview/internal/onboarding"
)

// OnboardingHandlers provides HTTP handlers for onboarding API.
type OnboardingHandlers struct {
	service *onboarding.Service
}

// NewOnboardingHandlers creates onboarding handlers.
func NewOnboardingHandlers(service *onboarding.Service) *OnboardingHandlers {
	return &OnboardingHandlers{service: service}
}

// HandleGetStatus returns the current onboarding status.
func (h *OnboardingHandlers) HandleGetStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	status, err := h.service.GetStatus()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// HandleSetStackRoots updates the stack root directories.
func (h *OnboardingHandlers) HandleSetStackRoots(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Roots []string `json:"roots"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.SetStackRoots(req.Roots); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// HandleSetStep updates the current onboarding step.
func (h *OnboardingHandlers) HandleSetStep(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Step int `json:"step"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.SetStep(req.Step); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// HandleComplete marks onboarding as finished.
func (h *OnboardingHandlers) HandleComplete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := h.service.Complete(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// HandleHosts manages remote Docker hosts.
func (h *OnboardingHandlers) HandleHosts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		hosts, err := h.service.GetHosts()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(hosts)

	case http.MethodPost:
		var host onboarding.Host
		if err := json.NewDecoder(r.Body).Decode(&host); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		id, err := h.service.AddHost(host)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int64{"id": id})

	case http.MethodDelete:
		// Extract ID from path: /api/onboarding/hosts/{id}
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 5 {
			http.Error(w, "host ID required", http.StatusBadRequest)
			return
		}
		id, err := strconv.Atoi(parts[len(parts)-1])
		if err != nil {
			http.Error(w, "invalid host ID", http.StatusBadRequest)
			return
		}
		if err := h.service.DeleteHost(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleAlertRules manages alert rules during onboarding.
func (h *OnboardingHandlers) HandleAlertRules(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rules, err := h.service.GetAlertRules()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(rules)

	case http.MethodPost:
		var rule onboarding.AlertRule
		if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		id, err := h.service.AddAlertRule(rule)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int64{"id": id})

	case http.MethodPut:
		var rule onboarding.AlertRule
		if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		if err := h.service.UpdateAlertRule(rule); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	case http.MethodDelete:
		// Extract ID from path: /api/onboarding/alerts/{id}
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 5 {
			http.Error(w, "rule ID required", http.StatusBadRequest)
			return
		}
		id, err := strconv.Atoi(parts[len(parts)-1])
		if err != nil {
			http.Error(w, "invalid rule ID", http.StatusBadRequest)
			return
		}
		if err := h.service.DeleteAlertRule(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
