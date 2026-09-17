/* ------------------------------------------------------------------ */
/*  INDEXA OG IMAGES — PNG 1200×630 en pur Node, zéro dépendance       */
/*  node:zlib pour le deflate, police bitmap 5×7 pour le texte.        */
/*  Pourquoi PNG et pas SVG : WhatsApp/X/Facebook refusent le SVG.     */
/* ------------------------------------------------------------------ */
import zlib from 'node:zlib';

const W = 1200, H = 630;

/* ------------------------- couleurs (RGB) -------------------------- */
/*  Palette Superpower : fond blanc, texte carbone, accent coral        */
const BG = [255, 255, 255];
const INK = [24, 24, 27];
const DIM = [113, 113, 122];
const ACCENT = [252, 95, 43];
const LINE = [228, 228, 231];

/* --------------------------- police 5×7 ---------------------------- */
/* 35 bits par glyphe, 5 colonnes × 7 lignes, '1' = pixel allumé       */
const FONT = {
  A: '0111010001100011111100011000110001', B: '1111010001100011111010001100011111',
  C: '0111010001100001000010000100010111', D: '1111010001100011000110001100011111',
  E: '1111110000100001111010000100001111', F: '1111110000100001111010000100000000',
  G: '0111010001100001011110001100010111', H: '1000110001100011111110001100011000',
  I: '0111000100001000010000100001000111', J: '001110001000010000100001100100110 0'.replace(/ /g, '0'),
  K: '1000110010101001100010100100110001', L: '1000010000100001000010000100001111',
  M: '1000111011101011010110001100011000', N: '1000110001100111010110011100011000',
  O: '0111010001100011000110001100010111', P: '1111010001100011111010000100000000',
  Q: '0111010001100011000110101100101101', R: '1111010001100011111010100100110001',
  S: '0111110000100000111000001000011111', T: '1111100100001000010000100001000010',
  U: '1000110001100011000110001100010111', V: '1000110001100011000110001010100100',
  W: '1000110001100011010110101110110001', X: '100010101000100010001010100011000',
  Y: '1000101010001000010000100001000010', Z: '1111100001000100010001000100001111',
  0: '0111010001100111010111001100010111', 1: '0010001100001000010000100001001110',
  2: '0111010001000010011001000100001111', 3: '111110001000100001000001100010111',
  4: '0001000110010100100111110001000010', 5: '111111000011110000010000100010111',
  6: '0011001000100001111010001100010111', 7: '1111100001000100010001000010000100',
  8: '0111010001100010111010001100010111', 9: '0111010001100010111100001000101100',
  ' ': '0000000000000000000000000000000000',
  '-': '0000000000000001111100000000000000', '—': '0000000000000001111100000000000000',
  ':': '0000001100011000000011000110000000', '.': '0000000000000000000000000110001100',
  ',': '0000000000000000000001100010001000', "'": '0011001100010000000000000000000000',
  '?': '0111010001000010001100100000000100', '!': '0010000100001000010000100000000100',
  '/': '0000100010001000010001000100010000', '(': '0001000100010000100001000100010001',
  ')': '0001000100001000010001000100010001', '+': '0000000100001001111100100001000000',
  '&': '0110010010100100110010101100101101', '×': '0000010001010100010001010100010000'
};

/* ------------------------- primitives dessin ----------------------- */
function fillRect(px, x0, y0, w, h, [r, g, b]) {
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) {
    let i = (y * W + Math.max(0, x0)) * 3;
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) {
      px[i++] = r; px[i++] = g; px[i++] = b;
    }
  }
}

function drawText(px, x, y, text, color, scale = 1) {
  const clean = String(text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  let cx = x;
  for (const ch of clean) {
    const bits = FONT[ch] || FONT['?'];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (bits[row * 5 + col] === '1') {
          fillRect(px, cx + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cx += 6 * scale;
  }
  return cx - x;
}

const textWidth = (text, scale = 1) => String(text || '').length * 6 * scale;

/* ------------------------------ carte ------------------------------ */
export function ogImagePNG({ title, city, path }) {
  const px = Buffer.alloc(W * H * 3);
  for (let i = 0; i < px.length; i += 3) { px[i] = BG[0]; px[i + 1] = BG[1]; px[i + 2] = BG[2]; }

  /* cadre + barre d'accent */
  fillRect(px, 0, 0, W, 4, LINE);
  fillRect(px, 0, H - 4, W, 4, LINE);
  fillRect(px, 70, 150, 6, 280, ACCENT);

  /* kicker */
  drawText(px, 100, 90, 'INDEXA — GENERATED PAGE', DIM, 2);

  /* titre : ligne 1 (prestation) + ligne 2 (ville) si présent */
  const lines = String(title || 'INDEXA').split('\n').map(s => s.trim()).filter(Boolean);
  const l1 = lines[0] || 'INDEXA';
  const l2 = lines[1] || city || '';

  /* taille adaptative : tient dans ~980px */
  const s1 = Math.max(2, Math.min(6, Math.floor(980 / Math.max(1, textWidth(l1, 1)))));
  drawText(px, 100, 165, l1, INK, s1);

  let y = 165 + 7 * s1 + 26;
  if (l2) {
    const s2 = Math.max(2, Math.min(6, Math.floor(980 / Math.max(1, textWidth(l2, 1)))));
    drawText(px, 100, y, l2, ACCENT, s2);
    y += 7 * s2 + 30;
  }

  /* chemin de l'URL en bas */
  if (path) drawText(px, 100, H - 90, path, DIM, 2);

  /* signature marque en bas à droite */
  const brand = 'INDEXA';
  drawText(px, W - 100 - textWidth(brand, 2), H - 90, brand, INK, 2);

  return pngEncode(px);
}

/* --------------------------- encodeur PNG -------------------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function pngEncode(px) {
  /* scanlines filtrées (filtre 0 = None) */
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    px.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type : truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
