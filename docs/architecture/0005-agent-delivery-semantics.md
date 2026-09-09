# ADR-0005: Agent Delivery Semantics (Bounded Heartbeat Retry, No Metric Backfill)

## Status

Accepted

## Context

The agent posts two classes of data: point-in-time state (heartbeats: metrics,
processes, ports) and irreplaceable history (audit events: file activity,
lifecycle). The heartbeat sender retried forever on failure, blocking the
loop on stale payloads while fresher ticks queued behind it. The question was
whether to add a durable queue for metric posts so backend outages don't leave
blank timelines.

## Decision

1. **Heartbeat sends are bounded by the tick cadence.** A stale payload is
   dropped; the next tick sends fresh data. Rationale: the backend timestamps
   on ingest, so an outage window can never be backfilled by retry — retry
   only plants one stale snapshot stamped as now while stalling command acks,
   revocations, and config updates.
2. **No metric backfill.** True backfill needs client timestamps (clock-skew
   and replay trust), TimescaleDB backfill windows, and a disk cap that
   reintroduces gaps anyway. Truthful outage gaps beat corrupt timelines.
3. **Audit events keep the durable disk queue** (fsynced JSON-lines, 500-event
   chunked drains, offset-tracked progress with 64 MB compaction, server-side
   uuid dedupe), because that data cannot be re-collected.
4. **Commands dedupe by id and ack on next success.** The backend resends
   un-acked commands; without dedupe a failed tick re-runs shell commands.

## Consequences

- Charts show blank gaps during backend outages (unavoidable — nothing can be
  stored while the backend is down).
- The audit queue has no size cap: a very long outage grows the file until
  the backend returns. Chunked drains bound memory per cycle but not disk.
- Crash between command execute and ack re-runs the command once (results are
  in-memory only).
