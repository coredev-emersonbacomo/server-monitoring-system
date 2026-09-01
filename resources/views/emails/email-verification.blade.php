<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'Verify Your Email' }}</title>
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
                                            Account Verification
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
                                Verify Your Email
                            </h1>
                            <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center;">
                                You're almost there. Confirm that <strong style="color: #cbd5e1;">{{ $userEmail ?? '' }}</strong> belongs to you to unlock the full {{ $appName ?? 'CoreDev Server Monitoring' }} experience.
                            </p>

                            <!-- Verify Button -->
                            <table align="center" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
                                <tr>
                                    <td>
                                        <a href="{{ $verifyUrl }}"
                                           style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 40px;
                                                  text-decoration: none; border-radius: 10px; font-weight: 700;
                                                  font-size: 14px; letter-spacing: 0.02em;">
                                            Verify Email
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Expiry Note -->
                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td align="center" style="font-size: 12px; color: #64748b; padding-bottom: 8px;">
                                        This link expires in <strong style="color: #cbd5e1;">{{ $expiresInMinutes ?? 60 }} minutes</strong>.
                                    </td>
                                </tr>
                            </table>

                            <!-- Security Warning Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #161c28; border-radius: 10px; border-left: 4px solid #f97316; padding: 14px 16px; margin-top: 16px;">
                                <tr>
                                    <td style="font-size: 12px; line-height: 1.5; color: #94a3b8;">
                                        <strong style="color: #e2e8f0; display: block; margin-bottom: 2px;">Didn't request this?</strong>
                                        If you did not create an account with this email, you can safely ignore this email.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 36px 28px; text-align: center; border-top: 1px solid #1a2233; background-color: #0f131a;">
                            <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">
                                This is an automated notification from <strong style="color: #94a3b8;">{{ $appName ?? 'CoreDev Server Monitoring' }}</strong>.
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
