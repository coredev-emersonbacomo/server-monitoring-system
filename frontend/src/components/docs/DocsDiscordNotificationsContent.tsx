import {
    Section,
    CodeBlock,
    InlineCode,
    Callout,
} from "@/components/docs/Section";

export function DocsDiscordNotificationsContent() {
    return (
        <>
            <Section title="Overview">
                <p>
                    The alert configurator and default alert graph send real-time Discord notifications
                    for critical events (such as CPU, Memory, Disk, or Network sustained above 85%, or
                    servers going offline).
                </p>
                <p>
                    When alerts are seeded or executed, the system reads three environment variables:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>SEEDED_DISCORD_BOT_TOKEN</InlineCode> - The Bot Token from your Discord Developer Portal application used to authenticate HTTP requests to the Discord API.
                    </li>
                    <li>
                        <InlineCode>SEEDED_DISCORD_CHANNEL_ID</InlineCode> - The Channel ID where alert embeds, messages, and interactive buttons will be posted.
                    </li>
                    <li>
                        <InlineCode>SEEDED_DISCORD_ROLE_ID</InlineCode> - (Optional) The Role ID to ping/mention (e.g. <InlineCode>&lt;@&amp;role_id&gt;</InlineCode>) when a critical alert fires.
                    </li>
                </ul>
            </Section>

            <Section title="Step 1: Create a Discord Application & Bot">
                <ol className="list-decimal list-inside space-y-2">
                    <li>
                        Go to the{" "}
                        <a
                            className="text-primary underline"
                            href="https://discord.com/developers/applications"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Discord Developer Portal
                        </a>{" "}
                        and log in with your Discord account.
                    </li>
                    <li>
                        Click the <strong>New Application</strong> button at the top right, enter an application name (e.g., <em>Server Monitoring Alerts</em>), and click <strong>Create</strong>.
                    </li>
                    <li>
                        In the left sidebar, navigate to the <strong>Bot</strong> tab.
                    </li>
                    <li>
                        Click <strong>Reset Token</strong> (or <em>Copy</em> if newly created) to generate your bot token.
                    </li>
                    <li>
                        Copy this token — this is your <InlineCode>SEEDED_DISCORD_BOT_TOKEN</InlineCode>.
                    </li>
                </ol>
                <Callout type="warning" title="Keep Bot Token Secret">
                    Your bot token acts as a password with full permissions granted to the bot. Never commit it to public version control; always put it in your personal gitignored <InlineCode>.env</InlineCode>.
                </Callout>
                {/* Image Placeholder: Bot Creation & Token */}
                {/* <DocImage src="/images/docs/discord-bot-token.png" alt="Discord Bot Token" caption="Copying the Bot Token from Discord Developer Portal" /> */}
            </Section>

            <Section title="Step 2: Invite the Bot to Your Server">
                <ol className="list-decimal list-inside space-y-2">
                    <li>
                        In the Developer Portal left sidebar, navigate to <strong>Installation</strong> or <strong>OAuth2 &gt; URL Generator</strong>.
                    </li>
                    <li>
                        Under <strong>Scopes</strong>, select <InlineCode>bot</InlineCode>.
                    </li>
                    <li>
                        Under <strong>Bot Permissions</strong>, select at least:
                        <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                            <li><strong>Send Messages</strong></li>
                            <li><strong>Embed Links</strong></li>
                            <li><strong>Attach Files</strong> (optional, for chart attachments)</li>
                            <li><strong>Mention Everyone / Roles</strong> (if pinging alert roles)</li>
                        </ul>
                    </li>
                    <li>
                        Copy the generated <strong>Install Link</strong> / authorization URL, open it in your browser, select your target Discord server, and click <strong>Authorize</strong>.
                    </li>
                </ol>
                {/* Image Placeholder: OAuth2 URL Generator & Permissions */}
                {/* <DocImage src="/images/docs/discord-bot-invite.png" alt="Discord Bot Invite" caption="Inviting Bot with Send Messages and Embed Links permissions" /> */}
            </Section>

            <Section title="Step 3: Enable Developer Mode in Discord">
                <p>
                    Developer Mode allows you to right-click channels and roles to easily copy their Snowflake IDs.
                </p>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Open your Discord desktop app or web browser client.</li>
                    <li>Click the <strong>User Settings (gear icon)</strong> at the bottom left next to your profile.</li>
                    <li>Under <em>App Settings</em> in the left sidebar, click <strong>Advanced</strong>.</li>
                    <li>Toggle <strong>Developer Mode</strong> to <strong>ON</strong>.</li>
                </ol>
                {/* Image Placeholder: Discord Developer Mode toggle */}
                {/* <DocImage src="/images/docs/discord-developer-mode.png" alt="Discord Developer Mode" caption="Enabling Developer Mode in Discord Settings" /> */}
            </Section>

            <Section title="Step 4: Copy the Channel ID">
                <ol className="list-decimal list-inside space-y-2">
                    <li>Navigate to the Discord server where your bot was invited.</li>
                    <li>Locate the text channel designated for alerts (e.g., <InlineCode>#server-alerts</InlineCode>).</li>
                    <li>Right-click the channel name in the channel list and select <strong>Copy Channel ID</strong>.</li>
                    <li>This numeric ID is your <InlineCode>SEEDED_DISCORD_CHANNEL_ID</InlineCode>.</li>
                </ol>
                <Callout type="info" title="Channel Permissions">
                    Ensure the bot has permission to view and send messages in this specific channel. If the channel is private, add the bot to the channel under <em>Edit Channel &gt; Permissions</em>.
                </Callout>
                {/* Image Placeholder: Copy Channel ID */}
                {/* <DocImage src="/images/docs/discord-channel-id.png" alt="Copy Channel ID" caption="Right-clicking channel to Copy Channel ID" /> */}
            </Section>

            <Section title="Step 5: Copy the Role ID (Optional)">
                <p>
                    If you want Discord alerts to mention a specific role (such as <InlineCode>@OnCall</InlineCode> or <InlineCode>@SecOps</InlineCode>):
                </p>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Go to your Discord server settings: click the server name at the top left &gt; <strong>Server Settings</strong>.</li>
                    <li>Click <strong>Roles</strong> in the sidebar.</li>
                    <li>Find the role you want to alert, click the three dots (<InlineCode>...</InlineCode>) next to it, and select <strong>Copy Role ID</strong>.</li>
                    <li>This numeric ID is your <InlineCode>SEEDED_DISCORD_ROLE_ID</InlineCode>.</li>
                </ol>
                {/* Image Placeholder: Copy Role ID */}
                {/* <DocImage src="/images/docs/discord-role-id.png" alt="Copy Role ID" caption="Copying Role ID in Server Settings" /> */}
            </Section>

            <Section title="Step 6: Add to Your Environment File">
                <p>
                    Add your collected credentials to your gitignored <InlineCode>.env</InlineCode> file in the project root:
                </p>
                <CodeBlock filename=".env">{`SEEDED_DISCORD_BOT_TOKEN="your_discord_bot_token_here"
SEEDED_DISCORD_CHANNEL_ID="123456789012345678"
SEEDED_DISCORD_ROLE_ID="987654321098765432"  # Optional`}</CodeBlock>
                <Callout type="warning" title="Clear Configuration Cache">
                    After updating <InlineCode>.env</InlineCode>, restart your workers or run:
                    <CodeBlock>{`php artisan config:clear`}</CodeBlock>
                </Callout>
            </Section>

            <Section title="Step 7: Seed or Update the Alert Graph">
                <p>
                    Once the environment variables are set in <InlineCode>.env</InlineCode>, run the database seeder or node config seeder so the default Discord alert nodes pick up your credentials:
                </p>
                <CodeBlock>{`php artisan db:seed --class=NodeConfigSeeder`}</CodeBlock>
                <p>
                    You can also inspect or customize Discord alert nodes anytime in the dashboard under{" "}
                    <strong>Settings &gt; Alert Config Editor</strong>.
                </p>
            </Section>
        </>
    );
}
