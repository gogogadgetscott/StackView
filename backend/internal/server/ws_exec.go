package server

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/gorilla/websocket"
)

// ExecMessage represents messages between client and terminal.
type ExecMessage struct {
	Type   string `json:"type"`   // input, resize, ping
	Data   string `json:"data"`   // stdin data for input type
	Cols   uint   `json:"cols"`   // terminal columns for resize
	Rows   uint   `json:"rows"`   // terminal rows for resize
}

// ExecWebSocketHandler provides a web terminal to a container.
func ExecWebSocketHandler(dockerClient *client.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("exec upgrade error: %v", err)
			return
		}
		defer conn.Close()
		conn.SetCloseHandler(func(code int, text string) error {
			cancel()
			return nil
		})

		// Read initial config with container ID
		var config struct {
			ContainerID string `json:"containerId"`
			Cmd         string `json:"cmd"` // optional, defaults to /bin/sh
		}
		if err := conn.ReadJSON(&config); err != nil {
			log.Printf("failed to read exec config: %v", err)
			return
		}

		if config.ContainerID == "" {
			_ = conn.WriteJSON(map[string]string{"error": "containerId is required"})
			return
		}

		cmd := config.Cmd
		if cmd == "" {
			cmd = "/bin/sh"
		}

		// Create exec instance
		execConfig := types.ExecConfig{
			Cmd:          []string{cmd},
			AttachStdin:  true,
			AttachStdout: true,
			AttachStderr: true,
			Tty:          true,
		}

		execID, err := dockerClient.ContainerExecCreate(ctx, config.ContainerID, execConfig)
		if err != nil {
			_ = conn.WriteJSON(map[string]string{"error": "failed to create exec: " + err.Error()})
			return
		}

		// Attach to exec
		attachResp, err := dockerClient.ContainerExecAttach(ctx, execID.ID, types.ExecStartCheck{
			Tty: true,
		})
		if err != nil {
			_ = conn.WriteJSON(map[string]string{"error": "failed to attach: " + err.Error()})
			return
		}
		defer attachResp.Close()

		// Send ready message
		_ = conn.WriteJSON(map[string]string{"type": "ready"})

		// Handle output: container -> websocket
		go func() {
			buf := make([]byte, 4096)
			for {
				n, err := attachResp.Reader.Read(buf)
				if err != nil {
					if err != io.EOF {
						log.Printf("exec read error: %v", err)
					}
					cancel()
					return
				}
				if n > 0 {
					msg := map[string]string{
						"type": "output",
						"data": string(buf[:n]),
					}
					if err := conn.WriteJSON(msg); err != nil {
						cancel()
						return
					}
				}
			}
		}()

		// Handle input: websocket -> container
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			_, msgBytes, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("exec websocket error: %v", err)
				}
				return
			}

			var msg ExecMessage
			if err := json.Unmarshal(msgBytes, &msg); err != nil {
				continue
			}

			switch msg.Type {
			case "input":
				if _, err := attachResp.Conn.Write([]byte(msg.Data)); err != nil {
					log.Printf("exec write error: %v", err)
					return
				}
			case "resize":
				if msg.Cols > 0 && msg.Rows > 0 {
					_ = dockerClient.ContainerExecResize(ctx, execID.ID, types.ResizeOptions{
						Width:  msg.Cols,
						Height: msg.Rows,
					})
				}
			case "ping":
				_ = conn.WriteJSON(map[string]string{"type": "pong"})
			}
		}
	})
}
