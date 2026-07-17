//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
)

var IsService bool

func restartAgent() {
	exePath, err := os.Executable()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get executable path: %v\n", err)
		return
	}

	// For Linux, spawn the new binary process directly.
	// If running under systemd/service, systemd is usually configured to restart on exit.
	cmd := exec.Command(exePath)
	if err := cmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to restart agent: %v\n", err)
	}
}
