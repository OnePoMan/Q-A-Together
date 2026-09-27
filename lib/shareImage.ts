import type { Question, VibeId } from '../shared/vibes';
import { APP_NAME, APP_URL } from '../shared/brand';

// Canvas colors per vibe: [background top, background bottom, accent].
const PALETTES: Record<VibeId, [string, string, string]> = {
  mix: ['#fff1f2', '#ffedd5', '#e11d48'],
  playful: ['#fffbeb', '#fef9c3', '#d97706'],
  'big-ideas': ['#eef2ff', '#f5f3ff', '#4f46e5'],
  us: ['#fdf4ff', '#fce7f3', '#c026d3'],
  deep: ['#f5f3ff', '#faf5ff', '#7c3aed'],
  wyr: ['#f0fdfa', '#ecfdf5', '#0d9488'],
  quickfire: ['#f0f9ff', '#ecfeff', '#0284c7'],
  spicy: ['#fef2f2', '#ffe4e6', '#dc2626'],
};

const WIDTH = 1080;
const HEIGHT = 1350;
const PAD = 110;
const SERIF = '"Playfair Display Variable", Georgia, serif';
const SANS = '"Inter Variable", system-ui, sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws a question as a 1080x1350 (4:5) card image, sized for social apps and messages. */
export async function renderQuestionImage(question: Question, vibe: VibeId): Promise<Blob> {
  await Promise.all([document.fonts.load(`600 72px ${SERIF}`), document.fonts.load(`600 32px ${SANS}`)]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const [top, bottom, accent] = PALETTES[vibe] ?? PALETTES.mix;

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, top);
  bg.addColorStop(1, bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Card
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 70, 90, WIDTH - 140, HEIGHT - 260, 64);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Category chip
  ctx.font = `600 32px ${SANS}`;
  const chip = question.category || 'Question';
  const chipWidth = ctx.measureText(chip).width + 56;
  ctx.fillStyle = `${accent}1f`;
  roundRect(ctx, PAD, 170, chipWidth, 64, 32);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.textBaseline = 'middle';
  ctx.fillText(chip, PAD + 28, 203);

  // Question, shrinking the font until it fits the card.
  const maxWidth = WIDTH - PAD * 2;
  const boxTop = 290;
  const boxBottom = HEIGHT - 330;
  let size = 76;
  let lines: string[] = [];
  for (; size >= 40; size -= 4) {
    ctx.font = `600 ${size}px ${SERIF}`;
    lines = wrap(ctx, question.text, maxWidth);
    if (lines.length * size * 1.28 <= boxBottom - boxTop) break;
  }
  const lineHeight = size * 1.28;
  let y = boxTop + (boxBottom - boxTop - lines.length * lineHeight) / 2 + lineHeight / 2;
  ctx.fillStyle = '#0f172a';
  for (const line of lines) {
    ctx.fillText(line, PAD, y);
    y += lineHeight;
  }

  // Footer
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(PAD + 22, HEIGHT - 110, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 24px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('?', PAD + 22, HEIGHT - 109);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = `600 34px ${SERIF}`;
  ctx.fillText(APP_NAME, PAD + 64, HEIGHT - 124);
  ctx.fillStyle = '#64748b';
  ctx.font = `500 24px ${SANS}`;
  ctx.fillText(APP_URL.replace('https://', ''), PAD + 64, HEIGHT - 86);

  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png'),
  );
}
