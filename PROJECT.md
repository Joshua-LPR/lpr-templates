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
10. [Future Considerations](#future-considerations)

---

## Overview

A library of print-ready business documents and digital assets, all built on a shared brand foundation. Each template lives as its own HTML file. Customization (employee details, favorites, archive, library, signature) is per-user and stored locally in the browser via `localStorage`.

**Tech stack**
- Plain HTML, CSS, JavaScript
- No build step, no backend, no database
- Montserrat font bundled locally (works offline)
- Sortable.js loaded from CDN for drag-and-drop ordering
- html2pdf.js + html-to-image loaded from CDN on demand (only when exporting)

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
2. Click **Setup** in the top toolbar → opens the Setup panel (Sender / Tenants / Vendors tabs)
3. Pick a recipient from the Tenants or Vendors tab → click **Apply as Recipient**
4. Optionally pick a sender LLC in the Sender tab → click **Apply to Template**
5. Click **Edit** to make any free-text changes to the body
6. Click **Export ▾** → Print, PDF, Image, or HTML
7. Or click **Save As** → saves a filled-in copy to your personal Library

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
| **Logo files** | `assets/logo-cropped.png`, `assets/logo-white.png` |

Montserrat is bundled locally in `assets/fonts/` so templates render identically online and offline.

---

## Template Inventory

### Stationery

| Template | Size | Notes |
|----------|------|-------|
| **Business Card** | 3.5″ × 2″ | Personal — name, title, contact w/ icons. Brand-blue back with white logo. |
| **Business Card — Company** | 3.5″ × 2″ | No name. Centered logo + office phone, email, address. |
| **Letterhead** | US Letter | Clean letterhead with watermark. Recipient block uses contact fields (works for tenants or vendors). |
| **Letterhead Clean** | US Letter | Same layout, no watermark. |
| **Letter Watermark** | US Letter | Bulk pre-printable background with bold brand band. |
| **Envelope** | 9.5″ × 4.125″ | #10 size. Minimal ivory layout. Recipient filled via Setup panel. |
| **Envelope Premium** | 9.5″ × 4.125″ | Pre-print spec variant with refined layout. Includes print-shop spec block. |
| **Mailing Labels** | Avery 5160 | 30 labels per sheet (return-address). |
| **Address Labels — P-touch** | DK-1201 (29×90mm) | Tenant or vendor mailing labels for Brother QL-810W. Generates a `.lbt` file per recipient — opens directly in P-touch Editor, ready to print. |
| **Certificate of Mailing** | 5″ × 3″ (PS Form 3817) | Feed-and-fill overlay for USPS PS Form 3817. Calibration sliders compensate for printer margin offset. |
| **Lease Cover Page** | US Letter | Branded title sheet with property/landlord/tenant blanks. |

### Property Management

| Template | Notes |
|----------|-------|
| **Notice Template — Blank** | Reusable shell. Placeholders for category, title, body. Recipient via Setup. |
| **24-Hour Notice of Entry** | MD-law required entry notice. Date/time/reason/entrants grid. Legal footer. |
| **Rent Increase Notice** | Renewal letter with new monthly rent and effective date. |
| **Non-Renewal Notice** | Lease will not renew. Vacate-by date and forwarding address request. |
| **Security Deposit Notices** | Three variants in one file: Withheld, Partial Refund, Full Refund. Mode bar at top switches between them (same pattern as Certificate of Mailing). Save As / Export captures only the active variant via `cloneNode` override. |
| **Door Hanger** | 4.25″ × 11″ with die-cut guide. Blank lines for handwriting. |
| **Yard Sign — For Rent** | 24″ × 18″ landscape. Print-shop spec for vinyl/coroplast. |

### Digital

| Template | Notes |
|----------|-------|
| **Email Signature** | HTML signature for Gmail/Outlook. Personal/Company toggle. Logo embed (base64) or hosted URL option. |

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

Empty title is supported — `data-employee-hide-empty` collapses elements with no value.

**Snapshot preservation:** when a template is saved via Save As or exported as HTML, a `data-lpr-snapshot` attribute is stamped on the HTML clone. `employee.js` skips re-applying defaults when it detects this flag, so the signer name, title, phone, and email are preserved exactly as they were when saved.

### Signature gallery

- **Signatures** panel on the index holds a labeled gallery — store one per person or multiple styles (formal, casual, etc.)
- Click **+ Add signature** → pick JPG or PNG → prompted for a label (e.g. "Joshua", "David Mitnick", "Formal") → saved as a chip
- Click any chip to make it active; the active sig is written to `lpr_signature` and auto-inserted into every `.signature` slot in letter templates
- **Leave blank** chip (always first) clears `lpr_signature` so templates print with an empty signature line for wet signing
- × on any chip deletes that signature; if it was active, the next available sig becomes active
- Auto-crops whitespace, resizes to ≤800px wide; saved as base64 in `lpr_sigs` array (per-user)
- `mix-blend-mode: multiply` makes JPG white backgrounds disappear on white pages
- **Drag to position + resize** in Edit mode — drag the signature to move it, drag the blue handle at the bottom-right corner to resize (aspect ratio preserved). Position and size saved per-template per-user.

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
| **Edit** | Toggles `contenteditable` on the entire page so any text can be retyped. Spell check activates automatically. |
| **Export → Print** | Browser-native print dialog (paper or system PDF) |
| **Export → PDF** | Saves a real PDF in the page's exact dimensions (html2pdf.js) |
| **Export → Image** | Saves a 2× resolution PNG (html-to-image). Multi-sheet templates export as multiple files. |
| **Export → HTML** | Saves a self-contained HTML copy with absolute asset paths |
| **Save As** | Saves filled-in template to current user's Library; all field content and signer info preserved |
| **Setup** | Opens the Setup panel (Sender / Tenants / Vendors tabs) |

**Unfilled-field warning:** clicking Export or Save As when some field types are still empty shows a modal listing which namespaces will be blank. User can go back or continue anyway.

### Setup panel — Sender, Tenants, Vendors

The **Setup** button (renamed from "Fill Fields") opens a tabbed panel that appears in every template. Tab order: Sender → Tenants → Vendors.

#### Sender tab (`owners.js`)

- Lists all owner LLCs (imported from Buildium owners CSV or added manually). Default: LPR Management, LLC.
- **Include signer name** toggle — shows/hides the employee name and title in the signoff block.
- **Include title** sub-toggle — shows/hides just the title line when signer is included.
- **Use office contact** sub-toggle — replaces the signer's direct phone/email with the office line (443.402.5641 / office@lasalleparkrealty.com).
- **Apply to Template** button updates the `data-owner-field` spans and toggles CSS classes.
- Storage key: `lpr_owners` (per user).
- Selected owner and toggle states reset to defaults on each page load (they are applied manually per session).

#### Tenants tab (`tenants.js`)

- 3-layer data model: `source` (CSV import) → `overrides` (manual panel edits) → `effective` (override wins, falls back to source).
- **Import CSV** — Buildium tenant export. Smart merge: new tenants added, existing updated, overrides preserved.
- Overrides auto-cleared if re-import matches the override value. "Buildium: …" hint shown when override differs from source.
- **Apply as Recipient** — fills `data-contact-field` spans (recipient address block) AND `data-tenant-field` spans (body references).
- **Body fields only** — fills only `data-tenant-field` spans; leaves `data-contact-field` untouched for a vendor recipient.
- **+ Add** — manually create a tenant entry directly in the browser without importing a CSV. Same fields as the editor. Saved to localStorage with a generated ID (`m_<timestamp>`). Manual entries show a **Delete** button in their editor header for removal.
- **Recently used** — the last 5 applied tenants appear in a shaded section above the scrollable list. Hidden during search. Each entry has an ✕ to remove it individually. Persists across sessions.
- Storage keys: `lpr_tenants` (address book), `lpr_recent_tenants` (recent list). Both per user.

#### Vendors tab (`vendors.js`)

- Same 3-layer override model as tenants.
- Fields: name, address_line1, address_line2, city, state, zip, email1, email2, phone, mobile.
- **Import CSV** — Buildium vendor export (columns: "Vendor Name *", "Address Line 1 (optional)", etc.). ID: uses "Id (optional)" column, falls back to vendor name.
- **Apply as Recipient** — fills `data-contact-field` spans (name → combined name, address, city, state, zip, email, phone) AND `data-vendor-field` spans.
- **Body fields only** — fills only `data-vendor-field` spans.
- **+ Add** — manually create a vendor entry directly in the browser without importing a CSV. Same fields as the editor. Saved to localStorage with a generated ID (`m_<timestamp>`). Manual entries show a **Delete** button in their editor header for removal.
- **Recently used** — the last 5 applied vendors appear in a shaded section above the scrollable list. Hidden during search. Each entry has an ✕ to remove it individually. Persists across sessions.
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

### Library (custom-saved templates)

The Library section at the bottom of the index holds copies you've saved with **Save As**. Each library item:
- Stores the full HTML snapshot in localStorage (all field content baked in)
- Opens via a temporary blob URL (not from a real file)
- Can be opened, edited again, exported, or deleted (× button)
- Captures the signer name, owner selection, recipient address, and all body fields at save time
- The `data-lpr-snapshot` flag prevents `employee.js` from overwriting baked-in employee values when the saved copy is reopened

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
| `data-contact-field` | Apply as Recipient (tenant or vendor) | Recipient address block — name, address_line1, address_line2, city, state, zip, email, phone |
| `data-tenant-field` | Tenant Apply as Recipient or Body fields only | Tenant-specific body references — first_name, last_name, address_line1, lease dates, rent amount, etc. |
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

### Insert Field sidebar (Edit mode)

While in Edit mode, the Setup panel shows an **Insert Field** sidebar with three groups:
- **RECIPIENT** — inserts `data-contact-field` spans
- **TENANT — body reference** — inserts `data-tenant-field` spans
- **VENDOR — body reference** — inserts `data-vendor-field` spans (only shown when `vendors.js` is loaded)

---

## File Structure

```
lpr-templates/
├── index.html                          # Main directory page
├── users.html                          # User picker (sign-in)
├── archive.html                        # Archived templates view
│
├── brand.css                           # Shared styles + bundled Montserrat @font-face
├── user.js                             # Multi-user namespacing (loads first)
├── employee.js                         # Employee-field replacement + signature injection
├── tenants.js                          # Tenant address book, Setup panel, Insert Field sidebar
├── owners.js                           # Sender/owner tab in Setup panel
├── vendors.js                          # Vendor address book, Vendors tab in Setup panel
├── template-tools.js                   # Edit/Export/Save As + unsaved-changes guard + signature drag
│
├── Business Card.html
├── Business Card Company.html
├── Letterhead.html
├── Letterhead Clean.html
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
├── Door Hanger.html
├── Yard Sign.html
│
└── assets/
    ├── logo-cropped.png                # Full-color logo
    ├── logo-white.png                  # White version for dark backgrounds
    ├── logo-email.png                  # Email-signature optimized
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
  <script src="template-tools.js"></script><!-- toolbar (Edit/Export/Save As/Setup button) -->
</body>
```

Templates that don't use tenant/vendor/owner fields (Business Card, Email Signature, etc.) omit those scripts.

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
| Signature image | ✅ Persists (localStorage) | ✅ Baked in at save time |
| Signature position / size | ✅ Persists per template (localStorage) | ✅ Baked in at save time |

### Storage limits

- localStorage cap: ~5–10 MB per origin (varies by browser)
- Typical usage: signatures ~50KB each, library items ~50KB each, everything else ~5KB total
- A team of 5 with signatures + ~10 library items: well under 1 MB

---

## Future Considerations

If multi-device sync ever becomes important:

- **Firebase / Supabase backend** — replaces localStorage with a cloud DB tied to Google Workspace login. Requires real engineering work but provides true per-user, per-device persistence.
- **Cloudflare Pages + Access** — keep static hosting, but add login/auth for actual access control (free for ≤50 users).
- **Custom domain** — point `templates.lasalleparkrealty.com` at the GitHub Pages site for cleaner branding.

For now the system is intentionally simple — no logins, no databases, no surprises. Everything is recoverable from a backup file and `localStorage`.

---

*Update this file when major features are added or changed.*
