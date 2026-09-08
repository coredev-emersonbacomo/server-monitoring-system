import {
    Section,
    SubSection,
    CodeBlock,
    InlineCode,
    Callout,
} from "./Section";
import { DocsGmailSmtpContent } from "./DocsGmailSmtpContent";

export function DocsOverviewContent() {
    return (
        <>
            <Section title="What is this system?">
                <p>
                    The Server Monitoring System is a platform for monitoring
                    physical servers and virtual machines on behalf of clients.
                    A lightweight agent is installed on each monitored machine;
                    it reports CPU, memory, disk, network, process, and port
                    data back to a central backend. The data is streamed live
                    to the dashboard over WebSockets and stored in a
                    time-series database for historical charts and reports.
                </p>
                <p>
                    The system is a monorepo with four main pieces:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>Laravel backend</InlineCode> - REST API,
                        realtime broadcasting, alert engine, background jobs,
                        and PDF report compilation.
                    </li>
                    <li>
                        <InlineCode>React SPA</InlineCode> (in{" "}
                        <InlineCode>frontend/</InlineCode>) - the dashboard and
                        management interface.
                    </li>
                    <li>
                        <InlineCode>Go agent</InlineCode> (in{" "}
                        <InlineCode>resources/agent/go</InlineCode>) - installed
                        on each monitored server.
                    </li>
                    <li>
                        <InlineCode>PostgreSQL (TimescaleDB) + Redis + Reverb</InlineCode>{" "}
                        - storage, caching, and realtime messaging.
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
                        installation, configuration, and running the
                        application (this section).
                    </li>
                    <li>
                        <strong>User Guide</strong> - a walkthrough of the app:
                        the dashboard, then each management page (clients,
                        servers, users), logs, reports, and settings.
                    </li>
                    <li>
                        <strong>Technical Reference</strong> - architecture,
                        the alerting engine, storage providers, the agent, and
                        background scheduling.
                    </li>
                </ul>
            </Section>
        </>
    );
}

