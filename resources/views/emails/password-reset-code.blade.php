<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'Password Reset Code' }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0c0e14; padding: 40px 16px;">
        <tr>
            <td align="center">
                <!-- Main Container Card -->
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; background-color: #12161f; border-radius: 16px; border: 1px solid #1f293d; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 36px 24px; text-align: center; border-bottom: 1px solid #1a2233; background: linear-gradient(180deg, #182030 0%, #12161f 100%);">
                            <table align="center" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td style="vertical-align: middle; padding-right: 14px;">
                                        <img src="https://coredev.ph/assets/coreDevlogo-CUQ-ORnY.png" alt="CoreDev Logo" width="44" height="44" style="display: block; width: 44px; height: 44px; object-fit: contain; border: 0; outline: none;" />
                                    </td>
                                    <td style="vertical-align: middle; text-align: left;">
                                        <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; display: block;">
                                            {{ $appName ?? 'CoreDev Server Monitoring' }}
                                        </span>
                                        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #f97316;">
                                            Security Alert
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 36px 28px;">
                            <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.02em;">
                                Password Reset Code
                            </h1>
                            <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center;">
                                We received a request to reset your password. Use the verification code below to complete the process.
                            </p>

                            <!-- Code Box -->
                            <div style="background-color: #0b0f19; border: 1px dashed #f97316; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
                                <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #f97316; display: block; margin-bottom: 8px;">
                                    Verification Code
                                </span>
                                <div style="font-family: 'SF Mono', 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.35em; color: #ffffff; padding-left: 0.35em;">
                                    {{ $code }}
                                </div>
                                <span style="font-size: 12px; color: #64748b; display: inline-flex; align-items: center; margin-top: 10px;">
                                     Code expires in <strong style="color: #cbd5e1; margin-left: 4px;">{{ $expiresInMinutes ?? 10 }} minutes</strong>
                                </span>
                            </div>

                            <!-- Security Warning Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #161c28; border-radius: 10px; border-left: 4px solid #f97316; padding: 14px 16px; margin-bottom: 8px;">
                                <tr>
                                    <td style="font-size: 12px; line-height: 1.5; color: #94a3b8;">
                                        <strong style="color: #e2e8f0; display: block; margin-bottom: 2px;">Didn't request this change?</strong>
                                        If you did not request a password reset, you can safely ignore this email. Your account remains completely secure.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 36px 28px; text-align: center; border-top: 1px solid #1a2233; background-color: #0f131a;">
                            <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">
                                This is an automated security notification from <strong style="color: #94a3b8;">{{ $appName ?? 'CoreDev Server Monitoring' }}</strong>.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #475569;">
                                Please do not reply to this email directly.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
