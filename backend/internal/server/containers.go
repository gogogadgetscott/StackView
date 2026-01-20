package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/docker/docker/client"
)

// ContainerDetailResponse provides detailed info about a container.
type ContainerDetailResponse struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Image    string            `json:"image"`
	Created  string            `json:"created"`
	Status   string            `json:"status"`
	Env      []string          `json:"env"`
	Mounts   []MountInfo       `json:"mounts"`
	Ports    []PortInfo        `json:"ports"`
	Labels   map[string]string `json:"labels"`
}

// MountInfo represents a container mount point.
type MountInfo struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Mode        string `json:"mode"`
}

// PortInfo represents a port mapping.
type PortInfo struct {
	HostPort      int    `json:"hostPort"`
	ContainerPort int    `json:"containerPort"`
	Protocol      string `json:"protocol"`
}

// handleGetContainer returns detailed info about a single container.
func (s *Server) handleGetContainer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract container ID from path: /api/containers/{id}
	path := strings.TrimPrefix(r.URL.Path, "/api/containers/")
	containerID := strings.Split(path, "/")[0]
	if containerID == "" {
		http.Error(w, "container ID required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	detail, err := getContainerDetail(ctx, s.dockerClient, containerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(detail)
}

func getContainerDetail(ctx context.Context, cli *client.Client, containerID string) (*ContainerDetailResponse, error) {
	inspect, err := cli.ContainerInspect(ctx, containerID)
	if err != nil {
		return nil, err
	}

	// Build mounts
	var mounts []MountInfo
	for _, m := range inspect.Mounts {
		mounts = append(mounts, MountInfo{
			Source:      m.Source,
			Destination: m.Destination,
			Mode:        m.Mode,
		})
	}

	// Build ports
	var ports []PortInfo
	for port, bindings := range inspect.NetworkSettings.Ports {
		for _, b := range bindings {
			hostPort := 0
			if b.HostPort != "" {
				// Parse host port
				var hp int
				_ = json.Unmarshal([]byte(b.HostPort), &hp)
			}
			ports = append(ports, PortInfo{
				HostPort:      hostPort,
				ContainerPort: port.Int(),
				Protocol:      port.Proto(),
			})
		}
	}

	return &ContainerDetailResponse{
		ID:       inspect.ID,
		Name:     strings.TrimPrefix(inspect.Name, "/"),
		Image:    inspect.Config.Image,
		Created:  inspect.Created,
		Status:   inspect.State.Status,
		Env:      inspect.Config.Env,
		Mounts:   mounts,
		Ports:    ports,
		Labels:   inspect.Config.Labels,
	}, nil
}

// ContainerTagsResponse returns tags for a container.
type ContainerTagsResponse struct {
	ContainerID string   `json:"containerId"`
	Tags        []string `json:"tags"`
}

// In-memory tag storage (in production, use SQLite)
var containerTags = make(map[string][]string)

// handleGetContainerTags returns tags for a container.
func (s *Server) handleGetContainerTags(w http.ResponseWriter, r *http.Request) {
	containerID := extractContainerIDFromTagsPath(r.URL.Path)
	if containerID == "" {
		http.Error(w, "container ID required", http.StatusBadRequest)
		return
	}

	rows, err := s.db.QueryContext(r.Context(), "SELECT tag FROM container_tags WHERE container_id = ?", containerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tags := []string{}
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		tags = append(tags, tag)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(ContainerTagsResponse{
		ContainerID: containerID,
		Tags:        tags,
	})
}

// handlePutContainerTags updates tags for a container.
func (s *Server) handlePutContainerTags(w http.ResponseWriter, r *http.Request) {
	containerID := extractContainerIDFromTagsPath(r.URL.Path)
	if containerID == "" {
		http.Error(w, "container ID required", http.StatusBadRequest)
		return
	}

	var req struct {
		Tags []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM container_tags WHERE container_id = ?", containerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, tag := range req.Tags {
		_, err = tx.Exec("INSERT INTO container_tags (container_id, tag) VALUES (?, ?)", containerID, tag)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(ContainerTagsResponse{
		ContainerID: containerID,
		Tags:        req.Tags,
	})
}

// handleGetAllTags returns all unique tags.
func (s *Server) handleGetAllTags(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.QueryContext(r.Context(), "SELECT DISTINCT tag FROM container_tags")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allTags []string = []string{}
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		allTags = append(allTags, tag)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(allTags)
}

// handleGetAllContainerTags returns a mapping of all container IDs to their tags.
func (s *Server) handleGetAllContainerTags(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.QueryContext(r.Context(), "SELECT container_id, tag FROM container_tags")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	mapping := make(map[string][]string)
	for rows.Next() {
		var id, tag string
		if err := rows.Scan(&id, &tag); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		mapping[id] = append(mapping[id], tag)
	}

	// Ensure all containers are represented, even with empty tags? 
	// Actually frontend can just handle missing keys as empty array.

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(mapping)
}

func extractContainerIDFromTagsPath(path string) string {
	// /api/containers/{id}/tags
	const prefix = "/api/containers/"
	const suffix = "/tags"
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, suffix) {
		return ""
	}
	id := strings.TrimPrefix(path, prefix)
	id = strings.TrimSuffix(id, suffix)
	return id
}
