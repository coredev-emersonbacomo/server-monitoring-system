import { Link } from "react-router-dom";
import { Section, SubSection, CodeBlock, InlineCode } from "./Section";

export function DocsAgentArchitectureContent() {
    return (
        <>
            <Section title="What the agent is">
                <p>
                    The agent is a small Go daemon (source in{" "}
                    <InlineCode>resources/agent/go</InlineCode>) installed on
                    each monitored machine. It collects system metrics, sends
                    heartbeats, maintains a WebSocket control channel, executes
                    backend-issued commands, and can self-update its binary.
                </p>
                <p>
                    Everything about an installation is scoped to an{" "}
                    <strong>installation UUID</strong>: the instance directory
                    and the identity key name derive from it. The OS service is{" "}
                    <strong>stable and single per host</strong>{" "}
                    <InlineCode>MonitorAgent</InlineCode> /{" "}
                    <InlineCode>monitor-agent.service</InlineCode> - it is not
                    per-UUID. One agent installation monitors{" "}
                    <strong>multiple servers</strong> on that host; additional
                    servers are attached by re-running the installer with a new
                    <InlineCode>ProvisionToken</InlineCode> for the same
                    installation.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Binary</strong> - immutable, installed by the
                        installer and only replaced by self-update.
                    </li>
                    <li>
                        <strong>State</strong> - config, logs, and the uninstall
                        marker in a per-installation directory under the data
                        root.
                    </li>
                    <li>
                        <strong>Identity</strong> - an RSA keypair held in the
                        OS keystore, used for challenge-response authentication.
                    </li>
                    <li>
                        <strong>Runtime</strong> - the short-lived session and
                        per-server filters, kept in memory only.
                    </li>
                </ul>
                <p>
                    Each of these areas has its own reference page:{" "}
                    <Link
                        to="/docs/agent-identity"
                        className="text-primary hover:underline"
                    >
                        Agent Identity
                    </Link>
                    ,{" "}
                    <Link
                        to="/docs/agent-storage"
                        className="text-primary hover:underline"
                    >
                        Agent Storage
                    </Link>
                    ,{" "}
                    <Link
                        to="/docs/agent-monitoring"
                        className="text-primary hover:underline"
                    >
                        Agent Monitoring
                    </Link>
                    , and{" "}
                    <Link
                        to="/docs/agent-security"
                        className="text-primary hover:underline"
                    >
                        Agent Security
                    </Link>
                    .
                </p>
            </Section>

            <Section title="Startup sequence">
                <p>
                    The agent's entry point is{" "}
                    <InlineCode>main.go</InlineCode>. It resolves the instance
                    UUID from the <InlineCode>-instance &lt;uuid&gt;</InlineCode>{" "}
                    argument or the <InlineCode>MONITOR_AGENT_INSTANCE</InlineCode>{" "}
                    environment variable, then runs a single loop:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <strong>Create the instance directory</strong> under the
                        data root ({" "}
                        <InlineCode>
                            C:\ProgramData\MonitorAgent\instances\&lt;uuid&gt;
                        </InlineCode>{" "}
                        /{" "}
                        <InlineCode>/var/lib/monitor-agent/instances/&lt;uuid&gt;</InlineCode>
                        ).
                    </li>
                    <li>
                        <strong>Redirect logging</strong> - stdout, stderr, and
                        the Go <InlineCode>log</InlineCode> package all write to{" "}
                        <InlineCode>agent.log</InlineCode> in the instance
                        directory.
                    </li>
                    <li>
                        <strong>Load config</strong> - read{" "}
                        <InlineCode>config.json</InlineCode>. If missing, a
                        minimal default is bootstrapped and the agent logs
                        clearly that the installer must supply{" "}
                        <InlineCode>server_url</InlineCode>.
                    </li>
                    <li>
                        <strong>Obtain the identity key</strong> -{" "}
                        <InlineCode>GetOrCreateKey</InlineCode> creates the RSA
                        keypair in the OS keystore on first run.
                    </li>
                    <li>
                        <strong>Handle pending uninstall / detach</strong> - if{" "}
                        <InlineCode>uninstall.flag</InlineCode> is present the
                        agent revokes itself, deletes its key and exits; if{" "}
                        <InlineCode>detach.flag</InlineCode> (containing a{" "}
                        <InlineCode>server_uuid</InlineCode>) is present it{" "}
                        <InlineCode>POST /api/v1/agent/servers/&#123;uuid&#125;/uninstall</InlineCode>{" "}
                        for that server (keeps the service for remaining servers).
                    </li>
                    <li>
                        <strong>Register</strong> - if a{" "}
                        <InlineCode>provision_token</InlineCode> is still in the
                        config, the agent registers its public key, then strips
                        the token from disk.
                    </li>
                    <li>
                        <strong>Authenticate</strong> - challenge-response
                        issues a short-lived session token (see Agent Security).
                    </li>
                    <li>
                        <strong>Build the runtime</strong> - the auth response
                        carries the list of owned servers and their per-server
                        filters (<InlineCode>port_filter</InlineCode>,{" "}
                        <InlineCode>process_filter</InlineCode>,{" "}
                        <InlineCode>network_filter</InlineCode>); these are held
                        in <InlineCode>runtime.go</InlineCode> in memory.
                    </li>
                    <li>
                        <strong>Run the heartbeat loop</strong> - one{" "}
                        <strong>aggregated</strong> heartbeat per tick (≈{" "}
                        <InlineCode>5s</InlineCode>) covering every owned server:
                        CPU, memory, disk, uptime and{" "}
                        <InlineCode>agent_config</InlineCode> travel once, and
                        each server contributes its own filtered partition; live
                        data is deduped via top-level{" "}
                        <InlineCode>processes_dict</InlineCode>/
                        <InlineCode>ports_dict</InlineCode>/
                        <InlineCode>networks_dict</InlineCode> plus per-server
                        key lists.
                    </li>
                </ol>
            </Section>

            <Section title="Command-line interface">
                <p>
                    The agent binary accepts several commands. The service
                    always runs with{" "}
                    <InlineCode>-instance &lt;uuid&gt;</InlineCode>; the other
                    flags are used by the installers and by operators:
                </p>
                <CodeBlock>{`monitor-agent -install -instance <uuid>     # register the single stable OS service
monitor-agent -uninstall -instance <uuid>   # host-whole uninstall (marker-based)
monitor-agent -detach -instance <uuid> -server <server-uuid>  # per-server detach (marker-based)
monitor-agent -has-key -key <keyName>       # exit 0 if the keystore key exists
monitor-agent -selftest                     # key-store round-trip self-test`}</CodeBlock>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>-has-key</InlineCode> is used by the
                        installer to detect UUID/keystore collisions before
                        creating a new installation.
                    </li>
                    <li>
                        <InlineCode>-selftest</InlineCode> exercises the
                        platform keystore: create/get the key, sign a random
                        challenge, and verify the signature. It is the runnable
                        check for the OS keystore integration.
                    </li>
                    <li>
                        The service is single and stable:{" "}
                        <InlineCode>MonitorAgent</InlineCode> on Windows,{" "}
                        <InlineCode>monitor-agent.service</InlineCode> on Linux
                        - the installation UUID is an argument, not part of the
                        service name.
                    </li>
                </ul>
            </Section>

            <Section title="Runtime behavior">
                <SubSection title="Heartbeat loop">
                    <p>
                        On each tick the agent collects metrics, processes and
                        open ports <strong>once</strong>, then sends a single
                        aggregated heartbeat covering every owned server:
                        CPU, memory, disk, network, uptime and the current
                        agent configuration travel once. Per-server data is
                        deduped: the top-level{" "}
                        <InlineCode>processes_dict</InlineCode>/
                        <InlineCode>ports_dict</InlineCode>/
                        <InlineCode>networks_dict</InlineCode> hold the union of
                        filtered objects and each server partition carries only
                        keys (process names, <InlineCode>protocol:port</InlineCode>
                        , interface names). Available sets (
                        <InlineCode>available_processes</InlineCode>/
                        <InlineCode>available_ports</InlineCode>/
                        <InlineCode>available_interfaces</InlineCode> with state{" "}
                        <InlineCode>up</InlineCode> for non-disconnected) are
                        sent only on change (signature via{" "}
                        <InlineCode>processSetSignature</InlineCode> etc.), so{" "}
                        <InlineCode>available_*</InlineCode> is details-only - the
                        live data lives in the per-server partitions.
                    </p>
                    <p>
                        The interval is adjustable from Settings → Agent Settings
                        and is pushed to running agents immediately.
                    </p>
                    <p>
                        If the agent’s distinct networks, ports or processes are
                        empty for a server (e.g.{" "}
                        <InlineCode>network_filter=[]</InlineCode>), the per-server
                        network/ports/processes list is empty and the chart shows
                        no lines - the Y-axis stays at <InlineCode>MB/s</InlineCode>
                        .
                    </p>
                </SubSection>
                <SubSection title="Control channel">
                    <p>
                        A WebSocket connection (authenticated over{" "}
                        <InlineCode>private-agent.&lt;serverUuid&gt;</InlineCode>{" "}
                        channels, one per owned server) receives per-server
                        filter updates (<InlineCode>port_filter</InlineCode>,{" "}
                        <InlineCode>process_filter</InlineCode>,{" "}
                        <InlineCode>network_filter</InlineCode>) and binary
                        update notifications. On (re)connect the agent refreshes
                        its session via{" "}
                        <InlineCode>runtime.SyncFromSession</InlineCode>, which
                        restores the freshest server filters from the auth
                        response - so nothing is missed while the socket is down.
                        Filter updates are applied via{" "}
                        <InlineCode>runtime.Upsert</InlineCode> ({" "}
                        <InlineCode>nil</InlineCode> = allow all,{" "}
                        <InlineCode>[]</InlineCode> = block all) and the next
                        heartbeat is already filtered.
                    </p>
                </SubSection>
                <SubSection title="Self-update">
                    <p>
                        When a heartbeat response carries a pending update, the
                        agent downloads the new binary, renames the current one
                        to <InlineCode>.old</InlineCode>, swaps it in, and
                        restarts itself with the same{" "}
                        <InlineCode>-instance</InlineCode> argument. A failed
                        download restores the previous binary.
                    </p>
                </SubSection>
                <SubSection title="Rejected servers">
                    <p>
                        Each heartbeat response lists revoked servers -
                        decommissioned, reassigned, or no longer owned - which
                        the agent removes from its monitored set rather than
                        leaving flapping. The agent resumes monitoring a server
                        only when it is assigned again.
                    </p>
                </SubSection>
            </Section>

            <Section title="Key source files">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>main.go</InlineCode> - entry point, CLI
                        commands, uninstall-marker flow, heartbeat loop.
                    </li>
                    <li>
                        <InlineCode>util.go</InlineCode> - paths, config
                        load/bootstrap, process grouping, binary update.
                    </li>
                    <li>
                        <InlineCode>client.go</InlineCode> - HTTP client,
                        challenge-response auth, session management, heartbeats,
                        revocation.
                    </li>
                    <li>
                        <InlineCode>runtime.go</InlineCode> - in-memory server
                        assignments and per-server filters.
                    </li>
                    <li>
                        <InlineCode>ws.go</InlineCode> - WebSocket control
                        channel.
                    </li>
                    <li>
                        <InlineCode>keystore.go</InlineCode> +{" "}
                        <InlineCode>keystore_windows.go</InlineCode> /{" "}
                        <InlineCode>keystore_linux.go</InlineCode> - platform
                        identity key storage.
                    </li>
                    <li>
                        <InlineCode>metrics_windows.go</InlineCode> /{" "}
                        <InlineCode>metrics_linux.go</InlineCode> - CPU, memory,
                        disk, network, process, and port collection.
                    </li>
                    <li>
                        <InlineCode>commands.go</InlineCode> - backend-issued
                        command execution.
                    </li>
                    <li>
                        <InlineCode>service_windows.go</InlineCode> +{" "}
                        <InlineCode>restart_*.go</InlineCode> - service
                        registration and binary-update restarts.
                    </li>
                </ul>
                <p>
                    Platform differences (keystore, metrics, restart, service)
                    are selected with Go build tags - the same codebase compiles
                    for Windows and Linux.
                </p>
            </Section>
        </>
    );
}