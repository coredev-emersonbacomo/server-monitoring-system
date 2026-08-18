//go:build windows

package main

import (
	"fmt"
	"os"
	"time"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

type monitorService struct{}

func (m *monitorService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (ssec bool, errno uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown
	changes <- svc.Status{State: svc.StartPending}

	// The SCM's ServiceMain argv is just [serviceName] — the "-instance <uuid>"
	// stored in the ImagePath shows up in the process command line (os.Args),
	// not in the `args` parameter passed to Execute.
	instance := parseInstance(os.Args)
	if instance == "" {
		writeStartupLog("Execute: no instance in command line, stopping")
		changes <- svc.Status{State: svc.Stopped}
		return false, 1
	}

	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}

	stopChan := make(chan struct{})
	done := make(chan struct{})
	go func() {
		defer close(done)
		runAgentLoop(instance, stopChan)
	}()

	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				changes <- svc.Status{State: svc.StopPending}
				close(stopChan)
				// runAgentLoop may be mid-uninstall-marker handling (HTTP
				// revoke + key deletion); wait for it before going Stopped so
				// the uninstaller never races the cleanup.
				<-done
				changes <- svc.Status{State: svc.Stopped}
				return
			default:
				// ignored
			}
		case <-done:
			// The agent loop ended on its own (uninstall marker, config error,
			// auth failure). End the service cleanly so the uninstaller's
			// stop-and-wait returns.
			changes <- svc.Status{State: svc.Stopped}
			return
		}
	}
}

func runService(name string) error {
	return svc.Run(name, &monitorService{})
}

func isServiceSession() (bool, error) {
	interactive, err := svc.IsAnInteractiveSession()
	if err != nil {
		return false, err
	}
	return !interactive, nil
}

func installService(name, instance string) error {
	exepath, err := os.Executable()
	if err != nil {
		return err
	}
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()
	s, err := m.OpenService(name)
	if err == nil {
		_, _ = s.Control(svc.Stop)
		_ = s.Delete()
		s.Close()
		time.Sleep(1 * time.Second)
	}
	// The "-instance <uuid>" arg pins this service to exactly one installation.
	s, err = m.CreateService(name, exepath, mgr.Config{
		DisplayName: name,
		StartType:   mgr.StartAutomatic,
	}, "-instance", instance)
	if err != nil {
		return err
	}
	defer s.Close()
	err = s.Start()
	if err != nil {
		return err
	}
	return nil
}

// stopServiceAndWait stops the service and blocks until it is stopped or the
// timeout expires. The uninstaller needs this so the running service gets a
// chance to process the uninstall marker (revoke the agent, delete its own
// identity key) before the service is torn down.
func stopServiceAndWait(name string, timeout time.Duration) error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()
	s, err := m.OpenService(name)
	if err != nil {
		return fmt.Errorf("service %s is not installed", name)
	}
	defer s.Close()
	_, _ = s.Control(svc.Stop)
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		status, err := s.Query()
		if err == nil && status.State == svc.Stopped {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("timed out waiting for service %s to stop", name)
}

func deleteService(name string) error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()
	s, err := m.OpenService(name)
	if err != nil {
		return fmt.Errorf("service %s is not installed", name)
	}
	defer s.Close()
	return s.Delete()
}