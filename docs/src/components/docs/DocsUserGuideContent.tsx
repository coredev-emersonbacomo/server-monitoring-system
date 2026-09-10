import {
    Section,
    SubSection,
    CodeBlock,
    InlineCode,
    Callout,
    DocImage,
} from "./Section";

export function DocsDashboardContent() {
    return (
        <>
            <Section title="The Dashboard at a glance">
                <p>
                    The Dashboard is the landing page after login and the
                    starting point for monitoring. Contains a refresh button to receive latest data.
                        It has four areas:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Stat cards</strong> - total Servers, Clients,
                        and Users. Click any card to open the matching
                        management page.
                    </li>
                    <li>
                        <strong>Server Overview</strong> - a donut chart of
                        Online vs. Offline servers. The legend links to{" "}
                        <InlineCode>/servers?status=online</InlineCode> and{" "}
                        <InlineCode>/servers?status=offline</InlineCode>.
                    </li>
                    <li>
                        <strong>Action Board</strong> - pending action items
                        that need attention (see below).
                    </li>
                    <li>
                        <strong>Usage</strong> - live CPU, Memory, and Disk
                        charts with one colored line per server. A time-range
                        selector switches between 1H, 1D, and 1W views.
                    </li>
                </ul>
            </Section>

            <Section title="Action Board">
                <p>
                    The Action Board lists items that need a human decision.
                    Each card shows the action type, the affected client/server,
                    the assignee, and a severity color (notice, warning, or
                    critical).
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>No SecOps assigned</strong> - a client has no
                        SecOps users assigned.
                    </li>
                    <li>
                        <strong>Server offline</strong> - a server went offline.
                        Clicking the card opens the server.
                    </li>
                </ul>
                <p>
                    Actions are assignable: you can <strong>Claim</strong> an
                    unassigned item, <strong>Unclaim</strong> one assigned to
                    you, or <strong>Mark completed</strong>. The{" "}
                    <strong>Completed</strong> button shows the history of
                    completed actions.
                </p>
            </Section>

            <Section title="Live usage charts">
                <p>
                    The Usage section plots aggregate CPU, Memory, and Disk
                    usage across all servers. Each server is its own colored
                    line on the same chart so you can spot outliers at a glance.
                    The 1H / 1D / 1W selector changes the aggregation window
                    (minute / hour / day). Charts update through refresh button.
                </p>
            </Section>
        </>
    );
}

export function DocsClientsContent() {
    return (
        <>
            <Section title="What is a client?">
                <p>
                    A client is a customer or organization that owns servers.
                    Each client has contact details, an optional banner image, a
                    list of servers, and a configurable number of assigned
                    SecOps users.
                </p>
                <p>
                    The Clients page is at <InlineCode>/clients</InlineCode>{" "}
                    ("Client Management"). Servers belong to exactly one client.
                </p>
            </Section>

            <Section title="Browsing clients">
                <p>
                    Clients are shown as a card grid (12 per batch, infinite
                    scroll). Each card shows the online/offline server counts,
                    banner, total servers, SecOps count, name, and description.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Search</strong> matches Name.
                    </li>
                    <li>
                        <strong>Filter tabs</strong>: All, With Servers, No
                        Servers, Archived.
                    </li>
                    <li>
                        <strong>Sort</strong> by Name, Server count, SecOps count.
                    </li>
                </ul>
            </Section>

            <Section title="Creating a client">
                <p>
                    Click <strong>Add client</strong> or open{" "}
                    <InlineCode>/clients/create</InlineCode>. Required fields:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Name</strong> (min 2 characters)
                    </li>
                    <li>
                        <strong>Description</strong> (min 5, max 255 characters)
                    </li>
                    <li>
                        <strong>Location</strong> (min 5 characters)
                    </li>
                    <li>
                        <strong>Email Address</strong> (must be a valid email)
                    </li>
                    <li>
                        <strong>Contact Number</strong> (min 5 characters,
                        auto-formatted)
                    </li>
                    <li>
                        <strong>Upload Banner Image</strong> (optional - JPEG,
                        PNG, JPG, GIF, or WebP)
                    </li>
                    <li>
                        <strong>Financial & Subscriptio</strong> (must be a number)
                    </li>
                </ul>
                <p>
                    Submit to create the client. You can edit these fields later
                    from the client page.
                </p>
                <DocImage
                    src="/images/cc1.gif"
                    alt="Create client walkthrough"
                />
            </Section>

            <Section title="Client details">
                <p>
                    Open a client card to see its detail page, which has three
                    tabs:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Details</strong> - Basic Information (location)
                        and Contact Details (email, contact number).
                    </li>
                    <li>
                        <strong>Sec Ops</strong> - the SecOps users assigned to
                        this client. Use <strong>Add SecOps</strong> to search
                        and assign users, and <strong>Remove</strong> to
                        unassign. The number is capped by the{" "}
                        <em>SecOps limit per client</em> system setting.
                    </li>
                    <li>
                        <strong>Alerts</strong> - choose an alert scope (
                        <em>Global</em> or <em>Client</em>) and edit the
                        client's alert configuration (see the Settings section).
                    </li>
                </ul>
                <DocImage
                    src="/images/cdetails.gif"
                    alt="Client details walkthrough"
                />
            </Section>

            <Section title="The Servers section">
                <p>
                    Below the tabs you'll find the client's servers: a search
                    box, an Online/Offline filter, <strong>View All</strong>{" "}
                    (opens the Servers page filtered to this client), and{" "}
                    <strong>Add Server</strong> to create a new server under
                    this client.
                </p>
                <DocImage
                    src="/images/client_serverlist.png"
                    alt="Client server list"
                />
            </Section>

            <Section title="Deleting a client">
                <p>
                    Deleting permanently removes the client and all associated
                    data. You must type the client name to confirm. Deletion is
                    blocked while any associated server still has a live agent -
                    uninstall the agent on those servers first.
                </p>
                <DocImage
                    src="/images/cdetails.gif"
                    alt="Client details walkthrough"
                />
            </Section>
        </>
    );
}

