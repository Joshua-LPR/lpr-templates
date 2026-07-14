/* templates-manifest.js — Track 4 / P0c
 *
 * Single source of truth for template card metadata. Loaded first on
 * index.html, archive.html, and (optionally) each template page so it can
 * read its own entry via window.LPR_MANIFEST_BY_ID.
 *
 * Pure data, no DOM, no dependencies. Plain <script src="templates-manifest.js">
 * — works from file:// with no build step. Also requireable from Node (used
 * by the gate script below) via module.exports.
 *
 * Schema (see track4-design.md §1.1):
 *   id         string   stable key === filename (matches lpr_* id scheme)
 *   title      string   card <h3> / archive card name
 *   role       string   card .role line / archive .role
 *   section    enum|null which .grid[data-section] the card renders into;
 *                        "stationery" | "property-management" | "digital".
 *                        null = no static home (retired template kept only
 *                        so archive.html / old lpr_archived ids still
 *                        resolve to a title+role instead of a raw filename).
 *   desc       string   card <p>
 *   badge      string|null  optional card corner badge
 *   modes      array    OPTIONAL — only present on multi-mode templates.
 *                        [{ id, label }] or, for templates with more than
 *                        one independent mode-bar (Yard Sign), [{ group, id, label }].
 *   options    string[] Template-Options groups this page will register
 *                        (doc only — the page still self-registers; see §5)
 *   fillLabels string[] canonical data-fill-label values used for search only
 *                        (spec §6.3 vocabulary — pages still migrate to match)
 *   flags      object   { exportRoot, noExport, hasEho, zeroTokens, manualAddress }
 *
 * Deviations from the literal §1.1 schema (documented, see P0c report):
 *   - Two retired-but-on-disk templates (Envelope Premium.html, Letterhead
 *     Clean.html) are included with section:null and an extra top-level
 *     `retired: true` field (not part of the §1.1 flags enum) so
 *     archive.html's TEMPLATES lookup and the P0c gate's "unmapped file"
 *     scan both resolve cleanly without polluting index.html's rendered
 *     sections. Live entries never carry this key.
 *   - Yard Sign's `modes` entries carry an extra `group` key ("design" |
 *     "qr-side") since it drives two independent mode-bars; single-group
 *     templates omit `group` entirely.
 */
