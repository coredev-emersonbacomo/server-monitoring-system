//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

var IsService bool

func restartAgent() {
	exePath, err := os.Executable()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get executable path: %v\n", err)
		return
	}

	var cmd *exec.Cmd
	if IsService {
		// Spawns a detached cmd that waits 2 seconds (via ping) and starts the service
		cmd = exec.Command("cmd", "/c", "ping 127.0.0.1 -n 3 > nul && net start MonitorAgent")
	} else {
		// Spawns a detached process of the new binary directly
		cmd = exec.Command(exePath)
	}

	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
	}

	if err := cmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to restart agent: %v\n", err)
	}
}
