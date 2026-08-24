import { useState } from "react";
import { Link } from "react-router-dom";
import { Section, SubSection, CodeBlock, InlineCode, Callout } from "./Section";
import { cn } from "@/lib/utils";

type Action = "restart" | "reboot" | "update" | "uninstall";

type ItemStatus = "survives" | "lost" | "removed" | "na";

interface StorageItem {
    label: string;
    detail: string;
    [key: string]: string;
}

const STORAGE_TIERS: {
    title: string;
    note: string;
    items: StorageItem[];
}[] = [
    {
        title: "Persistent Disk",
        note: "Bootstrap config + logs",
        items: [
            {
                label: "config.json",
                detail: "server_url, agent_version, installation_id (provision_token stripped)",
                restart: "survives",
                reboot: "survives",
                update: "survives",
                uninstall: "removed",
            },
            {
                label: "agent.log / crash.log",
                detail: "Runtime log and panic stack in the instance directory",
                restart: "survives",
                reboot: "survives",
                update: "survives",
                uninstall: "removed",
            },
            {
                label: "startup.log",
                detail: "Early-startup one-liners at the data root",
                restart: "survives",
                reboot: "survives",
                update: "survives",
                uninstall: "removed",
            },
        ],
    },
    {
        title: "OS Keystore",
        note: "Private identity key",
        items: [
            {
                label: "MonitorAgentIdentity-<uuid>",
                detail: "RSA-2048 private key (CNG / identity-<uuid>.pem)",
                restart: "survives",
                reboot: "survives",
                update: "survives",
                uninstall: "removed",
            },
        ],
    },
    {
        title: "Process Memory",
        note: "Session + runtime filters",
        items: [
            {
                label: "Session JWT",
                detail: "Short-lived auth token (900s) — never written to disk",
                restart: "lost",
                reboot: "lost",
                update: "lost",
                uninstall: "na",
            },
            {
                label: "Server filters",
                detail: "Port/process filters from the last auth response",
                restart: "lost",
                reboot: "lost",
                update: "lost",
                uninstall: "na",
            },
            {
                label: "WebSocket state",
                detail: "Control-channel connection + Reverb credentials",
                restart: "lost",
                reboot: "lost",
                update: "lost",
                uninstall: "na",
            },
        ],
    },
];

const ACTION_LABELS: Record<Action, string> = {
    restart: "Restart service",
    reboot: "Reboot machine",
    update: "Binary update",
    uninstall: "Uninstall",
};

const BADGE_STYLE: Record<ItemStatus, string> = {
    survives: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    lost: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    removed: "bg-destructive/10 text-destructive border-destructive/30",
    na: "bg-muted/40 text-muted-foreground border-border/40",
};

const BADGE_LABEL: Record<ItemStatus, string> = {
    survives: "Survives",
    lost: "Lost → re-auth",
    removed: "Removed",
    na: "n/a",
};

