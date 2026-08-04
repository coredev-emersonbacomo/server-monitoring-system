# Gmail SMTP Setup

How email notifications are sent through a Gmail account.

## How it works

Secrets never live in the tracked `.env`. The transport config lives in `.env`
(tracked), the credentials live in `.env.credentials` (gitignored), and
`scripts/dev.js` injects them into the process environment at runtime before
starting Laravel. Laravel prefers injected env vars over `.env` values.

```
scripts/dev.js -> reads .env.credentials -> sets process.env -> php artisan (queue:work)
                                                              -> php artisan (schedule:work)
```

## 1. Get a Gmail App Password

Gmail blocks your normal password for SMTP. App passwords require:

1. Enable **2-Step Verification** on the Gmail account (Security > 2-Step Verification).
2. Go to https://myaccount.google.com/apppasswords and create one for "Mail".
3. You get a 16-character password — use that, with spaces removed.

> Notes:
> - If "The setting you are looking for is not available for your account"
>   appears: 2SV is off, a passkey/security key is enrolled (remove it),
>   Google Workspace admin disabled app passwords, or Advanced Protection is on.
> - The app password can act as full account access. Never commit it, and
>   delete it from Google when it's no longer needed.

## 2. Configure the credentials file

Create `.env.credentials` (gitignored) in the project root:

```env
MAIL_USERNAME="you@gmail.com"
MAIL_PASSWORD="the16characterapppassword"
MAIL_FROM_ADDRESS="you@gmail.com"
```

The tracked `.env` keeps the non-secret SMTP transport config:

```env
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@example.com"
```

`MAIL_SCHEME=null` on port 587 uses STARTTLS automatically. For port 465 use
`MAIL_PORT=465` and `MAIL_SCHEME=smtps`.

## 3. Run through dev.js

Credentials are only injected by the dev script. Start everything with:

```
npm run dev
```

(When running `php artisan` commands manually, credentials are not injected —
the send will fail or fall back to the `.env` values.)

## 4. Verify recipients

Alerts are sent to the `secopclients` attached to the server's client
(`app/NodeConfig/Jobs/SendNotification.php`), not to the sender address. A
server with no secop client email logs `no recipients found` and skips.

## 5. Test

```
php artisan tinker
>>> Mail::html('<h1>test</h1>', fn ($m) => $m->to('you@gmail.com')->subject('test'));
```

After changing mail config: `php artisan config:clear` and `php artisan queue:restart`.

## Alternatives

If Gmail app passwords won't work for the account, any SMTP provider works
with the same setup — e.g. Mailtrap (testing), Resend, Brevo, or Mailgun:
just change `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` in
`.env.credentials`.
