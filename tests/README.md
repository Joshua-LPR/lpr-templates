# Browser tests

Automated checks that drive the real templates in headless Microsoft Edge —
nothing to install beyond **Node 22+** and Edge (both already on the office PCs).
They open the pages straight from this folder (`file://`), sign in a test user
in a throwaway browser profile, and never touch your own browser data.

```
node tests/run-all.mjs              # every suite (~3 min)
node tests/run-all.mjs flow sig     # only suites whose file name contains a word
node tests/page-flow.test.mjs       # one suite
```

| Suite | What it checks |
|---|---|
| `page-flow.test.mjs` | Letterhead automatic multi-page flow: page count, no clipped text, page numbers, continuation heading, edit mode, forced breaks, sign-off / paragraph-split rules, watermark, print, phone width |
| `signatures.test.mjs` | Setup → Sender signature rows: gallery / leave blank / signature line, tenant lines, alignment, persistence, long letters, Library copies |
| `exports.test.mjs` | PDF / PNG / HTML export and Save As → Library on a multi-page letter |
| `paste.test.mjs` | Clean paste from Google Docs / Word / AI / Markdown / plain text into four caret positions; pagination of pasted letters (no clipped text, numbering continues, no stranded headings); Undo; repair of already-broken letters |
| `clear.test.mjs` | Clear body / Clear all: letterhead, sign-off and signature lines untouched; date + recipient kept/removed; one empty line with the caret; one Undo restores; paste afterwards; no warning; one page |
| `fields.test.mjs` | Field chips: automatic spacing on Insert Field and on Done (no space before punctuation or after `$`; Undo/Redo take the space with the field); B / I / U / Plain / Size / Color on chips, one Undo per press, surviving Done, filling, HTML export and Save As |
| `deposit.test.mjs` | Security Deposit: calculated refund / balance / full refund (read-only, formula, blank until filled, negative-result note), in every place on the letter, after reload; wording: no em dashes, no 14-day sentence, formal phrasing, "Sincerely," |
| `header.test.mjs` | `{{badge}}` / `{{title: A \| B}}` keys: Notice Template (via Fields tab, two-line title, no leftover lines), Security Deposit (typed, fixed header), Letterhead (no header → highlighted) |
| `plan.test.mjs` | Regression from a real AI-drafted payment plan on Letterhead: dividers dropped (text + rich `<hr>`), header markers, "$" before the blank line, full address on one line, no "·" when the signer has no title |
| `tenants-ui.test.mjs` | Landlord dropdown (owners list incl. Properties + hand-added owners, "+ New owner…", survives owners-CSV re-import, shows in Sender, editor saves it); tenant import never deletes, stamps current vs past; "past" tag; merge picker Current/All + import note (amber when old) |
| `merge.test.mjs` | Mail merge: picker via the Tenants tab (building filter, tick all), N copies in name order each with its own recipient, per-copy pagination + continuation headings, shared Fields-tab values, Edit/Save As/Setup hidden, print + one-file PDF page counts, Exit restores; Envelope, Envelope Premium, Notice Template, 24-Hour Notice; no Merge on Rent Increase |
| `blank.test.mjs` | Blank forms: on paper / in PDF+PNG exports every EMPTY field on a letter or notice prints as a write-in line sized per field and date format; legal date "the ___ day of ___, 20___"; "$____" only where the letter has no "$"; signature rows + hidden rows untouched; screen unchanged; envelopes get no lines |
| `fit.test.mjs` | Every one-page letter/notice and every mode keeps its content inside the bottom margin, on screen and as a blank print (sheets clip silently). Known: TOPA page 2 (bead `wvd`) is reported, not failed |
| `addendum.test.mjs` | Utilities Addendum (chart condensed) on the shared full-size signature rows: defaults line + 1 tenant, capped at 1, fits in every sender mode incl. a gallery image, no doubled lines on a blank print |
| `formats.test.mjs` | Phase 5: 20 typed date spellings (and rejections), all five date formats + legal ordinals, money formatting, Fields-tab typing / bad input / per-field format dropdown (survives reload), smart `$` with and without a written `$`, tenant rent, `{{weekday date}}`-style keys, no date-picker popups in HTML export / Save As |
| `landlord.test.mjs` | Landlord tenant field from a (fake) Properties CSV: address matching variants, comma in an owner name, Address 2 tie-break, ambiguous + not-found stay blank, both import orders, manual landlord survives re-imports, Tenants tab UI, `{{landlord}}` filled on tenant pick, sign-off company untouched |
| `keys.test.mjs` | `{{field keys}}`: 44 spellings incl. recipient/tenant/vendor overlaps and date/time/amount/text; paste (Markdown + rich text) with bold/italic/underline carried over; values picked up from the page / Fields tab; unknown keys highlighted + listed; typed keys on Done; formatting in HTML export + Save As; Full Address (Insert Field, Undo, ", Apt 2" on screen + print); legend file in sync, AI instructions, Copy + Download. `--write` regenerates `FIELD-KEYS.md` |
| `editing.test.mjs` | Print Blank; edit-mode chips; font size + colour on any sheet; the "fields unlinked" warning stays quiet for deliberate deletions and still warns for others |
| `snapshots.test.mjs` | Save As `<base>` / asset URLs, Library-copy exports (incl. repaired old copies), standalone HTML export, `/` in URL parameters |
| `helpers.test.mjs` | Shared `LPR_UTIL` helpers in user.js give exactly the same answers as the code they replaced (saved-settings keys depend on it) |
| `optional-rows.test.mjs` | Dismiss / restore rows on 24-Hour Notice, Occupant Update, Tenancy Confirmation (screen, print, export, Save As copies) |

## Refactor safety net: `baseline.mjs`

Before changing shared code, capture how the whole site behaves today, then
compare after each step:

```
node tests/baseline.mjs capture                    # BEFORE touching code
node tests/baseline.mjs compare                    # after each change
node tests/baseline.mjs compare --expect "24-Hour Notice.html,Occupant Update.html"
```

It records, for every template: console errors, every saved setting it writes
to `localStorage` (keys **and** values — a changed key means people silently
lose saved settings), the HTML-export and Save As output, the print page
count, and screenshots of the optional-row notices. `--expect` lists templates
whose markup is meant to change in that step (their export/Save As text is
not compared; everything else still is).

Output (screenshots, PDFs, records) goes to `tests/out/`, which git ignores.
