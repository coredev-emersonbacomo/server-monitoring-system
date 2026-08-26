//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

// advapi32 token APIs are resolved lazily so we avoid an extra dependency and
// stay consistent with the rest of the Windows code (see keystore_windows.go).
var (
	advapi32OpenProcessToken = syscall.NewLazyDLL("advapi32.dll").NewProc("OpenProcessToken")
	advapi32GetTokenInfo     = syscall.NewLazyDLL("advapi32.dll").NewProc("GetTokenInformation")
)

// isAdminProcess reports whether the current process holds an elevated
// (administrator) token. This decides whether a runAs shell command must pop a
// UAC prompt or can run directly.
func isAdminProcess() bool {
	const (
		tokenQuery     = 0x0008 // TOKEN_QUERY
		tokenElevation = 20     // TokenElevation
	)

	hProc, err := syscall.GetCurrentProcess()
	if err != nil {
		return false
	}
	var hToken syscall.Handle
	r, _, _ := advapi32OpenProcessToken.Call(
		uintptr(hProc),
		uintptr(tokenQuery),
		uintptr(unsafe.Pointer(&hToken)),
	)
	if r == 0 {
		return false
	}
	defer syscall.CloseHandle(hToken)

	var elevation uint32
	var retLen uint32
	r, _, _ = advapi32GetTokenInfo.Call(
		uintptr(hToken),
		uintptr(tokenElevation),
		uintptr(unsafe.Pointer(&elevation)),
		uintptr(unsafe.Sizeof(elevation)),
		uintptr(unsafe.Pointer(&retLen)),
	)
	if r == 0 {
		return false
	}
	return elevation != 0
}

// runShellCommand executes a shell command. When runAs is requested but the
// current process is not elevated, the command is launched through a UAC
// elevation prompt (ShellExecute "runas"); when already elevated — e.g. the
// installed service, which runs as LocalSystem — it runs directly with no
// popup.
func runShellCommand(cmdStr string, runAs bool) ([]byte, error) {
	if runAs && !isAdminProcess() {
		return runElevated(cmdStr)
	}
	return exec.Command("cmd", "/c", cmdStr).CombinedOutput()
}

// runElevated launches cmdStr in an elevated (administrator) context via the
// UAC "runas" verb and captures its output. A UAC-elevated child cannot share
// stdout with this (non-elevated) process, so the command is written to a temp
// script whose output is redirected to a temp file, then read back once the
// elevated process exits.
func runElevated(cmdStr string) ([]byte, error) {
	dir, err := os.MkdirTemp("", "monitor-agent-elevated")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	batPath := filepath.Join(dir, "elevated.cmd")
	outPath := filepath.Join(dir, "out.txt")

	bat := fmt.Sprintf("@echo off\r\n%s > \"%s\" 2>&1\r\n", cmdStr, outPath)
	if err := os.WriteFile(batPath, []byte(bat), 0644); err != nil {
		return nil, err
	}

	// Single-quote the path for PowerShell; double any embedded quotes.
	psArg := fmt.Sprintf(
		"Start-Process -FilePath '%s' -Verb RunAs -Wait",
		strings.ReplaceAll(batPath, "'", "''"),
	)
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psArg).CombinedOutput(); err != nil {
		return out, fmt.Errorf("elevation failed: %w", err)
	}

	return os.ReadFile(outPath)
}
