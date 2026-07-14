package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func main() {
	if len(os.Args) > 1 {
		cmd := os.Args[1]
		switch cmd {
		case "-install", "--install":
			if err := installService("MonitorAgent", "Monitor Agent Service"); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to install service: %v\n", err)
				os.Exit(1)
			}
			fmt.Println("Service installed successfully.")
			return
		case "-uninstall", "--uninstall":
			if err := uninstallService("MonitorAgent"); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to uninstall service: %v\n", err)
				os.Exit(1)
			}
			fmt.Println("Service uninstalled successfully.")
			return
		}
	}

	isSvc, err := isServiceSession()
	if err == nil && isSvc {
		if err := runService("MonitorAgent"); err != nil {
			fmt.Fprintf(os.Stderr, "Service execution failed: %v\n", err)
			os.Exit(1)
		}
		return
	}

	stopChan := make(chan struct{})
	runAgentLoop(stopChan)
}

func runAgentLoop(stopChan <-chan struct{}) {
	appDir := filepath.Dir(os.Args[0])
	if execPath, err := os.Executable(); err == nil {
		appDir = filepath.Dir(execPath)
	}

	bootstrapPath := filepath.Join(appDir, "bootstrap.json")
	config, err := readConfig(bootstrapPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read bootstrap.json: %v\n", err)
		return
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
		return
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

	ticker := time.NewTicker(time.Duration(heartbeatInterval) * time.Second)
	defer ticker.Stop()

	// Run once initially
	sendHeartbeatStep(config, client, metrics, identityToken, &heartbeatInterval)

	for {
		select {
		case <-stopChan:
			return
		case <-ticker.C:
			sendHeartbeatStep(config, client, metrics, identityToken, &heartbeatInterval)
			ticker.Reset(time.Duration(heartbeatInterval) * time.Second)
		}
	}
}

func sendHeartbeatStep(config *BootstrapConfig, client *AgentClient, metrics *metricsCollector, identityToken string, heartbeatInterval *int) {
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
			*heartbeatInterval = response.HeartbeatInterval
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
}
