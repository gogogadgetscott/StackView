package server

import (
	"bufio"
	"context"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/gogogadgetscott/stackview/internal/stacks"
)

// LogEntry represents a single log line.
type LogEntry struct {
	Timestamp   string `json:"timestamp"`
	Service     string `json:"service"`
	ContainerID string `json:"containerId"`
	Message     string `json:"message"`
	Stream      string `json:"stream"` // stdout or stderr
}

// logsSubscription holds the requested log filters.
type logsSubscription struct {
	StackName string   `json:"stackName"`
	Services  []string `json:"services"` // empty means all
	Tail      string   `json:"tail"`     // number of lines or "all"
	Since     string   `json:"since"`    // timestamp or duration
}

// LogsWebSocketHandler streams container logs for a stack.
func LogsWebSocketHandler(dockerClient *client.Client, stackManager *stacks.Manager) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("logs upgrade error: %v", err)
			return
		}
		defer conn.Close()
		conn.SetCloseHandler(func(code int, text string) error {
			cancel()
			return nil
		})

		var sub logsSubscription
		if err := conn.ReadJSON(&sub); err != nil {
			log.Printf("failed to read logs subscription: %v", err)
			return
		}

		if sub.StackName == "" {
			_ = conn.WriteJSON(map[string]string{"error": "stackName is required"})
			return
		}

		// Get containers for the stack
		containers, err := stackManager.GetContainersForStack(ctx, sub.StackName)
		if err != nil {
			_ = conn.WriteJSON(map[string]string{"error": err.Error()})
			return
		}

		// Filter by services if specified
		serviceFilter := make(map[string]bool)
		for _, svc := range sub.Services {
			serviceFilter[svc] = true
		}

		writeMu := sync.Mutex{}
		writeJSON := func(v interface{}) error {
			writeMu.Lock()
			defer writeMu.Unlock()
			return conn.WriteJSON(v)
		}

		// Start log streaming for each container
		var wg sync.WaitGroup
		for _, c := range containers {
			if len(serviceFilter) > 0 && !serviceFilter[c.Service] {
				continue
			}

			wg.Add(1)
			go func(container stacks.ContainerDetail) {
				defer wg.Done()
				streamContainerLogs(ctx, dockerClient, container, sub, writeJSON)
			}(c)
		}

		// Wait for context cancellation or all streams to end
		done := make(chan struct{})
		go func() {
			wg.Wait()
			close(done)
		}()

		select {
		case <-ctx.Done():
		case <-done:
		}
	})
}

func streamContainerLogs(ctx context.Context, cli *client.Client, container stacks.ContainerDetail, sub logsSubscription, write func(interface{}) error) {
	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Timestamps: true,
		Tail:       sub.Tail,
		Since:      sub.Since,
	}

	if options.Tail == "" {
		options.Tail = "100"
	}

	logs, err := cli.ContainerLogs(ctx, container.ID, options)
	if err != nil {
		_ = write(map[string]string{"error": "failed to get logs: " + err.Error()})
		return
	}
	defer logs.Close()

	stdoutReader, stdoutWriter := io.Pipe()
	stderrReader, stderrWriter := io.Pipe()

	// Demultiplex Docker log stream; handles both TTY and non-TTY containers.
	go func() {
		defer stdoutWriter.Close()
		defer stderrWriter.Close()
		_, _ = stdcopy.StdCopy(stdoutWriter, stderrWriter, logs)
	}()

	wg := sync.WaitGroup{}
	wg.Add(2)

	scanStream := func(stream string, reader io.Reader) {
		defer wg.Done()
		scanner := bufio.NewScanner(reader)
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for scanner.Scan() {
			select {
			case <-ctx.Done():
				return
			default:
			}

			message := scanner.Text()
			timestamp := time.Now().Format(time.RFC3339)
			if len(message) > 30 && len(message) > 10 && message[10] == 'T' {
				parts := strings.SplitN(message, " ", 2)
				if len(parts) == 2 {
					timestamp = parts[0]
					message = parts[1]
				}
			}

			entry := LogEntry{
				Timestamp:   timestamp,
				Service:     container.Service,
				ContainerID: container.ID[:12],
				Message:     strings.TrimRight(message, "\n\r"),
				Stream:      stream,
			}

			if err := write(entry); err != nil {
				return
			}
		}
		if err := scanner.Err(); err != nil {
			_ = write(map[string]string{"error": "log stream error: " + err.Error()})
		}
	}

	go scanStream("stdout", stdoutReader)
	go scanStream("stderr", stderrReader)

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-ctx.Done():
	case <-done:
	}
}
