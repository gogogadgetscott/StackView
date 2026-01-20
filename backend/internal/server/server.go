package server

import (
	"net/http"

	"github.com/docker/docker/client"
)

// New wires HTTP handlers and returns a configured server.
func New(dockerClient *client.Client) *http.Server {
	mux := http.NewServeMux()
	mux.Handle("/ws/stats", StatsWebSocketHandler(dockerClient))

	return &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}
}
