//go:build !windows

package main

import (
	"errors"
)

func runService(name string) error {
	return errors.New("service mode is only supported on Windows")
}

func isServiceSession() (bool, error) {
	return false, nil
}

func installService(name, desc string) error {
	return errors.New("service installation is only supported on Windows")
}

func uninstallService(name string) error {
	return errors.New("service uninstallation is only supported on Windows")
}
