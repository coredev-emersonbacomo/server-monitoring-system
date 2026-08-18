//go:build windows

package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"syscall"
)

var IsService bool

func restartAgent() {
	exePath, err := os.Executable()
	if err != nil {
		log.Printf("Failed to get executable path: %v", err)
		return
	}

	var cmd *exec.Cmd
	if IsService {
		// Spawns a detached cmd that waits 2 seconds (via ping) and starts the
		// same per-installation service the old process was running under.
		cmd = exec.Command("cmd", "/c", fmt.Sprintf("ping 127.0.0.1 -n 3 > nul && net start %s", serviceNameFor(currentInstance)))
	} else {
		// Spawns a detached process of the new binary, pinned to the same instance.
		args := []string{}
		if currentInstance != "" {
			args = []string{"-instance", currentInstance}
		}
		cmd = exec.Command(exePath, args...)
	}

	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
	}

	if err := cmd.Start(); err != nil {
		log.Printf("Failed to restart agent: %v", err)
	}
}