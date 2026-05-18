/* global React */
const { useState } = React;

/* =========================================================================
   LPR Management, LLC — refinements of the existing logo
   Existing DNA to preserve:
     • Royal blue (#2A3FA0-ish)
     • Vertical-bar skyline mark (tall + shorter cluster)
     • "LPR" in heavy bold sans (Montserrat ExtraBold)
     • "Management, LLC" baseline below
   Each concept = a refined variation of that DNA.
   ========================================================================= */

const BRAND_BLUE = "#243C95";       // refined from the original royal blue
const BRAND_BLUE_LIGHT = "#3B57C2";
const PAPER = "#fbf9f5";
const INK_DARK = "#0e1430";

const inkOn = (on, palette) => on === "dark" ? palette.paper : palette.ink;

/* ---------- Mark Library ---------- */

/* Skyline A — original-style: 1 tall block + cluster of vertical bars */
function SkylineOriginal({ size = 100, color = BRAND_BLUE }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1}>
      {/* tallest building */}
      <rect x="40" y="14" width="14" height="86" fill={color} />
      <rect x="56" y="22" width="10" height="78" fill={color} />
      {/* angled top notch */}
      <polygon points="40,14 54,14 54,22 40,22" fill={color} />
      {/* short cluster left of tall — pinstripes */}
      {[0,6,12,18,24,30].map((x,i) => (
        <rect key={i} x={x} y={50 + (i%2)*4} width="3" height={50 - (i%2)*4} fill={color} />
      ))}
      {/* mid-right shorter tower */}
      <rect x="68" y="46" width="8" height="54" fill={color} />
      <rect x="78" y="58" width="6" height="42" fill={color} />
      <rect x="86" y="68" width="5" height="32" fill={color} />
    </svg>
  );
}

/* Skyline B — refined: cleaner, fewer pinstripes, more architectural */
function SkylineRefined({ size = 100, color = BRAND_BLUE }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1}>
      {/* tall slab w/ angled crown */}
      <polygon points="36,8 56,8 56,100 36,100" fill={color} />
      <polygon points="36,8 56,8 56,16" fill={color} opacity="0.85" />
      {/* mid */}
      <rect x="58" y="28" width="14" height="72" fill={color} />
      <polygon points="58,28 72,28 72,34" fill={color} opacity="0.7" />
      {/* small */}
      <rect x="74" y="50" width="10" height="50" fill={color} />
      {/* left short trio */}
      <rect x="14" y="62" width="4" height="38" fill={color} />
      <rect x="20" y="56" width="4" height="44" fill={color} />
      <rect x="26" y="68" width="4" height="32" fill={color} />
      {/* baseline */}
      <line x1="6" y1="100" x2="92" y2="100" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/* Skyline C — simplified single-family inflected: 3 home-sized blocks */
function SkylineHomes({ size = 100, color = BRAND_BLUE }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1}>
      {/* tall center building stays — connects to existing brand */}
      <rect x="42" y="20" width="12" height="80" fill={color} />
      <polygon points="42,20 54,20 54,28" fill={color} opacity="0.85" />
      {/* row of single-family-style pitched roofs */}
      <g>
        <polygon points="6,68 16,58 26,68 26,100 6,100" fill={color} />
        <polygon points="60,72 70,62 80,72 80,100 60,100" fill={color} />
        <polygon points="82,78 90,70 98,78 98,100 82,100" fill={color} />
      </g>
    </svg>
  );
}

/* Skyline D — keystone monogram (LPR letters as the building shapes themselves) */
function SkylineKeystone({ size = 100, color = BRAND_BLUE }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1}>
      <g fill={color} fontFamily="'Montserrat', sans-serif" fontWeight="800">
        {/* L as a tall thin building */}
        <rect x="14" y="22" width="14" height="78" />
        <rect x="28" y="86" width="14" height="14" />
        {/* P as mid building with a window */}
        <rect x="46" y="14" width="14" height="86" />
        <rect x="60" y="14" width="10" height="40" />
        <rect x="60" y="24" width="10" height="20" fill={PAPER} />
        {/* R as smaller tower */}
        <rect x="74" y="38" width="14" height="62" />
        <polygon points="74,38 88,38 88,46" opacity="0.8" />
      </g>
    </svg>
  );
}

/* Skyline E — minimal pinstripe (most stripped-down evolution) */
function SkylinePinstripe({ size = 100, color = BRAND_BLUE }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1}>
      {/* a clean rhythmic series of bars stepping up to a peak then back down */}
      {[
        [10,72],[18,60],[26,48],[34,32],[42,18],[50,32],[58,46],[66,58],[74,68],[82,78]
      ].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="6" height={100-y} fill={color} />
      ))}
    </svg>
  );
}

