<?php

namespace App\Services;

class DiscordAlertService
{
    /**
     * Send an alert to a Discord text channel.
     *
     * @param string $tokenId The Bot Token
     * @param string $roleId The Discord Role ID to mention
     * @param string $message The message content
     * @param string $channelId The Channel ID to send the message to
     */
    public static function sendAlert(string $tokenId, string $roleId, string $message, string $channelId)
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
}
