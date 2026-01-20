package history

import (
	"context"
	"database/sql"
	"log"
	"sync"
	"time"
)

// StatsPoint represents a single stats measurement.
type StatsPoint struct {
	ContainerID string    `json:"containerId"`
	StackName   string    `json:"stackName"`
	Timestamp   time.Time `json:"timestamp"`
	CPU         float64   `json:"cpu"`
	Memory      float64   `json:"memory"`
	Restarts    int       `json:"restarts"`
}

// AggregatedStats represents aggregated stats for a time bucket.
type AggregatedStats struct {
	Timestamp   time.Time `json:"timestamp"`
	AvgCPU      float64   `json:"avgCpu"`
	MaxCPU      float64   `json:"maxCpu"`
	AvgMemory   float64   `json:"avgMemory"`
	MaxMemory   float64   `json:"maxMemory"`
	Restarts    int       `json:"restarts"`
	SampleCount int       `json:"sampleCount"`
}

// ContainerHistory represents historical stats for a container.
type ContainerHistory struct {
	ContainerID string            `json:"containerId"`
	StackName   string            `json:"stackName"`
	Points      []AggregatedStats `json:"points"`
}

// StackHistory represents aggregated historical stats for a stack.
type StackHistory struct {
	StackName   string              `json:"stackName"`
	Containers  []ContainerHistory  `json:"containers"`
	Aggregated  []AggregatedStats   `json:"aggregated"`
}

// Service manages historical stats storage.
type Service struct {
	db               *sql.DB
	mu               sync.RWMutex
	currentBucket    map[string][]StatsPoint // containerID -> points in current bucket
	bucketStart      time.Time
	bucketDuration   time.Duration
	retentionDays    int
}

// NewService creates a history service.
func NewService(db *sql.DB) (*Service, error) {
	s := &Service{
		db:             db,
		currentBucket:  make(map[string][]StatsPoint),
		bucketStart:    time.Now().Truncate(time.Minute),
		bucketDuration: time.Minute,
		retentionDays:  7,
	}
	if err := s.initSchema(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Service) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS stats_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		container_id TEXT NOT NULL,
		stack_name TEXT NOT NULL,
		bucket_ts TEXT NOT NULL,
		avg_cpu REAL NOT NULL,
		max_cpu REAL NOT NULL,
		avg_mem REAL NOT NULL,
		max_mem REAL NOT NULL,
		restarts INTEGER NOT NULL DEFAULT 0,
		sample_count INTEGER NOT NULL DEFAULT 1,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_stats_history_container ON stats_history(container_id, bucket_ts);
	CREATE INDEX IF NOT EXISTS idx_stats_history_stack ON stats_history(stack_name, bucket_ts);
	CREATE INDEX IF NOT EXISTS idx_stats_history_ts ON stats_history(bucket_ts);
	`
	_, err := s.db.Exec(schema)
	return err
}

// RecordPoint stores a stats point in the current bucket.
func (s *Service) RecordPoint(point StatsPoint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if we need to flush the current bucket
	now := time.Now()
	if now.Sub(s.bucketStart) >= s.bucketDuration {
		s.flushBucketLocked()
		s.bucketStart = now.Truncate(time.Minute)
	}

	s.currentBucket[point.ContainerID] = append(s.currentBucket[point.ContainerID], point)
}

func (s *Service) flushBucketLocked() {
	if len(s.currentBucket) == 0 {
		return
	}

	tx, err := s.db.Begin()
	if err != nil {
		log.Printf("history: failed to begin tx: %v", err)
		return
	}

	stmt, err := tx.Prepare(`
		INSERT INTO stats_history (container_id, stack_name, bucket_ts, avg_cpu, max_cpu, avg_mem, max_mem, restarts, sample_count)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		tx.Rollback()
		log.Printf("history: failed to prepare: %v", err)
		return
	}
	defer stmt.Close()

	for containerID, points := range s.currentBucket {
		if len(points) == 0 {
			continue
		}

		var sumCPU, sumMem, maxCPU, maxMem float64
		var restarts int
		stackName := points[0].StackName

		for _, p := range points {
			sumCPU += p.CPU
			sumMem += p.Memory
			if p.CPU > maxCPU {
				maxCPU = p.CPU
			}
			if p.Memory > maxMem {
				maxMem = p.Memory
			}
			restarts += p.Restarts
		}

		avgCPU := sumCPU / float64(len(points))
		avgMem := sumMem / float64(len(points))

		_, err := stmt.Exec(
			containerID,
			stackName,
			s.bucketStart.Format(time.RFC3339),
			avgCPU,
			maxCPU,
			avgMem,
			maxMem,
			restarts,
			len(points),
		)
		if err != nil {
			log.Printf("history: failed to insert: %v", err)
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("history: failed to commit: %v", err)
	}

	// Clear the bucket
	s.currentBucket = make(map[string][]StatsPoint)
}

