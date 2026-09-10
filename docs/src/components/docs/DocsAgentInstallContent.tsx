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
                    heartbeats - the server moves from{" "}
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
                    (valid for 30 minutes) and returns two one-liner commands -
                    one for Linux, one for Windows. Copy the one for the target
                    machine's OS and run it there.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        The token has a live <strong>countdown</strong> in the
                        UI. If it expires before you finish, click{" "}
                        <strong>Regenerate Token</strong> to mint a new one -
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
                    The provision token expires after 30 minutes. If it expires
                    before you finish installing, generate a new one - an
                    expired token makes the installer fail immediately.
                </Callout>
            </Section>

            <Section title="Linux install">
                <CodeBlock
                    language="bash"
                    filename="Linux terminal (as root)"
                >{`sudo curl -fsSL {APP_URL}/install/linux | sudo bash -s -- <TOKEN>`}</CodeBlock>
                <p>
                    The script contacts the provision endpoint, downloads the
                    agent binary, verifies its SHA-256 checksum, and installs
                    it:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        Binary at{" "}
                        <InlineCode>
                            /opt/monitor-agent/monitor-agent
                        </InlineCode>{" "}
                        (shared location, root-owned, read-only at runtime).
                    </li>
                    <li>
                        Instance config at{" "}
                        <InlineCode>
                            /var/lib/monitor-agent/instances/&lt;uuid&gt;/config.json
                        </InlineCode>{" "}
                        (owned by the <InlineCode>monitor</InlineCode> service
                        user, mode 0600).
                    </li>
                    <li>
                        A dedicated <InlineCode>monitor</InlineCode> system user
                        is created if missing, and a hardened systemd unit{" "}
                        <InlineCode>monitor-agent.service</InlineCode> (stable,
                        one per host) is enabled and started.
                    </li>
                    <li>
                        The install log is written to{" "}
                        <InlineCode>
                            /var/log/monitor-agent-install.log
                        </InlineCode>
                        .
                    </li>
                </ul>
                <p>Useful checks after install:</p>
                <CodeBlock language="bash">{`systemctl status monitor-agent.service
journalctl -u monitor-agent.service -f
cat /var/log/monitor-agent-install.log`}</CodeBlock>
                <Callout>
                    There is exactly one{" "}
                    <InlineCode>monitor-agent.service</InlineCode> per physical
                    computer, named by the host (not the server). When the
                    installer finds an existing service it reuses the same
                    installation UUID, service, and identity key - it only
                    attaches the new server to the already-running agent, so
                    installing a second server on the same host creates no
                    duplicate service, binary, or key. A fresh UUID is minted
                    only when no service is detected.
                </Callout>
            </Section>

            <Section title="Windows install">
                <CodeBlock
                    language="powershell"
                    filename="PowerShell (as Administrator)"
                >{`powershell -ExecutionPolicy Bypass -Command "irm '{APP_URL}/install/windows.ps1' -OutFile $env:TEMP\\monitor-install.ps1; & $env:TEMP\\monitor-install.ps1 -ProvisionToken '<TOKEN>'"`}</CodeBlock>
                <p>
                    The script contacts the provision endpoint, downloads the
                    agent binary, verifies its SHA-256 checksum, and installs
                    it:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        Binary at{" "}
                        <InlineCode>
                            C:\Program Files\MonitorAgent\MonitorAgent.exe
                        </InlineCode>{" "}
                        (shared location, the agent never writes here at
                        runtime).
                    </li>
                    <li>
                        Instance config at{" "}
                        <InlineCode>
                            C:\ProgramData\MonitorAgent\instances\&lt;uuid&gt;\config.json
                        </InlineCode>{" "}
                        - ProgramData, not Program Files, is where the agent's
                        writable state lives.
                    </li>
                    <li>
                        A Windows service <InlineCode>MonitorAgent</InlineCode>{" "}
                        (stable, one per host) running as{" "}
                        <strong>LocalSystem</strong> is created and started.
                        Installing a second server on the same host reuses this
                        service and identity.
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
                <CodeBlock language="powershell">{`Get-Service -Name "MonitorAgent"
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
                        <strong>Register</strong> - the agent posts its public
                        key with the one-time provision token. The backend
                        matches it to the server, and the token is stripped from
                        the local config.
                    </li>
                    <li>
                        <strong>Authenticate</strong> - challenge-response with
                        the backend issues a short-lived session token held in
                        memory only.
                    </li>
                    <li>
                        <strong>Heartbeat</strong> - the agent starts sending
                        one aggregated heartbeat (all monitored servers in a
                        single request) on the heartbeat interval (default 5
                        seconds). The server moves to{" "}
                        <em>waiting for first heartbeat</em>, then{" "}
                        <em>online</em> once the first heartbeat lands.
                    </li>
                    <li>
                        <strong>Control</strong> - a WebSocket control channel
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
                        <strong>Pending Installation</strong> - the server was
                        created but no install command has been generated yet.
                        The Agent Installation Guide shows{" "}
                        <strong>Generate Installation Command</strong>.
                    </li>
                    <li>
                        <strong>Waiting for Installation</strong> - a provision
                        token exists; the agent has not installed yet. The guide
                        shows the commands with the token countdown.
                    </li>
                    <li>
                        <strong>Waiting for First Heartbeat</strong> - the agent
                        registered its identity but has not sent its first
                        heartbeat.
                    </li>
                    <li>
                        <strong>Online</strong> - the agent is sending
                        heartbeats.
                    </li>
                    <li>
                        <strong>Offline</strong> - no heartbeat within the
                        offline threshold.
                    </li>
                    <li>
                        <strong>Archived</strong> - removed from active
                        monitoring; the agent stops being monitored for this
                        server.
                    </li>
                    <li>
                        <strong>Agent Uninstalled</strong> - the agent was
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
                        Agent version and heartbeat interval (the interval the
                        agent actually polls on, kept on the agent row and
                        pushed via the backend's configuration endpoint), plus
                        the per-collector scan intervals, update channel, and
                        auto-update setting, with first-registration and last
                        heartbeat times.
                    </p>
                </SubSection>
                <SubSection title="Danger Zone - Uninstall Agent">
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

            <Section title="Uninstalling vs. detaching - one agent, many servers">
                <p>
                    One <InlineCode>MonitorAgent</InlineCode> monitors{" "}
                    <strong>all servers on one host</strong>. Two different
                    removals exist:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Detach a single server</strong> - the agent
                        stays installed and keeps monitoring its other servers.
                        The dashboard detaches via the{" "}
                        <strong>Agent tab → Detach Server</strong> (when the
                        host has &gt;1 servers) or the Delete flow for that
                        server; both require the host command for validation and
                        send{" "}
                        <InlineCode>
                            POST
                            /api/v1/agent/servers/&#123;uuid&#125;/uninstall
                        </InlineCode>{" "}
                        (agent JWT) - <InlineCode>AgentUninstalled</InlineCode>{" "}
                        for that server only.
                    </li>
                    <li>
                        <strong>Uninstall the whole agent</strong> - removes the
                        single stable service and the shared binary. Use when
                        the host has one server or you want to wipe the host
                        completely.
                    </li>
                </ul>
                <p>
                    Both are <strong>marker-based</strong> and must be run on
                    the host (validation - only the machine holding the key can
                    revoke). The script writes a flag, the running service
                    (LocalSystem/
                    <InlineCode>monitor</InlineCode>) does the authenticated
                    revoke/delete.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <InlineCode>uninstall.flag</InlineCode> (
                        <InlineCode>pending</InlineCode>) or{" "}
                        <InlineCode>detach.flag</InlineCode> (containing the{" "}
                        <InlineCode>server_uuid</InlineCode>) written into{" "}
                        <InlineCode>
                            C:\ProgramData\MonitorAgent\instances\&lt;uuid&gt;
                        </InlineCode>{" "}
                        or{" "}
                        <InlineCode>
                            /var/lib/monitor-agent/instances/&lt;uuid&gt;
                        </InlineCode>
                        .
                    </li>
                    <li>
                        Service sees the flag on the next loop (or next startup)
                        and <InlineCode>POST</InlineCode>s -{" "}
                        <InlineCode>/api/v1/agent/uninstall</InlineCode> (whole
                        agent) or{" "}
                        <InlineCode>
                            /api/v1/agent/servers/&#123;uuid&#125;/uninstall
                        </InlineCode>{" "}
                        (one server) - using its short-lived session. Detach
                        keeps the service for remaining servers; uninstall
                        deletes the identity key.
                    </li>
                    <li>
                        Agent writes <InlineCode>done</InlineCode> to the flag
                        and the service exits (uninstall) or continues (detach).
                    </li>
                    <li>
                        The script confirms <InlineCode>done</InlineCode>, then
                        (uninstall only) removes the stable service{" "}
                        <InlineCode>MonitorAgent</InlineCode>/
                        <InlineCode>monitor-agent.service</InlineCode>, the
                        instance directory and the shared binary.
                    </li>
                </ol>
                <p>
                    Detach <strong>immediately</strong> tries the{" "}
                    <InlineCode>POST</InlineCode> in the short-lived{" "}
                    <InlineCode>MonitorAgent.exe -detach</InlineCode> helper
                    too, so the server flips to <em>Agent Uninstalled</em>{" "}
                    without waiting for the next <InlineCode>5s</InlineCode>{" "}
                    heartbeat - fallback is the marker for the next loop.
                    Uninstall always waits for the service loop.
                </p>
                <p>
                    Commands are emitted per-server by the detail page - copy
                    them, don’t type the UUIDs:
                </p>
                <CodeBlock language="bash">{`# Detach one server (host stays, other servers keep monitoring)
sudo curl -fsSL {APP_URL}/detach/linux | sudo bash -s -- <INSTALLATION_UUID> <SERVER_UUID>

# Uninstall whole agent (all servers on this host)
sudo curl -fsSL {APP_URL}/uninstall/linux | sudo bash -s -- <INSTALLATION_UUID>`}</CodeBlock>
                <CodeBlock language="powershell">{`# Detach one server
powershell -ExecutionPolicy Bypass -Command "irm '{APP_URL}/detach/windows.ps1' -OutFile $env:TEMP\\monitor-detach.ps1; & $env:TEMP\\monitor-detach.ps1 -Instance '<INSTALLATION_UUID>' -Server '<SERVER_UUID>'"

# Uninstall whole agent
powershell -ExecutionPolicy Bypass -Command "irm '{APP_URL}/uninstall/windows.ps1' -OutFile $env:TEMP\\monitor-uninstall.ps1; & $env:TEMP\\monitor-uninstall.ps1 -Instance '<INSTALLATION_UUID>'"`}</CodeBlock>
                <Callout type="warning">
                    Detach takes <strong>exactly one</strong> server UUID and
                    never touches the other servers’ data; uninstall takes one
                    installation UUID and wipes the whole host. Wrong UUIDs fail
                    - nothing is guessed. When an agent detaches its last
                    server, it stays installed with zero servers until a full
                    uninstall - it does <strong>not</strong> auto-revoke.
                </Callout>
                <Callout>
                    Both are authenticated by the agent’s own session - only the
                    host holding the key can revoke/detach. The dashboard’s
                    Delete flow for a shared host also requires the host detach
                    command for validation (no direct DB detach). Status flips
                    to <em>Agent Uninstalled</em> in real time via{" "}
                    <InlineCode>AgentUninstalled</InlineCode> +{" "}
                    <InlineCode>ServerStatusUpdated</InlineCode> and the guide
                    reappears.
                </Callout>
            </Section>

            <Section title="Agent recovery and force reinstall">
                <p>
                    If agent files were accidentally deleted, corrupted, or
                    removed on the host server while database records remained
                    hanging (leaving the server in an unlinked or stale state),
                    you can run a <strong>Force Reinstall</strong>.
                </p>
                <p>
                    In the server detail page's <strong>Agent</strong> tab,
                    locate the <strong>Agent Recovery & Force Reinstall</strong>{" "}
                    card and click <strong>Force Reinstall Agent</strong>.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        The backend generates a new one-time provision token
                        linked to the server's{" "}
                        <strong>existing installation UUID</strong> stored in
                        the database.
                    </li>
                    <li>
                        The modal provides OS-specific commands with the
                        installation UUID embedded:
                    </li>
                </ol>
                <CodeBlock
                    language="bash"
                    filename="Linux (as root)"
                >{`sudo curl -fsSL {APP_URL}/install/linux | sudo bash -s -- <TOKEN> <INSTALLATION_UUID>`}</CodeBlock>
                <CodeBlock
                    language="powershell"
                    filename="Windows PowerShell (as Administrator)"
                >{`powershell -ExecutionPolicy Bypass -Command "irm '{APP_URL}/install/windows.ps1' -OutFile $env:TEMP\\monitor-install.ps1; & $env:TEMP\\monitor-install.ps1 -ProvisionToken '<TOKEN>' -InstallationId '<INSTALLATION_UUID>'"`}</CodeBlock>
                <p>
                    When executed on the host, the installer downloads a fresh
                    agent binary, restores the configuration directory with the
                    existing installation UUID, and registers/restarts the OS
                    service cleanly without creating orphaned server records.
                </p>
                <Callout>
                    Force reinstall preserves historical server metrics and
                    database associations by binding the freshly installed agent
                    back to the same installation ID.
                </Callout>
            </Section>

            <Section title="Troubleshooting">
                <p>
                    When an agent is not showing up online, check the logs in
                    order. Everything diagnosable lives on the machine - not in
                    the web UI.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Install log</strong> -{" "}
                        <InlineCode>
                            %TEMP%\monitor-agent-install.log
                        </InlineCode>{" "}
                        (Windows) or{" "}
                        <InlineCode>
                            /var/log/monitor-agent-install.log
                        </InlineCode>{" "}
                        (Linux). If the installer failed, the reason is here
                        (bad token, checksum mismatch, collision).
                    </li>
                    <li>
                        <strong>startup.log - always at the data root</strong> -{" "}
                        <InlineCode>
                            C:\ProgramData\MonitorAgent\startup.log
                        </InlineCode>{" "}
                        or{" "}
                        <InlineCode>
                            /var/lib/monitor-agent/startup.log
                        </InlineCode>
                        . One-line early-startup records: "loadConfig failed",
                        "GetOrCreateKey failed", "agent.log open failed". This
                        is the first place to look when the agent produces
                        nothing.
                    </li>
                    <li>
                        <strong>agent.log - in the instance directory</strong> -
                        the runtime log once the instance directory exists.
                        Registration failures, auth failures, and heartbeat
                        errors all land here.
                    </li>
                    <li>
                        <strong>crash.log - in the instance directory</strong> -
                        a last-gasp panic stack if the agent crashed.
                    </li>
                    <li>
                        <strong>System logs</strong> -{" "}
                        <InlineCode>
                            journalctl -u monitor-agent.service
                        </InlineCode>{" "}
                        on Linux (per-instance{" "}
                        <InlineCode>monitor-agent@*</InlineCode> units are
                        legacy), or the Windows Services snap-in for the{" "}
                        <InlineCode>MonitorAgent</InlineCode> service.
                    </li>
                </ul>
                <SubSection title="Common causes">
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>
                                Agent stays in waiting for installation
                            </strong>{" "}
                            - the provision token expired or was never
                            generated. Regenerate it from the guide.
                        </li>
                        <li>
                            <strong>
                                Missing config.json in the instance directory
                            </strong>{" "}
                            - the installer never ran successfully. The agent
                            now self-creates a minimal default config and logs
                            clearly in startup.log instead of exiting silently;
                            the installer must then supply{" "}
                            <InlineCode>server_url</InlineCode>.
                        </li>
                        <li>
                            <strong>Identity key missing</strong> - the private
                            key lives in the OS keystore (Windows) or at{" "}
                            <InlineCode>
                                /var/lib/monitor-agent/identity-&lt;uuid&gt;.pem
                            </InlineCode>{" "}
                            (Linux). If it is gone, the agent cannot
                            authenticate - reinstall to mint a fresh identity.
                        </li>
                        <li>
                            <strong>
                                Server flips between online and offline
                            </strong>{" "}
                            - check the offline threshold (Settings → Agent
                            Settings) is ≥ the heartbeat interval, and that the
                            machine has a stable connection to the backend.
                        </li>
                    </ul>
                </SubSection>
            </Section>
        </>
    );
}
