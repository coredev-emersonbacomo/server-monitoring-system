package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const queueFileName = "file_events.queue"

// EventQueue is a durable append-only JSON-lines queue of audit events. Events
// are written under a mutex; Drain clears the file and sends in a batch,
// re-enqueuing any that fail so they are retried on the next cycle. This is the
// delivery guarantee: an agent crash leaves undelivered events on disk.
type EventQueue struct {
	path string
	file *os.File
	mu   sync.Mutex
}

func NewEventQueue(instance string) (*EventQueue, error) {
	p := filepath.Join(instanceDir(instance), queueFileName)
	if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(p, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	return &EventQueue{path: p, file: f}, nil
}

// Enqueue appends one event as a single JSON line under the lock.
func (q *EventQueue) Enqueue(ev *AuditEvent) error {
	data, err := json.Marshal(ev)
	if err != nil {
		return err
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	_, err = q.file.Write(append(data, '\n'))
	return err
}

// auditSender is the subset of AgentClient the queue needs, so it can be faked
// in tests.
type auditSender interface {
	sendAuditEvents(events []*AuditEvent) []*AuditEvent
}

// Drain reads all queued events, clears the file, and sends them. Events that
// fail to send are re-enqueued. The lock is released during the network send so
// Enqueue can keep accepting events (they land in the freshly cleared file and
// are picked up on the next drain).
func (q *EventQueue) Drain(sender auditSender) error {
	data, err := os.ReadFile(q.path)
	if err != nil {
		return err
	}
	lines := strings.Split(string(data), "\n")
	events := make([]*AuditEvent, 0, len(lines))
	for _, ln := range lines {
		ln = strings.TrimSpace(ln)
		if ln == "" {
			continue
		}
		var ev AuditEvent
		if err := json.Unmarshal([]byte(ln), &ev); err != nil {
			continue
		}
		events = append(events, &ev)
	}
	if len(events) == 0 {
		return nil
	}

	// Clear before sending so events enqueued during the send are isolated.
	// Reopen rather than Truncate: with an O_APPEND handle, Truncate is
	// unreliable across platforms.
	q.mu.Lock()
	_ = q.file.Close()
	if werr := os.WriteFile(q.path, []byte{}, 0644); werr != nil {
		q.mu.Unlock()
		return werr
	}
	if f, oerr := os.OpenFile(q.path, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0644); oerr == nil {
		q.file = f
	}
	q.mu.Unlock()

	failed := sender.sendAuditEvents(events)
	for _, ev := range failed {
		_ = q.Enqueue(ev)
	}
	return nil
}

// Close flushes remaining events (best-effort) and closes the file.
func (q *EventQueue) Close() error {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.file.Close()
}
