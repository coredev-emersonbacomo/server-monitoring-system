import { Section, SubSection, CodeBlock, InlineCode, Callout } from "./Section";
import { DocsGmailSmtpContent } from "./DocsGmailSmtpContent";
import { DocsDiscordNotificationsContent } from "./DocsDiscordNotificationsContent";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export function DocsOverviewContent() {
    return (
        <>
            <Section title="What is this system?">
                <p>
                    The Server Monitoring System is a client-facing infrastructure
                    monitoring platform for managed environments. It gives SecOps
                    teams a single operational view across many client-owned
                    servers, with each host running a lightweight Go agent that
                    reports CPU, memory, disk, network, process, and port
                    telemetry to a central Laravel backend. Live metrics are
                    streamed to the dashboard, stored in a time-series database,
                    and used for alert evaluation, historical analysis, and PDF
                    reporting.
                </p>
                <p>The system is a monorepo with four main pieces:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>Laravel backend</InlineCode> - client and
                        server management, REST APIs, realtime broadcast channels,
                        alert evaluation, scheduled jobs, and report generation.
                    </li>
                    <li>
                        <InlineCode>React SPA</InlineCode> (in{" "}
                        <InlineCode>frontend/</InlineCode>) - the operational
                        dashboard and admin surfaces used by SecOps teams.
                    </li>
                    <li>
                        <InlineCode>Go agent</InlineCode> (in{" "}
                        <InlineCode>resources/agent/go</InlineCode>) - installed
                        on each monitored host to collect telemetry and report
                        health back to the backend.
                    </li>
                    <li>
                        <InlineCode>
                            PostgreSQL (TimescaleDB) + Redis + Reverb
                        </InlineCode>{" "}
                        - time-series storage, queue/cache infrastructure, and
                        realtime event delivery.
                    </li>
                </ul>
            </Section>

            <Section title="Who is it for?">
                <p>
                    The primary users are <strong>SecOps teams</strong> who
                    monitor servers owned by one or more clients. Users are
                    assigned to clients; each client has a limit on how many
                    SecOps users can be assigned (configurable in System
                    Settings). The dashboard surfaces alerts and action items,
                    while reports provide shareable PDF summaries.
                </p>
            </Section>

            <Section title="How this documentation is organized">
                <p>
                    The docs are split into three groups that map to how you
                    will use the system:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Deployment Guide</strong> - prerequisites,
                        installation, configuration, and running the application
                        (this section).
                    </li>
                    <li>
                        <strong>User Guide</strong> - a walkthrough of the app:
                        the dashboard, then each management page (clients,
                        servers, users), logs, reports, and settings.
                    </li>
                    <li>
                        <strong>Technical Reference</strong> - architecture, the
                        alerting engine, storage providers, the agent, and
                        background scheduling.
                    </li>
                </ul>
            </Section>
        </>
    );
}

