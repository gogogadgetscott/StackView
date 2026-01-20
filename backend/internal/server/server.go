package server

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/docker/docker/client"
	"github.com/gogogadgetscott/stackview/internal/onboarding"
	"github.com/gogogadgetscott/stackview/internal/stacks"
	_ "github.com/mattn/go-sqlite3"
)

// Server holds dependencies for HTTP handlers.
type Server struct {
	dockerClient       *client.Client
	stackManager       *stacks.Manager
	onboardingService  *onboarding.Service
	onboardingHandlers *OnboardingHandlers
	db                 *sql.DB
}

// New wires HTTP handlers and returns a configured server.
func New(dockerClient *client.Client) *http.Server {
	// Initialize SQLite database
	dbPath := os.Getenv("STACKVIEW_SQLITE_PATH")
	if dbPath == "" {
		dbPath = "./stackview.db"
	}
	// Ensure database directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatalf("failed to create database directory: %v", err)
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	// Initialize onboarding service
	onboardingSvc, err := onboarding.NewService(db)
	if err != nil {
		log.Fatalf("failed to init onboarding: %v", err)
	}

	// Initialize container tags table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS container_tags (
		container_id TEXT NOT NULL,
		tag TEXT NOT NULL,
		PRIMARY KEY (container_id, tag)
	)`)
	if err != nil {
		log.Fatalf("failed to create tags table: %v", err)
	}

	// Get stack roots - prefer onboarding config, fallback to env
	status, _ := onboardingSvc.GetStatus()
	var roots []string
	if len(status.StackRoots) > 0 {
		roots = status.StackRoots
	} else {
		rootsEnv := os.Getenv("STACKVIEW_STACK_ROOTS")
		if rootsEnv != "" {
			roots = strings.Split(rootsEnv, ",")
		} else {
			roots = []string{"/stacks"}
		}
	}

	stackManager := stacks.NewManager(roots, dockerClient)
	// Initial scan
	_ = stackManager.Refresh()

	onboardingHandlers := NewOnboardingHandlers(onboardingSvc)

	s := &Server{
		dockerClient:       dockerClient,
		stackManager:       stackManager,
		onboardingService:  onboardingSvc,
		onboardingHandlers: onboardingHandlers,
		db:                 db,
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

	// Stack detail routes
	mux.HandleFunc("/api/stacks/", s.handleStackRouter)

	// Container endpoints
	mux.HandleFunc("/api/containers/", s.handleContainerRouter)
	mux.HandleFunc("/api/tags", s.handleGetAllTags)

	// Onboarding endpoints
	mux.HandleFunc("/api/onboarding/status", onboardingHandlers.HandleGetStatus)
	mux.HandleFunc("/api/onboarding/stack-roots", onboardingHandlers.HandleSetStackRoots)
	mux.HandleFunc("/api/onboarding/step", onboardingHandlers.HandleSetStep)
	mux.HandleFunc("/api/onboarding/complete", onboardingHandlers.HandleComplete)
	mux.HandleFunc("/api/onboarding/hosts", onboardingHandlers.HandleHosts)
	mux.HandleFunc("/api/onboarding/hosts/", onboardingHandlers.HandleHosts)
	mux.HandleFunc("/api/onboarding/alerts", onboardingHandlers.HandleAlertRules)
	mux.HandleFunc("/api/onboarding/alerts/", onboardingHandlers.HandleAlertRules)

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

// handleContainerRouter routes container requests.
func (s *Server) handleContainerRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	
	// Handle /api/containers/tags
	if path == "/api/containers/tags" {
		s.handleGetAllContainerTags(w, r)
		return
	}
	
	// Handle /api/containers/{id}/tags
	if strings.HasSuffix(path, "/tags") {
		switch r.Method {
		case http.MethodGet:
			s.handleGetContainerTags(w, r)
		case http.MethodPut:
			s.handlePutContainerTags(w, r)
		case http.MethodOptions:
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}
	
	// Handle /api/containers/{id}
	s.handleGetContainer(w, r)
}