export function DocsRequirementsContent() {
    return (
        <>
            <Section title="Development workflows">
                <p>
                    You can run the system using either Herd (native) or Docker
                    (containerized). Choose the workflow that best fits your
                    preferences and environment.
                </p>
                
                <Section title="Option A: Herd (Native - Windows/macOS)">
                    <p>
                        Herd provides a native development experience with
                        zero Docker configuration. Ideal for quick iteration
                        on Windows and macOS.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <strong>Laravel Herd</strong> -{" "}
                            <a
                                className="text-blue-600 underline"
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
                                className="text-blue-600 underline"
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
                            <InlineCode>npm run install-redis:windows</InlineCode>{" "}
                            (fetches the{" "}
                            <a
                                className="text-blue-600 underline"
                                href="https://github.com/redis-windows/redis-windows"
                                target="_blank"
                                rel="noreferrer"
                            >
                                redis-windows
                            </a>{" "}
                            build to <InlineCode>C:\redis\redis-server.exe</InlineCode>,
                            which the dev tooling uses automatically)
                        </li>
                        <li>
                            <strong>PostgreSQL 17</strong> -{" "}
                            <a
                                className="text-blue-600 underline"
                                href="https://www.postgresql.org/download/windows/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Windows installer
                            </a>{" "}
                            plus TimescaleDB per the{" "}
                            <a
                                className="text-blue-600 underline"
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
                                className="text-blue-600 underline"
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
                                className="text-blue-600 underline"
                                href="https://github.com/typst/typst/releases"
                                target="_blank"
                                rel="noreferrer"
                            >
                                download Typst
                            </a>{" "}
                            for PDF report compilation.{" "}
                            <strong>Windows:</strong> download the latest{" "}
                            <InlineCode>typst-x86_64-pc-windows-msvc.zip</InlineCode>,
                            extract it, and add the folder containing{" "}
                            <InlineCode>typst.exe</InlineCode> to your{" "}
                            <InlineCode>PATH</InlineCode> (search &quot;Edit
                            environment variables for your account&quot; in
                            Windows Settings, edit{" "}
                            <InlineCode>Path</InlineCode> under User
                            variables, click New, and paste the folder path).
                            Alternatively, install via winget:{" "}
                            <InlineCode>winget install Typst.Typst</InlineCode>.{" "}
                            <strong>macOS:</strong>{" "}
                            <InlineCode>brew install typst</InlineCode>.{" "}
                            <strong>Linux:</strong>{" "}
                            <InlineCode>cargo install --locked typst-cli</InlineCode>{" "}
                            or download the{" "}
                            <InlineCode>typst-x86_64-unknown-linux-musl.tar.xz</InlineCode>{" "}
                            from the releases page, extract it, and copy{" "}
                            <InlineCode>typst</InlineCode> to{" "}
                            <InlineCode>/usr/local/bin/</InlineCode>. Verify
                            with{" "}
                            <InlineCode>typst --version</InlineCode>.
                        </li>
                    </ul>
                </Section>
                
                <Section title="Option B: Docker (Containerized - Any OS)">
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
                                    className="text-blue-600 underline"
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
                                className="text-blue-600 underline"
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
                            Install{" "}
                            <InlineCode>docker engine</InlineCode> +{" "}
                            <InlineCode>docker compose plugin</InlineCode> from
                            your package manager per the{" "}
                            <a
                                className="text-blue-600 underline"
                                href="https://docs.docker.com/engine/install/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Engine install docs
                            </a>
                            , then enable and start the service. Add your user
                            to the <InlineCode>docker</InlineCode> group if you
                            want to run without{" "}
                            <InlineCode>sudo</InlineCode>.
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
                        The primary database is <strong>PostgreSQL with
                        TimescaleDB</strong>. The scheduler refreshes Timescale
                        continuous aggregates via{" "}
                        <InlineCode>agg:refresh</InlineCode>.
                    </li>
                    <li>
                        A schema snapshot is tracked at{" "}
                        <InlineCode>database/schema/pgsql-schema.sql</InlineCode>{" "}
                        so the schema can be restored without re-running every
                        migration.
                    </li>
                </ul>
                <Callout type="warning">
                    TimescaleDB is not optional - the aggregate-refresh command
                    queries{" "}
                    <InlineCode>timescaledb_information.continuous_aggregates</InlineCode>{" "}
                    and the reset-db script drops continuous aggregates before
                    a fresh migrate.
                </Callout>
            </Section>
        </>
    );
}

