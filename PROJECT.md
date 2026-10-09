# LPR Brand Templates

Internal stationery and notice template system for **LPR Management, LLC**. Built as static HTML/CSS/JS so it runs on any web host with no backend or server-side dependencies.

**Live URL:** https://joshua-lpr.github.io/lpr-templates/
**Repo:** https://github.com/joshua-lpr/lpr-templates

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Brand System](#brand-system)
4. [Template Inventory](#template-inventory)
5. [Features](#features)
6. [Field Namespace System](#field-namespace-system)
7. [File Structure](#file-structure)
8. [Hosting & Deployment](#hosting--deployment)
9. [Browser Storage Notes](#browser-storage-notes)
10. [Multi-page letters + signature options — design record](#multi-page-letters--signature-options--design-record-built-2026-10-08)
11. [DRY cleanup — record](#dry-cleanup--done-2026-10-08-approved-by-joshua-bead-joshu_akiva-ssh)
12. [Future Considerations](#future-considerations)
13. [Conventions for New Templates](#conventions-for-new-templates)

---

## Overview

A library of print-ready business documents and digital assets, all built on a shared brand foundation. Each template lives as its own HTML file. Customization (employee details, favorites, archive, library, signature) is per-user and stored locally in the browser via `localStorage`.

**Tech stack**
- Plain HTML, CSS, JavaScript
- No build step, no backend, no database
- Montserrat font bundled locally (works offline)
- Sortable.js loaded from CDN for drag-and-drop ordering
- html2canvas + jsPDF (vendored in `assets/vendor/`) loaded on demand, only when exporting
- Flatpickr loaded from CDN on demand (only when a Fields tab with date/time inputs opens)

**Audience**
- Internal use by LPR Management staff
- Designed for a small team (5–10 people)

---

## Quick Start

### Accessing the templates

1. Visit https://joshua-lpr.github.io/lpr-templates/
2. First time on a browser → land on the **user picker** (`users.html`)
3. Pick yourself from the list (or add a new user)
4. You land on the **index** — a directory of every template
5. Click any template to open it

### Working with a template

1. Open the template
2. Click **Setup** in the top toolbar → opens the Setup panel (Sender / Tenants / Vendors / Fields tabs)
3. Pick a recipient from the Tenants or Vendors tab → click **Apply as Recipient**
4. Optionally pick a sender LLC in the Sender tab → click **Apply to Template**
5. Fill in date, time, amount, and text fields using the **Fields** tab
6. Click **Edit** to make any free-text changes to the body
7. Click **Export ▾** → Print, PDF, Image, or HTML
8. Or click **Save As** → saves a filled-in copy to your personal Library

### Switching users

Top-left of every page shows the active user. Click **↻ Switch user** to return to the picker.

---

## Brand System

| Property | Value |
|----------|-------|
| **Primary color (royal blue)** | `#283891` |
| **Closest Pantone** | PMS 287 C |
| **Type family** | Montserrat (weights 300, 400, 500, 600, 700, 800) |
| **Address** | 1517 Reisterstown Road, 2nd Floor, Pikesville, MD 21208 |
| **Phone** | 443.402.5641 |
| **Office email** | office@lasalleparkrealty.com |
| **Logo files** | `assets/logo-cropped.png` (full-color), `assets/logo-white.png` (white) — primary logos used across templates. See assets listing for additional files. |

Montserrat is bundled locally in `assets/fonts/` so templates render identically online and offline.

---

## Template Inventory

### Stationery

| Template | Size | Notes |
|----------|------|-------|
| **Business Card** | 3.5″ × 2″ | Personal — name, title, contact w/ icons. Brand-blue back with white logo. |
| **Business Card — Company** | 3.5″ × 2″ | No name. Centered logo + office phone, email, address. |
| **Letterhead** | US Letter | Letterhead with watermark on/off. Recipient block uses contact fields (works for tenants or vendors). **Long letters flow onto further pages automatically** (continuation heading + "Page X of Y"). Signature options in Setup → Sender: your signature (gallery / leave blank / signature line) and 0–2 tenant signature lines. |
| **Watermark Paper** | US Letter | Bulk pre-printable background with bold brand band (file: `Letter Watermark.html`). |
| **Envelope** | 9.5″ × 4.125″ | #10 size. Minimal ivory layout. Recipient filled via Setup panel. |
| **Envelope Premium** | 9.5″ × 4.125″ | Pre-print spec variant with refined layout. Includes print-shop spec block. |
| **Mailing Labels** | Avery 5160 | 30 labels per sheet (return-address). |
| **Address Labels — P-touch** | DK-1201 (29×90mm) | Tenant or vendor mailing labels for Brother QL-810W. Generates a `.lbt` file per recipient — opens directly in P-touch Editor, ready to print. |
| **Certificate of Mailing** | 5″ × 3″ (PS Form 3817) | Feed-and-fill overlay for USPS PS Form 3817. Four print modes: **Overlay** (print text onto a real blank form), **Card** (print full form on card stock), **Letter** (form + cut guides on letter paper), **Multi** (up to 5 forms per letter sheet — 3 upright left column, 2 rotated right column). Calibration sliders per mode compensate for printer margin offset. Form background image is sized to 83% (measured from actual USPS scan) so printed white margins match the real form. Multi mode supports per-slot inline editing — select a slot and edit name/address directly in the sidebar without leaving the panel. Mode is restored from `localStorage` on page load; defaults to Card mode on first visit. |
| **Lease Cover Page** | US Letter | Branded title sheet with property/landlord/tenant blanks. |

### Property Management

| Template | Notes |
|----------|-------|
| **Notice Template — Blank** | Reusable shell. Placeholders for category, title, body. Recipient via Setup. |
| **24-Hour Notice of Entry** | MD-law required entry notice. Date/time/reason/entrants grid. Legal footer. |
| **Rent Increase Notice** | Renewal letter. Key-facts info-grid (current rent, new rent, effective date, response deadline), full postal recipient block. Badge: Lease Renewal. |
| **Non-Renewal Notice** | Lease will not renew. Single vacate date (lease-end and vacate-by are the same day, driven by one fill field appearing twice). Gold vacate-date callout, blue-check move-out checklist, forwarding-address line. Deliberately spare: no security-deposit text, no questions invitation, no holdover paragraph, no statutory citations — this is the operative notice, not a service letter or a legal explainer. Badge: Required Notice. |
| **Tenancy Confirmation** | Verification letter confirming a tenant currently resides at an address. Addressed “To Whom It May Concern” — no postal recipient block, since it goes to whoever requested it (bank, employer, agency). Optional Rent block: Contract Rent, HAP Portion, and Tenant Portion, each dismissible and all shown by default. Dismissing “Rent details” hides the heading and both rows together, for the common case where the subsidy split must not be disclosed. Badge: Verification. |
| **Occupant Update** | Records that occupants moved in or out of a unit, at the tenant’s report. Mode bar toggles Moved In / Moved Out (swaps the verb phrase in the body sentence). Roster grid holds up to four Name + Date of Birth rows; rows 3 and 4 ship dismissed, since most household changes are one or two people. Addressed “To Whom It May Concern”. Badge: Occupant Update. |
| **Security Deposit Notices** | Three variants in one file: Withheld, Partial Refund, Full Refund. Mode bar at top switches between them (standardized mode-bar.js contract). Save As / Export captures only the active variant via mode-bar.js's central export scrub. Withheld and Partial show a 4-line account summary table (deposit / interest / deductions / total); Withheld adds a blue payment-deadline callout. Badges: Action Required (Withheld, Partial), For Your Records (Full Refund). |
| **Utilities Addendum** | Lease addendum designating which utilities are paid by tenant (T) or owner (O). Fuel type checkboxes (Natural Gas / Bottle gas / Oil or Electric / Coal or other) for heating/cooking/water heating. Community Name and resident address via Setup panel. Blank signature lines for wet or electronic signing. |
| **Door Hanger** | 4.25″ × 11″ with die-cut guide. Blank lines for handwriting. |
| **Yard Sign — For Rent** | 24″ × 18″ landscape. Print-shop spec for vinyl/coroplast. Equal Housing Opportunity mark on both design variants. Export menu includes a high-res 2400×1800 PNG (via html2canvas) in addition to the standard exports. |

### Digital

| Template | Notes |
|----------|-------|
| **Email Signature** | HTML signature for Gmail/Outlook. Personal/Company toggle. Logo embed (base64) or hosted URL option. Copy-paste tool — Export menu shows HTML only (Print/PDF/PNG removed; they export useless page UI). |

---

## Features

### Multi-user system

- Pick or add a user on `users.html`
- Each user has independent localStorage namespace
- Default users: David Mitnick, Joshua Schoemann, Sam Teitelman
- Add new users via the picker; users are stored only in the local browser

**Implementation:** `user.js` monkey-patches `localStorage.getItem/setItem/removeItem` to auto-namespace every key starting with `lpr_` under the active user.

### Per-employee field replacement

The **Customize for an employee** panel on the index lets you fill in any name/title/phone/email. Templates with employee fields (Business Card, Letterheads, Email Signature, signed notices) auto-fill those values via `data-employee-field` attributes.

URL params bypass the form: `Business Card.html?name=Jane&title=Manager&phone=...&email=...`

Empty title is supported — `data-employee-hide-if-empty="title"` collapses the element when that field has no value.

**Snapshot preservation:** when a template is saved via Save As or exported as HTML, a `data-lpr-snapshot` attribute is stamped on the HTML clone. `employee.js` skips re-applying defaults when it detects this flag, so the signer name, title, phone, and email are preserved exactly as they were when saved.

### Signature gallery

- **Signatures** panel on the index holds a labeled gallery — store one per person or multiple styles (formal, casual, etc.)
- Click **+ Add signature** → pick JPG or PNG → prompted for a label (e.g. "Joshua", "David Mitnick", "Formal") → saved as a chip
- Click any chip to make it active; the active sig is written to `lpr_signature` and auto-inserted into every `.signature` slot in letter templates
- **Leave blank** chip (always first) clears `lpr_signature`, so templates print **no** signature (name and title only). To print a line to sign by hand, use the per-document **Your signature → Signature line** option in Setup → Sender (templates with `data-sig-options`, e.g. Letterhead)
- × on any chip deletes that signature; if it was active, the next available sig becomes active
- Auto-crops whitespace, resizes to ≤800px wide; saved as base64 in `lpr_sigs` array (per-user)
- `mix-blend-mode: multiply` makes JPG white backgrounds disappear on white pages
- **Drag to position + resize** in Edit mode — drag the signature to move it, drag the blue handle at the bottom-right corner to resize (aspect ratio preserved). Position and size saved per-template per-user.

### Multi-page letters (automatic page flow)

Templates whose sheet has `data-flow` (Letterhead) never clip long letters: `page-flow.js` lays the one continuous letter body into as many real 8.5×11 pages as it needs and re-lays it whenever anything changes — **no manual per-page formatting**.
- Page 1 keeps the full letterhead; pages 2+ get a compact heading (small LPR icon, `Recipient · Date` — or the document's title when there is no recipient/date, e.g. an agreement — thin blue rule). `Page X of Y` on every page once there are 2+ pages; the watermark repeats.
- Splits **any** block: paragraphs between lines; numbered/bulleted lists, list items and nested content between items (numbering continues on the next page; a continued item gets no second number). **Text is never cut off** — a block that can't follow the rules is split anyway.
- Page-break rules: never inside a filled-in field, at least 2 lines of a paragraph on each side of a break, headings (and short all-bold lines like "1. Acknowledgment…") never end a page, the sign-off (and tenant signature lines) always arrive with at least the last 2 lines of the letter.
- Structure repair on Done / Library open: paste wrappers (Google Docs' invisible `<b>`, a bare `<span>`/`<div>` around paragraphs) are opened up, paragraphs that landed inside the date line or recipient block move back into the body, loose text gets a paragraph.
- **Edit mode** shows the whole letter as one tall sheet with dashed "Page N begins" guides; **⤓ New page** (format bar) forces a break before the current paragraph. Done re-paginates.
- Print, PDF, PNG (one file per page) and HTML export all see the same pages. Save As stores the one continuous letter; the Library copy re-paginates on open.
- Spec: style-guide.html "Multi-Page Letters"; design record below.

### Clean paste (every template, edit mode)

`paste-clean.js` (loaded by template-tools.js) makes Ctrl+V paste clean content: paragraphs, headings, bold / italic / underline, lists (with nesting) and simple tables are kept; the source's fonts, sizes, colours, spacing, classes, links and images are dropped, so pasted text uses the template's own brand styling. Plain-text pastes (e.g. "paste values only") understand simple Markdown — `#` headings, `**bold**`, `*italic*`, `1.` / `-` lists, indentation for nesting.
- One paragraph pastes inline at the caret. Several paragraphs paste as blocks in the letter body — never inside the date line / recipient block (they go after it) or the sign-off / tenant signature lines (they go before them). Outside a letter body, blocks become lines.
- **Pasting over a highlight replaces exactly that highlight — fields included** (fixed 2026-10-09: a highlight starting in the date line, recipient block, an empty line or a field-only line used to be ignored, leaving the fields behind). The highlight is trimmed to the letter body, so the letterhead, sign-off and tenant signature lines are never replaced, even after Ctrl+A. A date/recipient block left with no fields loses its date/address styling (Undo restores it).
- Uses the browser's own insert, so **Ctrl+Z undoes a paste** (one step, fields come back). Field keys (Phase 3) hook in via `window.LPR_PASTE.transforms`.

### Signature options (Setup → Sender)

Templates whose sheet has `data-sig-options` (Letterhead) add two rows to the Sender tab, applied by **Apply to Template** and remembered per template (`lpr_sigopt_<file>`):
- **Your signature** — *Gallery default* (whatever the gallery's active chip is), *Leave blank* (nothing printed), *Signature line* (a `Landlord/Agent Signature ___ Date ___` row to sign later; name + title · company print under the line). Dims when *Include signer name* is off.
- **Tenant signature lines** — None / 1 / 2 tenants, stacked; tenant 1's name (from the selected contact) prints under the line. General-purpose (payment plans, agreements) — no fixed wording.
- Spec: style-guide.html "Signature Blocks".

### Template search

A search bar on the index filters cards in real time by template name and description. Empty sections are hidden automatically. Clearing the search restores the full directory. Starred (Favorites) cards are included in search results regardless of their position in the page.

When there are archived templates that match the query, an **Archived — matching results** section appears below the main results. Each card there has a **Restore** button that moves it back to its original section without leaving the page.

The archive page (`archive.html`) has its own search bar that filters the archived grid in real time by name and size/role.

**Keyboard shortcuts (all search bars, including archive and Setup panel):**
- Press `/` from anywhere on the page (when not already in a text field) to jump focus to the nearest search bar.
- Press `Esc` while a search bar is focused to clear it and return focus to the page.

### Star, archive, drag-reorder

- Hover any card to see action buttons
- **★** marks favorite → bumped to top **Favorites** section
- **⌫** archives → hidden from main page, visible on `archive.html`
- Drag cards within a section to reorder
- Drag a section's title to reorder whole sections
- Library section sits at the bottom by default

### Edit / Export / Save As (template toolbar)

| Button | Action |
|--------|--------|
| **Edit** | Toggles `contenteditable` on the entire page so any text can be retyped. Spell check activates. While editing, a format bar appears in the toolbar with: **B / I / U / Plain** (bold, italic, underline, clear formatting), a **font size picker**, and a **text color picker** (LPR palette + custom hex) — all act on the current selection on any page, **field chips included** (a chip highlighted alone toggles; chips in a wider highlight follow the text; the style sits on the token span so it survives filling, Save As and export; one Undo per press); multi-page templates also get **⤓ New page** and **Clear body / Clear all** (no confirmation — Ctrl+Z undoes): *Clear body* empties the letter from the salutation down, keeping the date + recipient; *Clear all* removes those too; neither touches the letterhead, sign-off or tenant signature lines, and the fields they remove don't trigger the "unlinked" warning. The Insert Field sidebar also opens automatically in the Setup panel. On multi-page templates the letter becomes one continuous sheet while editing. |
| **Export → Print** | Browser-native print dialog (paper or system PDF). Automatically exits Edit mode first if active. |
| **Export → PDF** | Saves a PDF in the page's exact dimensions, one PDF page per sheet (html2canvas → jsPDF; a raster image, see "Export → PDF is a raster image"). Exits Edit mode first. |
| **Export → Image** | Saves a 2× resolution PNG (html2canvas). Multi-sheet / multi-page templates export one file per sheet (`-1`, `-2` …). Exits Edit mode first. |
| **Export → HTML** | Saves a fully self-contained HTML snapshot. Local stylesheets (`brand.css`, etc.) are fetched and inlined into `<style>` blocks when served over http(s) (under `file://` they stay as absolute `<link>`s). Asset paths are made absolute. Multi-page letters keep all their pages (the file is static, scripts removed). Exits Edit mode first. |
| **Save As** | Saves filled-in template to current user's Library; all field content, signer info, signature options and dismissed rows preserved. Multi-page letters are stored as one continuous letter and re-paginate on open. Creates a new library entry. |
| **Save Edits** | *(Library templates only)* Overwrites the current library entry with your changes. Shows a confirmation before overwriting. |
| **Setup** | Opens the Setup panel (Sender / Tenants / Vendors / Fields / Options tabs, as the template needs) |

**Unfilled-field warning:** clicking Export or Save As when some field types are still empty shows a modal listing which namespaces will be blank. User can go back or continue anyway.

### Setup panel — Sender, Tenants, Vendors, Fields, Options

The **Setup** button opens a tabbed panel that appears in every template. Tab order: Sender → Tenants → Vendors → Fields → Options. Fields appears only on templates with fill fields (or a registered manual-address module); Options appears only on templates that registered a Template Options group (see `template-options.js`) — e.g. Yard Sign's sign settings, Certificate of Mailing's print calibration.

#### Sender tab (`owners.js`)

- Lists all owner LLCs (imported from Buildium owners CSV or added manually). Default: LPR Management, LLC.
- **Include signer name** toggle — shows/hides the employee name and title in the signoff block.
- **Include title** sub-toggle — shows/hides just the title line when signer is included.
- **Use office contact** sub-toggle — replaces the signer's direct phone/email with the office line (443.402.5641 / office@lasalleparkrealty.com).
- **Your signature** (sub-row, dims with Include signer name) and **Tenant signature lines** — only on sheets with `data-sig-options`; contributed by `signature-block.js` through `window.LPR_SENDER_EXTRAS` and committed by the same Apply button. Unlike the toggles above, these persist per template (`lpr_sigopt_<file>`).
- **Apply to Template** button updates the `data-owner-field` spans and toggles CSS classes.
- Storage key: `lpr_owners` (per user).
- Selected owner and toggle states reset to defaults on each page load (they are applied manually per session).

#### Tenants tab (`tenants.js`)

- 3-layer data model: `source` (CSV import) → `overrides` (manual panel edits) → `effective` (override wins, falls back to source).
- **Import CSV** — Buildium tenant export. Smart merge: new tenants added, existing updated, overrides preserved. (The CSV parser handles quoted commas, `""` and line breaks.)
- **↑ Properties** — Buildium Properties export → each tenant's **Landlord** (tenant field, editable like any other). Matched on street address + zip (case, punctuation, Ave/Avenue, St/Street, Rd/Road… and zip+4 ignored); two properties at one address with different owners → Address 2 decides, otherwise blank (never guessed). It's the tenant's `source` value, so a landlord typed by hand wins and survives re-imports; either import order works. Only Address 1/2, Postal code and Rental owners are stored (`lpr_properties`). The import message says how many matched / were ambiguous / weren't found. The landlord does **not** change the Sender company in the sign-off (LPR signs as agent).
- Overrides auto-cleared if re-import matches the override value. "Buildium: …" hint shown when override differs from source.
- **Apply as Recipient** — fills `data-contact-field` spans (the canonical recipient family: name, first_name, last_name, address, city/state/zip, email, phone). Also fills any legacy `data-tenant-field` spans (permanent alias — old saved snapshots depend on it; new templates should use contact only).
- **Body fields only** — fills only the tenant-alias spans; leaves `data-contact-field` untouched for a vendor recipient.
- **+ Add** — manually create a tenant entry directly in the browser without importing a CSV. Same fields as the editor. Saved to localStorage with a generated ID (`m_<timestamp>`). Manual entries show a **Delete** button in their editor header for removal.
- **Recently used** — the last 5 applied tenants appear in a shaded section above the scrollable list. Hidden during search. Each entry has an ✕ to remove it individually. Persists across sessions.
- **Search** matches all address fields (name, address_line1, address_line2, city, state, zip) — typing a street name or city finds matching tenants.
- Storage keys: `lpr_tenants` (address book), `lpr_recent_tenants` (recent list). Both per user.

#### Vendors tab (`vendors.js`)

- Same 3-layer override model as tenants.
- Fields: name, address_line1, address_line2, city, state, zip, email1, email2, phone, mobile.
- **Import CSV** — Buildium vendor export (columns: "Vendor Name *", "Address Line 1 (optional)", etc.). ID: uses "Id (optional)" column, falls back to vendor name.
- **Apply as Recipient** — fills `data-contact-field` spans (name → combined name, address, city, state, zip, email, phone) AND `data-vendor-field` spans.
- **Body fields only** — fills only `data-vendor-field` spans.
- **+ Add** — manually create a vendor entry directly in the browser without importing a CSV. Same fields as the editor. Saved to localStorage with a generated ID (`m_<timestamp>`). Manual entries show a **Delete** button in their editor header for removal.
- **Recently used** — the last 5 applied vendors appear in a shaded section above the scrollable list. Hidden during search. Each entry has an ✕ to remove it individually. Persists across sessions.
- **Search** matches all address fields (name, address_line1, address_line2, city, state, zip) — same as tenant search.
- Storage keys: `lpr_vendors` (address book), `lpr_recent_vendors` (recent list). Both per user.

### Field namespace system

See [Field Namespace System](#field-namespace-system) below for full details.

### Unsaved-changes guard

When you've made text edits, attempting to navigate away triggers a modal:

- **Stay on page** — cancel
- **Discard** — leave without saving
- **Save to Library** — opens Save As flow

Tab close / refresh triggers the browser's native "are you sure?" warning.

Signature position/size adjustments auto-save to localStorage and do **not** count as unsaved edits.

### "Fields may have been unlinked" warning (on Done)

Done compares the auto-fill fields present at Edit vs Done (`censusTokenSpans` / `diffLostSpans` in template-tools.js) and offers **Undo my edits / Keep my edits** if any vanished. Fields removed **on purpose** are forgiven and don't trigger it: a highlight typed over, deleted, cut or pasted over; Backspace / Delete on a chip; Clear body / Clear all. Detection is the `beforeinput` listener (`getTargetRanges()`) plus `window.LPR_EDIT_UNDO.noteDeliberateRemoval(range)`, which scripted deletions (paste-clean.js) call themselves. Fields lost any other way still warn. Tested in `tests/editing.test.mjs` ("quiet warning").

### Library (custom-saved templates)

The Library section at the bottom of the index holds copies you've saved with **Save As**. Each library item:
- Stores the full HTML snapshot in localStorage (all field content baked in)
- Opens via `view.html?id=<id>` — a real `file://` page that `document.write`s the saved HTML into the same browsing context, preserving the `file://` origin so scripts load correctly and localStorage is accessible
- Displays a fully functional toolbar (Edit, Export, Save As, **Save Edits**) identical to any other template
- **Save Edits** button appears only on library templates and overwrites the existing entry in-place (with a confirmation prompt). **Save As** creates a new copy.
- Can be deleted from the index (× button on the card)
- Captures the signer name, owner selection, recipient address, and all body fields at save time
- The `data-lpr-snapshot` flag prevents `employee.js` from overwriting baked-in employee values when the saved copy is reopened
- Saved HTML has UI chrome (Setup panel, toolbar buttons, modals) stripped before storage — scripts re-inject them fresh on open. Local stylesheets are inlined over http(s); under `file://` they stay as absolute `<link>`s. A `<base href>` pointing at the templates folder lets anything loaded later by a relative path (export libraries, page-flow's icon) resolve.
- Copies saved under `file://` before 2026-10-08 have a doubled `<base href>` (which broke their PDF/PNG export); `view.html` repairs it on open, so they work without re-saving
- Duplicate names are allowed; entries are keyed by timestamp id (`c_<base36>`), not by name

### Backup & Restore

The **Backup & Restore** panel (above the usage instructions on the index):

- **Download backup** — exports every `lpr_*` localStorage key (all users on this browser) as a single JSON file
- **Restore from backup** — picks a JSON file, validates, asks for confirmation, then overwrites current data

**Recommended:** download a backup periodically and stash a copy in Google Drive or email it to yourself. localStorage can be wiped by "Clear cookies and other site data."

### Full Reset

The red **Reset Everything** button at the very bottom of the index opens a modal with two options:

- **My data only** — clears the current user's starred, archived, presets, library items, and order changes. Other users are unaffected. Takes effect immediately on click.
- **All users** — permanently wipes every user's data and removes all user accounts from this browser, then redirects to the user picker. Requires typing `RESET ALL` into a confirmation field before the action is enabled.

Template files are never affected by either option.

---

## Field Namespace System

Templates use three independent field namespaces. Each can be filled independently, allowing cross-party documents (e.g. letter addressed to a vendor about a tenant's property).

| Attribute | Filled by | Purpose |
|-----------|-----------|---------|
| `data-contact-field` | Apply as Recipient (tenant or vendor) | **The canonical recipient family** — name, first_name, last_name, address_line1, address_line2, city, state, zip, email, phone. Use this for ALL recipient references in new templates, including salutations ("Dear first_name last_name"). |
| `data-tenant-field` | LEGACY ALIAS — kept working forever for old saved snapshots | Do not use in new templates. All shipped templates were migrated to `data-contact-field` in the July 2026 consolidation. |
| `data-vendor-field` | Vendor Apply as Recipient or Body fields only | Vendor-specific body references — name, address, email, phone, mobile |
| `data-owner-field` | Sender → Apply to Template | LLC name in signoff |
| `data-employee-field` | employee.js on page load (URL params or defaults) | Signer name, title, phone, email |

### Placeholder display

Empty field spans show a faint italic label in normal view (e.g. *Recipient Name*, *Street Address*). More prominent dashed highlight in Edit mode. Hidden on print.

- `data-contact-field` spans get `data-contact-label` attribute → placeholder via CSS `::before`
- `data-tenant-field` spans get `data-tenant-label`
- `data-vendor-field` spans get `data-vendor-label`

### Address line 2 hide/show

The address_line2 row hides when empty (`:has([data-contact-field]:empty)` CSS) and reappears in Edit mode. Affects Envelopes, Address Labels P-touch, Letterheads, and Notice templates.

#### Fields tab (`fill-fields.js`)

The **Fields** tab is registered by `fill-fields.js` via `window.LPR_FILL_TABS.push()`. It appears after Vendors but only on templates that contain at least one `data-fill-field` span. (Label templates without fill fields get their Fields tab from `manual-address.js` instead — `LPR_MANUAL_ADDRESS.register({replaceFillTab:true})`.)

- Lists every fill field found on the page by its label
- Field types: **date** (calendar picker), **time** (12-hour clock picker), **amount** ($-formatted number), **text** (plain text)
- Calendar and clock pickers use **Flatpickr** (loaded from `assets/vendor/` on first open, cached for the session). The calendar is styled to match LPR brand — blue (#283891) header bar, gold (#d6a35a) today indicator, Montserrat font
- Values are saved to localStorage keyed by page name + field key (`lpr_fill_<pageName>_<key>`), so they persist across page reloads
- The field display on the template updates live as values are typed or selected

### Fill Fields System

Templates mark fillable spans with `data-fill-field` attributes:

```html
<span data-fill-field="date" data-fill-label="Notice Date"></span>
<span data-fill-field="time" data-fill-label="From Time"></span>
<span data-fill-field="amount" data-fill-label="New Monthly Rent"></span>
<span data-fill-field="text" data-fill-label="Reason for Entry"></span>
```

| Attribute | Purpose |
|-----------|---------|
| `data-fill-field` | Field type: `date`, `time`, `amount`, or `text` |
| `data-fill-label` | Human-readable label shown in the Fields tab and used as the placeholder |
| `data-fill-key` | Optional override for the localStorage storage key (defaults to a slug of the label) |

Multiple spans with the same `data-fill-label` share a single input — useful for repeating the same date in multiple locations on a document (e.g. "Notice Date" in both the header and the body).

**Display format:** Date fields show as "May 21, 2026"; time fields show as "10:00 AM"; amount fields show as "$1,234.00"; text fields render as-is.

**Flatpickr integration:** `fill-fields.js` lazy-loads Flatpickr CSS + JS from `assets/vendor/flatpickr.min.{js,css}` (vendored 4.6.13 — no network needed) only when the Fields tab is first opened on a template with date or time inputs. The promise is cached in `window._lpr_fp_promise` so subsequent opens are instant. Native `<input type="date/time">` elements are replaced by Flatpickr instances so the pickers are consistent across all browsers.

**Global hook:** `fill-fields.js` exposes `window.LPR_FILL_APPLY = applyAll` so the Insert sidebar can re-apply all stored values after inserting a new fill-field span.

### Insert Field sidebar (Edit mode)

While in Edit mode, the Setup panel shows an **Insert Field** sidebar with four groups:
- **FILL FIELDS** — inserts a typed fill-field span (`data-fill-field`) at the cursor position: Date, Time, Amount, Text (2-column grid at the top of the panel)
- **RECIPIENT** — inserts `data-contact-field` spans (includes First Name / Last Name for salutations)
- **TENANT — body reference** — inserts legacy `data-tenant-field` alias spans (prefer RECIPIENT for new content)
- **VENDOR — body reference** — inserts `data-vendor-field` spans (only shown when `vendors.js` is loaded)

Also: **Full Address** (Recipient and Tenant groups — "123 Main St, Apt 2, City, MD 21215", the ", Apt 2" part hides when line 2 is empty; rules in brand.css) and **FIELD KEYS — Copy field keys / Download .txt** (the legend below).

### Field keys `{{…}}` (field-keys.js)

Type or paste `{{first name}}`, `{{date: Payment Due Date}}`, `{{landlord}}`… in Edit mode: pasted keys become fields at once (a `LPR_PASTE.transforms` hook), typed ones on Done (`LPR_KEYS.convertSheets`, called from template-tools before auto-spacing). Spelling is forgiving (lower-cased, non-alphanumerics dropped). **Formatting carries over** (Joshua): a key inside bold / italic / underline — rich text, or Markdown `**…**` / `*…*` — stays inside it, so the field keeps that formatting through filling, Save As and export. New fields copy a value from a filled twin already on the page, and fill-ins re-apply the Fields tab's saved value for their label. Unknown keys stay as highlighted text (`mark.lpr-key-unknown`, plain on paper/exports) and are listed in a notice — never dropped.
- **Name overlaps** (Joshua): a bare key = the **recipient** (`data-contact-field`, filled from the tenant OR vendor picked as recipient). Tenant-only fields (lease, rent, phone 2, email 1/2, DOB) need no prefix; `{{tenant …}}` forces the tenant list for shared names; vendor keys **only** with the `vendor` prefix and signer keys only as `{{signer …}}`, so `{{phone}}` can never silently become the vendor's or signer's.
- **Fill-ins:** `{{date}}`, `{{time}}`, `{{amount}}`, `{{text}}`, or with a label: `{{date: Due Date}}` (same label = same value). "date of birth" is the tenant field, not a date blank.
- **Legend + AI instructions:** `LPR_KEYS.legendText()`, built from `LPR_UTIL.FIELDS` — never hand-copied. Copy / Download .txt in the Insert Field panel and on the index page ("Field keys for drafting"). `FIELD-KEYS.md` in the repo is generated: `node tests/keys.test.mjs --write` (the suite fails if it's out of date). The AI instructions say to format the KEY for a bold/italic value.

**Automatic spacing:** an inserted field that touches a letter, digit or another field gets a space (`LPR_UTIL.spaceToken`, so "JaneDoe" can't happen); none before punctuation (`Jane's`, `Doe,`) or after the `$` sign. Undo removes the field together with its space. Done applies the same rule to the whole letter (`spaceAllTokens`) for fields glued together any other way. All inserts go through one function, `placeToken()` in tenants.js.

---

## File Structure

```
lpr-templates/
├── index.html                          # Main directory page
├── users.html                          # User picker (sign-in)
├── archive.html                        # Archived templates view
├── view.html                           # Library template loader — reads id from ?id=, document.writes saved HTML (repairs the pre-2026-10-08 doubled <base>)
│
├── brand.css                           # Shared styles + bundled Montserrat @font-face
├── letter.css                          # Canonical letter-family skeleton (header/badge/title/body/grid/callouts/signoff/print + phone fit-to-width) — loaded after brand.css by the 10 letter templates
├── style-guide.html                    # LPR brand style guide (linked from index) — colors, typography, logo usage, voice & copy rules, notice anatomy, callout semantics, badge vocabulary
├── templates-manifest.js               # window.LPR_MANIFEST — single source of truth for template metadata (title/role/section/badge/modes/options/flags); index cards, archive registry, and Fields config derive from it
├── user.js                             # Multi-user namespacing (loads first) + lpr_schema_version migration hook + shared helpers (window.LPR_UTIL)
├── tests/                              # Headless-Edge browser tests — node tests/run-all.mjs (see tests/README.md); output in tests/out/ (git-ignored)
├── employee.js                         # Employee-field replacement + signature injection
├── tenants.js                          # Tenant address book, Setup panel, Insert Field sidebar (contact family incl. first/last name; data-tenant-field kept as permanent alias for old snapshots)
├── owners.js                           # Sender/owner tab in Setup panel
├── vendors.js                          # Vendor address book, Vendors tab in Setup panel
├── fill-fields.js                      # Fill Fields tab (date/time/amount/text inputs + Flatpickr integration)
├── mode-bar.js                         # Standardized on-page mode selector (.mode-bar[data-mode-group] + [data-mode-when="group:mode"]) — button state, persistence, lpr:modechange event, central export/clone scrub
├── optional-rows.js                    # Dismiss (×) / restore (＋) optional rows — 24-Hour Notice, Occupant Update, Tenancy Confirmation (markup: data-opt-row / data-opt-label / data-opt-start)
├── paste-clean.js                      # Clean paste in edit mode (every template; loaded by template-tools.js) — keeps structure + bold/italic/lists, drops foreign fonts/colours; Markdown-lite for plain text; Clear body / Clear all
├── field-keys.js                       # {{field keys}} → fields (paste + Done), full address preset, key legend + AI instructions (loaded by template-tools.js after paste-clean, and by index.html)
├── FIELD-KEYS.md                       # GENERATED legend — node tests/keys.test.mjs --write
├── page-flow.js                        # Automatic multi-page flow for [data-flow] letter sheets — continuation pages, "Page X of Y", edit-mode break guides (window.LPR_FLOW)
├── signature-block.js                  # Per-document sender signature (gallery / leave blank / signature line) + tenant signature lines, as rows in Setup → Sender
├── template-options.js                 # "Options" tab in the Setup panel — templates register groups via window.LPR_TEMPLATE_OPTIONS
├── manual-address.js                   # Shared manual-address module (one implementation; P-touch/CoM/Shipping register it; adopts each page's legacy storage key)
├── template-tools.js                   # Edit/Export/Save As + unsaved-changes guard + signature drag; exports pull image bytes from assets/img-data.js (see below)
│
├── Business Card.html
├── Business Card Company.html
├── Letterhead.html
├── Letter Watermark.html
├── Envelope.html
├── Envelope Premium.html
├── Mailing Labels.html
├── Address Labels P-touch.html
├── Certificate of Mailing.html
├── Lease Cover.html
├── Email Signature.html
├── 24-Hour Notice.html
├── Notice Template.html
├── Rent Increase Notice.html
├── Non-Renewal Notice.html
├── Security Deposit.html               # Combined — Withheld / Partial Refund / Full Refund
├── Utilities Addendum.html             # Lease addendum — T/O utility assignments + fuel type checkboxes
├── Door Hanger.html
├── Yard Sign.html
├── LPR Logo Concepts.html              # Logo exploration / brand reference page — dev tool, intentionally NOT linked from index (loads React dev builds from CDN)
│
│   # Dev / design-tool files (not part of the published template set)
│   # design-canvas.jsx, logos.jsx, tweaks-panel.jsx, logo.html
│   # Note: Envelope Premium.html has no index card by design — it is a retired
│   # variant surfaced via archive.html's registry. (Letterhead Clean.html was
│   # deleted 2026-10-08; Letterhead's "Clean (none)" mode replaces it.)
│
├── archive/
│   └── source-docs/                    # Original source PDFs/scans (moved out of site root; formerly uploads/)
│
└── assets/
    ├── vendor/                         # Vendored third-party libs (jsPDF, html2canvas, flatpickr js+css, qrious, sortablejs) — no CDN dependency at runtime
    ├── img-data.js                     # window.LPR_IMG_DATA — base64 data URIs of sheet-critical images. REQUIRED for PNG/PDF export under file:// (file:// images taint canvases; script loading is exempt). Regenerate entries if brand images change — command in the file header.
    ├── eho-white.png                   # Equal Housing Opportunity mark (Yard Sign)
    ├── logo-cropped.png                # Full-color logo (used in letterheads, notices)
    ├── logo-white.png                  # White version for dark backgrounds
    ├── logo-email.png                  # Legacy — not currently referenced in any template
    ├── logo-current.png                # Used by LPR Logo Concepts.html
    ├── logo.png                        # Full-color logo (alternate copy)
    ├── logo-icon.png                   # Icon-only (buildings mark), cropped from logo-cropped.png
    ├── logo-base64.txt                 # Base64-encoded logo for email signature inline embed
    ├── ps3817-form.png                 # USPS PS Form 3817 background (Certificate of Mailing)
    └── fonts/
        ├── montserrat-300.woff2
        ├── montserrat-400.woff2
        ├── montserrat-500.woff2
        ├── montserrat-600.woff2
        ├── montserrat-700.woff2
        └── montserrat-800.woff2
```

### Script load order (in each template)

```html
<head>
  <link rel="stylesheet" href="brand.css">
  <script src="user.js"></script>          <!-- must load FIRST -->
</head>
<body>
  ...
  <script src="employee.js"></script>      <!-- field replacement + signature -->
  <script src="tenants.js"></script>       <!-- tenant address book + Setup panel tabs -->
  <script src="owners.js"></script>        <!-- sender/owner tab (registers via unshift → appears first) -->
  <script src="vendors.js"></script>       <!-- vendor address book + Vendors tab -->
  <script src="fill-fields.js"></script>   <!-- fill fields tab (date/time/amount/text + Flatpickr) -->
  <!-- optional, only where the template uses them: -->
  <script src="mode-bar.js"></script>      <!-- on-page mode selector -->
  <script src="page-flow.js"></script>     <!-- sheets with data-flow -->
  <script src="template-options.js"></script> <!-- Options tab -->
  <script src="signature-block.js"></script>  <!-- sheets with data-sig-options -->
  <script src="manual-address.js"></script>   <!-- label-style templates -->
  <script src="template-tools.js"></script><!-- toolbar (Edit/Export/Save As/Setup button) -->
  <script src="optional-rows.js"></script> <!-- dismissible rows; after template-tools -->
</body>
```

Templates that don't use tenant/vendor/owner fields (Business Card, Email Signature, etc.) omit those scripts. user.js also provides the shared helpers (`window.LPR_UTIL`) every other script uses — see Conventions.

---

## Hosting & Deployment

### GitHub Pages (current setup)

1. Public repository at `github.com/joshua-lpr/lpr-templates`
2. Pages enabled in **Settings → Pages → Source: Deploy from a branch → Branch: main → /(root)**
3. Live at `https://joshua-lpr.github.io/lpr-templates/`

### Updating

Push changes to the `main` branch. GitHub Pages deploys automatically — live in ~60 seconds.

```bash
git add .
git commit -m "description of changes"
git push
```

### Embedding in Google Sites

1. In Google Sites: **Insert → Embed → By URL** → paste the GitHub Pages URL
2. The templates iframe into the Sites page
3. *Caveat:* iframe localStorage may be partitioned in some browsers (Safari, Brave). For reliable saved-data behavior, use the direct URL.

### Privacy & licensing

- Repo is **public** (required for free GitHub Pages on a non-Pro account). The published files are accessible to anyone who knows the URL.
- **No license** is attached — code is "all rights reserved" by default, preventing reuse.
- **No tenant or business-sensitive data** is committed to the repo — all customization stays in each user's localStorage.

---

## Browser Storage Notes

### Where data lives

| Data | Where |
|------|-------|
| Template files (HTML/CSS/JS/images) | Server (GitHub Pages) |
| Active user, user list | Browser localStorage |
| Favorites, archive, library, presets, order | Browser localStorage (namespaced per user) |
| Signature image + per-template positions | Browser localStorage (namespaced per user) |
| Per-template settings: mode-bar choice, fill fields, signature options, CoM calibration | Browser localStorage (namespaced per user) |
| Tenant address book + recent list | Browser localStorage (namespaced per user) |
| Vendor address book + recent list | Browser localStorage (namespaced per user) |
| Owner list | Browser localStorage (namespaced per user) |
| Anything typed into a template at edit time | Browser localStorage only after "Save As" |

### What persists vs. what doesn't

| Action | Saved data |
|--------|-----------|
| Close/reopen browser | ✅ Safe |
| Computer restart | ✅ Safe |
| Browser auto-update | ✅ Safe |
| Clear cache (cached images only) | ✅ Safe |
| Clear "Cookies and other site data" | ❌ Wiped |
| Different browser profile | ❌ Separate silo |
| Different device | ❌ Separate silo |
| Different browser (Chrome → Firefox) | ❌ Separate silo |

**Mitigation:** the Backup & Restore feature (above) lets you export a JSON file that can be restored after any wipe or moved between devices manually.

### Per-template field persistence

| Field type | Persists after navigating away? | Persists in Save As / Library? |
|---|---|---|
| Tenant / vendor / contact field content | ❌ Lost on page reload | ✅ Baked into HTML snapshot |
| Owner selection + signer toggles | ❌ Resets each page load | ✅ CSS classes baked in |
| Employee name / title / phone / email | ❌ Re-applied from URL params on load | ✅ Preserved via `data-lpr-snapshot` flag |
| Fill fields (date / time / amount / text) | ✅ Persists per template (localStorage) | ✅ Baked in at save time |
| Signature image | ✅ Persists (localStorage) | ✅ Baked in at save time |
| Signature position / size | ✅ Persists per template (localStorage) | ✅ Baked in at save time |
| Signature options (Sender tab: your signature, tenant lines) | ✅ Persists per template (`lpr_sigopt_<file>`) | ✅ Baked in (mirrored on the sheet) |
| Dismissed optional rows (×) | ❌ Resets on reload | ✅ Baked in; restore buttons work in the copy |

### Storage limits

- localStorage cap: ~5–10 MB per origin (varies by browser)
- Typical usage: signatures ~50KB each, library items ~50KB each, everything else ~5KB total
- A team of 5 with signatures + ~10 library items: well under 1 MB

---

## Multi-page letters + signature options — design record (built 2026-10-08)

*How it works for users: Features → "Multi-page letters" and "Signature options". This section records the design decisions and history.*

**Problem.** `.sheet.letter` is fixed at 11in with `overflow: hidden` (`letter.css` + `brand.css`), so a long letter is silently clipped on screen, in print and in PDF. The Letterhead placeholder text claiming letters "can run to a second page" is false.

**Scope.** Letterhead (Letterhead Clean was also covered, then deleted in the DRY cleanup). TOPA is explicitly out for now; fill-in-only templates (notices, Notice Template, labels, etc.) don't need it. Built as a shared, opt-in system (one attribute on the sheet) so other templates can adopt it later without new code.

### A. Automatic page flow
- The body is ONE continuous source flow; a shared script lays it into real fixed 8.5×11 `.sheet` pages. Editing an early page re-flows everything after it automatically — **no manual per-page adjustment, ever** (hard requirement).
- Why JS pages and not browser print pagination (`@page` margin boxes, Chrome 131+): the screen view and the html2canvas PDF/PNG export would never see the pages. Real sheets keep screen = print = PDF, and the existing print CSS (`page-break-after` on `.sheet`) and `resolveExportSheets()` already handle multiple sheets.
- Edit mode: pages merge into one continuous sheet with dashed page-break guides (live); Done re-paginates. Avoids caret/undo breakage and keeps template-tools.js's per-sheet edit snapshots working on a single sheet.
- Optional "start new page here" marker; content after it still flows automatically.
- Break rules: split paragraphs at word boundaries, never inside a token span; min 2 lines at page bottom/top; keep-together for signature blocks; sign-off (+ tenant block, below) always carries at least the last 2 body lines with it.
- Must handle: Save As / Library stores the unsplit source and re-paginates on open; paginate after `document.fonts.ready`; no forced break after the last sheet (trailing blank page); re-paginate after fill-field / picker / mode-bar changes.

### B. Look (standard business-letter practice: letterhead on page 1 only)
- Page 1: full letterhead, unchanged.
- Pages 2+: compact continuation heading — small icon (`assets/logo-icon.png`, ~0.35in) left; `Recipient name · Date` right in 8.5pt muted; thin 1px blue rule (lighter than page 1's 2px).
- Footer `Page X of Y`, centered, small muted — on every page **including page 1**, only when the letter is 2+ pages. Single-page letters show no number.
- Watermark repeats on every page. No "(continued)" markers.

### C. Sender signature — three distinct states
| State | Prints | Purpose |
|---|---|---|
| Signature image | saved signature | signed now |
| Leave blank | nothing — no space, no line (current gallery "Leave blank"; correct, keep) | deliberately omitted |
| Signature line (new) | signature + date lines, **identical to the tenant block's rows** | to be signed later |
Per-document override in Setup → **Sender** (moved there from Options 2026-10-08 — it sits with the other sign-off toggles): `Gallery default` · `Leave blank` · `Signature line`. Wire into employee.js's existing signature apply, not new code.

### D. Tenant signature block (Setup → Sender)
- `None` (default) · `1 tenant` · `2 tenants`. Label: **Tenant** (matches the style guide; Utilities Addendum keeps "Resident").
- **General-purpose signature block** (payment plans, agreements, anything a tenant signs) — NOT a receipt acknowledgment. No fixed heading or sentence.
- 2 tenants = rows **stacked** full-width (chosen 2026-10-08; user may switch to side-by-side later — keep layout CSS-only so that's a one-rule change).
- Rows: `Tenant Signature ____ Date ____` with printed tenant name (from the contact) under the line; 2nd tenant's name left blank (no co-tenant data in tenants.js).
- No lead-in / heading wording above the rows (a lead-in option was built, then removed 2026-10-08 at Joshua's request — "out of place between the signatures"). Any per-letter wording goes in the letter body.
- For two-party agreements, set the sender signature to "Signature line" so landlord and tenant rows match.
- Shared row CSS lives in `letter.css` ("Signature rows"), scoped to `.sig-block` / `.sig-as-line`. Utilities Addendum was deliberately **not** migrated (its rows differ from the spec; its look must not change) — bead `joshu_AKIVA-9vg`.

### E. Style guide changes — APPLIED 2026-10-08
- Added "Multi-Page Letters" and "Signature Blocks" sections to style-guide.html (sender signature label: **Landlord/Agent Signature**).
- Fixed guide drift: signoff token now `0.45in` fixed (was `auto + 0.4in`). Fixed this file: letterhead signoff 36px → 0.45in; checklist step 9 exempts flow templates.
- **⚠ PENDING USER REVIEW — remind Joshua:** `.date`/`.recipient` margin-bottom. Guide + this file say 22px; templates ship 12px/14px. Decision: keep the current 12/14px look, but Joshua wants to see it before the guide is changed. Do NOT edit the 22px lines in style-guide.html (dev appendix) or this file until he confirms.

### Status (2026-10-08)
- **Step 2 DONE — page flow live on Letterhead.** `page-flow.js` + "Multi-page flow" block in `letter.css` + hooks in `template-tools.js` (toggleEdit → `setEditing`, buildSaveHtml unpaginates around its single cloneNode, printBlank re-paginates, doExportNow `hold()`s the layout during capture, "⤓ New page" format-bar button). `logo-icon.png` added to `assets/img-data.js`.
- Verified in headless Edge (Chromium): 1/3/4/5-page letters, no body overflow, exact 11in sheets, Page X of Y, continuation meta, lossless + stable unpaginate/paginate round trip, edit mode = one sheet with correct guides, forced break, sign-off ≥2 body lines across 21 sweep layouts, no <2-line split pieces, watermark per page on/off, print PDF page count = sheets, auto-reflow on content change, phone width, Save As stores unsplit source and Library reopen re-paginates, PDF/PNG/HTML export page counts, icon renders in export, no regressions on Non-Renewal / Utilities Addendum / Letterhead Clean.
- ~~Pre-existing: PDF/PNG export from a Library copy (`view.html`) fails under file://~~ — FIXED in the DRY cleanup (root cause: doubled `<base href>` in Save As copies).
- **Steps 3–5 DONE.** `signature-block.js` adds rows to Setup → Sender (via `LPR_SENDER_EXTRAS`, committed by Apply) for sheets with `data-sig-options`: Your signature (Gallery default · Leave blank · Signature line) and Tenant signature (None · 1 · 2). employee.js's image insertion was extracted into `injectSignature()` / `window.LPR_SIGNATURE.inject` (single copy, reused). Row CSS in `letter.css` "Signature rows". State per template in `lpr_sigopt_<file>` + mirrored on the sheet so Library copies reopen as saved. Applied to Letterhead and Letterhead Clean; manifest descs; README row; placeholder text fixed. Tested: all three sender states, tenant rows/names/labels, sender row = tenant row geometry, persistence, 29 page-flow sweep layouts (tenant block stays with sign-off), Save As → Library reopen.
- Revised 2026-10-08 per Joshua: printed names (sender + tenant) always sit **under the line**, same SemiBold sign-off name style; fixed 1.9in label column so all signers' lines align. Sender keeps the title · company line under the name (signing capacity = as agent, not personally).
- Fixed 2026-10-08: signature toggles did nothing once the sign-off had flowed onto page 2+ (signature-block.js only searched page 1) — `apply()` now unpaginates → edits → re-paginates.
- **Follow-ups:** (1) Utilities Addendum's local `.ua-sign` rows don't match the style-guide signature spec (1.4in date line, 0.28in gaps, no printed name) — left untouched on purpose; migrate to the shared rows only with Joshua's OK (bead `joshu_AKIVA-9vg`). (2) ~~Letterhead Clean~~ — DELETED 2026-10-08 (DRY cleanup step A); Letterhead's "Clean (none)" mode replaces it. (3) date/recipient spacing review (above; bead `joshu_AKIVA-r8m`). (4) ~~Library-copy export failure under file://~~ — FIXED 2026-10-08 (DRY cleanup step D: doubled `<base>`).

### Build order
1. Style-guide drafts → approval. 2. Page flow on Letterhead + full test matrix (1/2/3 pages, sign-off at break, watermark, edit→Done, Save As→reopen, Chrome+Edge print, PDF/PNG, phone). 3. Sender signature states. 4. Tenant block + shared sig-row CSS (recheck Utilities Addendum). 5. Letterhead Clean, fix placeholder text, manifest desc, this section → move to Features. **All done** (Features entries added; this section kept as the design record).

---

## Planned: Phase 5 — date + money input (approved 2026-10-09)

Joshua: "multiple ways to input date formats — mm/dd/yyyy and spelled out; mm/dd/yyyy drops leading 0s; money inputs automatically add commas and add/remove the $ sign when needed/extra." All in `fill-fields.js` (Fields tab).
- **Date input:** type `10/8/2026`, `10-08-26`, `2026-10-08`, `October 8 2026`, `Oct 8, 2026`, `8 Oct 2026` — or use the calendar. Unreadable → red outline, letter unchanged. 2-digit year → 20xx. Stored as `YYYY-MM-DD` (unchanged, so saved values keep working).
- **Date display — per field (Joshua):** switch next to each date: "October 8, 2026" (default, today's behaviour) or "10/8/2026" (no leading zeros). Remembered per field; field keys: `{{numeric date: Label}}` sets numeric. Must survive Save As / export.
- **Money:** tidied when leaving the box: `1234.5`, `$1,234.5`, `1234.50` → `1,234.50` — **always 2 decimals** (Joshua). `$` added only when the letter doesn't already have one right before the field (no "$$", no missing "$"). Non-numbers ("TBD") kept as typed.
- **Fold in `bqt`:** hidden flatpickr calendar popups must not be baked into HTML export / Save As.
- Tests: every date spelling + an unreadable one; spelled vs numeric display incl. no leading zeros; per-field switch persists; money variants with "$" present / absent before the field; "TBD"; values through letter / Save As / export; no calendar markup in exports.

## Letter-drafting improvements (approved 2026-10-09 — ALL PHASES DONE)

Epic `joshu_AKIVA-w2b`. From Joshua drafting a payment-plan addendum on Letterhead.

**Phase 1 — Paste + page flow (bug `joshu_AKIVA-mcw`) — DONE 2026-10-09.** Tests: `tests/paste.test.mjs` (111 checks: Google Docs / Word / AI rich text / Markdown / plain text × date line / mid-paragraph / empty line / sign-off; inline paste; Undo; repair of already-broken letters; a payment-plan-shaped agreement). Decisions (Joshua 2026-10-09): clean paste on every template; Markdown in plain-text paste; continuation heading falls back to the document title (style guide updated). Root cause: page-flow.js only splits direct-child `<p>`; pasted content arrives as one wrapper (`<b id="docs-internal-guid…">`, a `<span>`) or lands inside `.date` (keep-together) → text clipped off the page, page-2 heading printed the whole `.date` text. Fix: split any tall block between its children (lists keep numbering via `start`, headings stay with the next block; nothing is ever clipped); repair structure on Done / Library open (unwrap paste wrappers, hoist blocks out of `.date` / `.recipient`); clean paste on every template (keep paragraphs, headings → `.subject`, bold/italic/underline, lists; drop fonts/sizes/colours/spacing; never insert inside date/recipient/sign-off); continuation heading uses only the name + date fields, length-capped.
**Phase 2 — Editing helpers — DONE 2026-10-09.** Clear buttons (`w2b.1`) — **two buttons, no dialog** (Joshua): *Clear body* (keeps date + recipient; **removes the "Dear …" line too** — Joshua) and *Clear all* (removes those too); both never touch the letterhead header, sign-off or tenant signature lines, and don't trigger the "fields were removed" warning (`paste-clean.js` `clear()`); auto-space between adjacent fields (`w2b.2`, `LPR_UTIL.spaceToken`); B / I / **U (new button — Joshua)** / Plain / Size / Color work on field chips (`w2b.3`, template-tools `formatWithChips`, undo entry type `style`). Tests: `tests/clear.test.mjs`, `tests/fields.test.mjs`.
**Phase 3 — Field keys — DONE 2026-10-09** (see Features → "Field keys"; tests `tests/keys.test.mjs`). `{{first name}}`-style keys convert to fields on paste / Done (`w2b.4`) — **a bold/italic key gives a bold/italic field** (stated in the legend); legend `FIELD-KEYS.md` with AI drafting instructions, one-click **Copy** + **Download .txt**; Full address preset with address line 2 handled (`w2b.5`).
**Phase 4 — Landlord — DONE 2026-10-09 (`w2b.6`).** Re-scoped by Joshua: the landlord is **just another tenant field** (`FIELDS.tenant.landlord`), so it appears in the Tenants tab, Insert Field, the legend and `{{landlord}}` with no extra code. Source: **↑ Properties** in the Tenants tab (Buildium Properties export; only Address 1/2 + Postal code → Rental owners is kept, `lpr_properties`). **Decisions (Joshua):** the sign-off company is NOT switched to the landlord — LPR signs as the managing agent of each entity (possible future option, no use case now); `{{landlord}}` = the tenant's landlord, the Sender company is `{{sender company}}` / `{{company}}`. Findings from the real export (194 rows): no property actually has two owners (the one comma is "…, LLC" — the owner cell is never split); 3 street addresses appear twice with different owners → Address 2 decides, else left blank. Tests: `tests/landlord.test.mjs`.

Each phase: new browser tests (paste fixtures from Google Docs / Word / plain text at the date line, mid-paragraph and on an empty line; no page overflow, all text present, numbering continues, field formatting survives fill, key conversion, address-line-2 hiding, owner matching) + all existing suites + baseline compare.

## DRY cleanup — DONE 2026-10-08 (approved by Joshua; bead `joshu_AKIVA-ssh`)

From the 2026-10-08 DRY audit. **In scope:** A–D below. **Out of scope (beads):** tenants/vendors/owners merge → `joshu_AKIVA-0dm` (on hold); single-source brand settings (address, phone/email, logo, colors) → `joshu_AKIVA-d8k` (future, needs design; related `joshu_AKIVA-dug`).

### Step 0 — baseline BEFORE any code change
- **Storage-key snapshot:** on every template (and a view.html Library copy) exercise every saved setting (mode bar, a fill field, manual address, signature offset, signature options, CoM calibration) and record all `localStorage` keys + values. After each step the snapshot must match exactly — a changed key = users silently lose saved settings.
- **Smoke baseline:** load every page, record console errors (so pre-existing errors aren't blamed on the refactor).
- **Output fingerprints:** HTML export + Save As HTML per template (normalized for ids/dates), plus print-to-PDF page counts and screenshots of the optional-row templates.

### A. Delete Letterhead Clean
- Reverses bead `joshu_AKIVA-okk` (July: kept as a retired variant on the archive page). Letterhead's "Clean (none)" mode produces the same letter.
- Remove the file, its manifest entry, README row, PROJECT.md rows/tree/notes, letter.css comment. Saved Library copies made from it keep working (they store their own HTML and load the shared scripts).
- **Tests:** index + archive load with no errors and no broken card; a Library copy saved from Letterhead Clean *before* deletion still opens, paginates, edits and exports after; no references left (grep).

### B. Shared helpers → `window.LPR_UTIL` in user.js
- Lives in user.js because every page **and every saved Library copy** already loads it first; a new file would be missing from old saved copies and break their scripts.
- `esc()`, `pageBase()`, `pageKey()` (adds the view.html id suffix), `fileKey()` (lower-cased filename), `TOKEN_ATTRS` / `TOKEN_SEL`, plus the fill-in-only subset Print Blank uses. The three page-key helpers stay **distinct on purpose**: saved settings depend on each exact formula.
- Replaces: esc ×8 + escapeHtml ×2 (index, archive); page-key code ×12 (mode-bar, fill-fields, manual-address, employee, template-tools ×2, signature-block, inline legacy blocks in Letterhead / CoM / Envelope / Yard Sign); token lists ×4 (template-tools ×3, page-flow).
- **Tests:** storage-key snapshot identical to baseline; esc() checks (`& < > "`, null/undefined, numbers); page-flow (24), signature, Sender-tab suites; smoke all pages; Print Blank still blanks only fill-ins (employee/owner stay); edit-mode field chips still atomic.

### C. Shared optional rows → `optional-rows.js` + letter.css
- 24-Hour Notice, Occupant Update, Tenancy Confirmation. Per-template differences move into markup: `data-opt-label` on each ✕ button, `data-opt-start="removed"` (Occupant rows 3–4). Shared `.opt-*` CSS into letter.css; Tenancy's whole-block rules stay local.
- Fixes two existing bugs: restore buttons are dead in Save As copies; Occupant re-hides rows 3–4 every time a saved copy reopens.
- Old saved copies keep their own inline script, so they're unaffected.
- **Tests (each template):** dismiss each row → gone on screen, in print-to-PDF and PNG; restore bar lists exactly the dismissed rows, right labels, right order; restore works; Occupant opens with 3–4 hidden; Tenancy "Rent details" hides the whole block; Save As → reopen keeps state and restore buttons work; screenshots match baseline; no console errors.

### D. template-tools.js internal cleanup
- One shared "prepare snapshot" step for HTML export and Save As (stylesheet inlining, asset-path fixing, common UI stripping), keeping their deliberate differences (export: no scripts, keeps pages; Save As: keeps scripts, saves the unsplit letter).
- One base-URL formula (Save As's). Fixes a latent export bug: a `/` in a URL parameter (e.g. `?title=Owner/Manager`) breaks asset paths in HTML export.
- One selection tracker for font size + colour (now two listeners, both checking only the first sheet → fix to any sheet, which also fixes them on Security Deposit's 2nd/3rd variants).
- **Tests:** HTML export + Save As output diff vs baseline shows only the expected differences; exported HTML opens standalone with styles and images; Save As → Library reopen; font size + colour on Letterhead and on Security Deposit variants 2 and 3; undo afterwards; PDF/PNG unchanged.

### Finish
Full regression on every template; update PROJECT.md conventions (use `LPR_UTIL`; optional-rows pattern; file tree). Nothing committed unless asked.

### Result
- **A** Letterhead Clean deleted. Old Library copies made from it still open, paginate, edit and export.
- **B** `window.LPR_UTIL` in user.js replaced 8 `esc()` + 2 `escapeHtml()` copies, 12 page-key derivations, 4 token lists. Saved-settings keys + values identical on every template and a Library copy (baseline compare).
- **C** `optional-rows.js` + letter.css replaced three inline copies. Screenshots pixel-identical. Fixed: dead restore buttons in Save As copies; Occupant re-hiding restored rows 3–4.
- **D** template-tools.js: one snapshot prep for HTML export + Save As (`pageDirUrl`, `stripSnapshotCommon`, `inlineStylesheets`, `absolutizeAssets`), one selection tracker, one `wrapSelection()` for size + colour. Fixed: font size / colour ignored mouse selections on any sheet but the first (Security Deposit variants 2–3); a `/` in a URL parameter broke HTML-export asset paths; **every Save As copy under file:// had a doubled `<base href>`** — the root cause of "Library copy PDF/PNG export fails (html2canvas won't load)". New saves are correct; view.html repairs older copies on open.
- Tests: `tests/` (7 suites, 119 checks) + `tests/baseline.mjs` (whole-site behaviour snapshot). Save As output differs from the pre-cleanup baseline only by the `<base>` repair and the step B/C lines, verified per template.

---

## Future Considerations

If multi-device sync ever becomes important:

- **Firebase / Supabase backend** — replaces localStorage with a cloud DB tied to Google Workspace login. Requires real engineering work but provides true per-user, per-device persistence.
- **Cloudflare Pages + Access** — keep static hosting, but add login/auth for actual access control (free for ≤50 users).
- **Custom domain** — point `templates.lasalleparkrealty.com` at the GitHub Pages site for cleaner branding.

For now the system is intentionally simple — no logins, no databases, no surprises. Everything is recoverable from a backup file and `localStorage`.

---

## Conventions for New Templates

### Adding a new template — the checklist

Follow these steps in order; a new letter-style notice needs ~30 minutes and zero new CSS.

1. **Start from the closest existing template** — for letters/notices copy `Notice Template.html` (blank shell already on the standard skeleton). Keep the standard `<head>`: `brand.css` → `letter.css` (letter family only) → `user.js` first.
2. **Content structure** — follow the notice anatomy in the style guide (badge → title → date → recipient block → opening → key-facts → action → signoff). Body copy follows the Voice & Copy rules (style-guide.html).
3. **Tokens** — recipients use `data-contact-field` ONLY (never `data-tenant-field` — legacy alias). Fill-ins use `data-fill-field="date|time|amount|text"` with `data-fill-label` from the canonical vocabulary (always "Notice Date", never "Date"/"Letter Date"; reuse existing labels where the concept matches — same label = one synced input). Sender/signer via `data-owner-field` / `data-employee-field` spans copied from an existing signoff block. Notice-family headers hardcode `office@lasalleparkrealty.com` (no employee email span).
4. **Script stack** (exact order): `user.js` (in head) … then before `</body>`: `employee.js`, `tenants.js`, `owners.js`, `vendors.js`, `fill-fields.js`, [`mode-bar.js` if multi-mode], [`page-flow.js` if the sheet has `data-flow`], [`signature-block.js` if the sheet has `data-sig-options`], [`template-options.js` if registering options], [`manual-address.js` if a label-style template], `template-tools.js`, then [`optional-rows.js` if the sheet has dismissible rows].
5. **Modes** (only if the template has real document variants): on-page `.mode-bar[data-mode-group="doc"][data-mode-key="<short>"]` with `.mode-btn[data-mode]` buttons directly above the sheet; variant elements get `data-mode-when="doc:<mode>"` (+ initial `mode-hidden` on non-defaults). No custom mode JS — mode-bar.js handles state/persistence/export. See "Mode bar (standardized)" below.
6. **Settings** (only if the template has knobs that aren't modes): register a group via `window.LPR_TEMPLATE_OPTIONS.push({id, title, render})` — appears in Setup → Options. Do NOT build on-page settings cards.
7. **Register in the manifest** — add an entry to `templates-manifest.js` (id = filename, title, role, section, desc, badge, modes/options/flags as applicable) **and add a thumbnail** `<template data-thumb-id="<filename>">` in index.html's `#thumb-defs` block (copy a similar template's thumbnail markup as a starting point). The index card and archive registry derive automatically — do not hand-write a card.
8. **Images on the sheet** — if the template adds a NEW image that appears on the printed sheet, add it to `assets/img-data.js` (base64 entry — regeneration command in that file's header) or PNG/PDF exports will render without it under `file://`.
9. **Verify before calling it done**: page loads with zero console errors; the sheet never exceeds one page **with long realistic values filled in** (multi-page flow templates instead: long content paginates cleanly per the style guide's Multi-Page Letters rules) (11in = 1056px: `sheet.scrollHeight <= sheet.clientHeight`); Export → PDF/PNG contains the logo/images; Save As → reopen from Library shows baked values; print preview is clean. Update the Template Inventory table in this file and the README table. Run `node tests/run-all.mjs`; before changing shared code, `node tests/baseline.mjs capture` first and `compare` after (see tests/README.md).

### Shared helpers — `window.LPR_UTIL` (user.js)

Use these instead of writing your own copy (the DRY audit of 2026-10-08 removed 24 copies):
- `LPR_UTIL.esc(s)` — HTML-escape text/attribute values (`& < > " '`; null/undefined → "").
- Page identity for `localStorage` keys — **pick the one the existing feature uses; never invent or "unify"** (saved settings are keyed by each exact formula): `pageBase()` (mode-bar legacy keys), `pageKey()` (fields, manual address, mode bar — adds the Library-copy id), `fileKey()` (signature offsets/options), `pageFile()` (raw file name).
- `TOKEN_ATTRS` / `TOKEN_SEL` (all six `data-*-field` types), `FILL_TOKEN_SEL` (fill-ins only — Print Blank).
- `spaceToken(el)` / `spaceAllTokens(root)` — space a field from a touching word/field; returns the inserted text nodes / count. Never spaces against an element with a class (deliberate layout, e.g. TOPA's date line).
- `FIELDS` — **the** field table (namespace → key → label: contact, tenant, vendor, fill, owner, employee). tenants.js / vendors.js, Insert Field, field keys and the legend all read it; add a field here, nowhere else. Order = display + CSV column order: append, don't reorder.
- `makeToken(ns, key, fillLabel)` — a new empty field span with the right attributes for any namespace.

They live in user.js because it is the one script every page **and every saved Library copy** loads first; a new helpers file would be missing from older saved copies. `tests/helpers.test.mjs` proves each helper matches the code it replaced.

### CSS — always use brand tokens, never hardcode hex

All color references in template `<style>` blocks must use the CSS custom properties from `brand.css`:

```css
/* ✅ correct */
color: var(--lpr-blue);
background: var(--lpr-page);

/* ❌ wrong */
color: #283891;
background: #efeae0;
```

`exportHtml()` inlines `brand.css` at export time, so custom properties resolve correctly in any standalone exported file without needing access to the source directory.

**Alpha variants** cannot be expressed as a CSS var — write them as `rgba()` literals:

```css
/* rgba variants stay as literals */
border: 1px solid rgba(40, 56, 145, 0.18);
```

### Exceptions — where hex must stay hardcoded

| Location | Rule |
|----------|------|
| SVG attribute values (`stroke=`, `fill=`) | CSS vars are not valid in SVG presentation attributes — keep as `#283891` |
| `Email Signature.html` `<table>` inline styles | Email clients (Gmail, Outlook) don't resolve CSS custom properties — all `style=` on the `<sig>` table must use literal hex |
| JS-generated HTML strings that produce `style=` attributes for email output | Same rule as above |
| `data-color` HTML attribute values used by `applyTextColor()` | Must be literal hex strings (they're JS values, not CSS) |

### JS-injected CSS (tenants.js, vendors.js, fill-fields.js, template-tools.js)

CSS injected via `<style>` blocks from JavaScript **can and should** use CSS vars — the `brand.css` `:root` definitions are present in the document at the time these styles are applied. Use vars everywhere except SVG `stroke`/`fill` attributes embedded in icon SVG strings.

### Document template spacing — letter/notice family

All US Letter templates share these values. Do not deviate per-template.

**Sheet**
- `padding: 0.75in 0.85in` — page margins (applies to `.sheet.letter` and `.sheet.notice`)

**Header** (`.lh-header` / `.n-header`)
- `padding-bottom: 18px` — space below logo/address before the 2px brand rule
- Logo height: `0.95in`
- Meta text: `font-size: 8.5pt; line-height: 1.55`

**Badge / title block** (`.doc-badge` + `.doc-title`)
- `.doc-badge` — `margin-top: 0.45in; font-size: 9pt; letter-spacing: 4px; font-weight: 600`
- `.doc-title` — `font-size: 26pt; font-weight: 700; letter-spacing: -0.4px; line-height: 1.05; margin-top: 8px`

**Body** (`.lh-body` / `.n-body`)
- `padding-top: 0.35in` — gap between title and body content
- `font-size: 11pt; line-height: 1.65`
- ⚠ **Pending Joshua's review (bead `joshu_AKIVA-r8m`) — do not edit these two lines or letter.css until he confirms:** the templates actually ship `.date` 12px / `.recipient` 14px; the 22px below is the old documented value.
- `.date` — `font-size: 10pt; margin-bottom: 22px`
- `.recipient` / `.to` — `margin-bottom: 22px; line-height: 1.45`
- `p` — `margin: 0 0 12px`

**Signoff (notice family)**
- `.signoff-wrap` — `margin-top: 0.45in` (fixed gap from body content — do NOT use `margin-top: auto`)
- `.signoff` — `padding-top: 0.12in`
- `.signature` — `height: auto; min-height: 0` — never use a fixed height (e.g. `height: 0.5in`). A fixed height reserves blank space when no signature is injected.

> **Why not `margin-top: auto`?** Auto pushes the signoff to the very bottom of the flex container. When the signer is hidden (company-only mode) the signoff block shrinks but stays pinned to the bottom, creating a large white gap. A fixed margin keeps the signoff at a consistent position regardless of signer visibility.

**Letterheads** (no badge/title) use `padding-top: 0.5in` on the body and `margin-top: 0.45in` on `.signoff` (fixed gap, not auto-push, because letter length is user-controlled).

### Body background

Every template `<style>` block must set:

```css
body { background: var(--lpr-page); padding: 60px 20px 40px; }
```

The `exportHtml()` and `buildSaveHtml()` functions both override `body.style.background` to `#fff` before saving, so the ivory page chrome never bleeds into exported/saved files.

### Phone number format

Use dots, not dashes or parentheses:

```
✅  443.402.5641
❌  443-402-5641
❌  (443) 402-5641
```

This applies to all templates, thumbnails, and print-shop spec blocks.

### Header block (letterheads, notices, letters)

Every letter/notice template must include the full LPR contact line — name, phone, **and email** — in the header or signoff block. The standard signoff:

```
LPR Management, LLC · 1517 Reisterstown Road, 2nd Floor · Pikesville, MD 21208
443.402.5641 · office@lasalleparkrealty.com
```

Employee-specific contact fills via `data-employee-field="phone"` and `data-employee-field="email"` spans. When the **Use office contact** toggle is active, those spans are replaced with the office line.

**Notice-family exception:** the notice templates (24-Hour Notice, Rent Increase, Non-Renewal, Security Deposit, Notice Template) hardcode `office@lasalleparkrealty.com` in the header instead of using the employee email span — adverse notices come from the office, not a person (same precedent as Utilities Addendum). Letterheads and personal documents (business card, email signature) keep the employee span.

### Mode bar (standardized — mode-bar.js)

Mode selection is **document identity** and lives ON-PAGE, directly above the sheet — never buried in a panel. All multi-mode templates (Security Deposit, Certificate of Mailing, Utilities Addendum, Envelope, Letterhead, Yard Sign) use the shared contract owned by `mode-bar.js`:

- Markup: `.mode-bar[data-mode-group][data-mode-key]` containing `.mode-btn[data-mode]` buttons; mode-dependent elements carry `data-mode-when="<group>:<mode>"` (hidden via `.mode-hidden` when not matching).
- mode-bar.js owns button state, per-page persistence (`lpr_mode_<pageKey>_<key>`), a `lpr:modechange` document event, the `body.mode-<group>-<mode>` class token, and the central export/clone scrub (strips `.mode-hidden`/`.mode-bar` from HTML snapshots — no per-template `cloneNode` overrides anymore).
- Templates with legacy per-mode internals (CoM's print-style swaps) bridge via an `lpr:modechange` listener rather than rewriting their CSS.
- Button LOOK still comes **from `brand.css`**; container layout + `.mode-hidden` come from `letter.css` (letter family) or a small commented local copy (non-letter pages like Yard Sign). Do not re-define `.mode-btn`, `.mode-btn.active`, or `.mode-btn:hover` in a template.
- True *settings* (not modes) belong in the Setup panel's **Options** tab via `window.LPR_TEMPLATE_OPTIONS` (see template-options.js); exception by decision: P-touch's Font/Bold toggles stay on-page because they change printed output. Sign-off/signature settings go in the **Sender** tab (`LPR_SENDER_EXTRAS`), not Options.

### Consolidated variant files

When a template has closely related variants (e.g. Withheld / Partial Refund / Full Refund), combine them into a single `.html` file with a mode bar rather than three separate files. The `archive.html` TEMPLATES map and `index.html` card list both reference the single combined file.

### `data-employee-hide-if-empty` with LLC name

When `title` is empty, `employee.js` must hide only the title span and separator — not the entire signoff-role line — because the LLC name (`data-owner-field`) lives in the same container. The pattern:

```html
<div class="signed-role" data-employee-hide-if-empty="title">
  <span data-employee-field="title">Senior Property Manager</span>
  <span class="owner-sep"> · </span>
  <span data-owner-field="name">LPR Management, LLC</span>
</div>
```

`employee.js` checks for `[data-owner-field]` inside the container. If found, it hides only `[data-employee-field="title"]` and `.owner-sep` — the LLC name stays visible. If there is no owner field in the container, the whole container is hidden. Never omit the `data-owner-field` span from a signoff-role line.

### Export safety — `no-print` and `data-no-export`

**Every UI element that is not part of the printed document must carry the `no-print` class** so it is stripped by `exportHtml()`. This includes:

| Element type | Examples |
|---|---|
| Toolbar / back button | `.toolbar` (already has `no-print`) |
| Mode toggle bars | `.mode-bar` |
| Calibration / settings panels | `.cal-card`, `#cal-panel` |
| Instruction / help blocks | `.instructions`, `#instr-overlay`, etc. |
| Print containers (hidden on screen) | `#multi-print-container` |
| Multi-mode panels | `#multi-panel` |
| Optional row restore bar | `.opt-restore-bar` |
| Spacer cells in grid 3rd column | Empty `<div class="no-print">` |

`exportHtml()` also strips `.label` elements (the "LETTERHEAD — US LETTER" captions), so do not put document content in an element with class `label`.

**Download-only templates** that have their own format (e.g. `.lbt`) and should not show the Export dropdown at all: add `data-no-export` to `<body>`. `template-tools.js` skips injecting the Export dropdown when this attribute is present.

```html
<!-- Address Labels P-touch: only offers .lbt download, no Export menu -->
<body data-no-export>
```

### Export filenames — address disambiguation

`baseFilename()` in `template-tools.js` derives the download name from
`document.title` (minus the `LPR —` prefix) and appends the **leading house
number** of the filled recipient address when one is present:

```
Non-Renewal Notice - 1234.pdf
```

Without this, every export of a given template shares one filename and each
new download silently overwrites the previous one in Downloads.

- **Number only, never the tenant name** — deliberate. Filenames travel with
  email attachments, so a misdirected send would otherwise disclose a tenant
  name before the file is even opened. The house number is enough to make the
  file distinct without naming anyone.
- Reads `[data-contact-field="address_line1"]`. Unfilled placeholders are CSS
  `::before` pseudo-elements on `:empty` spans, so `textContent` is `""` and the
  name falls back to title-only — no per-template opt-in needed.
- Keeps letter suffixes and hyphenated numbers (`12A`, `120-22`); returns `""`
  for anything not starting with a digit (PO boxes) or longer than 12 chars.
- Templates with no recipient block (Yard Sign, Business Card) are unaffected.
- Applies to the HTML / PNG / PDF downloads. **Print → Save as PDF does not use
  it** — `window.print()` hands naming to the browser.

### Export → PDF is a raster image

`exportPdf()` renders each sheet through html2canvas at `scale: 2` and places
the result as a JPEG (q 0.97) via `doc.addImage()`. The PDF therefore has **no
text layer** — not selectable, searchable, or screen-reader accessible, and
~192 DPI.

For documents where selectable text matters (legal notices that may need to be
reproduced or quoted), **Export → Print → "Save as PDF"** produces a true
vector PDF instead. The raster path is retained because it guarantees
pixel-identical output regardless of the viewer's print settings, which is what
fixed-layout pieces (Yard Sign, Certificate of Mailing overlays) need.

### Optional / removable rows in info grids

For grid rows that are contextually optional (e.g. Reason, Persons Entering in 24-Hour Notice):

**Grid structure:** use a 3-column grid — `grid-template-columns: 1.3in 1fr auto` — where the `auto` column holds X dismiss buttons for optional rows and empty `<div class="no-print">` spacers for required rows.

**Alignment:** add `align-items: end` to the grid so that val text sits adjacent to its `border-bottom` dashed underline even when the key label wraps to two lines.

**HTML pattern:**
```html
<div class="info-grid">
  <!-- required row — spacer in 3rd column -->
  <div class="key">Entry Date</div>
  <div class="val"><span data-fill-field="date" ...></span></div>
  <div class="no-print" aria-hidden="true"></div>

  <!-- optional row — dismiss button in 3rd column -->
  <div class="key opt-row-cell" data-opt-row="reason">Reason</div>
  <div class="val opt-row-cell" data-opt-row="reason"><span ...></span></div>
  <button class="opt-dismiss no-print" data-opt-row="reason" data-opt-label="Reason" title="Remove this row">×</button>
</div>
<div class="opt-restore-bar no-print"></div>
```

**Behaviour + styles are shared — write no JS or CSS per template.** Load `optional-rows.js` at the end of `<body>` (after template-tools.js); the `.opt-*` styles live in `letter.css` ("Optional rows"). Per-template differences go in markup only:
- `data-opt-label` on each × button — the restore-button text.
- `data-opt-start="removed"` — row starts dismissed (Occupant Update rows 3–4).
- Any element with the same `data-opt-row` hides with it (Tenancy Confirmation's whole `.rent-block`).

When all three cells in a row are `display:none`, the CSS grid row collapses to zero height automatically (the `auto` third column has no content → zero width in print, where `.no-print` elements are hidden). Saved Library copies keep their dismissed rows and rebuild a working restore bar on open (start-dismissed rows are not re-hidden).

### Multi-mode WYSIWYG — selection ring and empty-slot dimming

These two patterns are subtle but important to get right.

#### Selection ring

Use **`box-shadow: inset`** on the `.sheet` element itself — not `::after` on the wrap, not an outer shadow:

```css
.multi-wysiwyg-page .multi-thumb-wrap.selected-thumb .sheet {
  box-shadow: inset 0 0 0 4px var(--lpr-gold) !important;
}
```

Why:
- **Outer shadow** clips at the `overflow:hidden` WYSIWYG container — slots at `top:0` lose the top edge.
- **`::after` pseudo-element** is painted above the element's own inset box-shadow in CSS stacking order — an overlay `::after` would cover the ring.
- **Inset shadow on `.sheet`** paints above the background but below children; it rotates with the sheet for rotated slots; it is never clipped because it stays inside the element.

Add `z-index: 10` to the wrap so the selected slot paints above its neighbors:
```css
.multi-wysiwyg-page .multi-thumb-wrap.selected-thumb { z-index: 10; }
```

#### Empty-slot dimming

Use **CSS background-image layering** — do NOT apply `opacity` to the `.sheet` element:

```css
#multi-wysiwyg-page .multi-thumb-wrap[data-empty] .sheet {
  background-image: linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)),
                    url('assets/ps3817-form.png') !important;
}
/* also dim any pre-filled child text (overlay-from etc.) */
#multi-wysiwyg-page .multi-thumb-wrap[data-empty] .sheet .overlay-from,
#multi-wysiwyg-page .multi-thumb-wrap[data-empty] .sheet .overlay-to {
  opacity: 0.15;
}
```

Why not `opacity: 0.15` on `.sheet`: the inset box-shadow is a property of the element and is multiplied by the element's own opacity — the gold ring would appear at 15% strength (invisible). Background-image layering dims the visual without touching element opacity, so the inset ring stays full-strength gold even on empty selected slots.

Why not `::after` white overlay: same stacking-order problem as the selection ring — `::after` paints above the inset shadow, covering the ring.

#### Cut lines

Cut lines in multi-mode WYSIWYG should be **print-only**. Do not add a screen rule that shows `.multi-cut` elements in the preview. They do not align with the gold selection rings (different coordinate systems) and create visual noise. The `@media print` rule handles them:
```css
.mode-multi .multi-cut { display:block !important; }
```

### Library thumbnails for saved templates

`buildLibraryCards()` in `index.html` must look up the parent template's thumb HTML and use it for the saved copy's card thumbnail. It does this by scanning all `.card[href]` elements to build a `thumbMap` (filename → `.thumb` innerHTML), then looking up `t.base` (the parent template href) in that map. Do not hardcode a generic `mini-letter` fallback as the only thumbnail — saved templates should inherit their parent's visual identity.

### Export behavior

| Export type | Stylesheet handling |
|-------------|-------------------|
| **Print** | Browser uses live DOM — CSS vars resolve via `brand.css` in the `<link>` |
| **PDF / PNG** | html2canvas captures the rendered page (jsPDF wraps it for PDF) — vars already resolved by the browser. One page/file per visible sheet; page-flow layout is frozen during capture |
| **HTML** | `exportHtml()` inlines all local `<link rel="stylesheet">` files when served over http(s) (under `file://` they become absolute links), so vars resolve without needing `brand.css`. Static: scripts and screen-only UI removed, multi-page letters keep their pages |
| **Save As / Library** | `buildSaveHtml()` uses the same shared prep (`pageDirUrl`, `stripSnapshotCommon`, `inlineStylesheets`, `absolutizeAssets`), keeps scripts, adds a `<base href>`, and saves multi-page letters as one continuous letter |

---

*Update this file when major features are added or changed.*
