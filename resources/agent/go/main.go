package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func main() {
	appDir := filepath.Dir(os.Args[0])
	if d, err := os.Getwd(); err == nil {
		appDir = d
	}

	bootstrapPath := filepath.Join(appDir, "bootstrap.json")
	config, err := readConfig(bootstrapPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read bootstrap.json: %v\n", err)
		os.Exit(1)
	}

	metrics := newMetricsCollector()
	client := NewAgentClient()

	fmt.Println("Agent v2 starting...")
	fmt.Println("Registering with server...")

	registerPayload := &RegisterRequest{
		Token:           config.Token,
		AgentVersion:    config.AgentVersion,
		Hostname:        config.Hostname,
		OperatingSystem: metrics.GetOS(),
		Architecture:    metrics.GetArch(),
		Cpu:             metrics.GetCPUSpec(),
		Memory:          metrics.GetMemorySpec(),
		Disk:            metrics.GetDiskSpec(),
		Capabilities:    []string{"metrics.cpu", "metrics.memory", "metrics.disk", "metrics.network", "metrics.processes", "ports.scan"},
	}
	if registerPayload.Hostname == "" {
		registerPayload.Hostname = metrics.GetHostname()
	}

	registerResult, err := client.register(config.RegisterURL, registerPayload)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Registration failed: %v\n", err)
		os.Exit(1)
	}

	identityToken := registerResult.Identity
	fmt.Println("Registered successfully.")

	heartbeatInterval := registerResult.HeartbeatInterval
	if heartbeatInterval <= 0 {
		heartbeatInterval = config.HeartbeatInterval
	}

	if v, ok := registerResult.Configuration["version"].(float64); ok {
		config.confVersion = int(v)
	}

	fmt.Printf("Starting heartbeat loop (interval: %ds)...\n", heartbeatInterval)

	for {
		payload := &HeartbeatRequest{
			AgentVersion:        config.AgentVersion,
			ConfigurationVersion: config.confVersion,
			Timestamp:           time.Now().Unix(),
			Hostname:            metrics.GetHostname(),
			Cpu:                 metrics.GetCPUUsage(),
			Memory:              metrics.GetMemoryUsage(),
			Disk:                metrics.GetDiskUsage(),
			Uptime:              metrics.GetUptime(),
			Network:             metrics.GetNetworkStats(),
			TopProcesses:        metrics.GetTopProcesses(),
			OpenDbPorts:         metrics.GetOpenDatabasePorts(),
		}

		if response, err := client.sendHeartbeat(config.ApiURL, identityToken, payload); err != nil {
			fmt.Fprintf(os.Stderr, "Heartbeat failed: %v\n", err)
		} else {
			if response.HeartbeatInterval > 0 {
				heartbeatInterval = response.HeartbeatInterval
			}
			if v, ok := response.Configuration["version"].(float64); ok {
				config.confVersion = int(v)
				fmt.Printf("Configuration updated to version %d\n", config.confVersion)
			}
			if len(response.PendingCommands) > 0 {
				var completed []CommandResult
				for _, cmd := range response.PendingCommands {
					fmt.Printf("Executing command: %s (id: %d)\n", cmd.Type, cmd.Id)
					result := executeCommand(cmd)
					completed = append(completed, result)
				}
				if len(completed) > 0 {
					ackPayload := &HeartbeatRequest{
						AgentVersion:        config.AgentVersion,
						ConfigurationVersion: config.confVersion,
						Timestamp:           time.Now().Unix(),
						Hostname:            metrics.GetHostname(),
						CompletedCommands:   completed,
					}
					client.sendHeartbeat(config.ApiURL, identityToken, ackPayload)
				}
			}
		}

		time.Sleep(time.Duration(heartbeatInterval) * time.Second)
	}
}
