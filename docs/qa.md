# Verification

Verified locally on October 10, 2026 using Node.js 24 and installed Chromium-based Microsoft Edge through Playwright. The application has no runtime dependencies.

## Automated model checks

`npm test` passes all nine tests:

- Blank defaults and fictional sample data.
- Deep independence of master profile, versions, entries, exclusions, and design.
- Backup round trip, including ordering, visibility, exclusions, and customization.
- Shared data preservation across all five templates.
- Malformed JSON, unsupported schema, invalid sections, duplicate IDs, and oversized backup rejection.
- Sanitization of unknown design settings and section configuration.
- Rejection of executable/file/data URL schemes.
- Stable date formatting and incomplete dates.
- Multiple custom section backup and duplication.

## Browser workflows

`tests/browser.mjs` completes successfully against a running local server. It uses an isolated temporary browser profile and fictional data. It verifies:

- Editing and real-time preview; persistence after reload.
- Add/delete work entries; confirmation; undo and redo.
- Literal rendering of user-supplied markup without creating elements.
- Section reordering and all five template switches without content loss or page overflow.
- Blank creation, rename, deletion, duplicate versions, and independence from the original and master.
- Entry selection for a tailored resume.
- A 300-repeat summary preserved across multiple pages, including words that straddle page boundaries.
- A 250-repeat single achievement retained across pages with actual nested bullet indentation.
- A4/Letter switching; exported PDF page count matches preview.
- JSON download, successful restore, and invalid JSON error handling.
- Dark workspace with white document pages.
- Multiple custom sections, heading editing, and resume rendering.
- Service worker controlled offline reload with local data intact.
- 390 × 844 mobile viewport, editor/preview switching, and no outer horizontal overflow.
- Confirmed reset to a blank one-page resume.
- No uncaught browser exceptions.

Run with the preview server active:

```sh
npm start
node tests/browser.mjs
```

Install Playwright separately for browser QA. `PLAYWRIGHT_PACKAGE` accepts an absolute path to its `index.mjs`; `BROWSER_CHANNEL` defaults to `msedge`; `TEST_URL` defaults to the localhost server on port 4173. On sandboxed Windows environments, the server and browser process may require permitted execution outside the sandbox to communicate over loopback.

## Actual PDF checks

Generated `tests/output/one-page-a4.pdf` and `tests/output/multipage-letter.pdf` using the browser's real print pipeline. `tests/pdf-check.py` passes using `pypdf`:

- Exactly one A4 page at approximately 595 × 842 PDF points.
- Seven US Letter pages at 612 × 792 PDF points.
- All 300 long-summary repetitions remain selectable/extractable.
- Web/email link annotations remain present.
- No application controls appear in the PDF.
- No blank or isolated-heading pages in the multipage fixture.

Rendered representative exported A4 and Letter pages with Poppler and visually checked margins, readable type, page numbering, content boundaries, and absence of clipping. Reviewed actual desktop, mobile editor, mobile preview, and dark theme screenshots. Temporary PDF/image artifacts stay in the ignored `tests/output/` folder.

To repeat PDF inspection after the browser suite:

```sh
python tests/pdf-check.py
pdftoppm -f 1 -singlefile -png tests/output/one-page-a4.pdf tests/output/a4
pdftoppm -f 2 -singlefile -png tests/output/multipage-letter.pdf tests/output/letter-page2
```

## Verification boundaries

Firefox, Safari, actual mobile hardware, third-party ATS systems, and OS-specific interactive print dialogs have not been tested. The checks use real browser PDF generation, but the final user's Save as PDF settings remain under browser control. GitHub Pages runs the model tests before deploying; public deployment verification is separate from the local browser checks above. Quota/access failure handling is implemented but actual browser quota exhaustion is not forced by the workflow suite. Undo history is deliberately session-only.
