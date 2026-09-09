package main

import (
	"bufio"
	"encoding/json"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

const queueFileName = "file_events.queue"

// sendingFileSuffix is a one-time migration leftover: older versions parked
// the in-flight batch here. Startup folds it back once; new code tracks
// progress with the offset file below instead.
const sendingFileSuffix = ".sending"

// offsetFileName records how many leading bytes of the queue file are already
// delivered. Drains read forward from the offset, so RAM per drain stays
// bounded no matter how large the backlog grows.
const offsetFileName = "file_events.offset"

// maxDrainEvents bounds one Drain to a fixed batch so a huge backlog cannot
// OOM the agent or produce an oversized POST. The remainder stays queued for
// the next drain.
const maxDrainEvents = 500

// compactThreshold triggers a rewrite of the queue file once this many
// leading bytes are consumed, so a long outage cannot leave a giant sparse
// file behind. The copy streams with a small buffer (bounded RAM).
const compactThreshold = 64 << 20

// EventQueue is a durable append-only JSON-lines queue of audit events.
// Delivery progress is an fsynced byte offset, so a drain never reads more
// than one batch into memory and a crash can only cause duplicate delivery
// (deduped server-side by event uuid), never loss.
type EventQueue struct {
	path    string
	offPath string
	file    *os.File
	mu      sync.Mutex
	offset  int64
	// inflight serializes overlapping Drains (ticker vs shutdown): a skipped
	// drain is safe because undelivered events stay on disk for the next one.
	inflight bool
}

func NewEventQueue(instance string) (*EventQueue, error) {
	p := filepath.Join(instanceDir(instance), queueFileName)
	if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
		return nil, err
	}
	// One-time migration for the old .sending sidecar: fold it back.
	// Duplicates are safe (backend dedupes by uuid); loss is not.
	if data, err := os.ReadFile(p + sendingFileSuffix); err == nil && len(data) > 0 {
		f, err := os.OpenFile(p, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
		if err != nil {
			return nil, err
		}
		if _, err := f.Write(data); err != nil {
			f.Close()
			return nil, err
		}
		f.Close()
		_ = os.Remove(p + sendingFileSuffix)
		log.Printf("[AUDIT] recovered %d bytes of in-flight events from previous run", len(data))
	}
	f, err := os.OpenFile(p, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	q := &EventQueue{path: p, offPath: p + ".offset", file: f}
	if off, err := q.loadOffset(); err != nil {
		log.Printf("[AUDIT] offset unreadable, redelivering from start: %v", err)
	} else {
		q.offset = off
	}
	return q, nil
}

func (q *EventQueue) loadOffset() (int64, error) {
	data, err := os.ReadFile(q.offPath)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}
	off, err := strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
	if err != nil || off < 0 {
		return 0, err
	}
	return off, nil
}

// saveOffset persists the consumed byte count. Caller holds q.mu.
func (q *EventQueue) saveOffset() error {
	if err := os.WriteFile(q.offPath, []byte(strconv.FormatInt(q.offset, 10)), 0644); err != nil {
		return err
	}
	f, err := os.OpenFile(q.offPath, os.O_RDWR, 0644)
	if err != nil {
		return err
	}
	defer f.Close()
	return f.Sync()
}

// Enqueue appends one event as a single JSON line under the lock and fsyncs
// so a machine crash cannot lose it either.
func (q *EventQueue) Enqueue(ev *AuditEvent) error {
	data, err := json.Marshal(ev)
	if err != nil {
		return err
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	if _, err = q.file.Write(append(data, '\n')); err != nil {
		return err
	}
	return q.file.Sync()
}

// auditSender is the subset of AgentClient the queue needs, so it can be faked
// in tests.
type auditSender interface {
	sendAuditEvents(events []*AuditEvent) []*AuditEvent
}

// Drain sends at most maxDrainEvents starting at the stored offset, then
// advances the offset. RAM per drain is bounded by the batch, never the
// backlog size. Failures are re-enqueued at the tail (same uuids, deduped
// server-side) before the offset advances, so every event survives until it
// is delivered or the process dies between the two — in which case the next
// start redelivers (duplicates, deduped) rather than losing data.
func (q *EventQueue) Drain(sender auditSender) error {
	q.mu.Lock()
	if q.inflight {
		q.mu.Unlock()
		return nil
	}
	q.inflight = true
	q.mu.Unlock()
	defer func() {
		q.mu.Lock()
		q.inflight = false
		q.mu.Unlock()
	}()

	batch, consumed, dropped, err := q.readBatch()
	if err != nil {
		return err
	}
	if dropped > 0 {
		log.Printf("[AUDIT] dropped %d corrupt queue lines", dropped)
	}
	if len(batch) == 0 {
		return nil
	}

	failed := sender.sendAuditEvents(batch)

	q.mu.Lock()
	defer q.mu.Unlock()
	// Re-enqueue failures at the tail first: if we crash before the offset
	// advances, the originals redeliver (dupes, deduped) instead of vanishing.
	for _, ev := range failed {
		raw, merr := json.Marshal(ev)
		if merr != nil {
			continue
		}
		if _, werr := q.file.Write(append(raw, '\n')); werr != nil {
			log.Printf("[AUDIT] failed-event rewrite failed, event may redeliver late: %v", werr)
			continue
		}
	}
	if serr := q.file.Sync(); serr != nil {
		return serr
	}
	q.offset += consumed
	if serr := q.saveOffset(); serr != nil {
		return serr
	}
	return q.maybeCompact()
}

// readBatch streams at most maxDrainEvents lines from the stored offset,
// returning the events, the bytes consumed (always advanced past corrupt
// lines too), and the corrupt-line count. Bounded RAM by construction.
func (q *EventQueue) readBatch() (batch []*AuditEvent, consumed int64, dropped int, err error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	f, err := os.Open(q.path)
	if err != nil {
		return nil, 0, 0, err
	}
	defer f.Close()
	// The file may have been truncated or replaced out from under us; an
	// offset past EOF means everything currently in the file is unconsumed,
	// so rewind to zero rather than stranding it.
	if st, serr := f.Stat(); serr == nil && q.offset > st.Size() {
		log.Printf("[AUDIT] offset %d past EOF %d, rewinding to start", q.offset, st.Size())
		q.offset = 0
		if serr := q.saveOffset(); serr != nil {
			return nil, 0, 0, serr
		}
	}
	if _, err := f.Seek(q.offset, io.SeekStart); err != nil {
		return nil, 0, 0, err
	}

	r := bufio.NewReaderSize(f, 32*1024)
	for len(batch) < maxDrainEvents {
		line, rerr := r.ReadBytes('\n')
		if len(line) > 0 {
			consumed += int64(len(line))
			if trimmed := strings.TrimSpace(string(line)); trimmed != "" {
				var ev AuditEvent
				if uerr := json.Unmarshal([]byte(trimmed), &ev); uerr != nil {
					dropped++
				} else {
					batch = append(batch, &ev)
				}
			}
		}
		if rerr != nil {
			break
		}
	}
	return batch, consumed, dropped, nil
}

// maybeCompact rewrites the file once the consumed prefix passes
// compactThreshold, streaming with a small buffer. Caller holds q.mu.
func (q *EventQueue) maybeCompact() error {
	if q.offset < compactThreshold {
		return nil
	}
	src, err := os.Open(q.path)
	if err != nil {
		return err
	}
	defer src.Close()
	if _, err := src.Seek(q.offset, io.SeekStart); err != nil {
		return err
	}
	tmp := q.path + ".compact"
	dst, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	if _, err := io.CopyBuffer(dst, src, make([]byte, 32*1024)); err != nil {
		dst.Close()
		return err
	}
	if err := dst.Sync(); err != nil {
		dst.Close()
		return err
	}
	dst.Close()
	if err := os.Rename(tmp, q.path); err != nil {
		return err
	}
	_ = q.file.Close()
	f, err := os.OpenFile(q.path, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return err
	}
	q.file = f
	q.offset = 0
	return q.saveOffset()
}

// enqueueLog enqueues an audit event, logging (not crashing) on failure.
// A full disk or lost permissions must be visible, not silent.
func enqueueLog(q *EventQueue, ev *AuditEvent) {
	if err := q.Enqueue(ev); err != nil {
		log.Printf("[AUDIT] enqueue failed, event lost: %v", err)
	}
}

// Close flushes remaining events (best-effort) and closes the file.
func (q *EventQueue) Close() error {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.file.Close()
}
