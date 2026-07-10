<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;

class NotificationService
{
    /**
     * Send an alert to a Discord text channel.
     *
     * @param string $tokenId The Bot Token
     * @param string $roleId The Discord Role ID to mention
     * @param string $message The message content
     * @param string $channelId The Channel ID to send the message to
     */
    public function sendDiscordAlert(string $tokenId, string $roleId, string $message, string $channelId)
    {
        $discord = new \Discord\Discord([
            'token' => $tokenId,
        ]);

        $discord->on('ready', function (\Discord\Discord $discord) use ($roleId, $message, $channelId) {
            $channel = $discord->getChannel($channelId);

            if ($channel) {
                $builder = \Discord\Builders\MessageBuilder::new()
                    ->setContent("<@&{$roleId}> ({$message})")
                    ->setAllowedMentions(['roles' => [$roleId]]);

                $channel->sendMessage($builder)->done(function () use ($discord) {
                    $discord->close();
                });
            } else {
                $discord->close();
            }
        });

        $discord->run();
    }

    /**
     * Send an email alert.
     *
     * @param array|string $receivers The email address(es) to send to.
     * @param string $message The message content to send.
     */
    public function sendEmailAlert(array|string $receivers, string $message)
    {
        // Convert single receiver to array to support multiple easily
        $receivers = is_array($receivers) ? $receivers : func_get_args()[0] ?? [$receivers];
        if (is_string($receivers)) {
            $receivers = [$receivers];
        }

        Mail::raw($message, function ($mail) use ($receivers) {
            $mail->to($receivers)
                 ->subject('System Notification');
        });
    }
}
