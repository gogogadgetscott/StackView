package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/docker/docker/client"
	"github.com/gogogadgetscott/stackview/internal/server"
)

const defaultDockerHost = "unix:///var/run/docker.sock"

func main() {
	// Set up signal handling
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Create Docker client
	dockerClient, err := client.NewClientWithOpts(
		client.WithHost(defaultDockerHost),
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		log.Fatalf("Failed to create Docker client: %v", err)
	}
	defer dockerClient.Close()

	// Verify Docker connectivity
	_, err = dockerClient.Ping(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to Docker daemon: %v. Ensure Docker socket is mounted", err)
	}

	// Create and start HTTP server
	httpServer := server.New(dockerClient)
	serverErrors := make(chan error, 1)

	go func() {
		log.Println("StackView backend listening on :8080")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErrors <- fmt.Errorf("HTTP server error: %w", err)
		}
	}()

	// Wait for shutdown signal or server error
	select {
	case <-ctx.Done():
		log.Println("Shutdown signal received")
	case err := <-serverErrors:
		log.Printf("Server error: %v", err)
	}

	// Graceful shutdown with timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("Graceful shutdown failed: %v", err)
		os.Exit(1)
	}

	log.Println("Server shut down successfully")
}
