import {
    Section,
    CodeBlock,
    InlineCode,
    Callout,
} from "@/components/docs/Section";

export function DocsGmailSmtpContent() {
    return (
        <>
            <Section title="How it works">
                <p>
                    Secrets never live in the tracked base config. The transport
                    config lives in <InlineCode>.env.development</InlineCode>{" "}
                    (tracked), the credentials live in{" "}
                    <InlineCode>.env.credentials</InlineCode> (gitignored), and{" "}
                    <InlineCode>scripts/dev.js</InlineCode> injects them into the
                    process environment at runtime before starting Laravel. Laravel
                    prefers injected env vars over{" "}
                    <InlineCode>.env.development</InlineCode> values.
                </p>
                <CodeBlock>{`scripts/dev.js -> reads .env.credentials -> sets process.env -> php artisan (queue:work)
                                                              -> php artisan (schedule:work)`}</CodeBlock>
            </Section>

            <Section title="1. Get a Gmail App Password">
                <p>
                    Gmail blocks your normal password for SMTP. App passwords
                    require:
                </p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>
                        Enable <strong>2-Step Verification</strong> on the Gmail
                        account (Security &gt; 2-Step Verification).
                    </li>
                    <li>
                        Go to{" "}
                        <InlineCode>https://myaccount.google.com/apppasswords</InlineCode>{" "}
                        and create one for "Mail".
                    </li>
                    <li>
                        You get a 16-character password — use that, with spaces
                        removed.
                    </li>
                </ol>
                <Callout type="warning">
                    <strong>Notes:</strong>
                    <ul className="list-disc list-inside ml-2 space-y-1 mt-1">
                        <li>
                            If "The setting you are looking for is not available for
                            your account" appears: 2SV is off, a passkey/security
                            key is enrolled (remove it), Google Workspace admin
                            disabled app passwords, or Advanced Protection is on.
                        </li>
                        <li>
                            The app password can act as full account access. Never
                            commit it, and delete it from Google when it's no longer
                            needed.
                        </li>
                    </ul>
                </Callout>
            </Section>

            <Section title="2. Configure the credentials file">
                <p>
                    Create <InlineCode>.env.credentials</InlineCode> (gitignored) in
                    the project root:
                </p>
                <CodeBlock>{`MAIL_USERNAME="you@gmail.com"
MAIL_PASSWORD="the16characterapppassword"
MAIL_FROM_ADDRESS="you@gmail.com"`}</CodeBlock>
                <p>
                    The tracked <InlineCode>.env.development</InlineCode> keeps
                    the non-secret SMTP transport config:
                </p>
                <CodeBlock>{`MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@example.com"`}</CodeBlock>
                <p>
                    <InlineCode>MAIL_SCHEME=null</InlineCode> on port 587 uses
                    STARTTLS automatically. For port 465 use{" "}
                    <InlineCode>MAIL_PORT=465</InlineCode> and{" "}
                    <InlineCode>MAIL_SCHEME=smtps</InlineCode>.
                </p>
            </Section>

            <Section title="3. Run through dev.js">
                <p>
                    Credentials are only injected by the dev script. Start everything
                    with:
                </p>
                <CodeBlock>{`npm run dev`}</CodeBlock>
                <Callout type="warning">
                    When running <InlineCode>php artisan</InlineCode> commands
                    manually, credentials are not injected — the send will fail or
                    fall back to the <InlineCode>.env</InlineCode> values.
                </Callout>
            </Section>

            <Section title="4. Verify recipients">
                <p>
                    Alerts are sent to the <InlineCode>secopclients</InlineCode>{" "}
                    attached to the server's client (
                    <InlineCode>app/NodeConfig/Jobs/SendNotification.php</InlineCode>
                    ), not to the sender address. A server with no secop client email
                    logs <InlineCode>no recipients found</InlineCode> and skips.
                </p>
            </Section>

            <Section title="5. Test">
                <CodeBlock>{`php artisan tinker
>>> Mail::html('<h1>test</h1>', fn ($m) => $m->to('you@gmail.com')->subject('test'));`}</CodeBlock>
                <p>
                    After changing mail config:{" "}
                    <InlineCode>php artisan config:clear</InlineCode> and{" "}
                    <InlineCode>php artisan queue:restart</InlineCode>.
                </p>
            </Section>

            <Section title="Alternatives">
                <p>
                    If Gmail app passwords won't work for the account, any SMTP
                    provider works with the same setup — e.g. Mailtrap (testing),
                    Resend, Brevo, or Mailgun: just change{" "}
                    <InlineCode>MAIL_HOST</InlineCode>,{" "}
                    <InlineCode>MAIL_PORT</InlineCode>,{" "}
                    <InlineCode>MAIL_USERNAME</InlineCode>,{" "}
                    <InlineCode>MAIL_PASSWORD</InlineCode> in{" "}
                    <InlineCode>.env.credentials</InlineCode>.
                </p>
            </Section>
        </>
    );
}