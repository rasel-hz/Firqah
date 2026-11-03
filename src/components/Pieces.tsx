// FIRQAH's identity: a star-and-cross pattern in the spirit of geometric ornament. Each star is a skill,
// and a team is complete when no star is missing. It is drawn for this product, not copied from a heritage piece.

const GROUND = '#2c2825';
const INK = '#0e0c0b';
const WOOL = '#f4ecdf';
const MADDER = '#a32a1c';
const SAFFRON = '#e9ac2b';

/** An eight-point star filling a 96 tile. Stars side by side leave crosses between them, so the pieces interlock. */
const STAR = 'M48 0 62 14H82V34L96 48 82 62V82H62L48 96 34 82H14V62L0 48 14 34V14H34Z';

function Star({ x = 0, y = 0, fill, stroke, className }: { x?: number; y?: number; fill: string; stroke?: string; className?: string }) {
  return <path d={STAR} transform={`translate(${x} ${y})`} fill={fill} stroke={stroke} strokeWidth={stroke ? 3 : undefined} className={className} />;
}

const HERO_COLOURS = [
  [MADDER, WOOL, MADDER],
  [WOOL, null, WOOL],
  [MADDER, WOOL, MADDER],
] as const;

/** Nine pieces, and the saffron one settles into the last empty place once. Without motion it is simply there. */
export function PiecesPanel({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 288 288" className={`block w-full ${className}`} aria-hidden>
      <rect width="288" height="288" fill={GROUND} />
      {HERO_COLOURS.flatMap((row, r) =>
        row.map((colour, c) => (colour ? <Star key={`${r}-${c}`} x={c * 96} y={r * 96} fill={colour} /> : null)),
      )}
      <Star x={96} y={96} fill={INK} stroke={SAFFRON} />
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center' }} className="settle">
        <Star x={96} y={96} fill={SAFFRON} />
      </g>
    </svg>
  );
}

/** A repeating strip of pieces, for section edges and the footer. */
export function PiecesBand({ height = 96, id }: { height?: number; id: string }) {
  const scale = height / 96;
  return (
    <svg aria-hidden width="100%" height={height} className="block">
      <defs>
        <pattern id={id} width={height * 2} height={height} patternUnits="userSpaceOnUse">
          <g transform={`scale(${scale})`}>
            <rect width="192" height="96" fill={GROUND} />
            <Star fill={MADDER} />
            <Star x={96} fill={WOOL} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

export function PiecesMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      <Star fill={MADDER} />
      <path d="M48 24 57 39H72L60 48 72 57H57L48 72 39 57H24L36 48 24 39H39Z" fill={WOOL} />
      <circle cx="48" cy="48" r="8" fill={SAFFRON} />
    </svg>
  );
}

const STEP_ART = {
  // The challenge says which pieces it needs: empty places, outlined.
  needs: (
    <>
      <rect width="192" height="96" fill={GROUND} />
      <Star fill={INK} stroke={WOOL} />
      <Star x={96} fill={INK} stroke={WOOL} />
    </>
  ),
  // People bring their pieces, known or not yet confirmed.
  people: (
    <>
      <rect width="192" height="96" fill={GROUND} />
      <Star fill={MADDER} />
      <Star x={96} fill={INK} stroke={SAFFRON} />
    </>
  ),
  // Together, nothing is missing.
  complete: (
    <>
      <rect width="192" height="96" fill={GROUND} />
      <Star fill={SAFFRON} />
      <Star x={96} fill={MADDER} />
    </>
  ),
} as const;

export function StepArt({ name }: { name: keyof typeof STEP_ART }) {
  return (
    <svg viewBox="0 0 192 96" className="block w-full" aria-hidden>
      {STEP_ART[name]}
    </svg>
  );
}