/* ---------- Wordmark ---------- */
function Wordmark({ size = 60, color = BRAND_BLUE, weight = 800, kerning = -1 }) {
  // Rendered with web font Montserrat 800 — closely matches existing
  return (
    <span style={{
      fontFamily:"'Montserrat', sans-serif",
      fontWeight: weight,
      fontSize: size,
      color,
      letterSpacing: kerning,
      lineHeight: 0.9,
    }}>LPR</span>
  );
}

function Tagline({ size = 14, color = BRAND_BLUE, weight = 500, text = "Management, LLC" }) {
  return (
    <span style={{
      fontFamily:"'Montserrat', sans-serif",
      fontWeight: weight,
      fontSize: size,
      color,
      letterSpacing: 0,
    }}>{text}</span>
  );
}

/* =========================================================================
   CONCEPT 01 — "True to original"
   Direct cleanup of the existing logo. Same skyline, same lockup, just
   tightened: aligned baseline, refined building tops, optical kerning.
   ========================================================================= */
function ConceptOriginal({ mode = "primary", on = "light", palette }) {
  const ink = on === "dark" ? palette.paper : palette.brand;
  const Mark = ({ size = 100 }) => <SkylineOriginal size={size} color={ink} />;

  if (mode === "mark") return <Mark size={140} />;

  if (mode === "horizontal") {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:14, color:ink }}>
        <Mark size={70} />
        <div style={{ display:"flex", flexDirection:"column", lineHeight:0.95 }}>
          <Wordmark size={54} color={ink} weight={800} kerning={-2} />
          <span style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:500, fontSize:14, color:ink, marginTop:4 }}>
            Management, LLC
          </span>
        </div>
      </div>
    );
  }

  // Primary lockup — match original arrangement
  return (
    <div style={{ color:ink, textAlign:"center" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:18 }}>
        <Mark size={130} />
        <Wordmark size={92} color={ink} weight={800} kerning={-3} />
      </div>
      <div style={{
        fontFamily:"'Montserrat',sans-serif", fontWeight:500, fontSize:24,
        marginTop:8, color:ink, letterSpacing:0,
      }}>
        Management, LLC
      </div>
    </div>
  );
}

/* =========================================================================
   CONCEPT 02 — "Refined Skyline"
   Same DNA but with cleaner architectural building shapes — fewer
   pinstripes, more confident silhouette. Adds a thin baseline rule.
   ========================================================================= */
function ConceptRefined({ mode = "primary", on = "light", palette }) {
  const ink = on === "dark" ? palette.paper : palette.brand;
  const Mark = ({ size = 100 }) => <SkylineRefined size={size} color={ink} />;

  if (mode === "mark") return <Mark size={140} />;

  if (mode === "horizontal") {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:14, color:ink }}>
        <Mark size={70} />
        <div style={{ display:"flex", flexDirection:"column", lineHeight:0.95 }}>
          <Wordmark size={50} color={ink} weight={800} kerning={-2} />
          <span style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:400, fontSize:11, color:ink, letterSpacing:3, marginTop:6, textTransform:"uppercase" }}>
            Management · LLC
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color:ink, textAlign:"center" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20 }}>
        <Mark size={130} />
        <Wordmark size={92} color={ink} weight={800} kerning={-3} />
      </div>
      <div style={{ width:300, height:1, background:ink, margin:"14px auto 0", opacity:0.5 }} />
      <div style={{
        fontFamily:"'Montserrat',sans-serif", fontWeight:400, fontSize:13,
        marginTop:12, color:ink, letterSpacing:5, textTransform:"uppercase",
      }}>
        Management · LLC
      </div>
    </div>
  );
}

/* =========================================================================
   CONCEPT 03 — "Single-Family"
   The mark evolves toward the actual business: one tall slab (kept from
   original) + a row of pitched-roof homes — single-family property mgmt.
   ========================================================================= */
function ConceptSingleFamily({ mode = "primary", on = "light", palette }) {
  const ink = on === "dark" ? palette.paper : palette.brand;
  const Mark = ({ size = 100 }) => <SkylineHomes size={size} color={ink} />;

  if (mode === "mark") return <Mark size={140} />;

  if (mode === "horizontal") {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:14, color:ink }}>
        <Mark size={70} />
        <div style={{ display:"flex", flexDirection:"column", lineHeight:0.95 }}>
          <Wordmark size={50} color={ink} weight={800} kerning={-2} />
          <Tagline size={11} color={ink} weight={500} text="Management, LLC" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ color:ink, textAlign:"center" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:18 }}>
        <Mark size={130} />
        <Wordmark size={92} color={ink} weight={800} kerning={-3} />
      </div>
      <div style={{
        fontFamily:"'Montserrat',sans-serif", fontWeight:500, fontSize:22,
        marginTop:8, color:ink,
      }}>
        Management, LLC
      </div>
    </div>
  );
}