(function (global) {
  "use strict";

  var LPR_MANIFEST = [

    /* ---------------------------------------------------------------- */
    /* STATIONERY                                                        */
    /* ---------------------------------------------------------------- */

    {
      id: "Business Card.html",
      title: "Business Card",
      role: "3.5″ × 2″ · Personal",
      section: "stationery",
      desc: "Mark left, employee contact right. Royal blue back with full lockup.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: true, manualAddress: false }
    },
    {
      id: "Business Card Company.html",
      title: "Business Card — Company",
      role: "3.5″ × 2″ · Company",
      section: "stationery",
      desc: "No name version. Centered logo + office phone & address. For the main line.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: true, manualAddress: false }
    },
    {
      id: "Letterhead.html",
      title: "Letterhead",
      role: "8.5″ × 11″ · US Letter",
      section: "stationery",
      desc: "Header, body block, signature. Toggle watermark on or off.",
      badge: null,
      modes: [
        { id: "on",  label: "With watermark" },
        { id: "off", label: "Clean (none)" }
      ],
      options: [],
      fillLabels: ["Notice Date"],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "Letter Watermark.html",   // filename unchanged: localStorage keys derive from it
      title: "Watermark Paper",
      role: "8.5″ × 11″ · US Letter",
      section: "stationery",
      desc: "Pre-printable background — top brand band, foot stripe, ghosted mark.",
      badge: null,
      options: [],
      fillLabels: ["Notice Date", "Document Category", "Notice Title"],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "Envelope.html",
      title: "Envelopes",
      role: "9.5″ × 4.125″ · #10",
      section: "stationery",
      desc: "Three styles: Standard, With Stripe, and Send-address-only for pre-printed envelopes.",
      badge: null,
      modes: [
        { id: "standard", label: "Standard" },
        { id: "stripe",   label: "With Stripe" },
        { id: "sendonly", label: "Send Address Only" }
      ],
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "Mailing Labels.html",
      title: "Mailing Labels",
      role: "Avery 5160 · 30 / Sheet",
      section: "stationery",
      desc: "Return-address sheet with logo, name, and address per label.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: true, manualAddress: false }
    },
    {
      id: "Shipping Labels - Avery 5168.html",
      title: "Shipping Labels",
      role: "Avery 5168 · 4 / Sheet · 3.5″ × 5″",
      section: "stationery",
      desc: "Large mailing labels with LPR return address and fillable recipient. Print on a standard laser or inkjet printer.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: true }
    },
    {
      id: "Address Labels P-touch.html",
      title: "Address Labels — P-touch",
      role: "DK-1201 · 29×90mm · Brother QL-810W",
      section: "stationery",
      desc: "Generates a .lbt label file per tenant. Opens directly in P-touch Editor, ready to print.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: true, hasEho: false, zeroTokens: false, manualAddress: true }
    },
    {
      id: "Certificate of Mailing.html",
      title: "Certificate of Mailing",
      role: "5″ × 3″ · PS Form 3817 · Feed & Fill",
      section: "stationery",
      desc: "Prints From/To directly onto a blank USPS PS Form 3817 fed through your printer. Calibration sliders dial in your printer's offset.",
      badge: null,
      modes: [
        { id: "overlay", label: "Overlay — feed blank USPS form" },
        { id: "card",    label: "Full form — 3×5 card" },
        { id: "letter",  label: "Full form — Letter paper (cut corner)" },
        { id: "multi",   label: "Multi — Letter paper (up to 5)" }
      ],
      options: ["manual-address", "com-calibration"],
      fillLabels: [],
      flags: { exportRoot: true, noExport: false, hasEho: false, zeroTokens: false, manualAddress: true }
    },
    {
      id: "Lease Cover.html",
      title: "Lease Cover Page",
      role: "8.5″ × 11″ · US Letter",
      section: "stationery",
      desc: "Branded title sheet with property, landlord, tenant, and term blanks.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },

    /* ---------------------------------------------------------------- */
    /* PROPERTY MANAGEMENT                                               */
    /* ---------------------------------------------------------------- */

    {
      id: "Notice Template.html",
      title: "Notice Template — Blank",
      role: "8.5″ × 11″ · US Letter · Blank",
      section: "property-management",
      desc: "Reusable shell for any new notice. Same layout as the other letters, with placeholders for category, title, and body.",
      badge: null,
      options: [],
      fillLabels: ["Notice Date", "Document Category", "Notice Title"],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "24-Hour Notice.html",
      title: "24-Hour Notice of Entry",
      role: "8.5″ × 11″ · US Letter",
      section: "property-management",
      desc: "Required-by-MD-law entry notice with date, time, reason, and entrant fields.",
      badge: null,
      options: [],
      fillLabels: ["Notice Date", "Entry Date", "From Time", "To Time", "Reason for Entry", "Persons Entering"],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "Rent Increase Notice.html",
      title: "Rent Increase Notice",
      role: "8.5″ × 11″ · US Letter",
      section: "property-management",
      desc: "Renewal letter announcing new monthly rent amount and effective date.",
      badge: null,
      options: [],
      fillLabels: ["Notice Date", "Current Rent", "New Rent", "Renewal Date", "Response Deadline"],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "Non-Renewal Notice.html",
      title: "Non-Renewal Notice",
      role: "8.5″ × 11″ · US Letter",
      section: "property-management",
      desc: "Lease will not renew. Vacate-by date and forwarding-address request.",
      badge: null,
      options: [],
      fillLabels: ["Notice Date", "Lease End Date", "Move-Out Date"],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "TOPA Notice - DHCD.html",
      title: "TOPA Notice — DHCD",
      role: "8.5″ × 11″ · US Letter",
      section: "property-management",
      desc: "Cover letter to DHCD enclosing the Appendix A Form. Fill in property address and tenant name.",
      badge: null,
      options: [],
      fillLabels: ["Notice Date"],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "Security Deposit.html",
      title: "Security Deposit Notices",
      role: "8.5″ × 11″ · US Letter",
      section: "property-management",
      desc: "Three notice variants: Withheld, Partial Refund, and Full Refund. Toggle between them inside the template.",
      badge: null,
      modes: [
        { id: "withheld", label: "Withheld" },
        { id: "partial",  label: "Partial Refund" },
        { id: "returned", label: "Full Refund" }
      ],
      options: [],
      fillLabels: ["Notice Date", "Deposit Held", "Accrued Interest", "Total Deductions", "Balance Due", "Payment Due Date", "Refund Amount"],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "Utilities Addendum.html",
      title: "Utilities Addendum",
      role: "8.5″ × 11″ · US Letter · Lease Addendum",
      section: "property-management",
      desc: "Designates which utilities are paid by tenant (T) or owner (O). Fuel type checkboxes; blank signature lines for wet or electronic signing.",
      badge: null,
      modes: [
        { id: "full",   label: "Full — with Fuel Type" },
        { id: "simple", label: "Simplified — no Fuel Type" }
      ],
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false }
    },
    {
      id: "Door Hanger.html",
      title: "Door Hanger",
      role: "4.25″ × 11″ · Door-knob",
      section: "property-management",
      desc: "Notice card with die-cut for the door knob. Checkboxes for visit reason.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: true, manualAddress: false }
    },
    {
      id: "Yard Sign.html",
      title: "Yard Sign — For Rent",
      role: "24″ × 18″ · Vinyl / Coroplast",
      section: "property-management",
      desc: "Print-shop ready. Sized for standard H-stake yard signs. Includes spec sheet for printer.",
      badge: null,
      modes: [
        { group: "design",  id: "original", label: "Original" },
        { group: "design",  id: "v2",       label: "New Design" },
        { group: "qr-side", id: "white",    label: "White side" },
        { group: "qr-side", id: "blue",     label: "Blue side" }
      ],
      options: ["yard-settings"],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: true, zeroTokens: true, manualAddress: false }
    },

    /* ---------------------------------------------------------------- */
    /* DIGITAL                                                           */
    /* ---------------------------------------------------------------- */

    {
      id: "Email Signature.html",
      title: "Email Signature",
      role: "HTML · Gmail / Outlook",
      section: "digital",
      desc: "Live preview with one-click copy of the signature HTML.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: true, manualAddress: false }
    },

    /* ---------------------------------------------------------------- */
    /* RETIRED — no static home (section: null). Kept so archive.html's   */
    /* manifest-derived TEMPLATES lookup still resolves a title/role for  */
    /* any lpr_archived id or old lpr_custom_templates snapshot that      */
    /* still points at these filenames. Both files remain on disk.       */
    /* ---------------------------------------------------------------- */

    {
      id: "Envelope Premium.html",
      title: "Envelope",
      role: "9.5″ × 4.125″ · #10",
      section: null,
      desc: "Retired stand-alone envelope style; superseded by the multi-mode Envelope.html (Standard / With Stripe / Send Address Only).",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false },
      retired: true
    },
    {
      id: "Letterhead Clean.html",
      title: "Letterhead",
      role: "8.5″ × 11″ · US Letter",
      section: null,
      desc: "Retired stand-alone plain letterhead (no watermark); superseded by Letterhead.html's watermark on/off toggle.",
      badge: null,
      options: [],
      fillLabels: [],
      flags: { exportRoot: false, noExport: false, hasEho: false, zeroTokens: false, manualAddress: false },
      retired: true
    }

  ];

  var LPR_MANIFEST_BY_ID = {};
  for (var i = 0; i < LPR_MANIFEST.length; i++) {
    LPR_MANIFEST_BY_ID[LPR_MANIFEST[i].id] = LPR_MANIFEST[i];
  }

  global.LPR_MANIFEST = LPR_MANIFEST;
  global.LPR_MANIFEST_BY_ID = LPR_MANIFEST_BY_ID;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { LPR_MANIFEST: LPR_MANIFEST, LPR_MANIFEST_BY_ID: LPR_MANIFEST_BY_ID };
  }

})(typeof window !== "undefined" ? window : globalThis);
