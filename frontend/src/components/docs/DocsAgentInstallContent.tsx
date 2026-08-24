import { Link } from "react-router-dom";
import { Section, SubSection, CodeBlock, InlineCode, Callout } from "./Section";

export function DocsAgentInstallContent() {
    return (
        <>
            <Section title="The agent installation flow">
                <p>
                    Monitoring starts when the lightweight Go agent is installed
                    on the machine. The server record is created first, then the
                    server detail page walks you through generating a one-time
                    install command and running it on the target machine. The
                    agent registers itself, authenticates, and starts sending
                    heartbeats — the server moves from{" "}
                    <em>pending installation</em> to <em>online</em> without
                    further manual work.
                </p>
                <p>
                    The <strong>Agent Installation Guide</strong> card appears
                    on the server detail page while the server is in{" "}
                    <em>pending installation</em>,{" "}
                    <em>waiting for installation</em>, or{" "}
                    <em>agent uninstalled</em>. See the{" "}
                    <Link
                        to="/docs/agent-architecture"
                        className="text-primary hover:underline"
                    >
                        Agent Architecture
                    </Link>{" "}
                    reference for what the agent does once it is running.
                </p>
            </Section>

            <Section title="Generate the installation command">
                <p>
                    Click <strong>Generate Installation Command</strong>. The
                    backend creates a one-time <strong>provision token</strong>{" "}
                    (valid for 1 hour) and returns two one-liner commands — one
                    for Linux, one for Windows. Copy the one for the target
                    machine's OS and run it there.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        The token has a live <strong>countdown</strong> in the
                        UI. If it expires before you finish, click{" "}
                        <strong>Regenerate Token</strong> to mint a new one —
                        the old token stops working immediately.
                    </li>
                    <li>
                        The token is <strong>one-time use</strong>: it is burned
                        when the agent registers, and stripped from the agent's
                        on-disk config after registration so it is never
                        persisted as a secret.
                    </li>
                </ol>
                <Callout type="warning">
                    The provision token expires after 1 hour. If it expires
                    before you finish installing, generate a new one — an
                    expired token makes the installer fail immediately.
                </Callout>
            </Section>

            <Section title="Linux install">
                <CodeBlock language="bash" filename="Linux terminal (as root)">{`sudo curl -fsSL {APP_URL}/install/linux | sudo bash -s -- <TOKEN>`}</CodeBlock>
                <p>
                    The script contacts the provision endpoint, downloads the
                    agent binary, verifies its SHA-256 checksum, and installs it:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        Binary at{" "}
                        <InlineCode>/opt/monitor-agent/&lt;uuid&gt;/monitor-agent</InlineCode>{" "}
                        (root-owned, read-only at runtime).
                    </li>
                    <li>
                        Instance config at{" "}
                        <InlineCode>/var/lib/monitor-agent/instances/&lt;uuid&gt;/config.json</InlineCode>{" "}
                        (owned by the <InlineCode>monitor</InlineCode> service
                        user, mode 0600).
                    </li>
                    <li>
                        A dedicated <InlineCode>monitor</InlineCode> system user
                        is created if missing, and a hardened systemd instance
                        unit{" "}
                        <InlineCode>monitor-agent@&lt;uuid&gt;.service</InlineCode>{" "}
                        is enabled and started.
                    </li>
                    <li>
                        The install log is written to{" "}
                        <InlineCode>/var/log/monitor-agent-install.log</InlineCode>.
                    </li>
                </ul>
                <p>Useful checks after install:</p>
                <CodeBlock language="bash">{`systemctl status monitor-agent@<uuid>.service
journalctl -u monitor-agent@<uuid>.service -f
cat /var/log/monitor-agent-install.log`}</CodeBlock>
                <Callout>
                    A fresh installation always uses a new UUID, so you can
                    install agents on as many machines as you like — they never
                    collide, even on the same host.
                </Callout>
            </Section>

            <Section title="Windows install">
                <CodeBlock language="powershell" filename="PowerShell (as Administrator)">{`powershell -ExecutionPolicy Bypass -Command "irm '{APP_URL}/install/windows.ps1' -OutFile $env:TEMP\\monitor-install.ps1; & $env:TEMP\\monitor-install.ps1 -ProvisionToken '<TOKEN>'"`}</CodeBlock>
                <p>
                    The script contacts the provision endpoint, downloads the
                    agent binary, verifies its SHA-256 checksum, and installs it:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        Binary at{" "}
                        <InlineCode>
                            C:\Program Files\MonitorAgent\&lt;uuid&gt;\MonitorAgent.exe
                        </InlineCode>{" "}
                        (the agent never writes here at runtime).
                    </li>
                    <li>
                        Instance config at{" "}
                        <InlineCode>
                            C:\ProgramData\MonitorAgent\instances\&lt;uuid&gt;\config.json
                        </InlineCode>{" "}
                        — ProgramData, not Program Files, is where the agent's
                        writable state lives.
                    </li>
                    <li>
                        A Windows service{" "}
                        <InlineCode>MonitorAgent-&lt;uuid&gt;</InlineCode>{" "}
                        running as <strong>LocalSystem</strong> is created and
                        started.
                    </li>
                    <li>
                        The install log is written to{" "}
                        <InlineCode>
                            %TEMP%\monitor-agent-install.log
                        </InlineCode>
                        .
                    </li>
                </ul>
                <p>Useful checks after install:</p>
                <CodeBlock language="powershell">{`Get-Service -Name "MonitorAgent-<uuid>"
Get-Content "$env:TEMP\\monitor-agent-install.log"
Get-Content "C:\\ProgramData\\MonitorAgent\\instances\\<uuid>\\agent.log"`}</CodeBlock>
            </Section>

            <Section title="What happens after install">
                <p>
                    The installed service starts the agent, which walks through
                    the startup sequence automatically:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <strong>Register</strong> — the agent posts its public
                        key with the one-time provision token. The backend
                        matches it to the server, and the token is stripped from
                        the local config.
                    </li>
                    <li>
                        <strong>Authenticate</strong> — challenge-response with
                        the backend issues a short-lived session token held in
                        memory only.
                    </li>
                    <li>
                        <strong>Heartbeat</strong> — the agent starts sending one
                        heartbeat per monitored server on the heartbeat interval
                        (default 5 seconds). The server moves to{" "}
                        <em>waiting for first heartbeat</em>, then{" "}
                        <em>online</em> once the first heartbeat lands.
                    </li>
                    <li>
                        <strong>Control</strong> — a WebSocket control channel
                        opens to receive configuration and binary updates.
                    </li>
                </ol>
                <p>
                    If the server does not go online within the offline
                    threshold (default 15 seconds, must be ≥ the heartbeat
                    interval), see{" "}
                    <Link
                        to="/docs/agent-storage"
                        className="text-primary hover:underline"
                    >
                        Agent Storage
                    </Link>{" "}
                    for where to look, or the troubleshooting section below.
                </p>
            </Section>

            <Section title="Server statuses">
                <p>
                    A server is always in exactly one of these states. The
                    status is what drives the card color, the filters on the
                    Servers page, and which UI appears on the detail page.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Pending Installation</strong> — the server was
                        created but no install command has been generated yet.
                        The Agent Installation Guide shows{" "}
                        <strong>Generate Installation Command</strong>.
                    </li>
                    <li>
                        <strong>Waiting for Installation</strong> — a provision
                        token exists; the agent has not installed yet. The guide
                        shows the commands with the token countdown.
                    </li>
                    <li>
                        <strong>Waiting for First Heartbeat</strong> — the agent
                        registered its identity but has not sent its first
                        heartbeat.
                    </li>
                    <li>
                        <strong>Online</strong> — the agent is sending
                        heartbeats.
                    </li>
                    <li>
                        <strong>Offline</strong> — no heartbeat within the
                        offline threshold.
                    </li>
                    <li>
                        <strong>Archived</strong> — removed from active
                        monitoring; the agent stops being monitored for this
                        server.
                    </li>
                    <li>
                        <strong>Agent Uninstalled</strong> — the agent was
                        uninstalled from the machine. The guide returns and
                        offers a fresh install command so you can resume
                        monitoring.
                    </li>
                </ul>
            </Section>

            <Section title="The Agent tab">
                <p>
                    Once the agent is registered, the server detail page gains
                    an <strong>Agent</strong> tab with two parts:
                </p>
                <SubSection title="Installed Agent Properties">
                    <p>
                        Read-only properties reported by the agent: agent
                        version, heartbeat interval, metrics/port/service/
                        process scan intervals, update channel, auto-update
                        flag, first registration time, and last heartbeat time.
                    </p>
                </SubSection>
                <SubSection title="Danger Zone — Uninstall Agent">
                    <p>
                        A red <strong>Danger Zone</strong> box at the bottom
                        offers <strong>Uninstall Agent</strong>. Clicking it
                        opens a dialog with the Linux and Windows uninstall
                        commands for this server's machine. Running the command
                        stops monitoring and returns the server to the
                        installation flow (status becomes{" "}
                        <em>agent uninstalled</em> in real time).
                    </p>
                </SubSection>
            </Section>

            <Section title="Uninstalling the agent">
                <p>
                    Uninstallation is <strong>marker-based</strong>: the
                    uninstall script writes a marker file, then asks the running
                    service to clean up its own identity — the one thing only
                    the service account can do.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        The script writes <InlineCode>uninstall.flag</InlineCode>{" "}
                        (<InlineCode>pending</InlineCode>) into the instance
                        directory.
                    </li>
                    <li>
                        The service is stopped (Windows) or restarted (Linux).
                        On the next loop the agent sees the marker, revokes
                        itself on the backend using its own session token, and
                        deletes its identity key from the OS keystore.
                    </li>
                    <li>
                        The agent records <InlineCode>done</InlineCode> in the
                        marker and exits.
                    </li>
                    <li>
                        The script confirms the marker, then removes the service
                        registration, the instance directory, and the program
                        directory.
                    </li>
                </ol>
                <p>
                    The scripts uninstall <strong>all</strong> installations on
                    the host by default; pass an instance UUID to target a
                    single one (
                    <InlineCode>-Instance &lt;uuid&gt;</InlineCode> on Windows,
                    a positional argument on Linux).
                </p>
                <Callout>
                    Because revocation is authenticated by the agent's own
                    short-lived session, only the machine that holds the
                    identity key can remove the agent from the backend. The
                    server's status flips to <em>Agent Uninstalled</em> and the
                    installation guide reappears for reinstallation.
                </Callout>
            </Section>

            <Section title="Troubleshooting">
                <p>
                    When an agent is not showing up online, check the logs in
                    order. Everything diagnosable lives on the machine — not in
                    the web UI.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Install log</strong> —{" "}
                        <InlineCode>%TEMP%\monitor-agent-install.log</InlineCode>{" "}
                        (Windows) or{" "}
                        <InlineCode>/var/log/monitor-agent-install.log</InlineCode>{" "}
                        (Linux). If the installer failed, the reason is here
                        (bad token, checksum mismatch, collision).
                    </li>
                    <li>
                        <strong>
                            startup.log — always at the data root
                        </strong>{" "}
                        —{" "}
                        <InlineCode>
                            C:\ProgramData\MonitorAgent\startup.log
                        </InlineCode>{" "}
                        or{" "}
                        <InlineCode>/var/lib/monitor-agent/startup.log</InlineCode>
                        . One-line early-startup records: "loadConfig failed",
                        "GetOrCreateKey failed", "agent.log open failed". This
                        is the first place to look when the agent produces
                        nothing.
                    </li>
                    <li>
                        <strong>agent.log — in the instance directory</strong>{" "}
                        — the runtime log once the instance directory exists.
                        Registration failures, auth failures, and heartbeat
                        errors all land here.
                    </li>
                    <li>
                        <strong>crash.log — in the instance directory</strong>{" "}
                        — a last-gasp panic stack if the agent crashed.
                    </li>
                    <li>
                        <strong>System logs</strong> —{" "}
                        <InlineCode>journalctl -u monitor-agent@&lt;uuid&gt;.service</InlineCode>{" "}
                        on Linux, or the Windows Services snap-in for the{" "}
                        <InlineCode>MonitorAgent-&lt;uuid&gt;</InlineCode>{" "}
                        service.
                    </li>
                </ul>
                <SubSection title="Common causes">
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>Agent stays in waiting for installation</strong>{" "}
                            — the provision token expired or was never generated.
                            Regenerate it from the guide.
                        </li>
                        <li>
                            <strong>Missing config.json in the instance
                            directory</strong>{" "}
                            — the installer never ran successfully. The agent
                            now self-creates a minimal default config and logs
                            clearly in startup.log instead of exiting silently;
                            the installer must then supply{" "}
                            <InlineCode>server_url</InlineCode>.
                        </li>
                        <li>
                            <strong>Identity key missing</strong> — the private
                            key lives in the OS keystore (Windows) or at{" "}
                            <InlineCode>/var/lib/monitor-agent/identity-&lt;uuid&gt;.pem</InlineCode>{" "}
                            (Linux). If it is gone, the agent cannot authenticate
                            — reinstall to mint a fresh identity.
                        </li>
                        <li>
                            <strong>Server flips between online and offline</strong>{" "}
                            — check the offline threshold (Settings → Agent
                            Settings) is ≥ the heartbeat interval, and that the
                            machine has a stable connection to the backend.
                        </li>
                    </ul>
                </SubSection>
            </Section>
        </>
    );
}