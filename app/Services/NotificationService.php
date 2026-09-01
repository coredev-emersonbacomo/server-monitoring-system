<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    private function parseDiscordButton(string $message): array
    {
        $buttonUrl = null;
        $buttonLabel = 'Button';
        $cleaned = $message;

        if (preg_match('/<discord-button(?:\s+(?:href|url|detailsUrl)="([^"]*)")?\s*>([^<]*)<\/discord-button>/', $message, $matches)) {
            $buttonUrl = ! empty($matches[1]) ? $matches[1] : null;
            $buttonLabel = ! empty($matches[2]) ? $matches[2] : 'Button';
            $cleaned = trim(str_replace($matches[0], '', $message));
        }

        return [$cleaned, $buttonUrl, $buttonLabel];
    }

    private function parseDiscordFooter(string $message): array
    {
        $footer = null;
        $cleaned = $message;

        if (preg_match('/<discord-footer>([^<]*)<\/discord-footer>/', $message, $matches)) {
            $footer = ! empty($matches[1]) ? $matches[1] : null;
            $cleaned = trim(str_replace($matches[0], '', $message));
        }

        return [$cleaned, $footer];
    }

    private function parseDiscordEmbedTitle(string $message): array
    {
        $title = '';
        $cleaned = $message;

        if (preg_match('/<discord-embed-title>([^<]*)<\/discord-embed-title>/', $message, $matches)) {
            $title = $matches[1];
            $cleaned = trim(str_replace($matches[0], '', $message));
        }

        return [$cleaned, $title];
    }

    private function parseDiscordEmbed(string $message): array
    {
        $embedInner = null;
        $cleaned = $message;

        if (preg_match('/<discord-embed\s*>(.*?)<\/discord-embed>/s', $message, $matches)) {
            $embedInner = trim($matches[1]);
            $cleaned = trim(preg_replace('/<discord-embed\s*>(.*?)<\/discord-embed>/s', '', $message));
        }

        return [$cleaned, $embedInner];
    }

    private function parseEmailButton(string $message): array
    {
        $buttonUrl = null;
        $buttonLabel = 'View Server Details';
        $cleaned = $message;

        if (preg_match('/<email-button(?:\s+(?:href|url|detailsUrl)="([^"]*)")?\s*>([^<]*)<\/email-button>/', $message, $matches)) {
            $buttonUrl = ! empty($matches[1]) ? $matches[1] : null;
            $buttonLabel = ! empty($matches[2]) ? $matches[2] : 'View Server Details';
            $cleaned = trim(str_replace($matches[0], '', $message));
        }

        return [$cleaned, $buttonUrl, $buttonLabel];
    }

    /**
     * Send an alert to a Discord text channel using an embed card with link buttons.
     *
     * @param  string  $tokenId  The Bot Token
     * @param  string  $roleId  The Discord Role ID to mention
     * @param  string  $message  The message content
     * @param  string  $channelId  The Channel ID to send the message to
     * @param  string  $color  Hex color for the embed sidebar (default: red)
     */
    public function sendDiscordAlert(
        string $tokenId,
        string $roleId,
        string $message,
        string $channelId,
        string $color = '#ED4245',
    ) {
        [$message, $buttonUrl, $buttonLabel] = $this->parseDiscordButton($message);
        [$outerContent, $embedInner] = $this->parseDiscordEmbed($message);

        if ($embedInner !== null) {
            [$embedInner, $footerContent] = $this->parseDiscordFooter($embedInner);
            [$embedInner, $embedTitle] = $this->parseDiscordEmbedTitle($embedInner);
            $content = $outerContent;
            $description = $embedInner;
        } else {
            [$outerContent, $footerContent] = $this->parseDiscordFooter($outerContent);
            [$outerContent, $embedTitle] = $this->parseDiscordEmbedTitle($outerContent);
            $lines = preg_split('/\r?\n/', trim($outerContent), 2);
            $content = trim($lines[0]);
            $description = isset($lines[1]) ? trim($lines[1]) : '';
        }

        $footerText = $footerContent ?? 'Server Monitoring System';

        $payload = [];
        if ($content !== '') {
            $payload['content'] = "\u{200B}\n".$content;
        }
        if ($roleId) {
            $payload['allowed_mentions'] = ['roles' => [$roleId]];
        }

        if ($description !== '' || $embedTitle !== '') {
            $embed = [
                'color' => hexdec(ltrim($color, '#')),
                'timestamp' => now()->toIso8601String(),
                'footer' => ['text' => $footerText],
            ];
            if ($description !== '') {
                $embed['description'] = "\u{200B}\n".$description."\n\u{200B}";
            }
            if ($embedTitle !== '') {
                $embed['title'] = $embedTitle;
            }
            $payload['embeds'] = [$embed];
        }

        $components = [];
        if ($buttonUrl) {
            $components[] = [
                'type' => 1,
                'components' => [[
                    'type' => 2,
                    'style' => 5,
                    'label' => $buttonLabel,
                    'url' => $buttonUrl,
                ]],
            ];
        }
        $payload['components'] = $components;

        $response = Http::timeout(15)
            ->withHeaders([
                'Authorization' => 'Bot '.$tokenId,
                'Content-Type' => 'application/json',
            ])
            ->post("https://discord.com/api/v10/channels/{$channelId}/messages", $payload);

        if (! $response->successful()) {
            Log::error('[discord] Failed to send message', [
                'channel_id' => $channelId,
                'status' => $response->status(),
                'error' => $response->body(),
            ]);

            return false;
        }

        return true;
    }

    /**
     * Send an email alert with HTML card styling.
     *
     * @param  array|string  $receivers  The email address(es) to send to.
     * @param  string  $message  The message content.
     * @param  string  $subject  The email subject.
     * @param  string|null  $url  Optional URL link to include in the email.
     */
    public function sendEmailAlert(
        array|string $receivers,
        string $message,
        string $subject = 'System Notification',
        ?string $url = null,
    ) {
        $receivers = is_array($receivers) ? $receivers : [$receivers];

        $appName = config('app.name', 'Server Monitor');

        [$message, $buttonUrl, $buttonLabel] = $this->parseEmailButton($message);
        $buttonUrl = $buttonUrl ?? $url;

        $buttonHtml = '';
        if ($buttonUrl) {
            $buttonHtml = "
                <tr>
                    <td style=\"padding: 20px 30px 10px; text-align: center;\">
                        <a href=\"{$buttonUrl}\"
                           style=\"background-color: #3b82f6; color: #ffffff; padding: 10px 24px;
                                  text-decoration: none; border-radius: 6px; font-weight: 600;
                                  font-size: 14px; display: inline-block;\">
                            {$buttonLabel}
                        </a>
                    </td>
                </tr>";
        }

        $escapedMessage = nl2br(e($message));

        $html = "
        <!DOCTYPE html>
        <html>
        <head><meta charset=\"utf-8\"></head>
        <body style=\"margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\">
            <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color: #f4f5f7; padding: 40px 0;\">
                <tr>
                    <td align=\"center\">
                        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\"
                               style=\"background-color: #ffffff; border-radius: 8px; overflow: hidden;
                                      box-shadow: 0 1px 3px rgba(0,0,0,0.1);\">
                            <tr>
                                <td style=\"background-color: #1f2937; padding: 16px 30px;\">
                                    <span style=\"color: #ffffff; font-size: 16px; font-weight: 700;\">{$appName}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style=\"padding: 30px;\">
                                    <h2 style=\"margin: 0 0 16px; color: #1f2937; font-size: 20px; font-weight: 600;\">
                                        {$subject}
                                    </h2>
                                    <div style=\"color: #374151; font-size: 15px; line-height: 1.6;\">
                                        {$escapedMessage}
                                    </div>
                                </td>
                            </tr>
                            {$buttonHtml}
                            <tr>
                                <td style=\"background-color: #f9fafb; padding: 16px 30px;
                                           border-top: 1px solid #e5e7eb;\">
                                    <p style=\"margin: 0; color: #9ca3af; font-size: 12px;\">
                                        This is an automated notification from {$appName}.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>";

        Mail::html($html, function ($mail) use ($receivers, $subject) {
            $mail->to($receivers)
                ->subject($subject);
        });
    }

    /**
     * Send password reset code email using dedicated styled Mailable & Blade template.
     */
    public function sendPasswordResetCode(
        string $receiver,
        string $code,
        int $expiresInMinutes = 10,
    ): void {
        $logoPath = public_path('images/coreDevlogo.png');

        Mail::to($receiver)->send(
            new \App\Mail\PasswordResetCodeMail(
                code: $code,
                expiresInMinutes: $expiresInMinutes,
                logoPath: file_exists($logoPath) ? $logoPath : null,
            )
        );
    }
}
