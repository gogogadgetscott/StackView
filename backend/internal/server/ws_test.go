package server

import (
	"encoding/json"
	"testing"

	"github.com/docker/docker/api/types"
)

// TestCalculateCPUPercent verifies CPU percentage calculation matches Docker CLI logic.
func TestCalculateCPUPercent(t *testing.T) {
	tests := []struct {
		name     string
		stats    types.StatsJSON
		expected float64
	}{
		{
			name: "zero cpu delta",
			stats: types.StatsJSON{
				PreCPUStats: types.CPUStats{
					CPUUsage: types.CPUUsage{
						TotalUsage: 100,
					},
					SystemUsage: 1000,
				},
				CPUStats: types.CPUStats{
					CPUUsage: types.CPUUsage{
						TotalUsage: 100,
					},
					SystemUsage: 1000,
				},
			},
			expected: 0.0,
		},
		{
			name: "valid cpu calculation",
			stats: types.StatsJSON{
				PreCPUStats: types.CPUStats{
					CPUUsage: types.CPUUsage{
						TotalUsage: 100,
						PercpuUsage: []uint64{50, 50},
					},
					SystemUsage: 1000,
				},
				CPUStats: types.CPUStats{
					CPUUsage: types.CPUUsage{
						TotalUsage: 200,
						PercpuUsage: []uint64{100, 100},
					},
					SystemUsage: 2000,
				},
			},
			expected: 200.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateCPUPercent(tt.stats)
			if result != tt.expected {
				t.Errorf("calculateCPUPercent() = %f, expected %f", result, tt.expected)
			}
		})
	}
}

// TestStatsPayloadJSON verifies stats payload can be marshaled to JSON.
func TestStatsPayloadJSON(t *testing.T) {
	payload := statsPayload{
		ContainerID: "abc123",
		Name:        "test-container",
		CPUPercent:  50.5,
		MemPercent:  25.3,
		Timestamp:   1234567890,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("Failed to marshal stats payload: %v", err)
	}

	var unmarshaled statsPayload
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal stats payload: %v", err)
	}

	if unmarshaled.ContainerID != payload.ContainerID {
		t.Errorf("ContainerID mismatch: got %s, expected %s", unmarshaled.ContainerID, payload.ContainerID)
	}

	if unmarshaled.CPUPercent != payload.CPUPercent {
		t.Errorf("CPUPercent mismatch: got %f, expected %f", unmarshaled.CPUPercent, payload.CPUPercent)
	}
}
