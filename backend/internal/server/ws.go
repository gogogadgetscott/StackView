package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/gogogadgetscott/stackview/internal/stacks"
	"github.com/gorilla/websocket"
)

type subscription struct {
	ContainerIDs []string `json:"containerIds"`
	IntervalMS   int      `json:"intervalMs"`
}

type statsPayload struct {
	ContainerID string  `json:"containerId"`
	Name        string  `json:"name"`
	StackName   string  `json:"stackName"`
	CPUPercent  float64 `json:"cpuPercent"`
	MemPercent  float64 `json:"memPercent"`
	Timestamp   int64   `json:"ts"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// TODO: In production, restrict to allowed origins only
		// Example: return r.Header.Get("Origin") == "https://example.com"
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// StatsWebSocketHandler streams stats for requested containers at ~1s cadence.
func StatsWebSocketHandler(dockerClient *client.Client, stackManager *stacks.Manager) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("upgrade error: %v", err)
			return
		}
		defer conn.Close()
		conn.SetCloseHandler(func(code int, text string) error {
			cancel()
			return nil
		})

		var sub subscription
		if err := conn.ReadJSON(&sub); err != nil {
			log.Printf("failed to read subscription: %v", err)
			return
		}
		interval := time.Duration(sub.IntervalMS)
		if interval <= 0 {
			interval = time.Second
		}

		// Build list of containers with their stack names
		type containerInfo struct {
			ID        string
			StackName string
		}
		var containers []containerInfo

		if len(sub.ContainerIDs) == 0 {
			list, err := dockerClient.ContainerList(ctx, types.ContainerListOptions{All: true})
			if err != nil {
				log.Printf("list containers error: %v", err)
				_ = conn.WriteJSON(map[string]string{"error": "list containers failed"})
				return
			}
			for _, c := range list {
				containers = append(containers, containerInfo{
					ID:        c.ID,
					StackName: c.Labels["com.docker.compose.project"],
				})
			}
		} else {
			for _, id := range sub.ContainerIDs {
				stackName := stackManager.GetContainerStackName(ctx, id)
				containers = append(containers, containerInfo{
					ID:        id,
					StackName: stackName,
				})
			}
		}

		writeMu := sync.Mutex{}
		writeJSON := func(v interface{}) error {
			writeMu.Lock()
			defer writeMu.Unlock()
			return conn.WriteJSON(v)
		}

		errCh := make(chan error, len(containers))
		for _, c := range containers {
			go func(info containerInfo) {
				errCh <- streamSingle(ctx, dockerClient, info.ID, info.StackName, interval, writeJSON)
			}(c)
		}

		for {
			select {
			case <-ctx.Done():
				return
			case err := <-errCh:
				if err != nil {
					_ = writeJSON(map[string]string{"error": err.Error()})
				}
				return
			}
		}
	})
}

func streamSingle(ctx context.Context, cli *client.Client, containerID string, stackName string, interval time.Duration, write func(interface{}) error) error {
	stats, err := cli.ContainerStats(ctx, containerID, true)
	if err != nil {
		return err
	}
	defer stats.Body.Close()

	decoder := json.NewDecoder(stats.Body)
	lastEmit := time.Time{}
	for decoder.More() {
		var v types.StatsJSON
		if err := decoder.Decode(&v); err != nil {
			return err
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		now := time.Now()
		if now.Sub(lastEmit) < interval {
			continue
		}
		lastEmit = now

		cpu := calculateCPUPercent(v)
		memUsage := v.MemoryStats.Usage
		memLimit := v.MemoryStats.Limit
		memPercent := 0.0
		if memLimit > 0 {
			memPercent = float64(memUsage) / float64(memLimit) * 100
		}

		if err := write(statsPayload{
			ContainerID: containerID,
			Name:        strings.TrimPrefix(v.Name, "/"),
			StackName:   stackName,
			CPUPercent:  cpu,
			MemPercent:  memPercent,
			Timestamp:   now.UnixMilli(),
		}); err != nil {
			return err
		}
	}
	return nil
}

// calculateCPUPercent mirrors Docker CLI logic for accurate per-container CPU.
func calculateCPUPercent(v types.StatsJSON) float64 {
	prevCPU := v.PreCPUStats.CPUUsage.TotalUsage
	prevSystem := v.PreCPUStats.SystemUsage
	cpuDelta := float64(v.CPUStats.CPUUsage.TotalUsage - prevCPU)
	systemDelta := float64(v.CPUStats.SystemUsage - prevSystem)
	if systemDelta <= 0 || cpuDelta <= 0 {
		return 0
	}
	numCPUs := float64(len(v.CPUStats.CPUUsage.PercpuUsage))
	if numCPUs == 0 {
		numCPUs = 1
	}
	return (cpuDelta / systemDelta) * numCPUs * 100
}