function StorageDemo() {
    const [action, setAction] = useState<Action>("restart");

    return (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-medium text-muted-foreground mr-1">
                    Simulate:
                </span>
                {(Object.keys(ACTION_LABELS) as Action[]).map((a) => (
                    <button
                        key={a}
                        type="button"
                        onClick={() => setAction(a)}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                            action === a
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border/60 hover:bg-muted",
                        )}
                    >
                        {ACTION_LABELS[a]}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STORAGE_TIERS.map((tier) => (
                    <div
                        key={tier.title}
                        className="rounded-lg border border-border/50 bg-card p-3"
                    >
                        <p className="text-xs font-semibold text-foreground">
                            {tier.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mb-2">
                            {tier.note}
                        </p>
                        <div className="space-y-2">
                            {tier.items.map((item) => {
                                const status = item[action] as ItemStatus;
                                return (
                                    <div
                                        key={item.label}
                                        className="rounded-md border border-border/40 bg-background p-2"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-mono text-foreground break-all">
                                                {item.label}
                                            </span>
                                            <span
                                                className={cn(
                                                    "shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                                                    BADGE_STYLE[status],
                                                )}
                                            >
                                                {BADGE_LABEL[status]}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                                            {item.detail}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
                Disk state and the identity key persist across restarts, reboots,
                and updates. Anything lost from memory is re-established on the
                next start via challenge-response authentication. Only an
                uninstall removes disk state and deletes the key.
            </p>
        </div>
    );
}

export function DocsAgentStorageContent() {
    return (
        <>
            <Section title="Three storage tiers">
                <p>
                    The agent deliberately splits what it remembers across three
                    places, so that a restarted process can re-prove its
                    identity without any secret ever being persisted:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Persistent disk</strong> — the bootstrap{" "}
                        <InlineCode>config.json</InlineCode> (non-secret) and
                        logs, in the instance directory.
                    </li>
                    <li>
                        <strong>OS keystore</strong> — the private identity key,
                        protected by the platform.
                    </li>
                    <li>
                        <strong>Process memory</strong> — the short-lived session
                        token and per-server runtime filters, never written to
                        disk.
                    </li>
                </ul>
                <p>
                    The backend is the <strong>source of truth</strong> for
                    server configuration; the agent's copy in memory is only a
                    cache that is re-fetched on every authentication and pushed
                    to over the WebSocket when it changes.
                </p>
                <StorageDemo />
            </Section>

            <Section title="On-disk layout">
                <p>
                    The data root is shared by every installation on the machine;{" "}
                    <InlineCode>instances/&lt;uuid&gt;/</InlineCode> isolates one
                    installation's config and logs. The binary lives separately
                    in the program directory and is read-only at runtime.
                </p>
                <CodeBlock>{`# Windows
C:\\Program Files\\MonitorAgent\\<uuid>\\MonitorAgent.exe    # binary (read-only)
C:\\ProgramData\\MonitorAgent\\
  startup.log                                        # early-startup log
  instances\\<uuid>\\
    config.json                                      # bootstrap config
    agent.log                                        # runtime log
    crash.log                                        # last-gasp panic stack
    uninstall.flag                                   # uninstall marker

# Linux
/opt/monitor-agent/<uuid>/monitor-agent               # binary (read-only)
/var/lib/monitor-agent/
  startup.log                                        # early-startup log
  identity-<uuid>.pem                                # private key (0600)
  instances\\<uuid>\\
    config.json                                      # bootstrap config
    agent.log                                        # runtime log
    crash.log                                        # last-gasp panic stack
    uninstall.flag                                   # uninstall marker`}</CodeBlock>
                <Callout type="warning">
                    Diagnose the agent in the data-root instance directory ({" "}
                    <InlineCode>ProgramData</InlineCode> /{" "}
                    <InlineCode>/var/lib/monitor-agent</InlineCode>),{" "}
                    <strong>not</strong> the Program Files / /opt folder where
                    the binary lives. A missing <InlineCode>config.json</InlineCode>{" "}
                    there means the installer never ran; the agent self-creates a
                    minimal default and logs clearly instead of exiting silently.
                </Callout>
            </Section>

            <Section title="config.json">
                <p>
                    Bootstrap config written by the installer, then maintained by
                    the agent:
                </p>
                <CodeBlock>{`{
  "server_url": "https://...",
  "agent_version": "2.1",
  "installation_id": "<uuid>",
  "provision_token": "..."   // stripped after registration
}`}</CodeBlock>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        The agent fills <InlineCode>installation_id</InlineCode>{" "}
                        if empty and strips{" "}
                        <InlineCode>provision_token</InlineCode> after a
                        successful registration, so the persistent config never
                        holds a secret.
                    </li>
                    <li>
                        If the file is missing entirely, the agent
                        self-bootstraps{" "}
                        <InlineCode>{"{ installation_id }"}</InlineCode> and logs
                        that the installer still needs to supply{" "}
                        <InlineCode>server_url</InlineCode>. There is no legacy
                        fallback — every installation writes its own config at
                        install time.
                    </li>
                    <li>
                        Identity keys are never stored here — they live in the OS
                        keystore (see{" "}
                        <Link
                            to="/docs/agent-identity"
                            className="text-primary hover:underline"
                        >
                            Agent Identity
                        </Link>
                        ).
                    </li>
                </ul>
            </Section>

            <Section title="Logs">
                <SubSection title="agent.log">
                    <p>
                        The agent's runtime log in the instance directory. Stdout,
                        stderr, and the Go <InlineCode>log</InlineCode> package
                        output are all redirected here as soon as the instance
                        directory exists.
                    </p>
                </SubSection>
                <SubSection title="startup.log">
                    <p>
                        One-line early-startup log at the data root, written
                        before <InlineCode>agent.log</InlineCode> is wired up. It
                        records "loadConfig failed", "bootstrapDefaultConfig
                        failed", "agent.log open failed", and "runService error"
                        — the first place to look when an agent produces nothing.
                    </p>
                </SubSection>
                <SubSection title="crash.log & uninstall.flag">
                    <p>
                        <InlineCode>crash.log</InlineCode> is a last-gasp panic
                        stack written by the global recovery in{" "}
                        <InlineCode>main()</InlineCode> — it lives in the
                        instance directory when the instance is known, else at
                        the data root. <InlineCode>uninstall.flag</InlineCode>{" "}
                        drives the marker-based uninstall (see{" "}
                        <Link
                            to="/docs/agent-setup"
                            className="text-primary hover:underline"
                        >
                            Agent Installation &amp; Lifecycle
                        </Link>
                        ).
                    </p>
                </SubSection>
            </Section>

            <Section title="What survives what">
                <p>
                    The identity key and disk state are durable; the session and
                    filters are ephemeral by design. Because authentication is
                    challenge-response (no stored token), losing memory costs
                    nothing — the agent re-authenticates on the next start. Only
                    uninstall removes the key and disk state, which is why
                    deleting the agent from the backend requires the marker flow
                    to run under the service account.
                </p>
            </Section>
        </>
    );
}