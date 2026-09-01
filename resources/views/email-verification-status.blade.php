<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f3f4f6;">
    <table width="100%" height="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0c0e14; padding: 40px 16px;">
        <tr>
            <td align="center" valign="middle">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 440px; background-color: #12161f; border-radius: 16px; border: 1px solid #1f293d; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
                    <tr>
                        <td style="padding: 36px 36px 28px; text-align: center;">
                            <div style="width: 56px; height: 56px; line-height: 56px; border-radius: 50%; margin: 0 auto 20px; {{ $success ? 'background-color: rgba(16,185,129,0.15);' : 'background-color: rgba(239,68,68,0.15);' }}">
                                <span style="font-size: 26px;">{{ $success ? '✓' : '!' }}</span>
                            </div>
                            <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                                {{ $title }}
                            </h1>
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                                {{ $message }}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 16px 36px 28px; text-align: center; border-top: 1px solid #1a2233; background-color: #0f131a;">
                            <p style="margin: 0; font-size: 12px; color: #64748b;">
                                {{ $appName ?? 'CoreDev Server Monitoring' }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
