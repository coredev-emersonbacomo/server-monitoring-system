import concurrently from 'concurrently';

const muteDiscord = process.argv.includes('muteDiscord');
if (muteDiscord) {
  process.env.MUTE_DISCORD = '1';
}

const commands = [
  { command: 'C:\\Users\\User\\Redis\\redis-server.exe', name: 'redis', prefixColor: 'yellow' },
  { command: 'npm run dev -w frontend', name: 'dev', prefixColor: 'green' },
  { command: 'php artisan reverb:start', name: 'ws', prefixColor: 'cyan' },
  { command: 'php artisan queue:work -q', name: 'queue', prefixColor: 'magenta' },
  { command: 'php artisan schedule:work', name: 'schedule', prefixColor: 'blue' },
];

const { result } = concurrently(commands);

result.then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