export function DocsRequirementsContent() {
    const navigate = useNavigate();
    const go = (id: string) => {
        navigate(`/docs/${id}`);
    };

    return (
        <>
            <Section title="Development workflows">
                <p>
                    You can run the system using either Herd (native) or Docker
                    (containerized). Choose the workflow that best fits your
                    preferences and environment.
                </p>
                <p>
                    Unless a step says otherwise, run every command from the
                    repo root (the folder you cloned). First clone: run{" "}
                    <InlineCode>npm run setup</InlineCode> once (
                    <InlineCode>composer install</InlineCode> +{" "}
                    <InlineCode>npm install</InlineCode>), then pick a workflow
                    below.
                </p>

                <Section title="Option A: Ngrok Tunnel Deployment (Recommended)">
                    <p>
                        Host the app locally using ngrok.
                        Comply the requirements that is needed.
                        Run this in terminal or cmd, make sure that npm is in PATH <InlineCode>npm run host</InlineCode>.
                        This tunnels automatically to the specified ngrok_url in environment.
                        The <strong>NGROK_DOMAIN</strong> can be changed into a real domain (<strong>if you own one</strong>).
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>Laravel (13.21.1 or later)</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://laravel.com/framework/docs/13.x/installation"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Install Laravel
                            </a>{" "}
                            (includes PHP 8.5+)
                        </li>
                        <li>
                            <strong>Ngrok</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="#running#pre-production-testing-with-ngrok"
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => go("running#pre-production-testing-with-ngrok")}
                            >
                                Setup
                            </a>{" "}
                            follow the documentation for setting up NGROK_DOMAIN.
                        </li>
                        <li>
                            <strong>Node.js</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://nodejs.org/en/download"
                                target="_blank"
                                rel="noreferrer"
                            >
                                download Node.js 22 LTS
                            </a>{" "}
                            (for Vite dev servers)
                        </li>
                        <li>
                            <strong>Redis</strong> - run{" "}
                            <InlineCode>
                                npm run install-redis:windows
                            </InlineCode>{" "}
                            (fetches the{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://github.com/redis-windows/redis-windows"
                                target="_blank"
                                rel="noreferrer"
                            >
                                redis-windows
                            </a>{" "}
                            build to{" "}
                            <InlineCode>C:\redis\redis-server.exe</InlineCode>,
                            which the dev tooling uses automatically)
                        </li>
                        <li>
                            <strong>PostgreSQL 17</strong> -{" "}
                            plus TimescaleDB (<strong>Important</strong>) per the {" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://docs.timescale.com/self-hosted/latest/install/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                self-hosted install docs
                            </a>
                        </li>
                        <li>
                            <strong>Git</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://git-scm.com/downloads"
                                target="_blank"
                                rel="noreferrer"
                            >
                                download Git
                            </a>{" "}
                            to clone the repository.
                        </li>
                        <li>
                            <strong>Typst</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://github.com/typst/typst/releases"
                                target="_blank"
                                rel="noreferrer"
                            >
                                download Typst
                            </a>{" "}
                            for PDF report compilation.{" "}
                            <strong>Windows:</strong> download the latest{" "}
                            <InlineCode>
                                typst-x86_64-pc-windows-msvc.zip
                            </InlineCode>
                            , extract it, and add the folder containing{" "}
                            <InlineCode>typst.exe</InlineCode> to your{" "}
                            <InlineCode>PATH</InlineCode> (search &quot;Edit
                            environment variables for your account&quot; in
                            Windows Settings, edit <InlineCode>Path</InlineCode>{" "}
                            under User variables, click New, and paste the
                            folder path). Alternatively, install via winget:{" "}
                            <InlineCode>winget install Typst.Typst</InlineCode>.{" "}
                            <strong>macOS:</strong>{" "}
                            <InlineCode>brew install typst</InlineCode>.{" "}
                            <strong>Linux:</strong>{" "}
                            <InlineCode>
                                cargo install --locked typst-cli
                            </InlineCode>{" "}
                            or download the{" "}
                            <InlineCode>
                                typst-x86_64-unknown-linux-musl.tar.xz
                            </InlineCode>{" "}
                            from the releases page, extract it, and copy{" "}
                            <InlineCode>typst</InlineCode> to{" "}
                            <InlineCode>/usr/local/bin/</InlineCode>. Verify
                            with <InlineCode>typst --version</InlineCode>.
                        </li>
                    </ul>
                </Section>

                <Section title="Option B: Herd (Native - Windows/macOS)">
                    <p>
                        Herd provides a native development experience with zero
                        Docker configuration. Ideal for quick iteration on
                        Windows and macOS.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>Laravel Herd</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://herd.laravel.com"
                                target="_blank"
                                rel="noreferrer"
                            >
                                download Herd
                            </a>{" "}
                            (includes PHP 8.5+)
                        </li>
                        <li>
                            <strong>Node.js</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://nodejs.org/en/download"
                                target="_blank"
                                rel="noreferrer"
                            >
                                download Node.js 22 LTS
                            </a>{" "}
                            (for Vite dev servers)
                        </li>
                        <li>
                            <strong>Redis</strong> - run{" "}
                            <InlineCode>
                                npm run install-redis:windows
                            </InlineCode>{" "}
                            (fetches the{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://github.com/redis-windows/redis-windows"
                                target="_blank"
                                rel="noreferrer"
                            >
                                redis-windows
                            </a>{" "}
                            build to{" "}
                            <InlineCode>C:\redis\redis-server.exe</InlineCode>,
                            which the dev tooling uses automatically)
                        </li>
                        <li>
                            <strong>PostgreSQL 17</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://www.postgresql.org/download/windows/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Windows installer
                            </a>{" "}
                            plus TimescaleDB per the{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://docs.timescale.com/self-hosted/latest/install/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                self-hosted install docs
                            </a>
                        </li>
                        <li>
                            <strong>Git</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://git-scm.com/downloads"
                                target="_blank"
                                rel="noreferrer"
                            >
                                download Git
                            </a>{" "}
                            to clone the repository.
                        </li>
                        <li>
                            <strong>Typst</strong> -{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://github.com/typst/typst/releases"
                                target="_blank"
                                rel="noreferrer"
                            >
                                download Typst
                            </a>{" "}
                            for PDF report compilation.{" "}
                            <strong>Windows:</strong> download the latest{" "}
                            <InlineCode>
                                typst-x86_64-pc-windows-msvc.zip
                            </InlineCode>
                            , extract it, and add the folder containing{" "}
                            <InlineCode>typst.exe</InlineCode> to your{" "}
                            <InlineCode>PATH</InlineCode> (search &quot;Edit
                            environment variables for your account&quot; in
                            Windows Settings, edit <InlineCode>Path</InlineCode>{" "}
                            under User variables, click New, and paste the
                            folder path). Alternatively, install via winget:{" "}
                            <InlineCode>winget install Typst.Typst</InlineCode>.{" "}
                            <strong>macOS:</strong>{" "}
                            <InlineCode>brew install typst</InlineCode>.{" "}
                            <strong>Linux:</strong>{" "}
                            <InlineCode>
                                cargo install --locked typst-cli
                            </InlineCode>{" "}
                            or download the{" "}
                            <InlineCode>
                                typst-x86_64-unknown-linux-musl.tar.xz
                            </InlineCode>{" "}
                            from the releases page, extract it, and copy{" "}
                            <InlineCode>typst</InlineCode> to{" "}
                            <InlineCode>/usr/local/bin/</InlineCode>. Verify
                            with <InlineCode>typst --version</InlineCode>.
                        </li>
                    </ul>
                </Section>

                <Section title="Option C: Docker (Containerized - Any OS)">
                    <p>
                        Docker provides a consistent, isolated environment with
                        a single command to start the full stack. No host-level
                        service installation required beyond Docker itself.
                        Install Docker first, then verify the CLI is on PATH
                        before continuing to Installation below.
                    </p>
                    <SubSection title="Windows: enable virtualization, then WSL2, then Docker Desktop">
                        <ol className="list-decimal pl-5 space-y-1.5">
                            <li>
                                Check Task Manager &gt; Performance &gt; CPU:{" "}
                                <InlineCode>Virtualization</InlineCode> must say{" "}
                                <InlineCode>Enabled</InlineCode>. If it says{" "}
                                <InlineCode>Disabled</InlineCode>, reboot into
                                BIOS/UEFI and enable{" "}
                                <InlineCode>Intel VT-x</InlineCode> /{" "}
                                <InlineCode>AMD-V (SVM)</InlineCode>, then Save
                                &amp; Exit. No Windows command can bypass this
                                step.
                            </li>
                            <li>
                                In an elevated PowerShell, enable WSL2 and
                                reboot when asked:
                            </li>
                        </ol>
                        <CodeBlock>{`wsl --install --no-distribution
# after reboot:
wsl --update
wsl --set-default-version 2
wsl -l -v   # distro list should show VERSION 2`}</CodeBlock>
                        <ol className="list-decimal pl-5 space-y-1.5" start={3}>
                            <li>
                                Install{" "}
                                <a
                                    className="text-blue-600 dark:text-blue-400 underline"
                                    href="https://www.docker.com/products/docker-desktop/"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Docker Desktop for Windows
                                </a>
                                , keeping{" "}
                                <InlineCode>
                                    Use WSL 2 instead of Hyper-V
                                </InlineCode>{" "}
                                checked. Then in Docker Desktop go to Settings
                                &gt; General &gt;{" "}
                                <InlineCode>
                                    Use the WSL 2 based engine
                                </InlineCode>{" "}
                                plus Resources &gt; WSL integration, and start
                                Docker Desktop.
                            </li>
                        </ol>
                    </SubSection>
                    <SubSection title="macOS: install Docker Desktop">
                        <p>
                            Download{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://www.docker.com/products/docker-desktop/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Docker Desktop for Mac
                            </a>{" "}
                            (pick Apple Silicon vs Intel), drag it to
                            Applications, open it, and accept the prompts.
                            Virtualization is handled by Apple&apos;s
                            Virtualization framework - no BIOS step.
                        </p>
                    </SubSection>
                    <SubSection title="Linux: install Engine + Compose plugin">
                        <p>
                            Install <InlineCode>docker engine</InlineCode> +{" "}
                            <InlineCode>docker compose plugin</InlineCode> from
                            your package manager per the{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://docs.docker.com/engine/install/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Engine install docs
                            </a>
                            , then enable and start the service. Add your user
                            to the <InlineCode>docker</InlineCode> group if you
                            want to run without <InlineCode>sudo</InlineCode>.
                        </p>
                    </SubSection>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>Git</strong> - to clone the repository.
                        </li>
                    </ul>
                    <Callout>
                        Downloading WSL alone is not enough on Windows: the
                        chain is BIOS virtualization → Windows features/WSL2 →
                        Docker Desktop with the WSL 2 engine. If Docker reports
                        virtualization is disabled, start at step 1 above, not
                        with a WSL reinstall.
                    </Callout>
                </Section>

                <p className="text-sm text-gray-500 mt-4">
                    Go toolchain is only needed to rebuild the monitoring agent
                    and is not required to run the system.
                </p>
            </Section>

            <Section title="Database requirements">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        The primary database is{" "}
                        <strong>PostgreSQL with TimescaleDB</strong>. The
                        scheduler refreshes Timescale continuous aggregates via{" "}
                        <InlineCode>agg:refresh</InlineCode>.
                    </li>
                    <li>
                        A schema snapshot can be dumped to{" "}
                        <InlineCode>
                            database/schema/pgsql-schema.sql
                        </InlineCode>{" "}
                        so the schema can be restored without re-running every
                        migration - but that directory is gitignored, so the
                        snapshot is local-only, never tracked.
                    </li>
                </ul>
                <Callout type="warning">
                    TimescaleDB is not optional - the aggregate-refresh command
                    queries{" "}
                    <InlineCode>
                        timescaledb_information.continuous_aggregates
                    </InlineCode>{" "}
                    and the reset-db script drops continuous aggregates before a
                    fresh migrate.
                </Callout>
            </Section>
        </>
    );
}

export function DocsInstallationContent() {
    return (
        <>
            <Section title="Installation">
                <p>Choose the setup flow that matches your environment:</p>

                <Section title="Option A: Herd (Native)">
                    <CodeBlock>{`# 1. Install prerequisites
# - Laravel Herd (includes PHP 8.5+)
# - Node.js v22+
# - Redis (or use C:\\redis\\redis-server.exe on Windows)
# - PostgreSQL with TimescaleDB extension
# - Typst CLI (report compilation) - see Requirements > Option A

# 2. Setup
npm run setup     # composer install + npm install (first time only)

# 3. Start development services
npm run dev       # redis + vite + reverb + queue + scheduler`}</CodeBlock>
                    <p>
                        Access the application at:{" "}
                        <InlineCode>
                            http://server-monitoring-system.test
                        </InlineCode>
                        <br />
                        Frontend dev server:{" "}
                        <InlineCode>http://localhost:5173</InlineCode>
                    </p>
                    <Callout>
                        The default credentials are{" "}
                        <InlineCode>user / user123</InlineCode> (UserSeeder -
                        there is no admin role). Change the password after first
                        login. Seeding is controlled by the{" "}
                        <InlineCode>SEED_ON_BOOT</InlineCode> flip switch:{" "}
                        <InlineCode>true</InlineCode> in dev (seeds once on
                        empty DB, safe on reboot),{" "}
                        <InlineCode>false</InlineCode> in prod - create the
                        first prod user once with{" "}
                        <InlineCode>
                            php artisan db:seed --class=UserSeeder --force
                        </InlineCode>
                        .
                    </Callout>
                </Section>

                <Section title="Option B: No Herd">
                    <CodeBlock>{`# 1. Install prerequisites
# - Laravel (includes PHP 8.5+)
# - Node.js v22+
# - Redis (or use C:\\redis\\redis-server.exe on Windows)
# - PostgreSQL with TimescaleDB extension
# - Typst CLI (report compilation) - see Requirements > Option A

# 2. Setup
change .env APP_URL to "http://127.0.0.1:8000"
npm run setup     # composer install + npm install (first time only)

# 3. Start development services
npm run noherd # redis + vite + reverb + queue + scheduler`}</CodeBlock>
                    <p>
                        Access the application at:{" "}
                        <InlineCode>
                            http://127.0.0.1:8000
                        </InlineCode>
                        <br />
                        Frontend dev server:{" "}
                        <InlineCode>http://localhost:5173</InlineCode>
                    </p>
                    <Callout>
                        On Linux there is no Herd: run{" "}
                        <InlineCode>npm run noherd</InlineCode> instead (same
                        services, Vite proxy targets{" "}
                        <InlineCode>http://127.0.0.1:8000</InlineCode>) - bring
                        your own backend on :8000 (e.g.{" "}
                        <InlineCode>docker compose up</InlineCode>).
                    </Callout>
                    <Callout>
                        The default credentials are{" "}
                        <InlineCode>user / user123</InlineCode> (UserSeeder -
                        there is no admin role). Change the password after first
                        login. Seeding is controlled by the{" "}
                        <InlineCode>SEED_ON_BOOT</InlineCode> flip switch:{" "}
                        <InlineCode>true</InlineCode> in dev (seeds once on
                        empty DB, safe on reboot),{" "}
                        <InlineCode>false</InlineCode> in prod - create the
                        first prod user once with{" "}
                        <InlineCode>
                            php artisan db:seed --class=UserSeeder --force
                        </InlineCode>
                        .
                    </Callout>
                </Section>

                <Section title="Option B: Docker (Containerized)">
                    <CodeBlock>{`# Run every command below from the repo root (the folder you cloned).
# 1. Install Docker first (see Requirements > Option B above)
# https://www.docker.com/products/docker-desktop/
# Linux: https://docs.docker.com/engine/install/

# 2. Open a NEW terminal after install, then verify the CLI is on PATH:
docker --version
docker compose version

# Windows:
where.exe docker
# macOS / Linux:
which docker

# 3. Start Docker Desktop (Windows/macOS), then wait until its status
#    shows the engine is running (it just launched, so give it a minute),
#    then start the stack (add --build only when running compose directly
#    after dependency changes — npm run docker / npm run ngrok detect a
#    stale image and rebuild for you):
docker compose up                  # build if needed, then start all services
`}</CodeBlock>
                    <p>
                        Open the monitoring dashboard at:{" "}
                        <InlineCode>http://localhost:8000</InlineCode>
                        <br />
                        TimescaleDB and Redis are included, so there is nothing
                        extra to install.
                        <br />
                        On the first boot, the app migrates and seeds the
                        database automatically. Use the default login:{" "}
                        <InlineCode>user</InlineCode> /{" "}
                        <InlineCode>user123</InlineCode>.
                        <br />
                        The source code is bind-mounted, so edits appear live.
                    </p>
                    <Callout>
                        Run <InlineCode>where.exe docker</InlineCode> on Windows
                        or <InlineCode>which docker</InlineCode> on macOS/Linux.
                        If it prints nothing, or the terminal says{" "}
                        <InlineCode>
                            &apos;docker&apos; is not recognized
                        </InlineCode>
                        , close and reopen the terminal first. The installer only
                        adds Docker to PATH for new shells. If needed, reinstall
                        Docker Desktop with PATH integration enabled.
                    </Callout>
                </Section>

                <Section title="Reset the database">
                    <p>
                        If you want to start from a clean state, this command
                        drops the current aggregates, reruns the migrations and
                        seed data, saves the schema, and restarts the monitoring
                        worker loop:
                    </p>
                    <CodeBlock>{`npm run resetdb`}</CodeBlock>
                    <p>
                        This works in both setups. If Docker is running, it resets
                        the Docker database and asks for confirmation first. If
                        not, it resets the local Herd database instead.
                    </p>
                </Section>

                <Section title="(Optional) Rebuild the agent">
                    <p>
                        The repo already includes prebuilt agent binaries in{" "}
                        <InlineCode>public/agent</InlineCode> and{" "}
                        <InlineCode>public/MonitorAgent.exe</InlineCode>. You only
                        need to rebuild them if you change the agent code itself.
                        This requires the{" "}
                        <a
                            className="text-blue-600 dark:text-blue-400 underline"
                            href="https://go.dev/dl/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Go toolchain
                        </a>{" "}
                        on the host machine, not inside Docker:
                    </p>
                    <CodeBlock>{`npm run compileagent`}</CodeBlock>
                    <p>
                        This compiles both binaries for the supported targets,
                        syncs the agent version, updates the version metadata when
                        the binaries change, and notifies connected agents of the
                        update.
                    </p>
                </Section>
            </Section>
        </>
    );
}

export function DocsConfigurationContent() {
    return (
        <>
            <Section title="Environment files">
                <p>
                    The main local config file is{" "}
                    <InlineCode>.env.development</InlineCode>. Laravel reads it
                    when the app starts, and your personal settings live in the
                    gitignored root <InlineCode>.env</InlineCode> file. The app
                    does not read <InlineCode>.env.production</InlineCode>
                    directly; that file is only used when the entry script is
                    run in production mode.
                </p>
                <Callout type="danger">
                    This repo is public, so every value in{" "}
                    <InlineCode>.env.development</InlineCode> is just a dev
                    placeholder. The JWT key, Reverb keys, SMTP values, and
                    Cloudinary or Discord credentials are all dummy values and
                    must not be treated as real secrets. After cloning, generate
                    fresh values for your own setup, put the real ones in your
                    personal <InlineCode>.env</InlineCode>, and never commit that
                    file. If older git history still contains real secrets,
                    rotate them and clean the repo history before publishing.
                </Callout>
                <Callout type="warning">
                    With Docker, the values in <InlineCode>compose.yaml</InlineCode>{" "}
                    are the real environment variables used inside the running
                    containers. They override everything else. This means an edit
                    in your local <InlineCode>.env</InlineCode> changes Herd right
                    away, but it does not change a live Docker container. For
                    Docker, update the value in <InlineCode>compose.yaml</InlineCode>{" "}
                    or in the production override and recreate the container.
                </Callout>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>.env.development</InlineCode> - the committed
                        default config for local development. It contains no real
                        secrets; keep personal values in <InlineCode>.env</InlineCode>.
                    </li>
                    <li>
                        <InlineCode>.env</InlineCode> - your personal local
                        overrides. This file is gitignored and wins over the
                        default values.
                    </li>
                    <li>
                        <InlineCode>.env.example</InlineCode> - a clean template
                        regenerated from the dev defaults and stripped by the entry
                        script during local or production startup.
                    </li>
                    <li>
                        <InlineCode>.env.testing</InlineCode> - test-specific
                        configuration.
                    </li>
                    <li>
                        <InlineCode>.env.production</InlineCode> - production-only
                        values, kept out of version control.
                    </li>
                </ul>
                <p>
                    The frontend does not use a separate <InlineCode>frontend/.env</InlineCode>{" "}
                    file. The Vite variables are injected from the root env at
                    build time and during local development.
                </p>
            </Section>

            <Section title="Dev safety switches">
                <p>
                    Environment values are layered in order of priority: Docker
                    runtime variables, your personal gitignored{" "}
                    <InlineCode>.env</InlineCode>, and then the default values in
                    <InlineCode>.env.development</InlineCode>. Set the important
                    values once per machine, and only edit your personal root{" "}
                    <InlineCode>.env</InlineCode> file. A fresh clone without that
                    file will still behave like a production-like setup and may
                    send real notifications, which is intentional in this repo.
                </p>
                <SubSection title="Native (Herd)">
                    <p>
                        Add the lines below to <InlineCode>.env</InlineCode> in
                        the repo root, then restart the Herd site (PHP) so
                        workers pick up the new values.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <InlineCode>MUTE_NOTIFICATION=true</InlineCode> -
                            stay quiet locally (default{" "}
                            <InlineCode>false</InlineCode> = sends real alerts).
                        </li>
                        <li>
                            <InlineCode>TELESCOPE_ENABLED</InlineCode> -
                            request/query inspector, default{" "}
                            <InlineCode>true</InlineCode> in dev. Leave it on
                            unless it slows you down.
                        </li>
                        <li>
                            <InlineCode>ALERTS_VISUAL_DEBUGGER=true</InlineCode>{" "}
                            - only when solo-debugging the alerts visualizer
                            (default <InlineCode>false</InlineCode>).
                        </li>
                    </ul>
                </SubSection>
                <SubSection title="Docker (compose runners)">
                    <p>
                        Same file - personal <InlineCode>.env</InlineCode> in
                        the repo root. The runners (
                        <InlineCode>npm run docker</InlineCode> /{" "}
                        <InlineCode>npm run ngrok</InlineCode>) interpolate it
                        plus per-run values (<InlineCode>APP_URL</InlineCode>)
                        into the containers at <InlineCode>up</InlineCode>;
                        compose <InlineCode>environment:</InlineCode> wins over
                        everything. After editing <InlineCode>.env</InlineCode>,
                        re-run the command. Never edit files inside a running
                        container - changes vanish on recreate. Same three
                        switches apply.
                    </p>
                </SubSection>
                <SubSection title="Production">
                    <p>
                        Only when deploying (see{" "}
                        <InlineCode>Production: physical server</InlineCode>{" "}
                        below). Never copy a dev file - generate prod env with{" "}
                        <InlineCode>npm run setup:docker</InlineCode> from{" "}
                        <InlineCode>.env.docker.example</InlineCode>, which pins
                        safe values. It is safe by construction, not convention:
                        prod containers have no <InlineCode>.env*</InlineCode>{" "}
                        files at all (no bind mounts), compose hard-forces{" "}
                        <InlineCode>APP_ENV=production</InlineCode>,{" "}
                        <InlineCode>APP_DEBUG=false</InlineCode> and{" "}
                        <InlineCode>TELESCOPE_ENABLED=false</InlineCode>, and
                        the Telescope provider refuses non-local environments in
                        code.
                    </p>
                </SubSection>
            </Section>

            <Section title="Key configuration variables">
                <p>
                    The app reads most of its runtime settings from environment
                    variables. Set them once in your personal root{" "}
                    <InlineCode>.env</InlineCode> file, and keep the defaults in
                    <InlineCode>.env.development</InlineCode> for local development.
                    Only add the values that are marked as generated or fetched
                    from outside services.
                </p>
                <p>
                    Your personal <InlineCode>.env</InlineCode> overrides the dev
                    defaults, but for database, Redis, and Reverb settings it is
                    usually best to leave the project defaults alone. If you
                    change one of those values, you must also change the matching
                    service configuration. Only override a value when you need to
                    fix a local issue, such as a port conflict. Do not ship dev
                    defaults into production.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Variable
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Source (where to get it)
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Sample / format
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    DB_CONNECTION, DB_HOST, DB_PORT,
                                    DB_DATABASE, DB_USERNAME, DB_PASSWORD
                                </td>
                                <td className="px-3 py-1.5">
                                    Dev defaults (use as-is).
                                    <br />
                                    Docker uses the compose values.
                                    <br />
                                    Prod: your Neon dashboard as{" "}
                                    <InlineCode>DB_URL</InlineCode>.
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    DB_HOST=127.0.0.1
                                    <br />
                                    DB_PORT=5432
                                    <br />
                                    DB_DATABASE=server_monitoring
                                    <br />
                                    DB_URL=postgresql://user:pass@host/db?sslmode=require
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    CACHE_STORE, REDIS_CLIENT, REDIS_HOST,
                                    REDIS_PORT, REDIS_PASSWORD
                                </td>
                                <td className="px-3 py-1.5">
                                    Dev defaults (use as-is).
                                    <br />
                                    Docker provides the redis service.
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    CACHE_STORE=redis
                                    <br />
                                    REDIS_CLIENT=predis
                                    <br />
                                    REDIS_HOST=127.0.0.1
                                    <br />
                                    REDIS_PORT=6379
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    QUEUE_CONNECTION, SESSION_DRIVER
                                </td>
                                <td className="px-3 py-1.5">
                                    Fixed values - set literally, nothing to
                                    fetch.
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    QUEUE_CONNECTION=database
                                    <br />
                                    SESSION_DRIVER=database
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    JWT_SECRET
                                </td>
                                <td className="px-3 py-1.5">
                                    Generate any strong random string (e.g. 64
                                    hex chars via{" "}
                                    <a
                                        className="text-blue-600 dark:text-blue-400 underline"
                                        href="https://wiki.openssl.org/index.php/Binaries"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <InlineCode>
                                            openssl rand -hex 64
                                        </InlineCode>
                                    </a>
                                    or a password manager). Windows: Git Bash
                                    already includes openssl - otherwise grab it
                                    from that link.
                                    <br />
                                    Never reuse a sample as your secret.
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    JWT_SECRET=&lt;64 hex chars&gt;
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    BROADCAST_CONNECTION, REVERB_APP_ID,
                                    REVERB_APP_KEY, REVERB_APP_SECRET,
                                    REVERB_HOST, REVERB_PORT, REVERB_SCHEME
                                </td>
                                <td className="px-3 py-1.5">
                                    Dev dummies in{" "}
                                    <InlineCode>.env.development</InlineCode>{" "}
                                    (use as-is).
                                    <br />
                                    Prod: run{" "}
                                    <InlineCode>
                                        openssl rand -hex 16
                                    </InlineCode>{" "}
                                    three times (install steps in the OpenSSL
                                    note below) and use the outputs for
                                    ID/KEY/SECRET; set{" "}
                                    <InlineCode>VITE_REVERB_APP_KEY</InlineCode>{" "}
                                    to the same KEY.
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    REVERB_HOST=127.0.0.1
                                    <br />
                                    REVERB_PORT=8081
                                    <br />
                                    REVERB_SCHEME=http
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    MAIL_MAILER, MAIL_HOST, MAIL_PORT,
                                    MAIL_USERNAME, MAIL_PASSWORD,
                                    MAIL_FROM_ADDRESS
                                </td>
                                <td className="px-3 py-1.5">
                                    Your Gmail: an App Password (see{" "}
                                    <InlineCode>Gmail SMTP setup</InlineCode>{" "}
                                    below).
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    MAIL_HOST=smtp.gmail.com
                                    <br />
                                    MAIL_PORT=587
                                    <br />
                                    MAIL_USERNAME=you@gmail.com
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    UPLOAD_STORAGE_PROVIDER,
                                    CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
                                    CLOUDINARY_API_SECRET
                                </td>
                                <td className="px-3 py-1.5">
                                    Cloudinary console Dashboard + API Keys (see{" "}
                                    <InlineCode>
                                        Storage provider setup
                                    </InlineCode>{" "}
                                    below).
                                    <br />
                                    Leave the provider unset for the{" "}
                                    <InlineCode>cloudinary</InlineCode> default.
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    CLOUDINARY_CLOUD_NAME=my-cloud
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    SEEDED_DISCORD_BOT_TOKEN,
                                    SEEDED_DISCORD_CHANNEL_ID,
                                    SEEDED_DISCORD_ROLE_ID
                                </td>
                                <td className="px-3 py-1.5">
                                    Your Discord server (see{" "}
                                    <InlineCode>
                                        Discord notifications setup
                                    </InlineCode>{" "}
                                    below).
                                    <br />
                                    Baked into seeded alert configs on{" "}
                                    <InlineCode>
                                        migrate:fresh --seed
                                    </InlineCode>
                                    .
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    Channel/role IDs are 17-20 digit numbers,
                                    e.g. 123456789012345678
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    VITE_APP_NAME, VITE_REVERB_*, default
                                    picture/banner URLs
                                </td>
                                <td className="px-3 py-1.5">
                                    Make up the app name.
                                    <br />
                                    <InlineCode>VITE_REVERB_*</InlineCode>{" "}
                                    mirror the backend automatically.
                                    <br />
                                    Picture URLs default to placeholders
                                    (replace with your own hosted images).
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    VITE_APP_NAME="Server Monitoring System"
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <SubSection title="Installing OpenSSL (for the JWT secret above)">
                    <p>
                        <InlineCode>openssl rand -hex 64</InlineCode> prints the
                        random secret, but most Windows machines do not have{" "}
                        <InlineCode>openssl</InlineCode> on PATH. Pick one:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>Windows, no install (easiest)</strong> -
                            open Git Bash (ships with Git) and run the command
                            there. Nothing to install.
                        </li>
                        <li>
                            <strong>Windows, PowerShell/CMD</strong> - install
                            via <InlineCode>choco install openssl</InlineCode>{" "}
                            (Chocolatey) or{" "}
                            <InlineCode>scoop install openssl</InlineCode>{" "}
                            (Scoop), or the Win32 installer with PATH enabled -
                            then open a NEW terminal.
                        </li>
                        <li>
                            <strong>macOS / Linux</strong> - usually
                            preinstalled. If missing:{" "}
                            <InlineCode>brew install openssl</InlineCode>{" "}
                            (macOS) or{" "}
                            <InlineCode>sudo apt install openssl</InlineCode>{" "}
                            (Debian/Ubuntu).
                        </li>
                    </ul>
                    <p>
                        Verify: <InlineCode>openssl --version</InlineCode>{" "}
                        prints a version. Then run{" "}
                        <InlineCode>openssl rand -hex 64</InlineCode> and paste
                        the output as <InlineCode>JWT_SECRET</InlineCode> in
                        personal <InlineCode>.env</InlineCode>.
                    </p>
                </SubSection>
            </Section>

            <Section title="Storage provider setup">
                <p>
                    Image uploads (profile pictures, client banners, and other
                    storage-backed files) go through a pluggable storage
                    provider. Set it up as follows.
                </p>
                <SubSection title="1. Set the environment variable">
                    <CodeBlock>{`UPLOAD_STORAGE_PROVIDER=local`}</CodeBlock>
                    <p>
                        Supported values: <InlineCode>local</InlineCode>,{" "}
                        <InlineCode>cloudinary</InlineCode> (default),{" "}
                        <InlineCode>s3</InlineCode> (configured in{" "}
                        <InlineCode>config/uploads.php</InlineCode> via{" "}
                        <InlineCode>AWS_*</InlineCode> keys;{" "}
                        <InlineCode>r2/gcs/azure</InlineCode> are named in the
                        config comment but have no provider entries yet).
                    </p>
                </SubSection>
                <SubSection title="2. Configure the provider">
                    <p>
                        Provider configs live in{" "}
                        <InlineCode>config/uploads.php</InlineCode> under the{" "}
                        <InlineCode>providers</InlineCode> key.
                    </p>
                    <h4 className="text-base font-semibold mt-4 mb-2">Local</h4>
                    <CodeBlock>{`# defaults are fine for development
LOCAL_STORAGE_BASE_PATH=uploads
LOCAL_DELIVERY_URL=/storage/uploads`}</CodeBlock>
                    <p>
                        Files are stored on the <InlineCode>local</InlineCode>{" "}
                        disk (root <InlineCode>storage/app/private</InlineCode>,
                        so <InlineCode>storage/app/private/uploads/…</InlineCode>
                        ) and addressed at{" "}
                        <InlineCode>/storage/uploads/…</InlineCode> (the{" "}
                        <InlineCode>public/storage → storage/app/public</InlineCode>{" "}
                        symlink). Run{" "}
                        <InlineCode>php artisan storage:link</InlineCode> if not
                        already done.
                    </p>
                    <h4 className="text-base font-semibold mt-4 mb-2">
                        Cloudinary (sample provider)
                    </h4>
                    <p>
                        Client banners and avatars upload through signed intents
                        (<InlineCode>CLOUDINARY_*</InlineCode> stays server-side
                        - the secret never reaches the browser). Without
                        credentials, uploads fail at use-time with a toast;
                        everything else works.
                    </p>
                    <ol className="list-decimal pl-5 space-y-1.5">
                        <li>
                            Go to <strong>console.cloudinary.com</strong>, sign
                            up/in (free tier is fine), open the Dashboard and
                            copy <strong>Cloud name</strong>.
                        </li>
                        <li>
                            Open <strong>Settings (gear) → API Keys</strong>,
                            copy the <strong>API Key</strong> and reveal/copy
                            the <strong>API Secret</strong> (needs upload +
                            delete + admin-read; the default main key works).
                        </li>
                        <li>
                            Paste into personal gitignored{" "}
                            <InlineCode>.env</InlineCode> as{" "}
                            <InlineCode>CLOUDINARY_CLOUD_NAME</InlineCode>,{" "}
                            <InlineCode>CLOUDINARY_API_KEY</InlineCode>,{" "}
                            <InlineCode>CLOUDINARY_API_SECRET</InlineCode> - that
                            file reaches PHP in both Herd and Docker-dev (the
                            repo is bind-mounted, and Laravel reads{" "}
                            <InlineCode>.env</InlineCode> directly).{" "}
                            <InlineCode>.env.docker</InlineCode> is prod-only
                            (see Production below).
                        </li>
                        <li>
                            Verify by uploading a client banner or avatar;
                            delivery runs through{" "}
                            <InlineCode>res.cloudinary.com</InlineCode> (sizes
                            in <InlineCode>config/uploads.php</InlineCode>).
                        </li>
                    </ol>
                    <CodeBlock>{`UPLOAD_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLOUDINARY_UPLOAD_PREFIX=https://api.cloudinary.com/v1_1
CLOUDINARY_DELIVERY_PREFIX=https://res.cloudinary.com`}</CodeBlock>
                    <Callout type="warning">
                        A real Cloudinary secret was once committed in{" "}
                        <InlineCode>.env.development</InlineCode> (since
                        removed). It lives on in git history - rotate it at
                        console.cloudinary.com → Settings → API Keys if that
                        account is still in use.
                    </Callout>
                </SubSection>
                <SubSection title="3. Existing uploads won't carry over">
                    <Callout type="warning">
                        Switching providers does <strong>not</strong> migrate
                        existing files. Previously uploaded images will still
                        reference the old provider and remain accessible at
                        their original URLs (as long as the old provider config
                        remains intact). New uploads go to the new provider.
                    </Callout>
                </SubSection>
            </Section>

            <Section title="Gmail SMTP setup">
                <p>
                    Email alerts and notifications are delivered through a Gmail
                    SMTP account. Configure it as follows.
                </p>
                <DocsGmailSmtpContent />
            </Section>

            <Section title="Discord notifications setup">
                <p>
                    Real-time server alert embeds, status alerts, and role
                    callouts are delivered to Discord. Configure it as follows.
                </p>
                <DocsDiscordNotificationsContent />
            </Section>
        </>
    );
}

export function DocsRunningContent() {
    return (
        <>
            <Section title="Quick start">
                <SubSection title="Docker workflow (local, no tunnel)">
                    <CodeBlock>{`# From the repo root — let the script manage the stack for you:
npm run docker             # full stack + Vite HMR — main local workflow
docker compose logs -f app          # follow app logs
docker compose exec app php artisan tinker   # open the Laravel REPL`}</CodeBlock>
                    <p>
                        The Docker image is rebuilt automatically when needed,
                        such as on the first run or when the Dockerfile or lock
                        files change. Source edits appear live through the bind
                        mount. If you want to force a rebuild, add the{" "}
                        <InlineCode>rebuild</InlineCode> flag: {" "}
                        <InlineCode>npm run docker rebuild</InlineCode>.
                    </p>
                </SubSection>

                <SubSection title="ngrok workflow (public tunnel)">
                    <CodeBlock>{`npm run ngrok              # Docker stack + Vite HMR + public tunnel URL`}</CodeBlock>
                    <p>
                        This is the same stack as the Docker flow, but it adds a
                        stable public URL for testing agent installs and external
                        integrations from other machines. It needs{" "}
                        <InlineCode>NGROK_DOMAIN</InlineCode> and{" "}
                        <InlineCode>NGROK_UPSTREAM</InlineCode> in your{" "}
                        <InlineCode>.env</InlineCode>. See the ngrok setup section
                        below for the full instructions.
                    </p>
                </SubSection>

                <SubSection title="Herd workflow (native Windows/macOS)">
                    <CodeBlock>{`npm run dev       # redis + vite + reverb + queue + scheduler
# App: http://server-monitoring-system.test
# Frontend dev: http://localhost:5173
# Docs dev: http://localhost:5174`}</CodeBlock>
                    <p>
                        This uses local PHP 8.5, Redis, and PostgreSQL. The app is
                        served through Herd at{" "}
                        <InlineCode>
                            http://server-monitoring-system.test
                        </InlineCode>
                        .
                    </p>
                </SubSection>
            </Section>

            <Section title="Local development with Docker">
                <p>
                    <InlineCode>npm run docker</InlineCode> is the primary local
                    development workflow: it boots the full Docker stack and
                    starts the Vite dev server with HMR. No internet tunnel is
                    needed.
                </p>
                <SubSection title="Workflow (Docker)">
                    <CodeBlock>{`# From the repo root:
npm run docker          # Docker backend + Vite HMR (no tunnel)
npm run docker rebuild   # same, but rebuilds images from the current Dockerfile first`}</CodeBlock>
                    <p>This command automatically:</p>
                    <ol className="list-decimal pl-5 space-y-1.5">
                        <li>
                            Builds images when missing or stale (Dockerfile /
                            lockfile changes are detected automatically;{" "}
                            <InlineCode>rebuild</InlineCode> forces it), then
                            brings up the Docker stack (
                            <InlineCode>docker compose up -d</InlineCode>) for
                            PostgreSQL, Redis, Reverb, queue, scheduler, and the
                            app.
                        </li>
                        <li>
                            Waits for the backend to be healthy on{" "}
                            <InlineCode>:8000</InlineCode>
                            (cold boot runs composer + migrate, can take
                            minutes).
                        </li>
                        <li>
                            Starts the Vite dev server with HMR (
                            <InlineCode>:5173</InlineCode>); API and agent paths
                            proxy to the backend locally.
                        </li>
                        <li>
                            Idles until Ctrl+C (Vite stops; Docker stack parks
                            stopped).
                        </li>
                    </ol>
                    <p>
                        Only one run at a time - a second run refuses via the
                        shared <InlineCode>.ngrok.pid</InlineCode> lock (it
                        guards both <InlineCode>npm run docker</InlineCode> and{" "}
                        <InlineCode>npm run ngrok</InlineCode>, since they share
                        the same ports). On exit the stack is parked stopped
                        (not torn down), so the next run restarts in seconds
                        with no data loss.
                    </p>
                    <p>
                        <InlineCode>docker compose up</InlineCode> reuses the
                        cached image — staleness is detected automatically, so
                        after a <InlineCode>git pull</InlineCode> the next run
                        rebuilds on its own (each machine caches its own
                        image). Plain app/PHP code needs no rebuild: it is
                        bind-mounted and read per request.
                    </p>
                    <p>Edge cases:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>
                                A slow/&ldquo;stuck&rdquo; cold boot is normal
                            </strong>{" "}
                            - the entrypoint additionally runs{" "}
                            <InlineCode>npm run build</InlineCode> (frontend
                            assets) plus{" "}
                            <InlineCode>composer install</InlineCode> and
                            migrations before the app serves{" "}
                            <InlineCode>:8000</InlineCode>. Give a fresh stack a
                            few minutes.
                        </li>
                        <li>
                            <strong>Dependency changes</strong> (
                            <InlineCode>package-lock.json</InlineCode> /
                            <InlineCode>composer.lock</InlineCode>) are baked
                            into the image. If you see "&ldquo;module not
                            found&rdquo;" after a branch switch, run{" "}
                            <InlineCode>npm run docker rebuild</InlineCode>.
                        </li>
                        <li>
                            <strong>Stale dependency volumes</strong>: the
                            container mounts anonymous volumes for{" "}
                            <InlineCode>vendor</InlineCode>/
                            <InlineCode>node_modules</InlineCode> that survive
                            image rebuilds. To refresh them drop only those
                            volumes:
                            <CodeBlock>{`# From the repo root:
docker compose down; docker volume prune  # removes unused anonymous volumes
npm run docker rebuild`}</CodeBlock>
                            Do <em>not</em> use{" "}
                            <InlineCode>docker compose down -v</InlineCode> - it
                            also wipes the PostgreSQL and Redis data volumes.
                        </li>
                    </ul>
                </SubSection>
            </Section>

            <Section title="Pre-production testing with ngrok">
                <p>
                    Use <InlineCode>npm run ngrok</InlineCode> when you need to
                    expose the local app through a stable ngrok domain for agent
                    installs and external testing. This keeps the Docker dev flow
                    but adds an internet tunnel, and it needs{" "}
                    <InlineCode>NGROK_DOMAIN</InlineCode> and{" "}
                    <InlineCode>NGROK_UPSTREAM</InlineCode> in your{" "}
                    <InlineCode>.env</InlineCode> file.
                </p>
                <SubSection title="Setup">
                    <ol className="list-decimal pl-5 space-y-1.5">
                        <li>
                            Sign up for{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://ngrok.com"
                                target="_blank"
                                rel="noreferrer"
                            >
                                ngrok
                            </a>{" "}
                            and reserve a stable domain (sample — yours will
                            differ, e.g.{" "}
                            <InlineCode>
                                your-tunnel-abc123.ngrok-free.dev
                            </InlineCode>
                            ).
                        </li>
                        <li>
                            Download{" "}
                            <a
                                className="text-blue-600 dark:text-blue-400 underline"
                                href="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
                                target="_blank"
                                rel="noreferrer"
                            >
                                ngrok.exe
                            </a>{" "}
                            and put it somewhere on PATH.
                        </li>
                        <li>
                            Add ngrok configuration to your{" "}
                            <InlineCode>.env</InlineCode> (gitignored, full
                            URLs):
                            <CodeBlock>{`# Samples — replace with your own reserved domain:
NGROK_DOMAIN=your-tunnel-abc123.ngrok-free.dev
# For Docker workflow:
NGROK_UPSTREAM=http://127.0.0.1:8000
# For Herd workflow instead:
# NGROK_UPSTREAM=http://server-monitoring-system.test
`}</CodeBlock>
                        </li>
                    </ol>
                </SubSection>
                <SubSection title="Workflow (Docker)">
                    <CodeBlock>{`npm run ngrok    # HMR flow: docker stack + Vite dev + tunnel to Vite
npm run ngrok rebuild   # same, but rebuilds images from the current Dockerfile first`}</CodeBlock>
                    <p>This command automatically:</p>
                    <ol className="list-decimal pl-5 space-y-1.5">
                        <li>
                            Brings up the Docker stack (
                            <InlineCode>docker compose up -d</InlineCode>) for
                            PostgreSQL, Redis, Reverb, queue, scheduler, and the
                            app.
                        </li>
                        <li>
                            Bakes the tunnel URL into the recreated app
                            container from memory (nothing is written to{" "}
                            <InlineCode>.env</InlineCode>, so a later plain{" "}
                            <InlineCode>docker compose up</InlineCode> reverts
                            cleanly). Herd instead: written to{" "}
                            <InlineCode>.env</InlineCode>, restored on exit -
                            restart Herd PHP workers to pick it up.
                        </li>
                        <li>
                            Starts the Vite dev server with HMR and tunnels your
                            reserved domain to it (
                            <InlineCode>:5173</InlineCode>); API and agent paths
                            proxy to the backend locally.
                        </li>
                        <li>
                            Smoke-tests the public URL, then idles until Ctrl+C
                            (tunnel + Vite stop; Docker stack parks stopped).
                        </li>
                    </ol>
                    <p>
                        Only one run at a time (a second run refuses via the{" "}
                        <InlineCode>.ngrok.pid</InlineCode> lock). After
                        starting the tunnel,{" "}
                        <strong>regenerate the provision token</strong> in the
                        dashboard - install commands bake the tunnel URL and
                        tunnel headers at generation time.
                    </p>
                    <p>
                        <InlineCode>docker compose up</InlineCode> reuses the
                        cached image, so{" "}
                        <strong>
                            Dockerfile changes never apply without a rebuild
                        </strong>{" "}
                        (and each machine caches its own image - after a{" "}
                        <InlineCode>git pull</InlineCode>, run{" "}
                        <InlineCode>npm run ngrok rebuild</InlineCode> once).
                        Plain app/PHP code needs no rebuild: it is bind-mounted
                        and read per request.
                    </p>
                    <p>Edge cases:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>
                                A slow/&ldquo;stuck&rdquo; cold boot is normal
                                on Dockerfile/image changes
                            </strong>{" "}
                            - the entrypoint additionally runs{" "}
                            <InlineCode>npm run build</InlineCode> (frontend
                            assets) plus{" "}
                            <InlineCode>composer install</InlineCode> and
                            migrations before the app serves{" "}
                            <InlineCode>:8000</InlineCode>. Give a fresh stack a
                            few minutes.
                        </li>
                        <li>
                            <strong>Dependency changes</strong> (
                            <InlineCode>package-lock.json</InlineCode> /
                            <InlineCode>composer.lock</InlineCode>) are baked
                            into the image. If you see &ldquo;module not
                            found&rdquo; after a branch switch, run{" "}
                            <InlineCode>npm run ngrok rebuild</InlineCode>.
                        </li>
                        <li>
                            <strong>Stale dependency volumes</strong>: the
                            container mounts anonymous volumes for{" "}
                            <InlineCode>vendor</InlineCode>/
                            <InlineCode>node_modules</InlineCode> that survive
                            image rebuilds. To refresh them drop only those
                            volumes:
                            <CodeBlock>{`docker compose down; docker volume prune  # removes unused anonymous volumes
npm run ngrok rebuild`}</CodeBlock>
                            Do <em>not</em> use{" "}
                            <InlineCode>docker compose down -v</InlineCode> - it
                            also wipes the PostgreSQL and Redis data volumes.
                        </li>
                        <li>
                            <strong>
                                The &ldquo;Waiting for backend&rdquo; poll
                            </strong>{" "}
                            has a 600-retry (not 600-second) budget with
                            per-request timeouts, so a very slow cold boot can
                            outlast it. Re-run with{" "}
                            <InlineCode>npm run ngrok rebuild</InlineCode> if
                            the stack needs it, or check{" "}
                            <InlineCode>docker compose ps</InlineCode> and{" "}
                            <InlineCode>docker compose logs app</InlineCode>.
                        </li>
                    </ul>
                </SubSection>
                <SubSection title="Static variant">
                    <CodeBlock>{`npm run ngrok:build    # builds the SPA, tunnels straight to Laravel`}</CodeBlock>
                    <p>
                        Production-like check: builds frontend assets with the
                        ngrok URL baked in and tunnels directly to the backend
                        (no HMR).
                    </p>
                </SubSection>
                <SubSection title="Workflow (Herd)">
                    <CodeBlock>{`# .env: NGROK_UPSTREAM=http://server-monitoring-system.test
npm run ngrok    # tunnels to Vite, which proxies to the Herd app`}</CodeBlock>
                    <p>
                        Uses the host app directly instead of Docker. Requires a
                        ngrok traffic policy file (
                        <InlineCode>scripts/ngrok-policy.yml</InlineCode>) to
                        rewrite the Host header so Herd routes correctly.
                    </p>
                </SubSection>
            </Section>

            <Section title="Production: physical server">
                <p>
                    Before you deploy, make sure the server has Docker Engine and
                    the Compose plugin installed, a DNS <InlineCode>A</InlineCode>{" "}
                    record such as <InlineCode>monitor.company.com</InlineCode>{" "}
                    pointing to the server, and ports 80 and 443 open.
                </p>
                <CodeBlock>{`git clone <repo> && cd server-monitoring-system
npm run setup:docker -- --app-url https://monitor.company.com
docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.docker up -d --build`}</CodeBlock>
                <Callout type="warning">
                    Compose only auto-loads <InlineCode>.env</InlineCode> -{" "}
                    <InlineCode>.env.docker</InlineCode> is ignored unless
                    passed with <InlineCode>--env-file</InlineCode> on every
                    compose invocation.
                </Callout>
                <p>
                    Caddy handles HTTPS automatically with Let&apos;s Encrypt and
                    routes <InlineCode>/app/*</InlineCode> to the Reverb WebSocket
                    layer, while everything else goes to Laravel. The first boot
                    runs the migrations, and data stays in Docker volumes. The
                    production overlay passes the database, Redis, Reverb, and
                    app settings into the container, including{" "}
                    <InlineCode>APP_URL</InlineCode>, <InlineCode>APP_KEY</InlineCode>,{" "}
                    <InlineCode>JWT_SECRET</InlineCode>, <InlineCode>MAIL_*</InlineCode>,{" "}
                    <InlineCode>CLOUDINARY_*</InlineCode>, and{" "}
                    <InlineCode>UPLOAD_STORAGE_PROVIDER</InlineCode>. The queue
                    worker also receives the mail and storage values it needs to
                    process those jobs. <InlineCode>APP_KEY</InlineCode> and{" "}
                    <InlineCode>JWT_SECRET</InlineCode> are required, and Docker
                    will refuse to start without them.
                </p>
                <SubSection title="Updates">
                    <CodeBlock>{`git pull && docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.docker up -d --build`}</CodeBlock>
                    <p>~30s downtime; migrations run on boot.</p>
                </SubSection>
                <SubSection title="Backups">
                    <p>Nightly cron on the host:</p>
                    <CodeBlock>{`docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.docker exec -T postgres pg_dump -U postgres server_monitoring | gzip > backup-$(date +%F).sql.gz`}</CodeBlock>
                </SubSection>
            </Section>

            <Section title="Verify the installation">
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        Log in at <InlineCode>{"${APP_URL}"}</InlineCode> using the
                        seeded user account: <InlineCode>user / user123</InlineCode>.
                        There is no admin role in the default seed data.
                    </li>
                    <li>
                        Open the dashboard. The stat cards and server overview chart
                        should load correctly.
                    </li>
                    <li>
                        Create a client, then create a server under it, and follow
                        the agent installation guide to install the Go agent on a
                        machine.
                    </li>
                    <li>
                        Confirm the server changes to <InlineCode>online</InlineCode>{" "}
                        and that metrics appear in the metrics view.
                    </li>
                </ol>
            </Section>

            <Section title="Troubleshooting">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>
                            Docker says virtualization / WSL2 must be enabled
                        </strong>{" "}
                        (Windows) - check Task Manager &gt; Performance &gt; CPU
                        &gt; <InlineCode>Virtualization: Enabled</InlineCode>.
                        If Disabled, enable VT-x / AMD-V in BIOS/UEFI first,
                        then run{" "}
                        <InlineCode>wsl --install --no-distribution</InlineCode>{" "}
                        in an elevated PowerShell, reboot, run{" "}
                        <InlineCode>wsl --update</InlineCode>, and set Docker
                        Desktop to the WSL 2 engine. Reinstalling WSL alone
                        never fixes a BIOS-disabled CPU. One exception with its
                        own fix: if Task Manager already says{" "}
                        <InlineCode>Enabled</InlineCode> but Docker/WSL still
                        reports the hypervisor is missing, the hypervisor was
                        switched off at boot (leftover VirtualBox/gaming tweak)
                        - run{" "}
                        <InlineCode>
                            bcdedit /set hypervisorlaunchtype auto
                        </InlineCode>{" "}
                        in an elevated prompt and reboot.
                    </li>
                    <li>
                        <strong>
                            &apos;docker&apos; is not recognized / command not
                            found
                        </strong>{" "}
                        - open a NEW terminal after installing Docker Desktop
                        (PATH only applies to new shells), then verify with{" "}
                        <InlineCode>where.exe docker</InlineCode> (Windows) or{" "}
                        <InlineCode>which docker</InlineCode> (macOS/Linux) plus{" "}
                        <InlineCode>docker --version</InlineCode>. If still
                        missing, reinstall Docker Desktop with PATH integration
                        enabled, or on Linux check the Engine install step and
                        your <InlineCode>docker</InlineCode> group /{" "}
                        <InlineCode>sudo</InlineCode> setup.
                    </li>
                    <li>
                        <strong>
                            Docker Desktop is not running / cannot connect to
                            the Docker daemon
                        </strong>{" "}
                        - start Docker Desktop and wait until its status shows
                        the engine is running, then{" "}
                        <InlineCode>docker ps</InlineCode> should list
                        containers (empty is fine). On Linux start/enable the{" "}
                        <InlineCode>docker</InlineCode> service instead.
                    </li>
                    <li>
                        <strong>Reports fail to compile</strong> - the{" "}
                        <InlineCode>typst</InlineCode> CLI must be installed and
                        on PATH. Docker users get it automatically; for
                        Herd/native installs, see the Typst prerequisite in
                        Requirements above. Quick check:{" "}
                        <InlineCode>typst --version</InlineCode> should print a
                        version number. If not found:
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li>
                                <strong>Windows:</strong> download the latest{" "}
                                <InlineCode>
                                    typst-x86_64-pc-windows-msvc.zip
                                </InlineCode>{" "}
                                from{" "}
                                <a
                                    className="text-blue-600 dark:text-blue-400 underline"
                                    href="https://github.com/typst/typst/releases"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    github.com/typst/typst/releases
                                </a>
                                , extract it, and add the folder containing{" "}
                                <InlineCode>typst.exe</InlineCode> to your{" "}
                                <InlineCode>PATH</InlineCode> (or run{" "}
                                <InlineCode>
                                    winget install Typst.Typst
                                </InlineCode>
                                ).
                            </li>
                            <li>
                                <strong>macOS:</strong>{" "}
                                <InlineCode>brew install typst</InlineCode>
                            </li>
                            <li>
                                <strong>Linux:</strong>{" "}
                                <InlineCode>
                                    cargo install --locked typst-cli
                                </InlineCode>{" "}
                                or download the release tarball and copy the
                                binary to{" "}
                                <InlineCode>/usr/local/bin/</InlineCode>.
                            </li>
                        </ul>
                    </li>
                    <li>
                        <strong>No realtime updates</strong> - confirm the{" "}
                        <InlineCode>reverb</InlineCode> service is running (
                        <InlineCode>docker compose ps</InlineCode>) and the{" "}
                        <InlineCode>VITE_REVERB_*</InlineCode> values match the
                        deployment URL (the container entrypoint rebuilds the
                        frontend at boot when they change - only a restart, not
                        an image rebuild).
                    </li>
                    <li>
                        <strong>Jobs never run</strong> - the{" "}
                        <InlineCode>queue</InlineCode>,{" "}
                        <InlineCode>reverb</InlineCode>, and{" "}
                        <InlineCode>scheduler</InlineCode> services must all be
                        up: <InlineCode>docker compose ps</InlineCode>.
                    </li>
                    <li>
                        <strong>Agent shows "Waiting for Heartbeat"</strong> -{" "}
                        check the agent service on the monitored machine and
                        that the provision token has not expired.
                    </li>
                </ul>
            </Section>

            <Section title="Database access">
                <p>
                    <strong>Docker flow</strong> - from the repo root on the
                    machine hosting the stack:
                </p>
                <CodeBlock>{`npm run db        # psql into the Docker TimescaleDB
npm run db:prod   # prod server (over SSH): psql into the prod DB`}</CodeBlock>
                <p>
                    <strong>Herd flow</strong> (native postgres, defaults from{" "}
                    <InlineCode>.env.development</InlineCode>):
                </p>
                <CodeBlock>{`$env:PGPASSWORD = '00000000'
psql -h 127.0.0.1 -U postgres -d server_monitoring`}</CodeBlock>
                <p>
                    GUI clients (DBeaver / TablePlus / pgAdmin): dev →{" "}
                    <InlineCode>localhost:5432</InlineCode> /{" "}
                    <InlineCode>postgres</InlineCode> /{" "}
                    <InlineCode>postgres</InlineCode> /{" "}
                    <InlineCode>server_monitoring</InlineCode>. For production,
                    use an SSH tunnel or a temporary port mapping.
                </p>
                <Callout type="warning">
                    One port, two possible databases: a native{" "}
                    <InlineCode>postgres.exe</InlineCode> owns{" "}
                    <InlineCode>0.0.0.0:5432</InlineCode> while the Docker proxy
                    holds only <InlineCode>[::]:5432</InlineCode>, so{" "}
                    <InlineCode>127.0.0.1:5432</InlineCode> clients read the
                    native DB and <InlineCode>localhost</InlineCode> may resolve
                    to <InlineCode>::1</InlineCode> (the Docker DB). Stop one
                    Postgres while working in the other flow, or point your GUI
                    client at the address explicitly.
                </Callout>
            </Section>

            <Section title="Diagnostic queries">
                <p>
                    Useful when the UI cannot answer it: inspect or revoke
                    provision tokens, query hypertables directly (
                    <InlineCode>time_bucket</InlineCode> checks), verify
                    continuous aggregates are refreshing, or fix a failed
                    migration row without a full reset.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        Provision tokens: check expiry and revoke stale rows in{" "}
                        <InlineCode>provision_tokens</InlineCode>.
                    </li>
                    <li>
                        Hypertables:{" "}
                        <InlineCode>
                            SELECT * FROM timescaledb_information.hypertables
                        </InlineCode>
                        and confirm <InlineCode>time_bucket</InlineCode>{" "}
                        groupings match the metric resolution you expect.
                    </li>
                    <li>
                        Continuous aggregates:{" "}
                        <InlineCode>
                            SELECT * FROM
                            timescaledb_information.continuous_aggregates
                        </InlineCode>
                        and confirm <InlineCode>last_refresh</InlineCode> is
                        advancing (refreshed each minute by{" "}
                        <InlineCode>agg:refresh</InlineCode>).
                    </li>
                    <li>
                        Failed migrations: inspect{" "}
                        <InlineCode>migrations</InlineCode> rows and patch the
                        specific row before reaching for{" "}
                        <InlineCode>resetdb</InlineCode>.
                    </li>
                </ul>
            </Section>
        </>
    );
}
