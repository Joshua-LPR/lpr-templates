# LPR Management — Brand Templates

Print-ready stationery, notices, and digital assets for LPR Management, LLC.

## Quick Start

Open `index.html` in a browser — first visit redirects to the **user picker** (`users.html`). Pick yourself from the list (or add a new user), then you land on the template index. Click any template card to open it, then use the toolbar's **Print** button to send to a printer or save as PDF.

Use the **Customize for an employee** panel on the index to set name, title, phone, and email. Templates open pre-filled with those values.

## Templates

### Stationery
| Template | Format | Notes |
|---|---|---|
| Business Card | 3.5″ × 2″ · Personal | Employee name and contact, blue back |
| Business Card — Company | 3.5″ × 2″ · Company | No name, office line + address |
| Letterhead | 8.5″ × 11″ | Header, body, signature; optional watermark |
| Letterhead Clean | 8.5″ × 11″ | Simplified header, no watermark |
| Watermark Paper | 8.5″ × 11″ | Pre-printable background page (file: `Letter Watermark.html`) |
| Envelopes | 9.5″ × 4.125″ · #10 | Standard, stripe, and send-address-only modes |
| Envelope Premium | 9.5″ × 4.125″ | Ivory stock spec for print shop |
| Mailing Labels | Avery 5160 · 30/sheet | Return-address labels |
| Address Labels — P-touch | 29 × 90mm · Brother QL-810W | Generates `.lbt` file per tenant |
| Certificate of Mailing | 5″ × 3″ · PS Form 3817 | Overlay or full-print modes; calibration sliders |
| Lease Cover Page | 8.5″ × 11″ | Branded title sheet with tenant/property fields |

### Property Management
| Template | Format | Notes |
|---|---|---|
| Notice Template — Blank | 8.5″ × 11″ | Reusable shell for any new notice |
| 24-Hour Notice of Entry | 8.5″ × 11″ | Required-by-MD-law entry notice |
| Rent Increase Notice | 8.5″ × 11″ | Renewal letter; key-facts grid with current/new rent, effective date, response deadline |
| Non-Renewal Notice | 8.5″ × 11″ | Gold vacate-date callout + move-out checklist |
| Security Deposit Notices | 8.5″ × 11″ | Three variants: Withheld, Partial Refund, Full Refund; account summary tables |
| Utilities Addendum | 8.5″ × 11″ | Lease addendum: T/O utility assignments. Full mode includes fuel type checkboxes; Simplified mode hides that column. Hardcoded office contact in header. |
| Door Hanger | 4.25″ × 11″ | Die-cut notice card for door knob |
| Yard Sign — For Rent | 24″ × 18″ | Print-shop ready; H-stake spec included. EHO mark on both variants; high-res 2400×1800 PNG export |

### Digital
| Template | Notes |
|---|---|
| Email Signature | Copy-paste into Gmail/Outlook |

## Setup Panel

Every letter and notice has a **Setup** button in the toolbar that opens a side panel with:

- **Tenants tab** — Import a Buildium tenant CSV, pick a tenant, and all `data-tenant-field` spans fill automatically. Manual overrides preserved across CSV re-imports.
- **Vendors tab** — Import a Buildium vendor CSV, pick a vendor, fill `data-vendor-field` spans.
- **Fields tab** — Date pickers, time pickers, dollar amounts, and free-text fields for template-specific fill-in values.

## Multi-User System

Pick or add a user on `users.html` (first-visit landing page). Each user has an independent localStorage namespace — favorites, library, address books, and signatures are all per-user.

Default users: David Mitnick, Joshua Schoemann, Sam Teitelman. Add new users via the picker; users are stored only in the local browser.

Use the **Customize for an employee** panel on the index to fill in name, title, phone, and email. Templates with employee fields (Business Card, Letterheads, Email Signature, signed notices) auto-fill on open.

## Brand Tokens (brand.css)

| Token | Value | Use |
|---|---|---|
| `--lpr-blue` | `#283891` | Primary brand blue |
| `--lpr-blue-deep` | `#1c2870` | Hover / active state |
| `--lpr-ink` | `#0e1430` | Headings and dark text |
| `--lpr-text` | `#1a1a1a` | Body text |
| `--lpr-muted` | `#5a5f72` | Secondary/muted text |
| `--lpr-gold` | `#d6a35a` | Accent stripe |
| `--lpr-page` | `#efeae0` | Page background |
| `--lpr-rule` | `rgba(40,56,145,0.18)` | Borders and rules |

## File Structure

```
lpr-templates/
├── index.html            — template gallery
├── users.html            — user picker (sign-in)
├── archive.html          — archived templates view
├── view.html             — library template loader
├── style-guide.html      — LPR brand style guide
├── brand.css             — shared design tokens and base styles
├── user.js               — multi-user localStorage namespacing (loads first)
├── employee.js           — fills data-employee-field spans on load
├── tenants.js            — tenant address book + Setup panel
├── owners.js             — sender/owner tab in Setup panel
├── vendors.js            — vendor address book tab
├── fill-fields.js        — date/time/amount/text field pickers tab
├── template-tools.js     — Edit, Export, Save As toolbar
├── assets/               — fonts, logo files, form images
└── *.html                — individual template pages
```

> `design-canvas.jsx`, `logos.jsx`, `tweaks-panel.jsx`, and `logo.html` are dev/design-tool files not part of the published template set. Original source PDFs live in `archive/source-docs/`. Third-party libraries are vendored in `assets/vendor/` (no CDN dependency at runtime).

**Architecture (July 2026 consolidation):** template metadata lives in `templates-manifest.js` (index cards + archive registry derive from it); the letter family shares `letter.css`; multi-mode templates use the standardized `mode-bar.js` contract; template settings register into the Setup panel's Options tab (`template-options.js`); one shared `manual-address.js` serves all label templates; `assets/img-data.js` carries base64 image data so PNG/PDF exports work from `file://`.

## Address

1517 Reisterstown Road, 2nd Floor · Pikesville, MD 21208 · 443.402.5641
