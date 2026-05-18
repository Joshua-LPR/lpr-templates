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
6. [File Structure](#file-structure)
7. [Hosting & Deployment](#hosting--deployment)
8. [Browser Storage Notes](#browser-storage-notes)
9. [Future Considerations](#future-considerations)

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
2. Click **Edit** in the top toolbar → all text becomes editable
3. Click any field and type to replace placeholders
4. Click **Export ▾** → PDF, PNG, or HTML
5. Or click **Save As** → save your filled-in copy to your personal Library
6. **Print** still works for paper printing or browser-native save-as-PDF

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
| **Letterhead** | US Letter | Clean letterhead (no watermark). |
| **Letterhead with Watermark** | US Letter | Same letterhead, ghosted logo behind body text. |
| **Letter Watermark** | US Letter | Bulk pre-printable background. Top brand band + watermark + foot stripe. |
| **Envelope** | 9.5″ × 4.125″ | #10 size. Minimal ivory layout. Includes on-screen print-shop spec. |
| **Envelope — With Stripe** | 9.5″ × 4.125″ | Bolder variant with royal-blue side stripe. |
| **Mailing Labels** | Avery 5160 | 30 labels per sheet (return-address). |
| **Lease Cover Page** | US Letter | Branded title sheet with property/landlord/tenant blanks. |

### Property Management

| Template | Notes |
|----------|-------|
| **Notice Template — Blank** | Reusable shell. Placeholders for category, title, body. |
| **24-Hour Notice of Entry** | MD-law required entry notice. Date/time/reason/entrants. Legal footer. |
| **Rent Increase Notice** | Renewal letter with new monthly rent and effective date. |
| **Non-Renewal Notice** | Lease will not renew. Vacate-by date and forwarding address request. |
| **Security Deposit — Returned** | Full deposit + interest refunded, check enclosed. |
| **Security Deposit — Partial Refund** | Portion withheld for outstanding balance, balance refunded. |
| **Security Deposit — Withheld** | Full deposit applied to outstanding ledger, remaining balance owed. |
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

### Signature upload

- "My signature" panel on the index → upload JPG or PNG
- Auto-crops whitespace, resizes to ≤800px wide
- Saved as base64 data URL in localStorage (per-user)
- Auto-inserted into every `.signature` slot in letter templates
- `mix-blend-mode: multiply` makes JPG white backgrounds disappear on white pages
- **Drag to position + resize** in Edit mode — drag the signature to move it, drag the blue handle at the bottom-right corner to resize (aspect ratio preserved). Both position and size are saved per-template per-user. Signature adjustments save automatically and do **not** trigger the unsaved-changes prompt.

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
| **Edit** | Toggles `contenteditable` on the entire page so any text can be retyped |
| **Export → PDF** | Saves a real PDF in the page's exact dimensions (html2pdf.js) |
| **Export → Image** | Saves a 2× resolution PNG (html-to-image). Multi-sheet templates export as multiple files. |
| **Export → HTML** | Saves a self-contained HTML copy with absolute asset paths |
| **Save As** | Saves filled-in template to current user's Library |
| **Print** | Browser-native print dialog (paper or system PDF) |

### Unsaved-changes guard

When you've made text edits, attempting to navigate away triggers a modal:

- **Stay on page** — cancel
- **Discard** — leave without saving
- **Save to Library** — opens Save As flow

Tab close / refresh triggers the browser's native "are you sure?" warning.

Signature position/size adjustments auto-save to localStorage and do **not** count as unsaved edits.

### Library (custom-saved templates)

The Library section at the bottom of the index holds copies you've saved with **Save As**. Each library item:
- Stores the full HTML snapshot in localStorage
- Opens via a temporary blob URL (not from a real file)
- Can be opened, edited again, exported, or deleted (× button)
- Captures the signature position and any text edits at save time

### Backup & Restore

The **Backup & Restore** panel (above the usage instructions on the index):

- **Download backup** — exports every `lpr_*` localStorage key (all users on this browser) as a single JSON file
- **Restore from backup** — picks a JSON file, validates, asks for confirmation, then overwrites current data

**Recommended:** download a backup periodically and stash a copy in Google Drive or email it to yourself. localStorage can be wiped by "Clear cookies and other site data."

### Full Reset

The red **Reset Everything** button at the very bottom of the index clears all customizations for **all users** on this browser and reloads. Template files themselves are not affected. Two confirmations required.

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
├── Lease Cover.html
├── Email Signature.html
├── 24-Hour Notice.html
├── Notice Template.html
├── Rent Increase Notice.html
├── Non-Renewal Notice.html
├── Security Deposit Returned.html
├── Security Deposit Partial Refund.html
├── Security Deposit Withheld.html
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
  <script src="template-tools.js"></script><!-- toolbar (Edit/Export/Save As) -->
</body>
```

The index also loads Sortable.js for drag-and-drop and inline scripts for the library, backup, and customization UI.

---

## Hosting & Deployment

### GitHub Pages (current setup)

1. Public repository at `github.com/joshua-lpr/lpr-templates`
2. Pages enabled in **Settings → Pages → Source: Deploy from a branch → Branch: main → /(root)**
3. Live at `https://joshua-lpr.github.io/lpr-templates/`

### Updating

1. Receive updated files (or pull from this README's "version" tag)
2. On GitHub: **Add file → Upload files** → drag new versions → commit
3. Updates go live in ~60 seconds

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

*This document was generated as part of the brand template system. Update when major features change.*