export function DocsServersContent() {
    return (
        <>
            <Section title="What is a server?">
                <p>
                    A server is a machine monitored by the system. It belongs to
                    exactly one client. Monitoring is done by a small Go agent
                    installed on the machine itself; the server record tracks
                    the machine's identity, status, and metrics.
                </p>
                <p>
                    The Servers page is at <InlineCode>/servers</InlineCode>.
                </p>
            </Section>

            <Section title="Server statuses">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Pending Installation</strong> - server created,
                        no installation command generated yet.
                    </li>
                    <li>
                        <strong>Waiting for Installation</strong> - a provision
                        token has been generated; the agent has not installed.
                    </li>
                    <li>
                        <strong>Waiting for First Heartbeat</strong> - the agent
                        registered but has not sent its first heartbeat.
                    </li>
                    <li>
                        <strong>Online</strong> - the agent is reporting
                        heartbeats.
                    </li>
                    <li>
                        <strong>Offline</strong> - no heartbeat within the
                        offline threshold.
                    </li>
                    <li>
                        <strong>Archived</strong> - removed from active
                        monitoring.
                    </li>
                    <li>
                        <strong>Agent Uninstalled</strong> - the agent was
                        uninstalled; the installation guide reappears so you can
                        reinstall and resume monitoring.
                    </li>
                </ul>
            </Section>

            <Section title="Browsing servers">
                <p>
                    Servers are shown as a card grid with a status icon and
                    pill. Search matches server and client name. Filters (with
                    counts) cover all statuses above; a{" "}
                    <strong>View by Client</strong> dialog narrows the list to
                    one client. The list refreshes every 5 seconds and updates
                    live when a server's status changes.
                </p>
            </Section>

            <Section title="Creating a server">
                <p>
                    Click <strong>Add server</strong>. You'll be asked to select
                    a client first (the create page requires a{" "}
                    <InlineCode>client_uuid</InlineCode>). Then fill in:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Server name</strong> (required)
                    </li>
                    <li>
                        <strong>Subscription Fee</strong> (₱ / mo, optional -
                        used in client and general reports)
                    </li>
                    <li>
                        <strong>Description</strong> (optional, max 255
                        characters)
                    </li>
                </ul>
                <p>
                    After creating, the page opens the server detail with the{" "}
                    <strong>Agent Installation Guide</strong> - that's the next
                    step.
                </p>
                <DocImage
                    src="/images/screate.gif"
                    alt="Create server walkthrough"
                />
            </Section>

            <Section title="Installing the agent">
                <p>
                    To start monitoring, you must install the agent on the
                    machine. The server detail page shows the{" "}
                    <strong>Agent Installation Guide</strong> while the server
                    is in <em>pending installation</em> or{" "}
                    <em>waiting for installation</em>.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        Click <strong>Generate Installation Command</strong>.
                        The backend creates a provision token (valid for 1 hour)
                        and produces one-liner commands for the target OS.
                    </li>
                    <li>Run the appropriate command on the machine:</li>
                </ol>
                <CodeBlock>{`# Linux
sudo curl -fsSL {APP_URL}/install/linux | sudo bash -s -- <TOKEN>

# Windows (PowerShell, as Administrator)
powershell -ExecutionPolicy Bypass -Command "irm '{APP_URL}/install/windows.ps1' -OutFile $env:TEMP\\monitor-install.ps1; & $env:TEMP\\monitor-install.ps1 -ProvisionToken '<TOKEN>'"`}</CodeBlock>
                <p>
                    The installer downloads the agent binary, verifies its
                    SHA-256 checksum, writes a bootstrap file, and installs it
                    as a system service (<InlineCode>monitor-agent</InlineCode>{" "}
                    on Linux, <InlineCode>MonitorAgent</InlineCode> on Windows).
                </p>
                <p>
                    The token has a live countdown and can be{" "}
                    <strong>Regenerated</strong> if it expires. The agent then
                    registers itself with the backend - the server moves to{" "}
                    <em>waiting for heartbeat</em>, then <em>online</em> once
                    the first heartbeat arrives (default every 5 seconds).
                </p>
                <Callout>
                    The provision token expires after 1 hour. If it expires
                    before you finish installing, generate a new one.
                </Callout>
                <DocImage
                    src="/images/sinstall.gif"
                    alt="Agent installation walkthrough"
                />
            </Section>

            <Section title="Server details">
                <p>The server detail page has four tabs:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Info</strong> - edit the server name and
                        description inline, and see hardware specs (CPU model,
                        cores, RAM, disk, OS) once the agent reports them.
                    </li>
                    <li>
                        <strong>Metrics</strong> (once installed) - Top
                        Processes (PID, name, CPU %, RAM MB), Exposed Ports
                        (with per-port ping status), and System Resources: CPU,
                        Memory, Net In, Net Out, and Disk charts with time-range
                        presets from 1H up to 12Y plus a custom range. Charts
                        stream live via WebSocket.
                    </li>
                    <li>
                        <strong>Alerts</strong> - choose the alert scope (
                        Global / Client / Server) and edit this server's alert
                        configuration (see Settings → Alert Configs).
                    </li>
                    <li>
                        <strong>Agent</strong> - the installed agent's
                        properties: version, heartbeat/metrics/port/service/
                        process scan intervals, update channel, auto-update
                        flag, first registration, and last heartbeat. Also
                        includes{" "}
                        <strong>Agent Recovery & Force Reinstall</strong> to
                        re-provision and restore agent services with the
                        existing installation UUID if files were deleted on the
                        host.
                    </li>
                </ul>
                <DocImage
                    src="/images/sdetails.gif"
                    alt="Server details walkthrough"
                />
            </Section>

            <Section title="Deleting a server">
                <p>
                    Use the <strong>Danger Zone</strong> at the bottom of the
                    Info tab. Deleting permanently stops monitoring and removes
                    all collected metrics. If the agent is still installed, the
                    page shows the exact uninstall command for the server's OS
                    and requires you to uninstall the agent before deletion is
                    allowed. You must type the server name to confirm.
                </p>
                <DocImage
                    src="/images/cdelete.gif"
                    alt="Client delete walkthrough"
                />
            </Section>
        </>
    );
}

