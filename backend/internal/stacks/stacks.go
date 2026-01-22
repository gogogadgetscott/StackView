package stacks

import (
	"context"
	"strings"
	"sync"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
)

// StackStatus represents the runtime status of a stack.
type StackStatus struct {
	Stack
	RunningCount   int     `json:"runningCount"`
	StoppedCount   int     `json:"stoppedCount"`
	UnhealthyCount int     `json:"unhealthyCount"`
	TotalCPU       float64 `json:"totalCpu"`
	TotalMem       float64 `json:"totalMem"`
	ContainerIDs   []string `json:"containerIds"`
}

// ContainerStackInfo maps a container to its stack.
type ContainerStackInfo struct {
	ContainerID string
	StackName   string
}

// Manager handles stack discovery and status tracking.
type Manager struct {
	roots        []string
	dockerClient *client.Client
	mu           sync.RWMutex
	stacks       []Stack
}

// NewManager creates a stack manager with the given root directories.
func NewManager(roots []string, dockerClient *client.Client) *Manager {
	return &Manager{
		roots:        roots,
		dockerClient: dockerClient,
	}
}

// Refresh rescans for compose files and updates the stack list.
func (m *Manager) Refresh() error {
	stacks, err := Scan(m.roots)
	if err != nil {
		return err
	}
	m.mu.Lock()
	m.stacks = stacks
	m.mu.Unlock()
	return nil
}

// GetStacks returns the current list of discovered stacks.
func (m *Manager) GetStacks() []Stack {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]Stack, len(m.stacks))
	copy(result, m.stacks)
	return result
}

// GetStackStatuses returns stacks with runtime status from running containers.
func (m *Manager) GetStackStatuses(ctx context.Context) ([]StackStatus, error) {
	containers, err := m.dockerClient.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, err
	}

	m.mu.RLock()
	stacks := make([]Stack, len(m.stacks))
	copy(stacks, m.stacks)
	m.mu.RUnlock()

	// Build a map of stack name -> status
	statusMap := make(map[string]*StackStatus)
	for _, s := range stacks {
		statusMap[s.Name] = &StackStatus{
			Stack:        s,
			ContainerIDs: []string{},
		}
	}

	// Match containers to stacks using the compose project label
	for _, c := range containers {
		projectName := c.Labels["com.docker.compose.project"]
		if projectName == "" {
			continue
		}

		status, ok := statusMap[projectName]
		if !ok {
			// Container belongs to an unknown stack, create ad-hoc entry
			status = &StackStatus{
				Stack: Stack{
					Name:     projectName,
					Path:     "",
					Services: []string{},
				},
				ContainerIDs: []string{},
			}
			statusMap[projectName] = status
		}

		status.ContainerIDs = append(status.ContainerIDs, c.ID)

		// Count status
		state := strings.ToLower(c.State)
		switch state {
		case "running":
			status.RunningCount++
		case "exited", "dead", "created":
			status.StoppedCount++
		}

		// Check health
		if c.Status != "" && strings.Contains(strings.ToLower(c.Status), "unhealthy") {
			status.UnhealthyCount++
		}
	}

	// Convert map to slice
	result := make([]StackStatus, 0, len(statusMap))
	for _, s := range statusMap {
		result = append(result, *s)
	}

	return result, nil
}

// GetContainerStackName returns the stack name for a container ID.
func (m *Manager) GetContainerStackName(ctx context.Context, containerID string) string {
	info, err := m.dockerClient.ContainerInspect(ctx, containerID)
	if err != nil {
		return ""
	}
	return info.Config.Labels["com.docker.compose.project"]
}

// GetStackByName returns a single stack by name.
func (m *Manager) GetStackByName(ctx context.Context, name string) (*StackStatus, error) {
	statuses, err := m.GetStackStatuses(ctx)
	if err != nil {
		return nil, err
	}
	for _, s := range statuses {
		if s.Name == name {
			return &s, nil
		}
	}
	return nil, &StackNotFoundError{Name: name}
}

// ContainerDetail provides details about a container within a stack.
type ContainerDetail struct {
	ID      string
	Name    string
	Service string
	Status  string
	Health  *string
}

// GetContainersForStack returns detailed container info for a stack.
func (m *Manager) GetContainersForStack(ctx context.Context, stackName string) ([]ContainerDetail, error) {
	containers, err := m.dockerClient.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var result []ContainerDetail
	for _, c := range containers {
		projectName := c.Labels["com.docker.compose.project"]
		if projectName != stackName {
			continue
		}

		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		var health *string
		if strings.Contains(strings.ToLower(c.Status), "unhealthy") {
			h := "unhealthy"
			health = &h
		} else if strings.Contains(strings.ToLower(c.Status), "healthy") {
			h := "healthy"
			health = &h
		}

		result = append(result, ContainerDetail{
			ID:      c.ID,
			Name:    name,
			Service: c.Labels["com.docker.compose.service"],
			Status:  c.State,
			Health:  health,
		})
	}

	return result, nil
}

// StackNotFoundError is returned when a stack is not found.
type StackNotFoundError struct {
	Name string
}

func (e *StackNotFoundError) Error() string {
	return "stack not found: " + e.Name
}

// GetContainers returns detailed container info for all containers across all stacks.
func (m *Manager) GetContainers(ctx context.Context) ([]ContainerDetail, error) {
	containers, err := m.dockerClient.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var result []ContainerDetail
	for _, c := range containers {
		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		var health *string
		if strings.Contains(strings.ToLower(c.Status), "unhealthy") {
			h := "unhealthy"
			health = &h
		} else if strings.Contains(strings.ToLower(c.Status), "healthy") {
			h := "healthy"
			health = &h
		}

		result = append(result, ContainerDetail{
			ID:      c.ID,
			Name:    name,
			Service: c.Labels["com.docker.compose.service"],
			Status:  c.State,
			Health:  health,
		})
	}

	return result, nil
}

