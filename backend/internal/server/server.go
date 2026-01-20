package server

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/docker/docker/client"
	"github.com/gogogadgetscott/stackview/internal/stacks"
)

// Server holds dependencies for HTTP handlers.
type Server struct {
	dockerClient  *client.Client
	stackManager  *stacks.Manager
}

// New wires HTTP handlers and returns a configured server.
func New(dockerClient *client.Client) *http.Server {
	// Parse stack roots from environment variable
	rootsEnv := os.Getenv("STACKVIEW_STACK_ROOTS")
	var roots []string
	if rootsEnv != "" {
		roots = strings.Split(rootsEnv, ",")
	} else {
		// Default to common locations
		roots = []string{"/stacks"}
	}

	stackManager := stacks.NewManager(roots, dockerClient)
	// Initial scan
	_ = stackManager.Refresh()

	s := &Server{
		dockerClient: dockerClient,
		stackManager: stackManager,
	}

	mux := http.NewServeMux()
	
	// Stats WebSocket
	mux.Handle("/ws/stats", StatsWebSocketHandler(dockerClient, stackManager))
	
	// Logs and exec WebSockets
	mux.Handle("/ws/logs", LogsWebSocketHandler(dockerClient, stackManager))
	mux.Handle("/ws/exec", ExecWebSocketHandler(dockerClient))
	
	// Stack list and refresh
	mux.HandleFunc("/api/stacks", s.handleGetStacks)
	mux.HandleFunc("/api/stacks/refresh", s.handleRefreshStacks)
	
	// Stack detail routes - using a custom handler to route by path suffix
	mux.HandleFunc("/api/stacks/", s.handleStackRouter)

	return &http.Server{
		Addr:    ":8080",
		Handler: corsMiddleware(mux),
	}
}

// corsMiddleware adds CORS headers to all responses.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

// handleStackRouter routes requests to specific stack handlers based on path.
func (s *Server) handleStackRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	
	switch {
	case strings.HasSuffix(path, "/compose"):
		if r.Method == http.MethodGet {
			s.handleGetStackCompose(w, r)
		} else if r.Method == http.MethodPut {
			s.handlePutStackCompose(w, r)
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	case strings.HasSuffix(path, "/diff"):
		s.handleGetStackDiff(w, r)
	case strings.HasSuffix(path, "/start"):
		s.handleStackStart(w, r)
	case strings.HasSuffix(path, "/stop"):
		s.handleStackStop(w, r)
	case strings.HasSuffix(path, "/recreate"):
		s.handleStackRecreate(w, r)
	case strings.HasSuffix(path, "/redeploy"):
		s.handleStackRedeploy(w, r)
	default:
		// GET /api/stacks/{name}
		s.handleGetStackDetail(w, r)
	}
}

// handleGetStacks returns the list of discovered stacks with runtime status.
func (s *Server) handleGetStacks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	statuses, err := s.stackManager.GetStackStatuses(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(statuses)
}

// handleRefreshStacks rescans for compose files.
func (s *Server) handleRefreshStacks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := s.stackManager.Refresh(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
}
