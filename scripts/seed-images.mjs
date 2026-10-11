/**
 * Seeds real image objects for the dev check-ins (punch-list #16).
 *
 * `seed.sql` writes check_in rows whose `image_path` points at objects that
 * were never uploaded, so every seeded card rendered "Photo unavailable" on a
 * fresh database and the feed looked broken on first run.
 *
 * This uploads a small generated PNG for each seeded path. The images are
 * deliberately abstract gradients, not fake photographs — a seeded check-in
 * should look like placeholder content, not like a real person's evidence.
 *
 * Run after `supabase db reset`:  pnpm seed:images
 */
import { deflateSync } from 'node:zlib';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SERVICE_ROLE_KEY ??
  '';

if (!SERVICE_KEY) {
  console.error(
    'Need a service-role key. Run:\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | node -e "...") pnpm seed:images\n' +
      'or export SUPABASE_SERVICE_ROLE_KEY first (supabase status prints it).',
  );
  process.exit(1);
}

// ── A minimal PNG encoder. No image dependency for four placeholder tiles. ──
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** A soft diagonal gradient between two RGB colours. */
function gradientPng(size, from, to) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const t = (x / size) * 0.5 + (y / size) * 0.5;
      raw[p++] = Math.round(from[0] + (to[0] - from[0]) * t);
      raw[p++] = Math.round(from[1] + (to[1] - from[1]) * t);
      raw[p++] = Math.round(from[2] + (to[2] - from[2]) * t);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PALETTES = [
  [[46, 53, 59], [26, 31, 36]],
  [[58, 44, 38], [30, 24, 22]],
  [[38, 50, 46], [22, 30, 28]],
  [[48, 42, 58], [26, 23, 34]],
];


const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/check_ins?select=id,image_path&order=created_at`,
  { headers },
);

if (!res.ok) {
  console.error(`Could not read check_ins: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}

const checkIns = await res.json();

if (!checkIns.length) {
  console.log('No check-ins to seed images for.');
  process.exit(0);
}

let uploaded = 0;
for (const [i, row] of checkIns.entries()) {
  if (!row.image_path) continue;
  const [from, to] = PALETTES[i % PALETTES.length];
  const png = gradientPng(480, from, to);

  const up = await fetch(
    `${SUPABASE_URL}/storage/v1/object/check-ins/${row.image_path}`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'image/png', 'x-upsert': 'true' },
      body: png,
    },
  );

  if (up.ok) uploaded += 1;
  else console.error(`  x ${row.image_path}: HTTP ${up.status} ${await up.text()}`);
}

console.log(`Seeded ${uploaded}/${checkIns.length} check-in images.`);
