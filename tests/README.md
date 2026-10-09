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
