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
                    <strong>installation UUID</strong>: the instance directory,
                    the identity key name, and the service name all derive from
                    it. This makes installations <strong>per-machine and
                    isolated</strong> — multiple agents on one host never
                    collide, and one agent installation can monitor{" "}
                    <strong>multiple servers</strong> simultaneously.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Binary</strong> — immutable, installed by the
                        installer and only replaced by self-update.
                    </li>
                    <li>
                        <strong>State</strong> — config, logs, and the uninstall
                        marker in a per-installation directory under the data
                        root.
                    </li>
                    <li>
                        <strong>Identity</strong> — an RSA keypair held in the
                        OS keystore, used for challenge-response authentication.
                    </li>
                    <li>
                        <strong>Runtime</strong> — the short-lived session and
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
                        <strong>Redirect logging</strong> — stdout, stderr, and
                        the Go <InlineCode>log</InlineCode> package all write to{" "}
                        <InlineCode>agent.log</InlineCode> in the instance
                        directory.
                    </li>
                    <li>
                        <strong>Load config</strong> — read{" "}
                        <InlineCode>config.json</InlineCode>. If missing, a
                        minimal default is bootstrapped and the agent logs
                        clearly that the installer must supply{" "}
                        <InlineCode>server_url</InlineCode>.
                    </li>
                    <li>
                        <strong>Obtain the identity key</strong> —{" "}
                        <InlineCode>GetOrCreateKey</InlineCode> creates the RSA
                        keypair in the OS keystore on first run.
                    </li>
                    <li>
                        <strong>Handle a pending uninstall</strong> — if{" "}
                        <InlineCode>uninstall.flag</InlineCode> is present, the
                        agent revokes itself, deletes its key, and exits.
                    </li>
                    <li>
                        <strong>Register</strong> — if a{" "}
                        <InlineCode>provision_token</InlineCode> is still in the
                        config, the agent registers its public key, then strips
                        the token from disk.
                    </li>
                    <li>
                        <strong>Authenticate</strong> — challenge-response
                        issues a short-lived session token (see Agent Security).
                    </li>
                    <li>
                        <strong>Build the runtime</strong> — the auth response
                        carries the list of owned servers and their filters;
                        these are held in memory.
                    </li>
                    <li>
                        <strong>Run the heartbeat loop</strong> — one heartbeat
                        per owned server on the configured interval, plus a
                        WebSocket control-channel goroutine.
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
                <CodeBlock>{`monitor-agent -install -instance <uuid>     # register the OS service
monitor-agent -uninstall -instance <uuid>   # marker-based uninstall
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
                        The service name is derived from the instance:{" "}
                        <InlineCode>MonitorAgent-&lt;uuid&gt;</InlineCode> on
                        Windows,{" "}
                        <InlineCode>monitor-agent@&lt;uuid&gt;.service</InlineCode>{" "}
                        (systemd template) on Linux.
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
                        agent configuration travel once, and each server
                        contributes its own partition with that server's filter
                        applied. The interval is adjustable from Settings →
                        Agent Settings and is pushed to running agents
                        immediately.
                    </p>
                </SubSection>
                <SubSection title="Control channel">
                    <p>
                        A WebSocket connection (authenticated over{" "}
                        <InlineCode>private-agent.&lt;serverUuid&gt;</InlineCode>{" "}
                        channels) receives configuration updates and binary
                        update notifications. On (re)connect the agent refreshes
                        its session, which restores the freshest server filters
                        from the auth response — so nothing is missed while the
                        socket is down.
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
                        Each heartbeat response lists revoked servers —
                        decommissioned, reassigned, or no longer owned — which
                        the agent removes from its monitored set rather than
                        leaving flapping. The agent resumes monitoring a server
                        only when it is assigned again.
                    </p>
                </SubSection>
            </Section>

            <Section title="Key source files">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>main.go</InlineCode> — entry point, CLI
                        commands, uninstall-marker flow, heartbeat loop.
                    </li>
                    <li>
                        <InlineCode>util.go</InlineCode> — paths, config
                        load/bootstrap, process grouping, binary update.
                    </li>
                    <li>
                        <InlineCode>client.go</InlineCode> — HTTP client,
                        challenge-response auth, session management, heartbeats,
                        revocation.
                    </li>
                    <li>
                        <InlineCode>runtime.go</InlineCode> — in-memory server
                        assignments and per-server filters.
                    </li>
                    <li>
                        <InlineCode>ws.go</InlineCode> — WebSocket control
                        channel.
                    </li>
                    <li>
                        <InlineCode>keystore.go</InlineCode> +{" "}
                        <InlineCode>keystore_windows.go</InlineCode> /{" "}
                        <InlineCode>keystore_linux.go</InlineCode> — platform
                        identity key storage.
                    </li>
                    <li>
                        <InlineCode>metrics_windows.go</InlineCode> /{" "}
                        <InlineCode>metrics_linux.go</InlineCode> — CPU, memory,
                        disk, network, process, and port collection.
                    </li>
                    <li>
                        <InlineCode>commands.go</InlineCode> — backend-issued
                        command execution.
                    </li>
                    <li>
                        <InlineCode>service_windows.go</InlineCode> +{" "}
                        <InlineCode>restart_*.go</InlineCode> — service
                        registration and binary-update restarts.
                    </li>
                </ul>
                <p>
                    Platform differences (keystore, metrics, restart, service)
                    are selected with Go build tags — the same codebase compiles
                    for Windows and Linux.
                </p>
            </Section>
        </>
    );
}