export function DocsInstallationContent() {
    return (
        <>
            <Section title="Installation">
                <p>
                    Choose your preferred development workflow:
                </p>
                
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
                        Access the application at: <InlineCode>http://server-monitoring-system.test</InlineCode><br/>
                        Frontend dev server: <InlineCode>http://localhost:5173</InlineCode>
                    </p>
                    <Callout>
                        On Linux there is no Herd: run <InlineCode>npm run tim</InlineCode> instead
                        (same services, Vite proxy targets <InlineCode>http://127.0.0.1:8000</InlineCode>) -
                        bring your own backend on :8000 (e.g. <InlineCode>docker compose up</InlineCode>).
                    </Callout>
                    <Callout>
                        The default credentials are{" "}
                        <InlineCode>user / user123</InlineCode> (UserSeeder - there
                        is no admin role). Change the password after first login.
                        Seeding is controlled by the{" "}
                        <InlineCode>SEED_ON_BOOT</InlineCode> flip switch:{" "}
                        <InlineCode>true</InlineCode> in dev (seeds once on empty
                        DB, safe on reboot), <InlineCode>false</InlineCode> in
                        prod - create the first prod user once with{" "}
                        <InlineCode>
                            php artisan db:seed --class=UserSeeder --force
                        </InlineCode>
                        .
                    </Callout>
                </Section>
                
                <Section title="Option B: Docker (Containerized)">
                    <CodeBlock>{`# 1. Install Docker first (see Requirements > Option B above)
# https://www.docker.com/products/docker-desktop/
# Linux: https://docs.docker.com/engine/install/

# 2. Open a NEW terminal after install, then verify the CLI is on PATH:
docker --version
docker compose version

# Windows:
where.exe docker
# macOS / Linux:
which docker

# 3. Start Docker Desktop (Windows/macOS) and wait for green/running,
#    then start the stack:
docker compose up --build          # build images and start all services
`}</CodeBlock>
                    <p>
                        Access the application at: <InlineCode>http://localhost:8000</InlineCode><br/>
                        TimescaleDB + Redis included - nothing else to install.<br/>
                        First boot migrates and seeds automatically (login: <InlineCode>user</InlineCode> / <InlineCode>user123</InlineCode>).<br/>
                        Source is bind-mounted (live edits).
                    </p>
                    <Callout>
                        <InlineCode>where.exe docker</InlineCode> (Windows) or{" "}
                        <InlineCode>which docker</InlineCode> (macOS/Linux) must
                        print a path. If it prints nothing or the terminal says{" "}
                        <InlineCode>&apos;docker&apos; is not recognized</InlineCode>,
                        close and reopen the terminal first (the installer only
                        adds PATH for new shells), then reinstall Docker Desktop
                        with PATH integration enabled. See Troubleshooting below.
                    </Callout>
                </Section>
                
            <Section title="Reset the database">
                <p>
                    To reset from scratch (drops aggregates, re-runs migrate:fresh --seed,
                    dumps schema, kicks off system:monitor):
                </p>
                <CodeBlock>{`npm run resetdb`}</CodeBlock>
                <p>
                    Works in both flows: with the Docker stack up it resets the Docker
                    database (prints its target and asks [y/N] first) - otherwise the
                    local Herd database.
                </p>
            </Section>
                
                <Section title="(Optional) Rebuild the agent">
                    <p>
                        Pre-built agent binaries are committed to the repo (
                        <InlineCode>public/agent</InlineCode> and{" "}
                        <InlineCode>public/MonitorAgent.exe</InlineCode>), so this
                        is only needed when you change agent code (requires the{" "}
                        <a
                            className="text-blue-600 underline"
                            href="https://go.dev/dl/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Go toolchain
                        </a>{" "}
                        on the host, not in Docker):
                    </p>
                    <CodeBlock>{`npm run compileagent`}</CodeBlock>
                    <p>
                        This cross-compiles both binaries with Go, then syncs the
                        agent version, auto-bumps the version record when the
                        binaries change, and broadcasts an update to connected
                        agents.
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
                    The base application config lives in{" "}
                    <InlineCode>.env.development</InlineCode> (or{" "}
                    <InlineCode>.env.production</InlineCode>), which Laravel
                    loads on startup. <InlineCode>.env</InlineCode> holds{" "}
                    <strong>personal overrides only</strong> - it is gitignored
                    and merged on top, so it is no longer the main env holder.
                </p>
                <Callout type="warning">
                    Docker twist: inside containers, <InlineCode>compose.yaml</InlineCode>{" "}
                    <InlineCode>environment:</InlineCode> entries are real OS variables, and
                    Laravel loads env files with <InlineCode>createImmutable</InlineCode> -
                    real env beats <strong>every</strong> file. So editing{" "}
                    <InlineCode>.env</InlineCode> reaches Herd immediately but never reaches
                    a running container (this exact trap once froze{" "}
                    <InlineCode>APP_URL</InlineCode> at <InlineCode>localhost:8000</InlineCode>).
                    For Docker, change the value via <InlineCode>{"${VAR:-default}"}</InlineCode>{" "}
                    interpolation in <InlineCode>compose.yaml</InlineCode> (or the prod overlay)
                    and recreate the container.
                </Callout>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>.env.development</InlineCode> - committed,
                        base dev config (contains dev secrets).
                    </li>
                    <li>
                        <InlineCode>.env</InlineCode> - gitignored, personal
                        overrides that win on top.
                    </li>
                    <li>
                        <InlineCode>.env.example</InlineCode> - regenerated from{" "}
                        <InlineCode>.env.development</InlineCode> with values
                        stripped by the entry script on every{" "}
                        <InlineCode>npm run dev</InlineCode> /{" "}
                        <InlineCode>npm run prod</InlineCode>.
                    </li>
                    <li>
                        <InlineCode>.env.testing</InlineCode> - committed, test
                        config.
                    </li>
                    <li>
                        <InlineCode>.env</InlineCode> - gitignored, local secrets
                        (e.g. Gmail SMTP) loaded directly by Laravel and overriding{" "}
                        <InlineCode>.env.development</InlineCode> - see Gmail SMTP
                        below.
                    </li>
                    <li>
                        <InlineCode>.env.production</InlineCode> - gitignored,
                        production values.
                    </li>
                </ul>
                <p>
                    The frontend reads its own{" "}
                    <InlineCode>frontend/.env</InlineCode> (committed) at build
                    time.
                </p>
            </Section>

            <Section title="Key configuration variables">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Database</strong> - <InlineCode>DB_CONNECTION</InlineCode>,{" "}
                        <InlineCode>DB_HOST</InlineCode>,{" "}
                        <InlineCode>DB_PORT</InlineCode>,{" "}
                        <InlineCode>DB_DATABASE</InlineCode>,{" "}
                        <InlineCode>DB_USERNAME</InlineCode>,{" "}
                        <InlineCode>DB_PASSWORD</InlineCode>. Production may use{" "}
                        <InlineCode>DB_URL</InlineCode> (e.g. a Neon Postgres
                        URL with <InlineCode>sslmode=require</InlineCode>).
                    </li>
                    <li>
                        <strong>Redis / cache</strong> -{" "}
                        <InlineCode>CACHE_STORE=redis</InlineCode>,{" "}
                        <InlineCode>REDIS_CLIENT</InlineCode> (
                        <InlineCode>predis</InlineCode> in dev,{" "}
                        <InlineCode>phpredis</InlineCode> by default),{" "}
                        <InlineCode>REDIS_HOST/PORT/PASSWORD</InlineCode>.
                    </li>
                    <li>
                        <strong>Queue</strong> -{" "}
                        <InlineCode>QUEUE_CONNECTION=database</InlineCode>. A
                        queue worker must be running.
                    </li>
                    <li>
                        <strong>Session</strong> -{" "}
                        <InlineCode>SESSION_DRIVER=database</InlineCode>.
                    </li>
                    <li>
                        <strong>JWT</strong> - <InlineCode>JWT_SECRET</InlineCode>{" "}
                        (HS256). Access tokens expire in 15 minutes, refresh
                        tokens in 30 days.
                    </li>
                    <li>
                        <strong>Realtime</strong> -{" "}
                        <InlineCode>BROADCAST_CONNECTION=reverb</InlineCode>{" "}
                        with <InlineCode>REVERB_APP_ID/KEY/SECRET</InlineCode>{" "}
                        and <InlineCode>REVERB_HOST/PORT/SCHEME</InlineCode>.
                    </li>
                    <li>
                        <strong>Mail</strong> - <InlineCode>MAIL_MAILER</InlineCode>,{" "}
                        <InlineCode>MAIL_HOST</InlineCode>,{" "}
                        <InlineCode>MAIL_PORT</InlineCode>,{" "}
                        <InlineCode>MAIL_USERNAME</InlineCode>,{" "}
                        <InlineCode>MAIL_PASSWORD</InlineCode>,{" "}
                        <InlineCode>MAIL_FROM_ADDRESS</InlineCode>.
                    </li>
                    <li>
                        <strong>Uploads</strong> -{" "}
                        <InlineCode>UPLOAD_STORAGE_PROVIDER</InlineCode>{" "}
                        (defaults to <InlineCode>cloudinary</InlineCode>),{" "}
                        Cloudinary keys{" "}
                        <InlineCode>CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET</InlineCode>.{" "}
                        See Storage provider setup below.
                    </li>
                    <li>
                        <strong>Notifications</strong> -{" "}
<InlineCode>SEEDED_DISCORD_BOT_TOKEN</InlineCode>,{" "}
<InlineCode>SEEDED_DISCORD_CHANNEL_ID</InlineCode>,{" "}
<InlineCode>SEEDED_DISCORD_ROLE_ID</InlineCode>.
                    </li>
                    <li>
                        <strong>Frontend</strong> -{" "}
                        <InlineCode>VITE_APP_NAME</InlineCode>,{" "}
                        <InlineCode>VITE_REVERB_*</InlineCode>, default profile
                        picture and client banner URLs.
                    </li>
                </ul>
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
                        <InlineCode>cloudinary</InlineCode> (default).
                    </p>
                </SubSection>
                <SubSection title="2. Configure the provider">
                    <p>
                        Provider configs live in{" "}
                        <InlineCode>config/uploads.php</InlineCode> under the{" "}
                        <InlineCode>providers</InlineCode> key.
                    </p>
                    <p>
                        <strong>Local</strong>
                    </p>
                    <CodeBlock>{`# defaults are fine for development
LOCAL_STORAGE_BASE_PATH=uploads
LOCAL_DELIVERY_URL=/storage/uploads`}</CodeBlock>
                    <p>
                        Files are stored in{" "}
                        <InlineCode>storage/app/uploads/</InlineCode> and served
                        via a symlink from{" "}
                        <InlineCode>public/storage/uploads/</InlineCode>. Run{" "}
                        <InlineCode>php artisan storage:link</InlineCode> if not
                        already done.
                    </p>
                    <p>
                        <strong>Cloudinary</strong>
                    </p>
                    <CodeBlock>{`CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLOUDINARY_UPLOAD_PREFIX=https://api.cloudinary.com/v1_1
CLOUDINARY_DELIVERY_PREFIX=https://res.cloudinary.com`}</CodeBlock>
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
                    Email alerts and notifications are delivered through a
                    Gmail SMTP account. Configure it as follows.
                </p>
                <DocsGmailSmtpContent />
            </Section>
        </>
    );
}

export function DocsRunningContent() {
    return (
        <>
            <Section title="Quick start">
                <SubSection title="Docker workflow">
                    <CodeBlock>{`docker compose up --build          # dev: app + db + redis + reverb + queue + scheduler
docker compose logs -f app          # tail app logs
docker compose exec app php artisan tinker   # REPL inside the container`}</CodeBlock>
                    <p>
                        Rebuild after dependency changes (
                        <InlineCode>composer.json</InlineCode> /{" "}
                        <InlineCode>package.json</InlineCode>); source edits apply
                        live through the bind mount.
                    </p>
                </SubSection>
                
                <SubSection title="Herd workflow (Native Windows/macOS)">
                    <CodeBlock>{`npm run dev       # redis + vite + reverb + queue + scheduler
# App: http://server-monitoring-system.test
# Frontend dev: http://localhost:5173
# Docs dev: http://localhost:5174`}</CodeBlock>
                    <p>
                        Uses local PHP 8.5, Redis, and PostgreSQL. App served via
                        Herd at <InlineCode>http://server-monitoring-system.test</InlineCode>.
                    </p>
                </SubSection>
            </Section>
            
            <Section title="Pre-production testing with ngrok">
                <p>
                    Use <InlineCode>npm run ngrok</InlineCode> to expose your local
                    app via a stable ngrok domain for testing agent installations
                    and external integrations.
                </p>
                <SubSection title="Setup">
                    <ol className="list-decimal pl-5 space-y-1.5">
                        <li>
                            Sign up for <a className="text-blue-600 underline" href="https://ngrok.com">ngrok</a>
                            and reserve a stable domain (e.g. <InlineCode>bottle-zippy-revivable.ngrok-free.dev</InlineCode>).
                        </li>
                        <li>
                            Install ngrok CLI via{" "}
                            <a className="text-blue-600 underline" href="https://ngrok.com/docs/getting-started">
                                MSIX (Windows Store)
                            </a> or package manager.
                        </li>
                        <li>
                            Add ngrok configuration to your <InlineCode>.env</InlineCode> (gitignored, full URLs):
                            <CodeBlock>{`NGROK_DOMAIN=bottle-zippy-revivable.ngrok-free.dev
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
                    <p>
                        This command automatically:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1.5">
                        <li>Brings up the Docker stack (<InlineCode>docker compose up -d</InlineCode>)
                            for PostgreSQL, Redis, Reverb, queue, scheduler, and the app.</li>
                        <li>Bakes the tunnel URL into the recreated app container
                            from memory (nothing is written to{" "}
                            <InlineCode>.env</InlineCode>, so a later plain{" "}
                            <InlineCode>docker compose up</InlineCode> reverts
                            cleanly). Herd instead: written to{" "}
                            <InlineCode>.env</InlineCode>, restored on exit -
                            restart Herd PHP workers to pick it up.</li>
                        <li>Starts the Vite dev server with HMR and tunnels your reserved
                            domain to it (<InlineCode>:5173</InlineCode>); API and agent paths
                            proxy to the backend locally.</li>
                        <li>Smoke-tests the public URL, then idles until Ctrl+C (tunnel +
                            Vite stop; Docker stack parks stopped).</li>
                    </ol>
                    <p>
                        Only one run at a time (a second run refuses via the{" "}
                        <InlineCode>.ngrok.pid</InlineCode> lock). After starting the tunnel,{" "}
                        <strong>regenerate the provision token</strong> in the dashboard -
                        install commands bake the tunnel URL and tunnel headers at
                        generation time.
                    </p>
                    <p>
                        <InlineCode>docker compose up</InlineCode> reuses the cached image, so{" "}
                        <strong>Dockerfile changes never apply without a rebuild</strong> (and
                        each machine caches its own image - after a{" "}
                        <InlineCode>git pull</InlineCode>, run{" "}
                        <InlineCode>npm run ngrok rebuild</InlineCode> once). Plain app/PHP code
                        needs no rebuild: it is bind-mounted and read per request.
                    </p>
                    <p>
                        Edge cases:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li><strong>A slow/&ldquo;stuck&rdquo; cold boot is normal on Dockerfile/image
                            changes</strong> - the entrypoint additionally runs{" "}
                            <InlineCode>npm run build</InlineCode> (frontend assets) plus{" "}
                            <InlineCode>composer install</InlineCode> and migrations before the app
                            serves <InlineCode>:8000</InlineCode>. Give a fresh stack a few minutes.</li>
                        <li><strong>Dependency changes</strong> (<InlineCode>package-lock.json</InlineCode> /
                            <InlineCode>composer.lock</InlineCode>) are baked into the image. If you
                            see &ldquo;module not found&rdquo; after a branch switch, run{" "}
                            <InlineCode>npm run ngrok rebuild</InlineCode>.</li>
                        <li><strong>Stale dependency volumes</strong>: the container mounts anonymous
                            volumes for <InlineCode>vendor</InlineCode>/<InlineCode>node_modules</InlineCode>{" "}
                            that survive image rebuilds. To refresh them drop only those volumes:
                            <CodeBlock>{`docker compose down; docker volume prune  # removes unused anonymous volumes
npm run ngrok rebuild`}</CodeBlock>
                            Do <em>not</em> use <InlineCode>docker compose down -v</InlineCode> - it
                            also wipes the PostgreSQL and Redis data volumes.</li>
                        <li><strong>The &ldquo;Waiting for backend&rdquo; poll</strong> has a 600-retry
                            (not 600-second) budget with per-request timeouts, so a very slow cold boot
                            can outlast it. Re-run with{" "}
                            <InlineCode>npm run ngrok rebuild</InlineCode> if the stack needs it, or
                            check <InlineCode>docker compose ps</InlineCode> and{" "}
                            <InlineCode>docker compose logs app</InlineCode>.</li>
                    </ul>
                </SubSection>
                <SubSection title="Static variant">
                    <CodeBlock>{`npm run ngrok:build    # builds the SPA, tunnels straight to Laravel`}</CodeBlock>
                    <p>
                        Production-like check: builds frontend assets with the ngrok URL
                        baked in and tunnels directly to the backend (no HMR).
                    </p>
                </SubSection>
                <SubSection title="Workflow (Herd)">
                    <CodeBlock>{`# .env: NGROK_UPSTREAM=http://server-monitoring-system.test
npm run ngrok    # tunnels to Vite, which proxies to the Herd app`}</CodeBlock>
                    <p>
                        Uses the host app directly instead of Docker. Requires a
                        ngrok traffic policy file (<InlineCode>scripts/ngrok-policy.yml</InlineCode>)
                        to rewrite the Host header so Herd routes correctly.
                    </p>
                </SubSection>
            </Section>

            <Section title="Production: physical server">
                <p>
                    Prerequisites on the server: Docker Engine + compose
                    plugin, a DNS <InlineCode>A</InlineCode> record (e.g.{" "}
                    <InlineCode>monitor.company.com</InlineCode>) pointing at
                    the server, ports 80/443 open.
                </p>
                <CodeBlock>{`git clone <repo> && cd server-monitoring-system
npm run setup:docker -- --app-url https://monitor.company.com
docker compose -f compose.yaml -f compose.prod.yaml up -d --build`}</CodeBlock>
                <p>
                    Caddy terminates HTTPS automatically (Let&apos;s Encrypt)
                    and routes <InlineCode>/app/*</InlineCode> to Reverb
                    websockets, everything else to Laravel. First boot
                    migrates; data persists in Docker volumes. Fill{" "}
                    <InlineCode>MAIL_*</InlineCode>/
                    <InlineCode>CLOUDINARY_*</InlineCode> in{" "}
                    <InlineCode>.env.docker</InlineCode> only if needed.
                </p>
                <SubSection title="Updates">
                    <CodeBlock>{`git pull && docker compose -f compose.yaml -f compose.prod.yaml up -d --build`}</CodeBlock>
                    <p>
                        ~30s downtime; migrations run on boot.
                    </p>
                </SubSection>
                <SubSection title="Backups">
                    <p>
                        Nightly cron on the host:
                    </p>
                    <CodeBlock>{`docker compose -f compose.yaml -f compose.prod.yaml exec -T postgres pg_dump -U postgres server_monitoring | gzip > backup-$(date +%F).sql.gz`}</CodeBlock>
                </SubSection>
            </Section>

            <Section title="Verify the installation">
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        Log in at <InlineCode>{"${APP_URL}"}</InlineCode> with
                        the seeded user (<InlineCode>user / user123</InlineCode> -
                        there is no admin role).
                    </li>
                    <li>
                        Open the Dashboard - stat cards and the Server Overview
                        donut should load.
                    </li>
                    <li>
                        Create a client, then a server under it, and follow the
                        Agent Installation Guide to install the agent on a
                        machine (see the User Guide).
                    </li>
                    <li>
                        Confirm the server reaches <InlineCode>online</InlineCode>{" "}
                        status and metrics appear in the Metrics tab.
                    </li>
                </ol>
            </Section>

            <Section title="Troubleshooting">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>
                            Docker says virtualization / WSL2 must be enabled
                        </strong>{" "}
                        (Windows) - check Task Manager &gt; Performance &gt;
                        CPU &gt; <InlineCode>Virtualization: Enabled</InlineCode>.
                        If Disabled, enable VT-x / AMD-V in BIOS/UEFI first,
                        then run <InlineCode>wsl --install --no-distribution</InlineCode>{" "}
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
                        <InlineCode>which docker</InlineCode> (macOS/Linux)
                        plus <InlineCode>docker --version</InlineCode>. If still
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
                        - start Docker Desktop and wait for green/running, then{" "}
                        <InlineCode>docker ps</InlineCode> should list
                        containers (empty is fine). On Linux start/enable the{" "}
                        <InlineCode>docker</InlineCode> service instead.
                    </li>
                    <li>
                        <strong>Reports fail to compile</strong> - the{" "}
                        <InlineCode>typst</InlineCode> CLI must be installed
                        and on PATH. Docker users get it automatically; for
                        Herd/native installs, see the Typst prerequisite in
                        Requirements above. Quick check:{" "}
                        <InlineCode>typst --version</InlineCode> should print
                        a version number. If not found:
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li>
                                <strong>Windows:</strong> download the latest{" "}
                                <InlineCode>typst-x86_64-pc-windows-msvc.zip</InlineCode>{" "}
                                from{" "}
                                <a
                                    className="text-blue-600 underline"
                                    href="https://github.com/typst/typst/releases"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    github.com/typst/typst/releases
                                </a>
                                , extract it, and add the folder containing{" "}
                                <InlineCode>typst.exe</InlineCode> to your{" "}
                                <InlineCode>PATH</InlineCode> (or run{" "}
                                <InlineCode>winget install Typst.Typst</InlineCode>
                                ).
                            </li>
                            <li>
                                <strong>macOS:</strong>{" "}
                                <InlineCode>brew install typst</InlineCode>
                            </li>
                            <li>
                                <strong>Linux:</strong>{" "}
                                <InlineCode>cargo install --locked typst-cli</InlineCode>{" "}
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
                        <InlineCode>VITE_REVERB_*</InlineCode> build args match
                        the deployment URL (they bake in at image build time -
                        rebuild after changing them).
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
        </>
    );
}