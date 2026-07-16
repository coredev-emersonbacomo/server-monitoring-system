package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

func main() {
	// Global panic recovery and logging
	defer func() {
		if r := recover(); r != nil {
			appDir := filepath.Dir(os.Args[0])
			if execPath, err := os.Executable(); err == nil {
				appDir = filepath.Dir(execPath)
			}
			logFile := filepath.Join(appDir, "crash.log")
			f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
			if err == nil {
				defer f.Close()
				timestamp := time.Now().Format("2006-01-02 15:04:05")
				fmt.Fprintf(f, "\n=== CRASH LOG %s ===\n", timestamp)
				fmt.Fprintf(f, "Panic: %v\n", r)
				// Write stack trace
				buf := make([]byte, 2048)
				n := runtime.Stack(buf, false)
				f.Write(buf[:n])
				fmt.Fprintln(f, "=====================\n")
			}
			fmt.Fprintf(os.Stderr, "Fatal crash: %v. Check crash.log for details.\n", r)
			os.Exit(1)
		}
	}()
//
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
		IsService = true
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

	// Redirect stdout and stderr to agent.log for service logging
	logFile, err := os.OpenFile(filepath.Join(appDir, "agent.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err == nil {
		os.Stdout = logFile
		os.Stderr = logFile
	}

	bootstrapPath := filepath.Join(appDir, "bootstrap.json")
	config, err := readConfig(bootstrapPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to read bootstrap.json: %v\n", err)
		return
	}

	var identityToken string
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "PANIC RECOVERED: %v\n", r)
			if config != nil && identityToken != "" {
				reportAgentPanic(config, identityToken, r)
			}
		}
	}()

	metrics := newMetricsCollector()
	client := NewAgentClient()

	fmt.Println("Agent v2 starting...")
