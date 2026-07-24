<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;
use Discord\Discord;
use Discord\Builders\MessageBuilder;

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
        $discord = new Discord([
            'token' => $tokenId,
        ]);

        $discord->on('ready', function (Discord $discord) use ($roleId, $message, $channelId) {
            $channel = $discord->getChannel($channelId);

            if ($channel) {
                $content = $roleId
                    ? "<@&{$roleId}> ({$message})"
                    : $message;

                $builder = MessageBuilder::new()
                    ->setContent($content);

                if ($roleId) {
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
     * Send an email alert.
     *
     * @param array|string $receivers The email address(es) to send to.
     * @param string $message The message content to send.
     * @param string $subject The email subject.
     */
    public function sendEmailAlert(array|string $receivers, string $message, string $subject = 'System Notification')
    {
        $receivers = is_array($receivers) ? $receivers : [$receivers];

        Mail::raw($message, function ($mail) use ($receivers, $subject) {
            $mail->to($receivers)
                 ->subject($subject);
        });
    }
}
