import net from 'node:net';
import { env } from '../config.js';

export type ClamAvResult =
  | { clean: true }
  | { clean: false; virus: string };

const CHUNK_SIZE = 64 * 1024;
const TIMEOUT_MS = 15_000;

export function scanBufferWithClamAv(buffer: Buffer): Promise<ClamAvResult> {
  if (!env.CLAMAV_ENABLED) {
    return Promise.resolve({ clean: true });
  }

  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: env.CLAMAV_HOST, port: env.CLAMAV_PORT });
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };

    socket.setTimeout(TIMEOUT_MS, () => {
      finish(() => reject(new Error('ClamAV scan timed out')));
    });

    socket.on('error', (err) => {
      finish(() => reject(err));
    });

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const slice = buffer.subarray(offset, offset + CHUNK_SIZE);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(slice.length, 0);
        socket.write(len);
        socket.write(slice);
      }
      socket.write(Buffer.alloc(4));
    });

    socket.on('data', (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });

    socket.on('end', () => {
      const response = Buffer.concat(chunks).toString('utf8').replace(/\0/g, '').trim();
      if (response === 'stream: OK') {
        finish(() => resolve({ clean: true }));
        return;
      }
      const foundMatch = response.match(/^stream:\s*(.+?)\s+FOUND$/);
      if (foundMatch) {
        finish(() => resolve({ clean: false, virus: foundMatch[1] }));
        return;
      }
      finish(() => reject(new Error(`Unexpected ClamAV response: ${response || 'empty'}`)));
    });
  });
}
