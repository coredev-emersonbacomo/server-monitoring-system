import { Link } from "react-router-dom";
import { Section, InlineCode, Callout } from "./Section";

export function DocsAgentSecurityContent() {
    return (
        <>
            <Section title="Trust model">
                <p>
                    The agent and the backend trust each other through a{" "}
                    <strong>public-key identity</strong>, never through a shared
                    secret or a persistent token. The agent proves possession of
                    its private key on every authentication; the backend proves
                    its identity by issuing signed challenges the agent can
                    verify cryptographically. Everything on the wire is scoped
                    to short-lived, single-use credentials.
                </p>
                <p>
                    The identity system itself is documented in{" "}
                    <Link
                        to="/docs/agent-identity"
                        className="text-primary hover:underline"
                    >
                        Agent Identity
                    </Link>
                    .
                </p>
            </Section>

            <Section title="Authentication - challenge-response">
                <p>
                    The agent has no login and no stored password. Instead it
                    performs a challenge-response handshake each time it needs a
                    session:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        The agent POSTs its installation UUID to{" "}
                        <InlineCode>/api/v1/agent/auth/challenge</InlineCode>.
                    </li>
                    <li>
                        The backend looks up the agent, issues a{" "}
                        <strong>random, single-use challenge</strong> with a{" "}
                        <InlineCode>challenge_ttl</InlineCode> of 60 seconds, and
                        stores it in the <InlineCode>agent_challenges</InlineCode>{" "}
                        table.
                    </li>
                    <li>
                        The agent signs the raw challenge text with its private
                        key and sends the signature to{" "}
                        <InlineCode>/api/v1/agent/auth/verify</InlineCode>.
                    </li>
                    <li>
                        The backend verifies the signature against the stored
                        public key, marks the challenge used, and returns a{" "}
                        <strong>short-lived JWT</strong> (
                        <InlineCode>session_ttl</InlineCode> 900 seconds) - held{" "}
                        <strong>only in process memory</strong>, never on disk.
                    </li>
                </ol>
                <Callout>
                    Challenges are single-use and expire in 60 seconds, so a
                    captured challenge cannot be replayed, and the session token
                    expires in 15 minutes with no refresh mechanism on disk - a
                    stolen token is only useful for the few seconds of its
                    life. When the token is rejected (401) the agent silently
                    re-authenticates.
                </Callout>
            </Section>

            <Section title="Registration & provisioning">
                <p>
                    First contact uses a <strong>one-time provision token</strong>{" "}
                    (valid 1 hour) generated per server from the dashboard:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        The installer calls{" "}
                        <InlineCode>/api/v1/provision</InlineCode> with the token
                        to fetch the download URL, checksum, and server URL.
                    </li>
                    <li>
                        The agent calls{" "}
                        <InlineCode>/api/v1/register</InlineCode> with its public
                        key + fingerprint + the token, and the backend
                        find-or-creates the agent by installation UUID.
                    </li>
                    <li>
                        The token is <strong>stripped from config.json</strong>{" "}
                        after registration - the persistent config never holds a
                        secret.
                    </li>
                </ul>
                <p>
                    Registration is <strong>not</strong> a revocable gate: a
                    re-registering agent (e.g. reinstalled, token regenerated) is
                    matched to its existing record, and the agent keeps its
                    servers. An agent is revoked only when it loses all its
                    servers or explicitly uninstalls.
                </p>
            </Section>

            <Section title="Local security">
                <p>
                    The private key is the crown jewel, so its local protection
                    is per-platform:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Windows</strong> - the key lives in the{" "}
                        <em>per-user</em> keystore of the service account
                        (LocalSystem), preferring the TPM-backed provider. It is
                        never exported by the application, and TPM keys are
                        non-exportable at the hardware level. An administrator
                        who stops the service cannot delete the key - only the
                        service account can.
                    </li>
                    <li>
                        <strong>Linux</strong> - a 0600 file owned by the{" "}
                        <InlineCode>monitor</InlineCode> user at{" "}
                        <InlineCode>/var/lib/monitor-agent/identity-&lt;uuid&gt;.pem</InlineCode>.
                        The systemd unit is hardened: no new privileges, empty
                        capability bounding set, private tmp, read/write limited
                        to the program and data directories, home protected.
                    </li>
                    <li>
                        <strong>Installers</strong> - refuse collisions by
                        checking for an existing instance directory, service,
                        or keystore key before installing.
                    </li>
                </ul>
            </Section>

            <Section title="WebSocket channel authorization">
                <p>
                    The agent's control channel is a private Reverb channel per
                    server ({" "}
                    <InlineCode>private-agent.&lt;serverUuid&gt;</InlineCode> ).
                    Subscription is authorized by{" "}
                    <InlineCode>/broadcasting/auth/agent</InlineCode>, which does
                    <strong> not</strong> use the normal dashboard middleware - it
                    self-authenticates:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        Validates the agent's short-lived JWT from the
                        Authorization header.
                    </li>
                    <li>
                        Confirms the agent <strong>owns</strong> the channel's
                        server via <InlineCode>servers.agent_id</InlineCode>,
                        and that the server is not agent-deleted or archived.
                    </li>
                    <li>
                        Returns a Pusher HMAC-SHA256 auth signature bound to the
                        socket id + channel name.
                    </li>
                </ol>
                <p>
                    A multi-server agent holds one private channel per owned
                    server and may only subscribe to those it owns.
                </p>
            </Section>

            <Section title="Uninstall, detach & revocation">
                <p>
                    Removing an agent - or detaching one server from a shared
                    host - is deliberately the one operation an unprivileged
                    operator <em>cannot</em> fake. Both are marker-based and
                    host-validated:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Full uninstall</strong> -{" "}
                        <InlineCode>/api/v1/agent/uninstall</InlineCode>{" "}
                        (agent JWT). Revokes the whole installation, deletes the
                        identity key, all servers on that host become{" "}
                        <em>agent uninstalled</em>. Marker{" "}
                        <InlineCode>uninstall.flag</InlineCode> → service
                        restart → <InlineCode>handleUninstallMarker</InlineCode>.
                    </li>
                    <li>
                        <strong>Per-server detach</strong> -{" "}
                        <InlineCode>
                            /api/v1/agent/servers/&#123;uuid&#125;/uninstall
                        </InlineCode>{" "}
                        (agent JWT, one server). Only that server is detached (
                        <InlineCode>agent_id→null</InlineCode>,{" "}
                        <InlineCode>AgentUninstalled</InlineCode> for that server);
                        the agent stays for its other servers. Marker{" "}
                        <InlineCode>detach.flag</InlineCode> containing the{" "}
                        <InlineCode>server_uuid</InlineCode> is written by{" "}
                        <InlineCode>detach.ps1/sh -Instance … -Server …</InlineCode>{" "}
                        and handled by{" "}
                        <InlineCode>handleDetachMarker</InlineCode> (immediate{" "}
                        <InlineCode>POST</InlineCode> try, else next heartbeat,
                        then <InlineCode>done</InlineCode>). When the last server
                        is detached the agent remains with zero servers until a
                        full uninstall - it does <em>not</em> auto-revoke.
                    </li>
                    <li>
                        Both delegate the key operation to the running service
                        account (LocalSystem/<InlineCode>monitor</InlineCode>) via
                        the marker, so an admin without the service account cannot
                        delete the key.
                    </li>
                    <li>
                        After revocation the backend refuses{" "}
                        <InlineCode>/api/v1/agent/auth/*</InlineCode> and{" "}
                        <InlineCode>/heartbeat</InlineCode> for that agent, and
                        its servers stay <em>agent uninstalled</em> until a fresh
                        provision token re-registers the host.
                    </li>
                </ul>
            </Section>

            <Section title="What is not secret">
                <p>
                    Keeping the inventory of non-secrets straight avoids
                    over-classifying and leaking the wrong things:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Installation UUID</strong> - an identifier; it
                        names the instance, key, and service, and is safe to show
                        in logs and the UI.
                    </li>
                    <li>
                        <strong>Public key &amp; fingerprint</strong> - safe to
                        transmit and store; possession of the private key is what
                        authenticates.
                    </li>
                    <li>
                        <strong>Crash reports</strong> - explicitly exclude the
                        private key, signatures, and credentials.
                    </li>
                </ul>
            </Section>

            <Section title="Verification & troubleshooting">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Agent self-test</strong> - run the binary with{" "}
                        <InlineCode>-selftest</InlineCode> to exercise the
                        keystore round-trip (create/get key, sign, verify).
                    </li>
                    <li>
                        <strong>Key presence</strong> -{" "}
                        <InlineCode>-has-key -key &lt;keyName&gt;</InlineCode>{" "}
                        exits 0 if the keystore key exists.
                    </li>
                    <li>
                        <strong>Auth failures</strong> - the agent logs "Authenticated
                        with server." on success and the challenge/verify step
                        on failure in <InlineCode>agent.log</InlineCode>. A
                        reinstall is the fix for a lost key.
                    </li>
                </ul>
            </Section>
        </>
    );
}