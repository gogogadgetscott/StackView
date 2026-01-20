package server

import (
	"encoding/json"
	"net/http"
	"os/exec"
	"strings"
)

// ControlResponse holds the result of a stack control operation.
type ControlResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Output  string `json:"output,omitempty"`
}

// handleStackStart starts all services in a stack.
func (s *Server) handleStackStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	s.runComposeCommand(w, r, "start", []string{"up", "-d"})
}

// handleStackStop stops all services in a stack.
func (s *Server) handleStackStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	s.runComposeCommand(w, r, "stop", []string{"stop"})
}

// handleStackRecreate recreates all services in a stack.
func (s *Server) handleStackRecreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	s.runComposeCommand(w, r, "recreate", []string{"up", "-d", "--force-recreate"})
}

// handleStackRedeploy pulls images and recreates all services.
func (s *Server) handleStackRedeploy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	s.runComposeCommandSequence(w, r, "redeploy", [][]string{
		{"pull"},
		{"up", "-d", "--force-recreate"},
	})
}

// runComposeCommand executes a docker compose command for a stack.
func (s *Server) runComposeCommand(w http.ResponseWriter, r *http.Request, operation string, args []string) {
	stackName := extractStackNameFromControlPath(r.URL.Path, operation)
	if stackName == "" {
		http.Error(w, "invalid stack name", http.StatusBadRequest)
		return
	}

	status, err := s.stackManager.GetStackByName(r.Context(), stackName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	cmd := exec.CommandContext(r.Context(), "docker", append([]string{"compose"}, args...)...)
	cmd.Dir = status.Path

	output, err := cmd.CombinedOutput()
	response := ControlResponse{
		Success: err == nil,
		Message: operation + " completed",
		Output:  string(output),
	}
	if err != nil {
		response.Message = operation + " failed: " + err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if !response.Success {
		w.WriteHeader(http.StatusInternalServerError)
	}
	json.NewEncoder(w).Encode(response)
}

// runComposeCommandSequence executes multiple compose commands in sequence.
func (s *Server) runComposeCommandSequence(w http.ResponseWriter, r *http.Request, operation string, cmdArgs [][]string) {
	stackName := extractStackNameFromControlPath(r.URL.Path, operation)
	if stackName == "" {
		http.Error(w, "invalid stack name", http.StatusBadRequest)
		return
	}

	status, err := s.stackManager.GetStackByName(r.Context(), stackName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	var allOutput strings.Builder
	for _, args := range cmdArgs {
		cmd := exec.CommandContext(r.Context(), "docker", append([]string{"compose"}, args...)...)
		cmd.Dir = status.Path

		output, err := cmd.CombinedOutput()
		allOutput.Write(output)
		allOutput.WriteString("\n")

		if err != nil {
			response := ControlResponse{
				Success: false,
				Message: operation + " failed at step: " + strings.Join(args, " "),
				Output:  allOutput.String(),
			}
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	response := ControlResponse{
		Success: true,
		Message: operation + " completed",
		Output:  allOutput.String(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(response)
}

// extractStackNameFromControlPath extracts stack name from /api/stacks/{name}/{operation}
func extractStackNameFromControlPath(path, operation string) string {
	const prefix = "/api/stacks/"
	suffix := "/" + operation
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, suffix) {
		return ""
	}
	name := strings.TrimPrefix(path, prefix)
	name = strings.TrimSuffix(name, suffix)
	return name
}