// FlushBucket manually flushes the current bucket (for graceful shutdown).
func (s *Service) FlushBucket() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.flushBucketLocked()
}

// GetStackHistory returns historical stats for a stack.
func (s *Service) GetStackHistory(ctx context.Context, stackName string, duration time.Duration) (*StackHistory, error) {
	since := time.Now().Add(-duration).Format(time.RFC3339)

	rows, err := s.db.QueryContext(ctx, `
		SELECT container_id, bucket_ts, avg_cpu, max_cpu, avg_mem, max_mem, restarts, sample_count
		FROM stats_history
		WHERE stack_name = ? AND bucket_ts >= ?
		ORDER BY container_id, bucket_ts
	`, stackName, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	containerMap := make(map[string]*ContainerHistory)
	allPoints := []AggregatedStats{}

	for rows.Next() {
		var containerID, bucketTS string
		var agg AggregatedStats
		if err := rows.Scan(&containerID, &bucketTS, &agg.AvgCPU, &agg.MaxCPU, &agg.AvgMemory, &agg.MaxMemory, &agg.Restarts, &agg.SampleCount); err != nil {
			continue
		}
		agg.Timestamp, _ = time.Parse(time.RFC3339, bucketTS)

		if _, ok := containerMap[containerID]; !ok {
			containerMap[containerID] = &ContainerHistory{
				ContainerID: containerID,
				StackName:   stackName,
				Points:      []AggregatedStats{},
			}
		}
		containerMap[containerID].Points = append(containerMap[containerID].Points, agg)
		allPoints = append(allPoints, agg)
	}

	// Aggregate across all containers for the stack
	aggregated := s.aggregateStackPoints(allPoints)

	containers := make([]ContainerHistory, 0, len(containerMap))
	for _, c := range containerMap {
		containers = append(containers, *c)
	}

	return &StackHistory{
		StackName:  stackName,
		Containers: containers,
		Aggregated: aggregated,
	}, nil
}

func (s *Service) aggregateStackPoints(points []AggregatedStats) []AggregatedStats {
	if len(points) == 0 {
		return nil
	}

	// Group by timestamp bucket
	byTimestamp := make(map[time.Time][]AggregatedStats)
	for _, p := range points {
		bucket := p.Timestamp.Truncate(time.Minute)
		byTimestamp[bucket] = append(byTimestamp[bucket], p)
	}

	result := make([]AggregatedStats, 0, len(byTimestamp))
	for ts, pts := range byTimestamp {
		var sumCPU, sumMem, maxCPU, maxMem float64
		var restarts, samples int

		for _, p := range pts {
			sumCPU += p.AvgCPU
			sumMem += p.AvgMemory
			if p.MaxCPU > maxCPU {
				maxCPU = p.MaxCPU
			}
			if p.MaxMemory > maxMem {
				maxMem = p.MaxMemory
			}
			restarts += p.Restarts
			samples += p.SampleCount
		}

		result = append(result, AggregatedStats{
			Timestamp:   ts,
			AvgCPU:      sumCPU, // Sum for stack total, not average
			MaxCPU:      maxCPU,
			AvgMemory:   sumMem,
			MaxMemory:   maxMem,
			Restarts:    restarts,
			SampleCount: samples,
		})
	}

	return result
}

// Cleanup removes old data beyond retention period.
func (s *Service) Cleanup(ctx context.Context) error {
	cutoff := time.Now().AddDate(0, 0, -s.retentionDays).Format(time.RFC3339)
	_, err := s.db.ExecContext(ctx, `DELETE FROM stats_history WHERE bucket_ts < ?`, cutoff)
	return err
}

// StartBackgroundWorker starts a goroutine to periodically flush and cleanup.
func (s *Service) StartBackgroundWorker(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	cleanupTicker := time.NewTicker(time.Hour)

	go func() {
		for {
			select {
			case <-ctx.Done():
				s.FlushBucket()
				return
			case <-ticker.C:
				s.FlushBucket()
			case <-cleanupTicker.C:
				if err := s.Cleanup(ctx); err != nil {
					log.Printf("history: cleanup failed: %v", err)
				}
			}
		}
	}()
}
