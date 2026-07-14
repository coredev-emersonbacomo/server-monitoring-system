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

	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}

	stopChan := make(chan struct{})

	go runAgentLoop(stopChan)

	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				changes <- svc.Status{State: svc.StopPending}
				close(stopChan)
				changes <- svc.Status{State: svc.Stopped}
				return
			default:
				// ignored
			}
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

func installService(name, desc string) error {
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
	s, err = m.CreateService(name, exepath, mgr.Config{
		DisplayName: desc,
		StartType:   mgr.StartAutomatic,
	})
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

func uninstallService(name string) error {
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
	_, err = s.Control(svc.Stop)
	if err != nil {
		// Ignore error if service is already stopped
	}
	err = s.Delete()
	if err != nil {
		return err
	}
	return nil
}
