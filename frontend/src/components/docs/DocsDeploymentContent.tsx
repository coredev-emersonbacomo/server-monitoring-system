import {
    Section,
    SubSection,
    CodeBlock,
    InlineCode,
    Callout,
} from "./Section";
import RedisDownloadLink from "./RedisDownloadLink";
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
                        <InlineCode>Laravel backend</InlineCode> — REST API,
                        realtime broadcasting, alert engine, background jobs,
                        and PDF report compilation.
                    </li>
                    <li>
                        <InlineCode>React SPA</InlineCode> (in{" "}
                        <InlineCode>frontend/</InlineCode>) — the dashboard and
                        management interface.
                    </li>
                    <li>
                        <InlineCode>Go agent</InlineCode> (in{" "}
                        <InlineCode>resources/agent/go</InlineCode>) — installed
                        on each monitored server.
                    </li>
                    <li>
                        <InlineCode>PostgreSQL (TimescaleDB) + Redis + Reverb</InlineCode>{" "}
                        — storage, caching, and realtime messaging.
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
                        <strong>Deployment Guide</strong> — prerequisites,
                        installation, configuration, and running the
                        application (this section).
                    </li>
                    <li>
                        <strong>User Guide</strong> — a walkthrough of the app:
                        the dashboard, then each management page (clients,
                        servers, users), logs, reports, and settings.
                    </li>
                    <li>
                        <strong>Technical Reference</strong> — architecture,
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
            <Section title="Required software">
                <p>
                    To get started, install the prerequisites below, then run{" "}
                    <InlineCode>npm run setup</InlineCode> to install all
                    dependencies.
                </p>
                <Callout>
                    <InlineCode>npm run setup</InlineCode> runs{" "}
                    <InlineCode>composer install && npm install</InlineCode>.
                    For the full one-command setup (env, key, migrate, build),
                    use <InlineCode>composer run setup</InlineCode>.
                </Callout>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>PHP 8.4+</strong>
                    </li>
                    <li>
                        <strong>Composer 2.x</strong>
                    </li>
                    <li>
                        <strong>Node.js</strong> <InlineCode>^20.19.0 || &gt;=22.12.0</InlineCode>
                    </li>
                    <li>
                        <strong>PostgreSQL 16+ with TimescaleDB extension</strong>
                    </li>
                    <li>
                        <strong>Redis</strong> — auto-started in dev.
                    </li>
                    <li>
                        <strong>Typst CLI</strong> (for PDF reports)
                    </li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">
                    Go toolchain is only needed to rebuild the monitoring agent
                    and is not required to run the system.
                </p>
            </Section>

            <Section title="PHP extensions">
                <p>
                    The following PHP extensions must be enabled (the
                    framework requires them):
                </p>
                <CodeBlock>{`ctype, filter, hash, mbstring, openssl, session, tokenizer
json, zlib
pdo_pgsql   (required — the primary database driver)`}</CodeBlock>
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
                    TimescaleDB is not optional — the aggregate-refresh command
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
            <Section title="Install PHP dependencies">
                <CodeBlock>{`composer install`}</CodeBlock>
                <p>
                    A convenience command chains everything below:{" "}
                    <InlineCode>composer install</InlineCode>, copies{" "}
                    <InlineCode>.env</InlineCode> from{" "}
                    <InlineCode>.env.example</InlineCode> if missing, generates
                    an app key, runs migrations, installs npm packages, and
                    builds the frontend:
                </p>
                <CodeBlock>{`composer run setup`}</CodeBlock>
            </Section>

            <Section title="Select an environment">
                <p>
                    Laravel loads its base configuration from{" "}
                    <InlineCode>.env.development</InlineCode> (or{" "}
                    <InlineCode>.env.production</InlineCode>) and merges{" "}
                    <InlineCode>.env</InlineCode> (gitignored) on top for
                    personal overrides — <InlineCode>.env</InlineCode> is no
                    longer the source of app config. The entry script switches
                    the mode and regenerates{" "}
                    <InlineCode>.env.example</InlineCode> from{" "}
                    <InlineCode>.env.development</InlineCode> on every run:
                </p>
                <CodeBlock>{`npm run dev     # node entry.js dev  -> loads .env.development + .env, starts the dev stack
npm run prod    # node entry.js prod -> loads .env.production  + .env, clears config cache, builds`}</CodeBlock>
                <Callout type="warning">
                    <InlineCode>.env.development</InlineCode> is committed and
                    contains live secrets (JWT secret, Reverb keys, Cloudinary,
                    Discord). Never commit{" "}
                    <InlineCode>.env.production</InlineCode> or your real
                    credentials.
                </Callout>
            </Section>

            <Section title="Install JavaScript dependencies">
                <p>
                    Installing from the repo root covers the{" "}
                    <InlineCode>frontend</InlineCode> workspace:
                </p>
                <CodeBlock>{`npm install`}</CodeBlock>
            </Section>

            <Section title="Run migrations and seeders">
                <CodeBlock>{`php artisan migrate --seed`}</CodeBlock>
                <p>
                    Seeders create default settings, the admin account, sample
                    clients, and a starter global alert config. To reset
                    everything from scratch (drops aggregates, re-runs{" "}
                    <InlineCode>migrate:fresh --seed</InlineCode>, dumps the
                    schema, and reloads the monitor):
                </p>
                <CodeBlock>{`npm run resetdb`}</CodeBlock>
                <Callout>
                    The default admin credentials are{" "}
                    <InlineCode>admin / admin123</InlineCode>. Change the
                    password after first login.
                </Callout>
            </Section>

            <Section title="Link storage and build the frontend">
                <CodeBlock>{`php artisan storage:link
npm run build`}</CodeBlock>
                <p>
                    The build compiles the React SPA to{" "}
                    <InlineCode>frontend/dist</InlineCode> and the Laravel Vite
                    assets to <InlineCode>public/build</InlineCode>.
                </p>
            </Section>

             <Section title="(Optional) Rebuild the agent">
                <p>
                    Pre-built agent binaries are committed to the repo (
                    <InlineCode>public/agent</InlineCode> and{" "}
                    <InlineCode>public/MonitorAgent.exe</InlineCode>), so this
                    is only needed when you change agent code:
                </p>
                <CodeBlock>{`npm run compileagent`}</CodeBlock>
                <p>
                    This cross-compiles both binaries with Go, then syncs the
                    agent version, auto-bumps the version record when the
                    binaries change, and broadcasts an update to connected
                    agents.
                </p>
            </Section>

            <Section title="Redis">
                <p>
                    Redis is used for application caching. It runs on{" "}
                    <InlineCode>127.0.0.1:6379</InlineCode> by default and is
                    read from <InlineCode>.env.development</InlineCode>{" "}
                    (<InlineCode>REDIS_HOST</InlineCode>,{" "}
                    <InlineCode>REDIS_PORT</InlineCode>). During development,
                    <InlineCode>npm run dev</InlineCode> auto-starts Redis from{" "}
                    <InlineCode>PATH</InlineCode>, falling back to{" "}
                    <InlineCode>C:\redis\redis-server.exe</InlineCode> on Windows.
                </p>
                <SubSection title="Install via npm">
                    <p>
                        One command downloads and installs Redis for your
                        platform:
                    </p>
                    <CodeBlock>{`npm run install-redis:windows   # Windows: extracts to C:\\redis
npm run install-redis:linux     # Linux: package manager or source build`}</CodeBlock>
                    <p>
                        The Windows script downloads the non-Service ZIP
                        release to <InlineCode>C:\redis\</InlineCode> and
                        verifies <InlineCode>redis-server.exe</InlineCode>. The
                        Linux script uses the system package manager (apt, dnf,
                        yum, or pacman), falling back to a source build, then
                        starts Redis as a daemon and verifies it responds to
                        PING.
                    </p>
                    <Callout>
                        The Windows build ships its MSYS2 runtime DLLs next to
                        the executable — keep them in <InlineCode>C:\redis\</InlineCode>{" "}
                        and do{" "}
                        <strong>not</strong> move <InlineCode>redis-server.exe</InlineCode>
                        without the DLLs.
                    </Callout>
                </SubSection>
                <SubSection title="Manual: Windows">
                    <ol className="list-decimal pl-5 space-y-1.5">
                        <li>
                            Click{" "}
                            <RedisDownloadLink fallbackLabel="Download latest release" />{" "}
                            to download the latest non-Service (MSYS2) ZIP.
                            Skip the <InlineCode>-service</InlineCode> and{" "}
                            <InlineCode>.msi</InlineCode> variants.
                        </li>
                        <li>
                            Right-click the downloaded ZIP and choose{" "}
                            <strong>Extract All…</strong>, then browse to{" "}
                            <InlineCode>C:\redis\</InlineCode> and extract.
                        </li>
                        <li>
                            Open <InlineCode>C:\redis\</InlineCode> in File
                            Explorer and confirm{" "}
                            <InlineCode>redis-server.exe</InlineCode> is there.
                        </li>
                    </ol>
                </SubSection>
                <SubSection title="Manual: Linux">
                    <p>
                        Install via your package manager or build from source,
                        then start as a daemon:
                    </p>
                    <CodeBlock>{`# apt / Debian
sudo apt-get install -y redis-server
# dnf / Fedora
sudo dnf install -y redis
# pacman / Arch
sudo pacman -Sy --noconfirm redis
# build from source (latest stable)
curl -fsSL https://download.redis.io/redis-stable.tar.gz | tar xz
cd redis-stable && make && sudo make install`}</CodeBlock>
                    <CodeBlock>{`# start (if not running as a service)
redis-server --daemonize yes --bind 127.0.0.1 --port 6379
redis-cli ping   # PONG`}</CodeBlock>
                </SubSection>
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
                    <strong>personal overrides only</strong> — it is gitignored
                    and merged on top, so it is no longer the main env holder.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>.env.development</InlineCode> — committed,
                        base dev config (contains dev secrets).
                    </li>
                    <li>
                        <InlineCode>.env</InlineCode> — gitignored, personal
                        overrides that win on top.
                    </li>
                    <li>
                        <InlineCode>.env.example</InlineCode> — regenerated from{" "}
                        <InlineCode>.env.development</InlineCode> with values
                        stripped by the entry script on every{" "}
                        <InlineCode>npm run dev</InlineCode> /{" "}
                        <InlineCode>npm run prod</InlineCode>.
                    </li>
                    <li>
                        <InlineCode>.env.testing</InlineCode> — committed, test
                        config.
                    </li>
                    <li>
                        <InlineCode>.env.credentials</InlineCode> — gitignored,
                        secrets (Gmail SMTP) injected into the process
                        environment at runtime by{" "}
                        <InlineCode>scripts/dev.js</InlineCode> — see Gmail SMTP
                        below.
                    </li>
                    <li>
                        <InlineCode>.env.production</InlineCode> — gitignored,
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
                        <strong>Database</strong> — <InlineCode>DB_CONNECTION</InlineCode>,{" "}
                        <InlineCode>DB_HOST</InlineCode>,{" "}
                        <InlineCode>DB_PORT</InlineCode>,{" "}
                        <InlineCode>DB_DATABASE</InlineCode>,{" "}
                        <InlineCode>DB_USERNAME</InlineCode>,{" "}
                        <InlineCode>DB_PASSWORD</InlineCode>. Production may use{" "}
                        <InlineCode>DB_URL</InlineCode> (e.g. a Neon Postgres
                        URL with <InlineCode>sslmode=require</InlineCode>).
                    </li>
                    <li>
                        <strong>Redis / cache</strong> —{" "}
                        <InlineCode>CACHE_STORE=redis</InlineCode>,{" "}
                        <InlineCode>REDIS_CLIENT</InlineCode> (
                        <InlineCode>predis</InlineCode> in dev,{" "}
                        <InlineCode>phpredis</InlineCode> by default),{" "}
                        <InlineCode>REDIS_HOST/PORT/PASSWORD</InlineCode>.
                    </li>
                    <li>
                        <strong>Queue</strong> —{" "}
                        <InlineCode>QUEUE_CONNECTION=database</InlineCode>. A
                        queue worker must be running.
                    </li>
                    <li>
                        <strong>Session</strong> —{" "}
                        <InlineCode>SESSION_DRIVER=database</InlineCode>.
                    </li>
                    <li>
                        <strong>JWT</strong> — <InlineCode>JWT_SECRET</InlineCode>{" "}
                        (HS256). Access tokens expire in 15 minutes, refresh
                        tokens in 30 days.
                    </li>
                    <li>
                        <strong>Realtime</strong> —{" "}
                        <InlineCode>BROADCAST_CONNECTION=reverb</InlineCode>{" "}
                        with <InlineCode>REVERB_APP_ID/KEY/SECRET</InlineCode>{" "}
                        and <InlineCode>REVERB_HOST/PORT/SCHEME</InlineCode>.
                    </li>
                    <li>
                        <strong>Mail</strong> — <InlineCode>MAIL_MAILER</InlineCode>,{" "}
                        <InlineCode>MAIL_HOST</InlineCode>,{" "}
                        <InlineCode>MAIL_PORT</InlineCode>,{" "}
                        <InlineCode>MAIL_USERNAME</InlineCode>,{" "}
                        <InlineCode>MAIL_PASSWORD</InlineCode>,{" "}
                        <InlineCode>MAIL_FROM_ADDRESS</InlineCode>.
                    </li>
                    <li>
                        <strong>Uploads</strong> —{" "}
                        <InlineCode>UPLOAD_STORAGE_PROVIDER</InlineCode>{" "}
                        (defaults to <InlineCode>cloudinary</InlineCode>),{" "}
                        Cloudinary keys{" "}
                        <InlineCode>CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET</InlineCode>.{" "}
                        See Storage provider setup below.
                    </li>
                    <li>
                        <strong>Notifications</strong> —{" "}
                        <InlineCode>DISCORD_BOT_TOKEN</InlineCode>,{" "}
                        <InlineCode>DISCORD_CHANNEL_ID</InlineCode>,{" "}
                        <InlineCode>DISCORD_ROLE_ID</InlineCode>.
                    </li>
                    <li>
                        <strong>Frontend</strong> —{" "}
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
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>npm run setup</InlineCode> — install all dependencies.
                    </li>
                    <li>
                        <InlineCode>npm run dev</InlineCode> — full dev environment (Redis, Vite, Reverb, queue, scheduler auto-started).
                    </li>
                    <li>
                        <InlineCode>npm start</InlineCode> — build and deploy frontend to <InlineCode>public/</InlineCode> for production.
                    </li>
                </ul>
            </Section>

            <Section title="Production daemons">
                <p>
                    Unlike <InlineCode>npm run dev</InlineCode>, production does not
                    auto-start the queue, Reverb, or scheduler. Run them as
                    supervised daemons:
                </p>
                <CodeBlock>{`php artisan queue:work
php artisan reverb:start`}</CodeBlock>
                <p>
                    Scheduler via cron:{" "}
                    <InlineCode>* * * * * php artisan schedule:run</InlineCode>.
                </p>
                <p>
                    Enable HTTPS: set <InlineCode>REVERB_SCHEME=https</InlineCode>,
                    <InlineCode>APP_DEBUG=false</InlineCode>, and{" "}
                    <InlineCode>JWT_COOKIE_SECURE=true</InlineCode>.
                </p>
            </Section>

            <Section title="Verify the installation">
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        Log in at <InlineCode>{"${APP_URL}"}</InlineCode> with
                        the admin account.
                    </li>
                    <li>
                        Open the Dashboard — stat cards and the Server Overview
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
                        <strong>Reports fail to compile</strong> — ensure the{" "}
                        <InlineCode>typst</InlineCode> CLI is installed and on
                        PATH on the server.
                    </li>
                    <li>
                        <strong>No realtime updates</strong> — confirm Reverb is
                        running and the <InlineCode>VITE_REVERB_*</InlineCode>{" "}
                        values match the backend.
                    </li>
                    <li>
                        <strong>Jobs never run</strong> — the queue worker,{" "}
                        Reverb, and the scheduler must all be running.
                    </li>
                    <li>
                        <strong>Agent shows "Waiting for Heartbeat"</strong> —{" "}
                        check the agent service on the monitored machine and
                        that the provision token has not expired.
                    </li>
                </ul>
            </Section>
        </>
    );
}