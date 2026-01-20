package stacks

import (
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Stack represents a discovered docker-compose stack.
type Stack struct {
	Name     string   `json:"name"`
	Path     string   `json:"path"`
	Services []string `json:"services"`
}

// composeFile is a minimal representation of docker-compose.yml for service extraction.
type composeFile struct {
	Services map[string]interface{} `yaml:"services"`
}

// composeFileNames are the filenames we look for.
var composeFileNames = []string{"docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"}

// Scan recursively searches for compose files in the given root directories
// and returns discovered stacks.
func Scan(roots []string) ([]Stack, error) {
	var stacks []Stack
	seen := make(map[string]bool)

	for _, root := range roots {
		root = strings.TrimSpace(root)
		if root == "" {
			continue
		}

		err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
			if err != nil {
				// Skip directories we can't access
				return nil
			}

			// Skip hidden directories and common ignore patterns
			if d.IsDir() {
				name := d.Name()
				if strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" {
					return filepath.SkipDir
				}
				return nil
			}

			// Check if this is a compose file
			fileName := d.Name()
			isCompose := false
			for _, cf := range composeFileNames {
				if fileName == cf {
					isCompose = true
					break
				}
			}
			if !isCompose {
				return nil
			}

			dir := filepath.Dir(path)
			if seen[dir] {
				return nil
			}
			seen[dir] = true

			stack, err := parseStack(path)
			if err != nil {
				// Skip invalid compose files
				return nil
			}
			stacks = append(stacks, stack)
			return nil
		})
		if err != nil {
			return stacks, err
		}
	}

	return stacks, nil
}

// parseStack reads a compose file and extracts stack info.
func parseStack(composePath string) (Stack, error) {
	data, err := os.ReadFile(composePath)
	if err != nil {
		return Stack{}, err
	}

	var cf composeFile
	if err := yaml.Unmarshal(data, &cf); err != nil {
		return Stack{}, err
	}

	dir := filepath.Dir(composePath)
	name := filepath.Base(dir)

	services := make([]string, 0, len(cf.Services))
	for svc := range cf.Services {
		services = append(services, svc)
	}

	return Stack{
		Name:     name,
		Path:     dir,
		Services: services,
	}, nil
}
