import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// A cross-stitch panel in the spirit of Palestinian tatreez: an eight-pointed star
// inside a border, worked on aida-style cloth. Each completed promise = one stitch.
// Cells are filled from the centre outward with a little deterministic jitter, so the
// panel grows like real embroidery and every visitor sees the same picture.

const N = 29;
const C = (N - 1) / 2;
const CELL = 10;
const COLORS = { red: 'var(--thread)', black: 'var(--ink)', olive: 'var(--olive)' };

function seeded(i) { // tiny deterministic PRNG
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function buildMotif() {
  const cells = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = Math.abs(x - C), dy = Math.abs(y - C);
      const edge = Math.max(dx, dy);
      const sq = edge / 6, di = (dx + dy) / 9;
      const inStar = edge <= 6 || dx + dy <= 9;
      let color = null;
      if (inStar) {
        const ring = Math.floor(Math.min(sq, di) * 3.2);
        color = ['red', 'black', 'red', 'olive', 'red'][Math.min(ring, 4)];
      } else if (edge === 14) {
        color = 'black';
      } else if (edge === 12 && (x + y) % 2 === 0) {
        color = (x + y) % 4 === 0 ? 'red' : 'olive';
      } else if (edge > 6 && edge < 12 && dx + dy > 9 && (dx % 4 === 0) && (dy % 4 === 0)) {
        color = 'olive';
      } else if (edge > 9 && edge < 12 && (dx === 0 || dy === 0)) {
        color = 'red';
      }
      cells.push({ x, y, color, d: Math.hypot(dx, dy) + seeded(y * N + x) * 3.2 });
    }
  }
  const motif = cells.filter((c) => c.color).sort((a, b) => a.d - b.d);
  motif.forEach((c, i) => { c.order = i; });
  return { cells, total: motif.length };
}

export default function Tatreez({ stitches = 0, highlightNewest = false, className = '' }) {
  const { t } = useTranslation();
  const { cells, total } = useMemo(buildMotif, []);
  const filled = Math.min(stitches, total);
  const size = N * CELL;
  const pad = 3;

  return (
    <figure className={`tatreez ${className}`}>
      <svg viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`} role="img"
        aria-label={t('progress.panelLabel', { count: stitches })}>
        <rect className="tatreez__cloth" x={-pad} y={-pad} width={size + pad * 2} height={size + pad * 2} rx="4" />
        {cells.map((c) => {
          const cx = c.x * CELL + CELL / 2, cy = c.y * CELL + CELL / 2;
          const done = c.color && c.order < filled;
          if (!done) {
            // Unstitched motif cells show a faint guide in their future thread colour, like a printed chart.
            return c.color
              ? <circle key={`${c.x}-${c.y}`} className="tatreez__guide" cx={cx} cy={cy} r="1.7" fill={COLORS[c.color]} />
              : <circle key={`${c.x}-${c.y}`} className="tatreez__hole" cx={cx} cy={cy} r="0.55" />;
          }
          const newest = highlightNewest && c.order === filled - 1;
          const a = CELL * 0.3;
          return (
            <g key={`${c.x}-${c.y}`} className={`tatreez__stitch${newest ? ' is-newest' : ''}`}
              style={{ '--i': Math.min(c.order, 60) }} stroke={COLORS[c.color]}>
              <path d={`M${cx - a} ${cy - a}L${cx + a} ${cy + a}`} />
              <path d={`M${cx + a} ${cy - a}L${cx - a} ${cy + a}`} />
            </g>
          );
        })}
      </svg>
      <figcaption>{t('progress.stitchCaption')} <strong>{t('progress.beNext')}</strong></figcaption>
    </figure>
  );
}
