<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;
use Discord\Discord;
use Discord\Builders\MessageBuilder;
use Discord\Parts\Embed\Embed;

class NotificationService
{
    /**
     * Send an alert to a Discord text channel using an embed card.
     *
     * @param string $tokenId The Bot Token
     * @param string $roleId The Discord Role ID to mention
     * @param string $message The message content
     * @param string $channelId The Channel ID to send the message to
     * @param string $title The embed title
     * @param string|null $url Optional URL link shown on the embed
     * @param string $color Hex color for the embed sidebar (default: red)
     */
    public function sendDiscordAlert(
        string $tokenId,
        string $roleId,
        string $message,
        string $channelId,
        string $title = 'System Alert',
        ?string $url = null,
        string $color = '#ED4245',
    ) {
        $discord = new Discord([
            'token' => $tokenId,
        ]);

        $discord->on('ready', function (Discord $discord) use ($roleId, $message, $channelId, $title, $url, $color) {
            $channel = $discord->getChannel($channelId);

            if ($channel) {
                $embed = new Embed($discord);
                $embed->setTitle($title);
                $embed->setDescription($message);
                $embed->setColor($color);
                $embed->setTimestamp(now()->timestamp);
                $embed->setFooter('Server Monitoring System');

                if ($url) {
                    $embed->setURL($url);
                }

                $builder = MessageBuilder::new()
                    ->addEmbed($embed);

                if ($roleId) {
                    $builder->setContent("<@&{$roleId}>");
                    $builder->setAllowedMentions(['roles' => [$roleId]]);
                }

                $channel->sendMessage($builder)->then(function () use ($discord) {
                    $discord->close();
                }, function () use ($discord) {
                    $discord->close();
                });
            } else {
                $discord->close();
            }
        });

        $discord->run();
    }

    /**
     * Send an email alert with HTML card styling.
     *
     * @param array|string $receivers The email address(es) to send to.
     * @param string $message The message content.
     * @param string $subject The email subject.
     * @param string|null $url Optional URL link to include in the email.
     */
    public function sendEmailAlert(
        array|string $receivers,
        string $message,
        string $subject = 'System Notification',
        ?string $url = null,
    ) {
        $receivers = is_array($receivers) ? $receivers : [$receivers];

        $appName = config('app.name', 'Server Monitor');
        $buttonHtml = '';

        if ($url) {
            $buttonHtml = "
                <tr>
                    <td style=\"padding: 20px 30px 10px; text-align: center;\">
                        <a href=\"{$url}\"
                           style=\"background-color: #3b82f6; color: #ffffff; padding: 10px 24px;
                                  text-decoration: none; border-radius: 6px; font-weight: 600;
                                  font-size: 14px; display: inline-block;\">
                            View Server Details
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
}
