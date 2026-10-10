# Architecture

Resume Studio is a static client application with no build step and no runtime packages. Static deployment works on GitHub Pages, including repository subpaths. System fonts avoid third-party requests and allow offline use.

## Data ownership

The version-1 workspace contains `schemaVersion`, `master`, `versions`, `activeId`, and `theme`. Each resume has an ID, name, personal object, summary, typed section arrays, ordered section keys, hidden section keys, custom titles, excluded entry IDs, and design settings. Entry IDs are stable across copies. The master and versions have distinct resume IDs and deeply copied data. Edits never propagate between copies. Creating from the master explicitly takes a snapshot of its current contents.

Exclusions are stored separately from entries so tailoring can retain the whole career history without printing every item. Hidden sections preserve their data and can be restored. Backup export includes the full workspace and an informational timestamp. A sample contains invented details and reserved example URLs.

## Boundaries and validation

`model.js` has no DOM dependencies. Import validates the schema, shape, unique IDs, section limits, and version limits, then constructs a clean object from allowed fields. Unsupported settings fall back to defaults; numeric controls are bounded. Text is never evaluated or interpreted as markup. Import errors leave the current workspace intact; valid imports require confirmation before replacing it. Deletion, reset, and import also retain an undo snapshot.

`render.js` creates actual DOM elements, inserts user data through `textContent` or text nodes, and allows only HTTP/HTTPS links. CSS selectors and class names come from validated template enums. Ordinary email links use an encoded mailto value. User-supplied HTML is printed literally.

`app.js` owns interactions. Rendering the editor and document are separate: input events update data immediately and debounce preview work without replacing the focused input. Saving is debounced to 250 ms and flushed on visibility changes and unload. Quota/access errors remain visible and suggest backing up. Undo snapshots group consecutive text changes and are capped at 50 in-memory states.

## Templates and printing

All five templates share a semantic header and ordered sequence of section headings and entry articles. Presentation lives in `resume.css`; no resume uses rasterized text. The single-column reading order is retained across designs. Dark application theme variables do not enter document design values.

Pagination measures the selected template at actual paper dimensions in an offscreen DOM. It reserves the selected margins, keeps headings with following content, and places ordinary entries on the next page when needed. A block taller than an entire page is split by child elements, then by words as a last resort. Preview pages are fixed A4/Letter sheets; CSS scales only the preview. Print media removes application controls, resets scaling, applies the same dimensions, and breaks between sheets. The browser print dialog handles PDF output. `beforeprint` also regenerates pages for Ctrl+P.

## Offline and deployment

The service worker precaches the local application shell. Same-origin GET requests use network-first caching with offline fallback. No resume data is sent by the application. A new release should increment the cache name; activation removes only older Resume Studio caches. Local dev uses a small HTTP server, not a production backend.

## Extending the app

Add section definitions and fields in `model.js`, then implement document formatting in `render.js`. Add template enum metadata, CSS variants, and a thumbnail for new templates. A schema change must increment `schemaVersion` and introduce an explicit migration at the validation boundary. Keep fixtures fictional.

Future AI integrations should live in a separate opt-in service module. Show the actual data and destination before asking for explicit consent; never attach automatic network behavior to an input event. No AI provider or API contract is present in the initial version.
