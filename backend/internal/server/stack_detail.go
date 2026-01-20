package server

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// StackDetailResponse contains full details for a single stack.
type StackDetailResponse struct {
	Name           string          `json:"name"`
	Path           string          `json:"path"`
	Services       []string        `json:"services"`
	RunningCount   int             `json:"runningCount"`
	StoppedCount   int             `json:"stoppedCount"`
	UnhealthyCount int             `json:"unhealthyCount"`
	TotalCPU       float64         `json:"totalCpu"`
	TotalMem       float64         `json:"totalMem"`
	ContainerIDs   []string        `json:"containerIds"`
	Containers     []ContainerInfo `json:"containers"`
}

// ContainerInfo provides details about a container within a stack.
type ContainerInfo struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Service string  `json:"service"`
	Status  string  `json:"status"`
	Health  *string `json:"health"`
}

// ComposeContentResponse holds the compose file content.
type ComposeContentResponse struct {
	Content string `json:"content"`
	Path    string `json:"path"`
}

// DiffResponse shows differences between compose and running state.
type DiffResponse struct {
	ComposeServices  []string        `json:"composeServices"`
	RunningServices  []string        `json:"runningServices"`
	MissingServices  []string        `json:"missingServices"`
	ExtraContainers  []string        `json:"extraContainers"`
	Containers       []ContainerInfo `json:"containers"`
	HasDifferences   bool            `json:"hasDifferences"`
}

// handleGetStackDetail returns details for a single stack.
func (s *Server) handleGetStackDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stackName := extractStackName(r.URL.Path, "/api/stacks/")
	if stackName == "" || strings.Contains(stackName, "/") {
		http.Error(w, "invalid stack name", http.StatusBadRequest)
		return
	}

	status, err := s.stackManager.GetStackByName(r.Context(), stackName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Get container details
	containerDetails, err := s.stackManager.GetContainersForStack(r.Context(), stackName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert stacks.ContainerDetail to server.ContainerInfo
	containers := make([]ContainerInfo, len(containerDetails))
	for i, c := range containerDetails {
		containers[i] = ContainerInfo{
			ID:      c.ID,
			Name:    c.Name,
			Service: c.Service,
			Status:  c.Status,
			Health:  c.Health,
		}
	}

	response := StackDetailResponse{
		Name:           status.Name,
		Path:           status.Path,
		Services:       status.Services,
		RunningCount:   status.RunningCount,
		StoppedCount:   status.StoppedCount,
		UnhealthyCount: status.UnhealthyCount,
		TotalCPU:       status.TotalCPU,
		TotalMem:       status.TotalMem,
		ContainerIDs:   status.ContainerIDs,
		Containers:     containers,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(response)
}

// handleGetStackCompose returns the compose file content.
func (s *Server) handleGetStackCompose(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stackName := extractStackNameFromComposePath(r.URL.Path)
	if stackName == "" {
		http.Error(w, "invalid stack name", http.StatusBadRequest)
		return
	}

	status, err := s.stackManager.GetStackByName(r.Context(), stackName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	composePath := findComposeFile(status.Path)
	if composePath == "" {
		http.Error(w, "compose file not found", http.StatusNotFound)
		return
	}

	content, err := os.ReadFile(composePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := ComposeContentResponse{
		Content: string(content),
		Path:    composePath,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(response)
}

// handlePutStackCompose writes to the compose file.
func (s *Server) handlePutStackCompose(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stackName := extractStackNameFromComposePath(r.URL.Path)
	if stackName == "" {
		http.Error(w, "invalid stack name", http.StatusBadRequest)
		return
	}

	status, err := s.stackManager.GetStackByName(r.Context(), stackName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	composePath := findComposeFile(status.Path)
	if composePath == "" {
		http.Error(w, "compose file not found", http.StatusNotFound)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := os.WriteFile(composePath, []byte(req.Content), 0644); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
}

// handleGetStackDiff compares compose file vs running containers.
func (s *Server) handleGetStackDiff(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stackName := extractStackNameFromDiffPath(r.URL.Path)
	if stackName == "" {
		http.Error(w, "invalid stack name", http.StatusBadRequest)
		return
	}

	status, err := s.stackManager.GetStackByName(r.Context(), stackName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	containerDetails, err := s.stackManager.GetContainersForStack(r.Context(), stackName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert stacks.ContainerDetail to server.ContainerInfo
	containers := make([]ContainerInfo, len(containerDetails))
	for i, c := range containerDetails {
		containers[i] = ContainerInfo{
			ID:      c.ID,
			Name:    c.Name,
			Service: c.Service,
			Status:  c.Status,
			Health:  c.Health,
		}
	}

	// Build running services set
	runningServices := make(map[string]bool)
	for _, c := range containerDetails {
		runningServices[c.Service] = true
	}
	runningList := make([]string, 0, len(runningServices))
	for svc := range runningServices {
		runningList = append(runningList, svc)
	}

	// Find missing and extra
	composeSet := make(map[string]bool)
	for _, svc := range status.Services {
		composeSet[svc] = true
	}

	var missing, extra []string
	for _, svc := range status.Services {
		if !runningServices[svc] {
			missing = append(missing, svc)
		}
	}
	for svc := range runningServices {
		if !composeSet[svc] {
			extra = append(extra, svc)
		}
	}

	response := DiffResponse{
		ComposeServices:  status.Services,
		RunningServices:  runningList,
		MissingServices:  missing,
		ExtraContainers:  extra,
		Containers:       containers,
		HasDifferences:   len(missing) > 0 || len(extra) > 0,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(response)
}

// extractStackName extracts stack name from path like /api/stacks/{name}
func extractStackName(path, prefix string) string {
	if !strings.HasPrefix(path, prefix) {
		return ""
	}
	remainder := strings.TrimPrefix(path, prefix)
	// Remove trailing slash if present
	remainder = strings.TrimSuffix(remainder, "/")
	return remainder
}

// extractStackNameFromComposePath extracts stack name from /api/stacks/{name}/compose
func extractStackNameFromComposePath(path string) string {
	const prefix = "/api/stacks/"
	const suffix = "/compose"
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, suffix) {
		return ""
	}
	name := strings.TrimPrefix(path, prefix)
	name = strings.TrimSuffix(name, suffix)
	return name
}

// extractStackNameFromDiffPath extracts stack name from /api/stacks/{name}/diff
func extractStackNameFromDiffPath(path string) string {
	const prefix = "/api/stacks/"
	const suffix = "/diff"
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, suffix) {
		return ""
	}
	name := strings.TrimPrefix(path, prefix)
	name = strings.TrimSuffix(name, suffix)
	return name
}

// findComposeFile finds the compose file in a directory.
func findComposeFile(dir string) string {
	candidates := []string{"docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"}
	for _, name := range candidates {
		path := filepath.Join(dir, name)
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	return ""
}