//
	heartbeatInterval := config.HeartbeatInterval
	if heartbeatInterval <= 0 {
		heartbeatInterval = 5
	}

	if config.IdentityToken != "" {
		fmt.Println("Existing identity token found. Skipping registration.")
		identityToken = config.IdentityToken
		// Send version update notification to backend on agent start
		if config.UpdateURL != "" {
			_ = client.postNotification(config.UpdateURL, identityToken, map[string]string{"agent_version": config.AgentVersion})
		}
	} else {
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

		identityToken = registerResult.Identity
		fmt.Println("Registered successfully.")

		if registerResult.HeartbeatInterval > 0 {
			heartbeatInterval = registerResult.HeartbeatInterval
		}

		if v, ok := registerResult.Configuration["version"].(float64); ok {
			config.confVersion = int(v)
		}

		// Persist Reverb/WS connection details and the identity token so they survive restarts
		config.IdentityToken = identityToken
		if registerResult.ServerUUID != "" {
			config.ServerUUID = registerResult.ServerUUID
		}
		if registerResult.UpdateURL != "" {
			config.UpdateURL = registerResult.UpdateURL
		}
		if registerResult.ReverbHost != "" {
			config.ReverbHost = registerResult.ReverbHost
		}
		if registerResult.ReverbPort > 0 {
			config.ReverbPort = registerResult.ReverbPort
		}
		if registerResult.ReverbScheme != "" {
			config.ReverbScheme = registerResult.ReverbScheme
		}
		if registerResult.ReverbAppKey != "" {
			config.ReverbAppKey = registerResult.ReverbAppKey
		}
		// Write updated config back to bootstrap.json
		if err := writeConfig(bootstrapPath, config); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: failed to persist Reverb config: %v\n", err)
		}
	}

	fmt.Printf("Starting heartbeat loop (interval: %ds)...\n", heartbeatInterval)

	ticker := time.NewTicker(time.Duration(heartbeatInterval) * time.Second)
	defer ticker.Stop()
	//
	// Run once initially to register the first heartbeat and populate config / Reverb credentials
	sendHeartbeatStep(config, client, metrics, identityToken, &heartbeatInterval)

	// Start the WebSocket control channel goroutine
	go connectControlChannel(config, identityToken, &heartbeatInterval, stopChan)

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
		ConfigurationVersion: config.confVersion,
		Timestamp:            time.Now().Unix(),
		Hostname:             metrics.GetHostname(),
		Cpu:                  metrics.GetCPUUsage(),
		Memory:               metrics.GetMemoryUsage(),
		Disk:                 metrics.GetDiskUsage(),
		Uptime:               metrics.GetUptime(),
		Network:              metrics.GetNetworkStats(),
		TopProcesses:         metrics.GetTopProcesses(),
		OpenDbPorts:          metrics.GetOpenDatabasePorts(),
		AgentConfig: &AgentConfigReport{
			HeartbeatInterval: config.HeartbeatInterval,
			AgentVersion:      config.AgentVersion,
		},
	}

	if response, err := client.sendHeartbeat(config.ApiURL, identityToken, payload); err != nil {
		fmt.Fprintf(os.Stderr, "Heartbeat failed: %v\n", err)
	} else {
		hasChanges := false
		if response.HeartbeatInterval > 0 && config.HeartbeatInterval != response.HeartbeatInterval {
			*heartbeatInterval = response.HeartbeatInterval
			config.HeartbeatInterval = response.HeartbeatInterval
			hasChanges = true
		}
		if response.ServerUUID != "" && config.ServerUUID != response.ServerUUID {
			config.ServerUUID = response.ServerUUID
			hasChanges = true
		}
		if response.UpdateURL != "" && config.UpdateURL != response.UpdateURL {
			config.UpdateURL = response.UpdateURL
			hasChanges = true
		}
		if response.ReverbHost != "" && config.ReverbHost != response.ReverbHost {
			config.ReverbHost = response.ReverbHost
			hasChanges = true
		}
		if response.ReverbPort > 0 && config.ReverbPort != response.ReverbPort {
			config.ReverbPort = response.ReverbPort
			hasChanges = true
		}
		if response.ReverbScheme != "" && config.ReverbScheme != response.ReverbScheme {
			config.ReverbScheme = response.ReverbScheme
			hasChanges = true
		}
		if response.ReverbAppKey != "" && config.ReverbAppKey != response.ReverbAppKey {
			config.ReverbAppKey = response.ReverbAppKey
			hasChanges = true
		}
		
		if hasChanges {
			appDir := filepath.Dir(os.Args[0])
			if execPath, err := os.Executable(); err == nil {
				appDir = filepath.Dir(execPath)
			}
			bootstrapPath := filepath.Join(appDir, "bootstrap.json")
			if err := writeConfig(bootstrapPath, config); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to persist Reverb config: %v\n", err)
			}
		}

		if v, ok := response.Configuration["version"].(float64); ok {
			config.confVersion = int(v)
			fmt.Printf("Configuration updated to version %d\n", config.confVersion)
		}
		if response.PendingUpdate != nil {
			fmt.Printf("Received agent update notification to version %s\n", response.PendingUpdate.Version)

			// Notify backend that we are starting update
			updatingURL := strings.Replace(config.UpdateURL, "/update", "/updating", 1)
			client.postNotification(updatingURL, identityToken, map[string]string{"version": response.PendingUpdate.Version})

			if response.PendingUpdate.HeartbeatInterval > 0 {
				*heartbeatInterval = response.PendingUpdate.HeartbeatInterval
				config.HeartbeatInterval = response.PendingUpdate.HeartbeatInterval
			}

			config.AgentVersion = response.PendingUpdate.Version

			appDir := filepath.Dir(os.Args[0])
			if execPath, err := os.Executable(); err == nil {
				appDir = filepath.Dir(execPath)
			}
			bootstrapPath := filepath.Join(appDir, "bootstrap.json")
			if err := writeConfig(bootstrapPath, config); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to write updated config: %v\n", err)
			}

			if response.PendingUpdate.BinaryURL != "" {
				fmt.Printf("Updating agent binary from %s...\n", response.PendingUpdate.BinaryURL)
				if err := updateBinary(response.PendingUpdate.BinaryURL); err != nil {
					fmt.Fprintf(os.Stderr, "Binary update failed: %v\n", err)
				} else {
					fmt.Println("Binary updated successfully! Exiting to allow restart.")
					restartAgent()
					os.Exit(0)
				}//
			}
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
