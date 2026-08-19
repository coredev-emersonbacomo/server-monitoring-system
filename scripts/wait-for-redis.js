import net from 'net';

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = parseInt(process.env.REDIS_PORT || '6379', 10);
const timeoutMs = parseInt(process.env.REDIS_WAIT_TIMEOUT_MS || '30000', 10);
const intervalMs = 200;

const start = Date.now();

function attempt() {
  const socket = net.connect(port, host);
  socket.once('connect', () => {
    socket.end();
    process.exit(0);
  });
  socket.once('error', () => {
    if (Date.now() - start > timeoutMs) {
      console.error(`[wait-for-redis] timed out waiting for Redis on ${host}:${port}`);
      process.exit(1);
    }
    setTimeout(attempt, intervalMs);
  });
}

attempt();
