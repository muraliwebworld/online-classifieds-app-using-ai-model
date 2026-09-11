import { app } from './app.js';
import { env } from './config.js';
import { prisma } from './db.js';

const server = app.listen(env.PORT, () => {
  console.log(`Classifieds API listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
