# LPR Management — Brand Templates

Print-ready stationery, notices, and digital assets for LPR Management, LLC.

## Quick Start

Open `index.html` in a browser. Click any template card to open it, then use the toolbar's **Print** button to send to a printer or save as PDF.

Set your name, title, phone, and email in the **employee picker** at the top of the index — templates open pre-filled.

## Templates

### Stationery
| Template | Format | Notes |
|---|---|---|
| Business Card | 3.5″ × 2″ · Personal | Employee name and contact, blue back |
| Business Card — Company | 3.5″ × 2″ · Company | No name, office line + address |
| Letterhead | 8.5″ × 11″ | Header, body, signature; optional watermark |
| Letterhead Clean | 8.5″ × 11″ | Simplified header, no watermark |
| Letter Watermark | 8.5″ × 11″ | Pre-printable background page |
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
| Rent Increase Notice | 8.5″ × 11″ | Renewal letter with new rent and effective date |
| Non-Renewal Notice | 8.5″ × 11″ | Vacate-by date and forwarding-address request |
| Security Deposit Notices | 8.5″ × 11″ | Three variants: Withheld, Partial Refund, Full Refund |
| Door Hanger | 4.25″ × 11″ | Die-cut notice card for door knob |
| Yard Sign — For Rent | 24″ × 18″ | Print-shop ready; H-stake spec included |

### Digital
| Template | Notes |
|---|---|
| Email Signature | Copy-paste into Gmail/Outlook |

## Setup Panel

Every letter and notice has a **Setup** button in the toolbar that opens a side panel with:

- **Tenants tab** — Import a Buildium tenant CSV, pick a tenant, and all `data-tenant-field` spans fill automatically. Manual overrides preserved across CSV re-imports.
- **Vendors tab** — Import a Buildium vendor CSV, pick a vendor, fill `data-vendor-field` spans.
- **Fields tab** — Date pickers, time pickers, dollar amounts, and free-text fields for template-specific fill-in values.

## Employee Picker

On the index page, enter a name, title, phone, and email and save as a preset. Templates open with those values pre-filled via `user.js`. Defaults to David Mitnick when blank.

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
├── brand.css             — shared design tokens and base styles
├── user.js               — employee picker (reads URL params + localStorage)
├── employee.js           — fills data-employee-field spans on load
├── tenants.js            — tenant address book + Setup panel
├── vendors.js            — vendor address book tab
├── fill-fields.js        — date/time/amount/text field pickers tab
├── template-tools.js     — Edit, Export, Save As toolbar
├── assets/               — fonts, logo files, form images
└── *.html                — individual template pages
```

## Address

1517 Reisterstown Road, 2nd Floor · Pikesville, MD 21208 · 443.402.5641
