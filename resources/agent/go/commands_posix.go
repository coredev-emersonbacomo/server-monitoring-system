//go:build !windows

package main

import (
	"os"
	"os/exec"
)

// isAdminProcess reports whether the current process runs with root
// privileges. On POSIX the agent normally runs as root; that counts as
// "administrator" for runAs purposes.
func isAdminProcess() bool {
	return os.Geteuid() == 0
}

// runShellCommand executes a shell command. When runAs is requested but the
// current process is not root, the command is prefixed with sudo so the OS
// prompts for elevation; when already root it runs directly.
func runShellCommand(cmdStr string, runAs bool) ([]byte, error) {
	if runAs && !isAdminProcess() {
		return exec.Command("sudo", "sh", "-c", cmdStr).CombinedOutput()
	}
	return exec.Command("sh", "-c", cmdStr).CombinedOutput()
}
