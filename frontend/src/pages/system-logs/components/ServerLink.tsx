import { Link } from "react-router-dom";
import type { AgentServerRef } from "../hooks/useAuditLogs";

const linkClass =
    "rounded px-1 -mx-1 text-foreground hover:bg-muted/70 hover:text-primary underline-offset-2 hover:underline transition-colors";

// Renders the owning server(s) for a log row as links to their detail pages.
// A server-scoped event shows its single server; an agent-scoped event shows
// the agent's monitored servers stacked vertically. Highlights on hover.
export function ServerLink({
    serverUuid,
    serverName,
    agentServers,
}: {
    serverUuid?: string | null;
    serverName?: string | null;
    agentServers?: AgentServerRef[] | null;
}) {
    if (serverUuid) {
        const label = serverName || serverUuid;
        return (
            <Link
                to={`/servers/${serverUuid}`}
                className={linkClass}
                title={serverName ? `${serverName} (${serverUuid})` : serverUuid}
            >
                {label}
            </Link>
        );
    }

    const servers = agentServers && agentServers.length > 0 ? agentServers : null;
    if (!servers) {
        return <span className="text-muted-foreground">—</span>;
    }

    if (servers.length === 1) {
        const s = servers[0];
        return (
            <Link
                to={`/servers/${s.uuid}`}
                className={linkClass}
                title={s.name ? `${s.name} (${s.uuid})` : s.uuid}
            >
                {s.name || s.uuid}
            </Link>
        );
    }

    return (
        <div className="flex flex-col gap-0.5">
            {servers.map((s) => (
                <Link
                    key={s.uuid}
                    to={`/servers/${s.uuid}`}
                    className={linkClass}
                    title={s.name ? `${s.name} (${s.uuid})` : s.uuid}
                >
                    {s.name || s.uuid}
                </Link>
            ))}
        </div>
    );
}

