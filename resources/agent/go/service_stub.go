//go:build !windows

package main

import (
	"errors"
	"time"
)

func runService(name string) error {
	return errors.New("service mode is only supported on Windows")
}

func isServiceSession() (bool, error) {
	return false, nil
}

func installService(name, instance string) error {
	return errors.New("service installation is only supported on Windows")
}

func stopServiceAndWait(name string, timeout time.Duration) error {
	return errors.New("service management is only supported on Windows")
}

func deleteService(name string) error {
	return errors.New("service management is only supported on Windows")
}