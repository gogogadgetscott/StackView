package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/docker/docker/client"
	"github.com/gogogadgetscott/stackview/internal/server"
)

const defaultDockerHost = "unix:///var/run/docker.sock"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	dockerClient, err := client.NewClientWithOpts(
		client.WithHost(defaultDockerHost),
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		log.Fatalf("failed to create docker client: %v", err)
	}

	httpServer := server.New(dockerClient)
	go func() {
		log.Println("StackView backend listening on :8080")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutdown signal received")
	if err := httpServer.Shutdown(context.Background()); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}

	dockerClient.Close()
	os.Exit(0)
}
