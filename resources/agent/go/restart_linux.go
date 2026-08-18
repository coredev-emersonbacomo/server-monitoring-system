//go:build !windows

package main

import (
	"log"
	"os"
	"os/exec"
)

var IsService bool

func restartAgent() {
	exePath, err := os.Executable()
	if err != nil {
		log.Printf("Failed to get executable path: %v", err)
		return
	}

	// For Linux, spawn the new binary process directly, pinned to the same
	// instance. If running under systemd, the unit is configured to restart on
	// exit, so this process will die and systemd takes over.
	args := []string{}
	if currentInstance != "" {
		args = []string{"-instance", currentInstance}
	}
	cmd := exec.Command(exePath, args...)
	if err := cmd.Start(); err != nil {
		log.Printf("Failed to restart agent: %v", err)
	}
}