/* =========================================================================
   CONCEPT 04 — "LPR Buildings"
   The skyline IS the letters — L, P, R as building forms. Most distinctive,
   still preserves "tall blue buildings + LPR" DNA but unifies into one mark.
   ========================================================================= */
function ConceptLPRBuildings({ mode = "primary", on = "light", palette }) {
  const ink = on === "dark" ? palette.paper : palette.brand;
  const Mark = ({ size = 100 }) => <SkylineKeystone size={size} color={ink} />;

  if (mode === "mark") return <Mark size={140} />;

  if (mode === "horizontal") {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:14, color:ink }}>
        <Mark size={70} />
        <div style={{ borderLeft:`1px solid ${ink}`, opacity:0.4, height:50 }} />
        <div style={{
          fontFamily:"'Montserrat',sans-serif", fontWeight:600, fontSize:14,
          letterSpacing:3, lineHeight:1.3, textTransform:"uppercase", color:ink,
        }}>
          LaSalle Park Realty<br/>
          <span style={{ fontWeight:400, fontSize:9, letterSpacing:3, opacity:0.85 }}>
            Management, LLC
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color:ink, textAlign:"center" }}>
      <Mark size={170} />
      <div style={{
        fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:18,
        marginTop:18, letterSpacing:6, textTransform:"uppercase",
      }}>
        LaSalle Park Realty
      </div>
      <div style={{
        fontFamily:"'Montserrat',sans-serif", fontWeight:400, fontSize:11,
        marginTop:8, letterSpacing:4, opacity:0.85,
      }}>
        MANAGEMENT, LLC
      </div>
    </div>
  );
}

/* =========================================================================
   CONCEPT 05 — "Pinstripe Skyline"
   Most minimal evolution: rhythmic pinstripe bars forming a skyline arc.
   Reads great at small sizes (favicon, signature, sign).
   ========================================================================= */
function ConceptPinstripe({ mode = "primary", on = "light", palette }) {
  const ink = on === "dark" ? palette.paper : palette.brand;
  const Mark = ({ size = 100 }) => <SkylinePinstripe size={size} color={ink} />;

  if (mode === "mark") return <Mark size={140} />;

  if (mode === "horizontal") {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:14, color:ink }}>
        <Mark size={64} />
        <div style={{ display:"flex", flexDirection:"column", lineHeight:0.95 }}>
          <Wordmark size={48} color={ink} weight={800} kerning={-2} />
          <Tagline size={11} color={ink} weight={500} text="Management, LLC" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ color:ink, textAlign:"center" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:18 }}>
        <Mark size={120} />
        <Wordmark size={92} color={ink} weight={800} kerning={-3} />
      </div>
      <div style={{
        fontFamily:"'Montserrat',sans-serif", fontWeight:500, fontSize:22,
        marginTop:8, color:ink,
      }}>
        Management, LLC
      </div>
    </div>
  );
}

/* ---------- Concept index ---------- */
const CONCEPTS = [
  { id:"original", name:"01 · True to Original", direction:"Same skyline, same lockup, just cleaned up — tightened kerning, aligned baseline, refined building tops. Drop-in replacement.", Component: ConceptOriginal },
  { id:"refined", name:"02 · Refined Skyline", direction:"Cleaner architectural building shapes with fewer pinstripes. Adds a baseline rule and refined caption. Same DNA, more confident silhouette.", Component: ConceptRefined },
  { id:"single-family", name:"03 · Single-Family Skyline", direction:"Keeps the tall blue slab from the original but evolves the cluster into pitched-roof homes — actually represents single-family property management.", Component: ConceptSingleFamily },
  { id:"lpr-buildings", name:"04 · LPR Buildings", direction:"The skyline IS the letters — L, P, R rendered as building forms. Most distinctive; unifies mark and wordmark into one ownable shape.", Component: ConceptLPRBuildings },
  { id:"pinstripe", name:"05 · Pinstripe Skyline", direction:"Most minimal evolution — rhythmic pinstripe bars forming a skyline arc. Best small-size legibility (favicon, email signature, yard sign).", Component: ConceptPinstripe },
];

window.LPR_CONCEPTS = CONCEPTS;
window.LPR_BRAND = { BRAND_BLUE, BRAND_BLUE_LIGHT, PAPER, INK_DARK };