export function DocsUsersContent() {
    return (
        <>
            <Section title="What is a user?">
                <p>
                    Users are accounts that can sign in to the system. A user
                    becomes a <strong>SecOps</strong> member by being assigned
                    to a client (from the client's Sec Ops tab). There is no
                    separate role picker - assignment to a client is what makes
                    a user SecOps.
                </p>
                <p>
                    The Users page is at <InlineCode>/users</InlineCode> ("User
                    Management").
                </p>
            </Section>

            <Section title="Browsing users">
                <p>
                    Users are shown as a grid of profile cards (avatar, full
                    name, email, phone). Search matches name, email, or
                    username. Filter tabs: All, Active, Archived. Sort by
                    created date, name, email, or username.
                </p>
            </Section>

            <Section title="Creating a user">
                <p>
                    Click <strong>Add user</strong> or open{" "}
                    <InlineCode>/users/create</InlineCode>. Fields:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Avatar</strong> (optional - JPEG, PNG, JPG, GIF,
                        WebP)
                    </li>
                    <li>
                        <strong>First name</strong> and{" "}
                        <strong>Last name</strong> (required)
                    </li>
                    <li>
                        <strong>Email Address</strong> (required, valid email)
                    </li>
                    <li>
                        <strong>Username</strong> (required, letters/numbers/
                        dots)
                    </li>
                    <li>
                        <strong>Phone Number</strong> (required, Philippine
                        format: 11 digits starting with 09)
                    </li>
                    <li>
                        <strong>Timezone</strong> (required - used to localize
                        alert notification timestamps; defaults to the browser's
                        timezone)
                    </li>
                    <li>
                        <strong>Password</strong> (required on create, optional
                        on edit - at least 8 characters with uppercase, number,
                        and symbol for "Strong")
                    </li>
                    <li>
                        <strong>Confirm password</strong>
                    </li>
                </ul>
                <DocImage
                    src="/images/ucreate.gif"
                    alt="Create user walkthrough"
                />
            </Section>

            <Section title="User details">
                <p>
                    The detail page shows an Active/Inactive badge and two tabs:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Details</strong> - Basic Information (email,
                        username, phone), timezone, and change-password section.
                    </li>
                    <li>
                        <strong>Clients</strong> - the client assignments for
                        this user. Use <strong>Assign Client</strong> to search
                        and assign, and <strong>Remove</strong> to unassign.
                        Users assigned to a client appear in that client's Sec
                        Ops tab.
                    </li>
                </ul>
                <DocImage
                    src="/images/udetails.gif"
                    alt="User details walkthrough"
                />
            </Section>

            <Section title="Deleting a user">
                <p>
                    Use the card's kebab menu → <strong>Remove User</strong>.
                    Type the user's full name to confirm. The account is
                    permanently removed.
                </p>
                <DocImage
                    src="/images/udelete.gif"
                    alt="Delete user walkthrough"
                />
            </Section>
        </>
    );
}

export function DocsLogsContent() {
    return (
        <>
            <Section title="What are logs?">
                <p>
                    The Logs page (<InlineCode>/logs</InlineCode>) is an audit
                    trail of everything that happens in the system - server
                    lifecycle events, provisioning, alerts, auth events, user
                    and client changes, and more.
                </p>
            </Section>

            <Section title="Five log tabs">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Activity</strong> - general activity logs
                        (server/client/user lifecycle, provisioning, alert
                        notifications).
                    </li>
                    <li>
                        <strong>Server Health</strong> - server status
                        transitions and health events.
                    </li>
                    <li>
                        <strong>Agent</strong> - agent installation and update events.
                    </li>
                    <li>
                        <strong>File Activity</strong> - server files activity.
                    </li>
                    <li>
                        <strong>Agent Lifecycle</strong> - agent status reports (e.g., started, unexpectedly disconnected).
                    </li>
                </ul>
            </Section>

            <Section title="Reading a log entry">
                <p>
                    Each tab shows a table with sortable columns:{" "}
                    <strong>Timestamp</strong>, <strong>Subject</strong> (the
                    affected entity), <strong>User</strong> (who performed the
                    action, or "System"), and <strong>Action</strong> (a colored
                    badge: created, updated, deleted, and more). Click{" "}
                    <strong>View</strong> on a row to open the full entry:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>Message and formatted timestamp.</li>
                    <li>
                        Subject with a link to the related server or user where
                        applicable.
                    </li>
                    <li>
                        Provision Details for "generate installation command"
                        entries (server link, token expiration, generated by).
                    </li>
                    <li>
                        Extra Details as key/value pairs, plus the{" "}
                        <strong>Raw JSON Payload</strong> for developers.
                    </li>
                </ul>
            </Section>
        </>
    );
}

export function DocsReportsContent() {
    return (
        <>
            <Section title="What are reports?">
                <p>
                    The Reports page (<InlineCode>/report</InlineCode>) compiles
                    professional PDF reports server-side using the Typst engine.
                    Reports are great for sharing performance and SLA summaries
                    with clients. A PDF preview renders inline, and you can
                    download it from the browser.
                </p>
            </Section>

            <Section title="Three report scopes">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Global</strong> - a system-wide general report
                        covering every client and server (no selection needed).
                    </li>
                    <li>
                        <strong>Clients</strong> - pick one or more clients to
                        generate a client report per client (one page each in
                        multi-reports).
                    </li>
                    <li>
                        <strong>Servers</strong> - pick one or more servers for
                        a per-server report (one page each in multi-reports).
                    </li>
                </ul>
            </Section>

            <Section title="Generating a report">
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        Switch to the <strong>Clients</strong> or{" "}
                        <strong>Servers</strong> tab and click{" "}
                        <strong>Select Servers / Select Clients</strong>.
                    </li>
                    <li>
                        In the picker, search or use <strong>Select all</strong>
                        , then click <strong>Generate Report</strong> with the
                        entities checked.
                    </li>
                    <li>
                        Choose an <strong>orientation</strong> (Landscape /
                        Portrait, default Portrait) and optional status{" "}
                        <strong>Filter</strong> (Online / Offline / Production /
                        Staging / Development).
                    </li>
                    <li>
                        The report compiles automatically and shows as an inline
                        PDF. If the browser can't render it, use the{" "}
                        <strong>Download the PDF</strong> fallback link.
                    </li>
                </ol>
                <Callout>
                    Report compilation requires the Typst CLI to be installed on
                    the backend server. Metrics windows use the last 24 hours by
                    default (1–168 hours supported).
                </Callout>
            </Section>

            <Section title="Report Glossary & Definitions">
                <ul className="list-disc pl-5 space-y-3">
                    <li>
                        <strong>KPI (Key Performance Indicator)</strong>: Quantifiable metrics used to track and measure critical business and operational performance. Includes the KPI summary (servers, clients, users, alerts, budget vs. subscription fee), servers needing attention, 7-day metrics, top CPU usage, most alerts, highest cost rankings, recent clients and servers, and diagnostic insights.
                    </li>
                    <li>
                        <strong>SLA (Service Level Agreement)</strong>: A commitment defining the expected level of service availability and reliability, monitored here through the SLA uptime dashboard.
                    </li>
                </ul>
            </Section>

            <Section title="What each report contains">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Global</strong> - KPI summary (servers, clients,
                        users, alerts, budget vs. subscription fee), servers
                        needing attention, 7-day metrics, top CPU / most alerts
                        / highest cost rankings, SLA uptime dashboard, recent
                        clients and servers, and diagnostic insights.
                    </li>
                    <li>
                        <strong>Client</strong> - contact info, KPI summary
                        (servers, online/offline, alerts, avg CPU/memory,
                        budget, fees), a servers table, SLA uptime bars, metrics
                        chart, and insights.
                    </li>
                    <li>
                        <strong>Server</strong> - hardware info, last-24-hour
                        metric summary (min/max/avg), SLA uptime percentage, CPU
                        chart, 7-day trends, and insights.
                    </li>
                    <li>
                        <strong>Multi-reports</strong> - the same content, one
                        page per selected server or client with a page numbering
                        reset.
                    </li>
                </ul>
            </Section>
        </>
    );
}

export function DocsSettingsContent() {
    return (
        <>
            <Section title="The Settings hub">
                <p>
                    Settings is at <InlineCode>/settings</InlineCode> and links
                    to every configuration area: Profile, Sessions & Devices,
                    System Settings, Agent Settings, Alert Configs, System
                    Pipeline Visualizer, and Docs.
                </p>
            </Section>

            <Section title="Profile">
                <p>
                    Update your personal information: avatar, first/last name,
                    email, username, phone number, and timezone (used to
                    localize alert timestamps). You can also change your
                    password here - leave the password fields blank to keep the
                    current one.
                </p>
            </Section>

            <Section title="Sessions & Devices">
                <p>
                    Manage where your account is signed in. Summary cards show
                    active sessions, the current device, last activity, and
                    security status. You can revoke a session ("Disconnect
                    device"), sign out all other sessions, purge revoked or
                    compromised records permanently, and review the last 10
                    security events (logins, logouts, session revocations,
                    compromised sessions, token reuse).
                </p>
            </Section>

            <Section title="System Settings">
                <p>
                    A single configurable value: the{" "}
                    <strong>SecOps limit per client</strong> (1–50, default 2).
                    This caps how many SecOps users can be assigned to one
                    client. Lowering the limit does not remove existing
                    assignments - it only blocks new ones that exceed it. Saving
                    System Settings is admin-only.
                </p>
            </Section>

            <Section title="Agent Settings">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Heartbeat Interval</strong> - how often agents
                        send heartbeats (default 5s; must be ≤ offline
                        threshold).
                    </li>
                    <li>
                        <strong>Offline Threshold</strong> - time without a
                        heartbeat before a server is marked offline (default
                        15s; must be ≥ heartbeat interval).
                    </li>
                    <li>
                        <strong>Port Ping Interval</strong> - how often the
                        backend TCP-pings exposed ports (default 60s).
                    </li>
                    <li>
                        <strong>Latest Agent Version</strong> - the current
                        agent binary version. Changing it triggers self-update
                        downloads on running agents.
                    </li>
                    <li>
                        <strong>Data Retention</strong> - how long the system
                        keeps high-volume, low-retention data (agent
                        heartbeats, metric samples, and file activity events;
                        default 60 days / 2 months). Older rows are deleted
                        automatically each day by a scheduled cleanup. Agent
                        logs and other important records - CRUD operations,
                        install/uninstall events - are never removed.
                    </li>
                </ul>
                <p>
                    A heartbeat-interval change is pushed to all connected
                    agents immediately over the WebSocket control channel.
                </p>
            </Section>

            <Section title="Alert Configs">
                <p>
                    The Alert Configs page is the visual editor for the alerting
                    engine - see the dedicated{" "}
                    <strong>Alert Config Editor</strong> section for a full
                    walkthrough of the editor and every node type. This is the
                    most complex part of the system, so take your time there.
                </p>
                <p>
                    Configs exist at three scopes and are resolved per server:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <strong>Server</strong> config if the server's scope is
                        Server and it has nodes.
                    </li>
                    <li>
                        <strong>Client</strong> config (if the server's scope is
                        Client, or no server config).
                    </li>
                    <li>
                        <strong>Global</strong> config as the final fallback.
                    </li>
                </ol>
                <p>
                    When a client/server config is first opened and empty, the
                    global config is copied in as a starting point. The
                    recommended pattern is a global config with default
                    thresholds, then per-server overrides where machines need
                    tighter or looser alerts.
                </p>
            </Section>

            <Section title="System Pipeline Visualizer">
                <p>
                    A live ecosystem map of the monitoring pipeline: agent
                    heartbeats, metrics flow, backend alert evaluation (FSM),
                    and scheduled timers. It shows current stats (heartbeats,
                    system sweeps, active timers, notifications), live backend
                    timers with countdowns, and a live event stream. You can
                    pause/resume the pipeline and sync state - useful for
                    debugging alert timing.
                </p>
                <p>
                    The visualizer is <strong>opt-in and off by default</strong>{" "}
                    so the backend emits no telemetry in normal operation. To
                    enable it locally, set{" "}
                    <InlineCode>ALERTS_VISUAL_DEBUGGER=true</InlineCode> in the
                    root <InlineCode>.env.development</InlineCode> (or the local .env.). This single flag
                    gates the <InlineCode>/node-configs/telemetry-state</InlineCode>{" "}
                    endpointend all realtime broadcasts,and the{" "}
                    <InlineCode>/settings/alerts/debugger</InlineCode> route (it is
                    injected as <InlineCode>VITE_ALERTS_VISUAL_DEBUGGER</InlineCode>).
                </p>
                <p>
                    The feature is modular: the frontend is split into{" "}
                    <InlineCode>useTelemetry</InlineCode> (state + realtime
                    wiring), <InlineCode>PipelineBoard</InlineCode>,{" "}
                    <InlineCode>ParticleCanvas</InlineCode>,{" "}
                    <InlineCode>StatsBar</InlineCode>,{" "}
                    <InlineCode>EventStreamPanel</InlineCode>,{" "}
                    <InlineCode>OfflineServersPanel</InlineCode>, and{" "}
                    <InlineCode>EventDetailsModal</InlineCode> under{" "}
                    <InlineCode>pages/settings/alerts/</InlineCode>; the backend
                    snapshot is built by{" "}
                    <InlineCode>TelemetrySnapshot</InlineCode> and gated through{" "}
                    <InlineCode>config("telemetry.enabled")</InlineCode>.
                </p>
            </Section>
        </>
    );
}

export function DocsAlertConfiguratorContent() {
    return (
        <>
            <Section title="What is the alert config editor?">
                <p>
                    The alerting system is configured visually as a{" "}
                    <strong>node graph</strong> - a pipeline where{" "}
                    <strong>metrics</strong> flow through{" "}
                    <strong>conditions</strong> and <strong>time gates</strong>{" "}
                    and eventually trigger <strong>notifications</strong>. You
                    build the graph by dragging nodes onto a canvas and wiring
                    them together.
                </p>
                <p>The same editor is used everywhere a config exists:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Global</strong> - Settings → Alert Configs.
                    </li>
                    <li>
                        <strong>Client</strong> - a client's Alerts tab.
                    </li>
                    <li>
                        <strong>Server</strong> - a server's Alerts tab.
                    </li>
                </ul>
                <p>
                    Each scope stores its own config; see Alert scopes below for
                    how they resolve.
                </p>
            </Section>

            <Section title="The editor layout">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Node palette</strong> (left) - node types
                        grouped by category: <strong>Metrics</strong> (blue),{" "}
                        <strong>Compare</strong> (amber), <strong>Logic</strong>{" "}
                        (violet), <strong>Time</strong> (green),{" "}
                        <strong>Actions</strong> (red). Drag items onto the
                        canvas or click to add.
                    </li>
                    <li>
                        <strong>Canvas</strong> - dotted background,
                        snap-to-grid, zoom controls, a minimap, and box-select.{" "}
                        <InlineCode>Ctrl+A</InlineCode> selects everything;{" "}
                        <InlineCode>Delete</InlineCode>/
                        <InlineCode>Backspace</InlineCode> deletes the
                        selection.
                    </li>
                    <li>
                        <strong>Undo/Redo</strong> - toolbar with an action
                        history dropdown; shortcuts{" "}
                        <InlineCode>Ctrl+Z</InlineCode>,{" "}
                        <InlineCode>Ctrl+Shift+Z</InlineCode>,{" "}
                        <InlineCode>Ctrl+Y</InlineCode>.
                    </li>
                    <li>
                        <strong>Wiring</strong> - drag from a node's output
                        socket to a compatible input socket. Socket types
                        (number, boolean, string, event, severity) must match
                        unless the target accepts anything.
                    </li>
                    <li>
                        <strong>Save / Preview</strong> - Save persists the
                        config (enabled only when you have changes); Preview
                        compiles the graph and shows the resulting JSON.
                    </li>
                </ul>
            </Section>

            <Section title="Building an alert - step by step">
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <strong>Start with a Metric node.</strong> Pick the
                        metric you care about (e.g. CPU usage).
                    </li>
                    <li>
                        <strong>Compare it.</strong> Wire the metric into a
                        Compare node and set an operator (e.g. greater than) and
                        threshold (e.g. 85).
                    </li>
                    <li>
                        <strong>Add a time gate.</strong> Wire the comparison
                        into a Sustained node so a single spike doesn't page you
                        (e.g. sustained for 5 minutes).
                    </li>
                    <li>
                        <strong>Optionally repeat.</strong> Drop the Repeat
                        capability onto the time node to resend reminders on an
                        interval.
                    </li>
                    <li>
                        <strong>Notify.</strong> Wire the gate into a Notify
                        node, choose the channel (Email, SMS, or Discord), and
                        write the subject/message using template variables.
                    </li>
                    <li>
                        <strong>Save.</strong> Evaluation starts on the next
                        monitor sweep (every minute).
                    </li>
                </ol>
                <Callout>
                    New to this? Open the Global config first - it's seeded with
                    a working example (CPU/memory/disk/network above 85%, email
                    after 10s/20s, Discord after 30s, plus a server-offline
                    branch). Study it before building your own.
                </Callout>
            </Section>

            <Section title="Node reference">
                <SubSection title="Metric (blue) - entry point">
                    <p>
                        Reads a value from the server. Choose the metric type:
                        CPU usage, memory usage, disk usage, network usage,
                        server status, heartbeat age, or ports ping. CPU/memory/
                        disk/network output a numeric value; server status
                        outputs Online/Offline booleans; ports ping outputs
                        timing plus an Offline flag.
                    </p>
                </SubSection>

                <SubSection title="Compare (amber)">
                    <p>
                        A condition with operators: greater than, greater than
                        or equal, less than, less than or equal, equal, or
                        between. Set a threshold (plus min/max for "between").
                        Outputs a boolean. Multiple metrics wired into one
                        Compare behave as <strong>OR</strong> - any metric
                        exceeding the threshold makes it true.
                    </p>
                </SubSection>

                <SubSection title="Logic (violet)">
                    <p>
                        AND / OR / NOT over unlimited boolean inputs. Useful for
                        combining conditions (e.g. CPU high AND disk high).
                    </p>
                </SubSection>

                <SubSection title="Severity">
                    <p>
                        Tags a result with a severity level - notice, warning,
                        or critical - used in notification templates.
                    </p>
                </SubSection>

                <SubSection title="Sustained (green) - time gate">
                    <p>
                        Requires the condition to hold continuously for a
                        duration before propagating. Settings:{" "}
                        <InlineCode>duration</InlineCode> (default 5 minutes)
                        and <InlineCode>min_match_percent</InlineCode> - the
                        minimum percentage of samples that must violate the
                        threshold within the window (default 100%; set 80 to
                        tolerate brief dips). Sustained nodes have Chain In /
                        Chain Out handles so you can stack them (e.g. 10s → 20s
                        → 30s).
                    </p>
                </SubSection>

                <SubSection title="Check After (green) - delay">
                    <p>
                        Delays propagation for a fixed duration and cancels if
                        the input goes false before it fires. Good for
                        debouncing - e.g. wait 10 seconds before alerting that a
                        server is offline, to avoid flapping.
                    </p>
                </SubSection>

                <SubSection title="Repeat (capability)">
                    <p>
                        Repeat is not a standalone node - it's a capability you{" "}
                        <strong>drop onto a time node</strong> (Sustained or
                        Check After). It injects an interval and a repeat cap ({" "}
                        <InlineCode>inf</InlineCode> = endless). After the
                        initial trigger, notifications resend on the interval
                        until the condition clears.
                    </p>
                </SubSection>

                <SubSection title="Template Input (violet)">
                    <p>
                        Emits a value resolved from the evaluation context by
                        key. Use it to parameterize compare thresholds from a
                        template value.
                    </p>
                </SubSection>

                <SubSection title="Notify (red) - terminal">
                    <p>
                        Sends a notification when its boolean input is true.
                        This node has no output. Channel options:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>Email</strong> - channel, severity, subject,
                            message.
                        </li>
                        <li>
                            <strong>SMS</strong> - channel, severity, message.
                        </li>
                        <li>
                            <strong>Discord</strong> - channel, severity, bot
                            token, channel ID, optional role ID, message.
                        </li>
                    </ul>
                    <p>
                        The message field is required and supports the template
                        variables below.
                    </p>
                </SubSection>
            </Section>

            <Section title="Alert scopes & resolution">
                <p>
                    Each server resolves its config by scope, most specific
                    first:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <strong>Server</strong> config (when the server's scope
                        is set to Server and it has nodes).
                    </li>
                    <li>
                        <strong>Client</strong> config (server scope is Client,
                        or no server config exists).
                    </li>
                    <li>
                        <strong>Global</strong> config as the final fallback.
                    </li>
                </ol>
                <p>
                    The scope is chosen per server (Global / Client / Server) on
                    its Alerts tab and per client (Global / Client) on its
                    Alerts tab. When you first open a client or server config
                    that is empty, the global config is copied in as a starting
                    point. Recommended: build defaults globally, then override
                    per server where machines need tighter or looser alerts.
                </p>
            </Section>

            <Section title="Durations">
                <p>
                    Time settings accept human-readable durations:{" "}
                    <InlineCode>30</InlineCode> (30s),{" "}
                    <InlineCode>5m</InlineCode>, <InlineCode>1h30m</InlineCode>,{" "}
                    <InlineCode>2d6h</InlineCode>, <InlineCode>1w2d</InlineCode>{" "}
                    - units s, m, h, d, w, mo (30 days), y. Values are stored
                    and transmitted as milliseconds internally.
                </p>
            </Section>

            <Section title="Template variables">
                <p>
                    Subject and message fields autocomplete when you type{" "}
                    <InlineCode>{"{"}</InlineCode>. Three groups are available:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>server.*</strong> - name, host name, CPU model,
                        OS, status, uptime, and more.
                    </li>
                    <li>
                        <strong>server.client.*</strong> - client name,
                        location, email, budget, subscription fee, and more.
                    </li>
                    <li>
                        <strong>metric.*</strong> - the triggering sample:
                        timestamp, cpu, memory, netIn, netOut, disk.
                    </li>
                    <li>
                        <strong>runtime.*</strong> - severity, metric name,
                        sustain value, event timestamps, offline duration, port
                        and ping, threshold, and repeat counts.
                    </li>
                </ul>
                <p>
                    Typing <InlineCode>{"<"}</InlineCode> inserts Discord tags
                    like <InlineCode>discord-button</InlineCode>,{" "}
                    <InlineCode>discord-embed</InlineCode>,{" "}
                    <InlineCode>if-repeat</InlineCode>, and{" "}
                    <InlineCode>discord-footer</InlineCode>. For Discord,{" "}
                    <InlineCode>
                        {"<t:{runtime.eventTimestampUnix}:f>"}
                    </InlineCode>{" "}
                    renders the timestamp in each viewer's local timezone.
                </p>
            </Section>
        </>
    );
}
