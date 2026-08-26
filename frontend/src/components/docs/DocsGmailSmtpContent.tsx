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
                    config (host, port, mailer) lives in{" "}
                    <InlineCode>.env.development</InlineCode> (tracked), and the
                    credentials live in <InlineCode>.env</InlineCode> (gitignored,
                    overrides <InlineCode>.env.development</InlineCode>). Laravel
                    loads <InlineCode>.env</InlineCode> directly via its normal env
                    loading — no runtime injection step is needed.
                </p>
                <CodeBlock>{`.env.development  -> MAIL_HOST, MAIL_PORT, MAIL_MAILER (tracked, non-secret)
.env             -> MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS (gitignored, secret)`}</CodeBlock>
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
                </ol>
                <Callout type="warning">
                    <strong>Notes:</strong> If "The setting you are looking for is
                    not available for your account" appears: 2FA (2-Step
                    Verification) is off, a passkey/security key is enrolled (remove
                    it), Google Workspace admin disabled app passwords, or Advanced
                    Protection is on.
                </Callout>
                <ol start={3} className="list-decimal list-inside ml-2 space-y-1">
                    <li>
                        You get a 16-character password — use that, with spaces
                        removed.
                    </li>
                </ol>
            </Section>

            <Section title="2. Configure the credentials file">
                <p>
                    Put your secrets in <InlineCode>.env</InlineCode> (gitignored,
                    in the project root) — it overrides the tracked{" "}
                    <InlineCode>.env.development</InlineCode> values:
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
                <Callout type="warning">
                    After editing mail config, clear the cache:{" "}
                    <InlineCode>php artisan config:clear</InlineCode> (the dev stack
                    also restarts the workers automatically when{" "}
                    <InlineCode>.env</InlineCode> changes).
                </Callout>
                <Callout type="warning">
                    The app password acts as full account access. Never commit it
                    (it lives in the gitignored <InlineCode>.env</InlineCode>), and
                    delete it from Google when it's no longer needed.
                </Callout>
            </Section>

            <Section title="3. Run">
                <p>
                    Credentials live in <InlineCode>.env</InlineCode>, which Laravel
                    loads directly — both the dev stack and manual{" "}
                    <InlineCode>php artisan</InlineCode> commands pick them up. Start
                    everything with:
                </p>
                <CodeBlock>{`npm run dev`}</CodeBlock>
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
                    <InlineCode>.env</InlineCode>.
                </p>
            </Section>
        </>
    );
}