// Renders the "RAINORA" wordmark. Every "O" is orange, and the dot of the
// "i" is colored orange too — no raindrop icon.
//
// The "i" is rendered as an inline SVG built directly from the *actual*
// vector outline of Playfair Display's "i" glyph (extracted from the real
// font file with fonttools: the dot and stem are the font's own paths, in
// font design units where baseline = 0 and unitsPerEm = 1000). The SVG box
// is sized in em using that same 1000-unit scale (width: 0.293em, height:
// 0.765em — exactly matching the glyph's real advance width and total
// height), and its bottom edge sits on the text baseline by default (the
// standard behavior for inline replaced elements). Because the math is
// tied directly to the font's own coordinate system instead of guessed
// percentages, the dot lands in exactly the same spot the browser would
// draw it — never floating "way up" or detached from the word.
export default function Logo({ className = '', textClass = 'text-2xl md:text-3xl' }) {
  return (
    <span
      className={`inline-flex items-baseline font-serif tracking-widest text-white select-none ${textClass} ${className}`}
    >
      <span>RA</span>
      <svg
        viewBox="0 0 293 765"
        style={{ width: '0.293em', height: '0.765em', verticalAlign: 'baseline' }}
        aria-hidden="true"
      >
        <g transform="matrix(1,0,0,-1,0,765)">
          <path
            d="M195 526V93Q195 51 212.5 36.0Q230 21 271 21V0Q254 1 219.5 2.5Q185 4 150 4Q116 4 81.0 2.5Q46 1 29 0V21Q70 21 87.5 36.0Q105 51 105 93V406Q105 451 89.0 472.5Q73 494 29 494V515Q61 512 91 512Q120 512 146.5 515.5Q173 519 195 526Z"
            fill="currentColor"
          />
          <path
            d="M143 765Q169 765 188.0 746.0Q207 727 207 701Q207 675 188.0 656.0Q169 637 143 637Q117 637 98.0 656.0Q79 675 79 701Q79 727 98.0 746.0Q117 765 143 765Z"
            fill="#f97316"
          />
        </g>
      </svg>
      <span>N</span>
      <span className="text-orange-500">O</span>
      <span>RA</span>
    </span>
  );
}
