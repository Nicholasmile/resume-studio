import { STORAGE_KEY, createWorkspace, createResume, activeResume, duplicateResume, parseBackup, sectionDefinitions, definitionFor, personalFields, genericFields, templates, uid, safeUrl } from './model.js';
import { el, renderPages } from './render.js';
const $ = id => document.getElementById(id);
let workspace, storageIssue = false;
try { const saved = localStorage.getItem(STORAGE_KEY); workspace = saved ? parseBackup(saved) : createWorkspace(); }
catch { workspace = createWorkspace(); storageIssue = true; }
let tab = 'content', zoom = .75, pageIndex = 0, totalPages = 1, renderTimer, saveTimer, toastTimer, historyTimer;
let undoStack = [], redoStack = [], grouped = false;
let openSections = new Set(['personal']);
let sectionToAdd = 'publications';
const titles = { content: 'Your story, on paper.', templates: 'Find your fit.', design: 'The finishing touches.', versions: 'One story. Many chapters.' };
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 5000); }
function confirmAction(title, message) {
  const dialog = $('confirm-dialog'); $('confirm-title').textContent = title; $('confirm-message').textContent = message;
  return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.showModal(); });
}
function checkpoint(group = false) {
  if (!group || !grouped) { undoStack.push(JSON.stringify(workspace)); if (undoStack.length > 50) undoStack.shift(); redoStack = []; }
  grouped = group; clearTimeout(historyTimer); if (group) historyTimer = setTimeout(() => grouped = false, 700); historyButtons();
}
function historyButtons() { $('undo').disabled = !undoStack.length; $('redo').disabled = !redoStack.length; }
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); $('save-status').textContent = 'Saved on this device'; storageIssue = false; }
  catch { $('save-status').textContent = 'Saving unavailable — back up JSON'; if (!storageIssue) toast('Browser storage is unavailable or full. Export a JSON backup to keep your work.'); storageIssue = true; }
}
function changed(rebuild = false) {
  $('save-status').textContent = 'Saving…'; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 250);
  clearTimeout(renderTimer); renderTimer = setTimeout(renderPreview, 100);
  if (rebuild) renderEditor(); historyButtons();
}
function mutate(fn, rebuild = true) { checkpoint(); fn(); changed(rebuild); }
function undo(redo = false) {
  const source = redo ? redoStack : undoStack, dest = redo ? undoStack : redoStack;
  if (!source.length) return;
  dest.push(JSON.stringify(workspace)); workspace = JSON.parse(source.pop()); grouped = false;
  renderAll(); persist();
}
function button(text, className, action, aria) { const b = el('button', className, text); b.type = 'button'; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', action); return b; }
function note(text, cls = 'panel-description') { return el('p', cls, text); }
function field([key, label, type = 'text', hint], value, setter, options = {}) {
  const wrapper = el('label', `field${type === 'checkbox' ? ' checkbox' : ''}`), caption = el('span', '', label);
  const input = document.createElement(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
  const inputId = `field-${uid()}`; input.id = inputId; wrapper.htmlFor = inputId; caption.id = `${inputId}-label`; input.setAttribute('aria-labelledby', caption.id);
  if (input.tagName === 'INPUT') input.type = type;
  if (options.choices) options.choices.forEach(([v, text]) => { const opt = el('option', '', text); opt.value = v; input.append(opt); });
  if (type === 'checkbox') input.checked = value === true; else input.value = value ?? '';
  if (type === 'url') { input.placeholder = 'https://'; hint = hint || 'Use a full https:// or http:// URL.'; }
  if (type === 'email') input.placeholder = 'you@example.com';
  if (type === 'range') { input.min = options.min; input.max = options.max; input.step = options.step || 1; caption.textContent += ` · ${value}${options.unit || ''}`; }
  if (key === 'end' && options.current) input.disabled = true;
  if (type === 'text' || type === 'textarea') input.maxLength = type === 'textarea' ? 100000 : 20000;
  if (options.autocomplete) input.autocomplete = options.autocomplete;
  input.addEventListener(type === 'checkbox' || type === 'select' ? 'change' : 'input', () => {
    checkpoint(true);
    const next = type === 'checkbox' ? input.checked : type === 'range' ? Number(input.value) : input.value;
    setter(next); if (type === 'range') caption.textContent = `${label} · ${next}${options.unit || ''}`;
    changed(key === 'current');
  });
  if (type === 'checkbox') wrapper.append(input, caption); else wrapper.append(caption, input);
  if (hint) { const help = el('small', '', hint); help.id = `${inputId}-hint`; input.setAttribute('aria-describedby', help.id); wrapper.append(help); }
  if (['email', 'url'].includes(type)) {
    const error = el('small', 'field-error'); error.id = `${inputId}-error`; error.hidden = true; input.setAttribute('aria-errormessage', error.id); wrapper.append(error);
    const validate = () => {
      input.setCustomValidity(type === 'url' && input.value && !safeUrl(input.value) ? 'Enter a full http:// or https:// URL.' : '');
      const invalid = !input.validity.valid; input.setAttribute('aria-invalid', String(invalid)); error.hidden = !invalid; error.textContent = invalid ? type === 'email' ? 'Enter a valid email address, or leave this field blank.' : 'Enter a full http:// or https:// URL, or leave this field blank.' : '';
    };
    input.addEventListener('input', validate); input.addEventListener('blur', validate); validate();
  }
  return wrapper;
}
function appendVersion(version) {
  if (workspace.versions.length >= 100) { toast('You have reached the 100-version limit. Delete an unused version to create another.'); return; }
  workspace.versions.push(version); workspace.activeId = version.id;
}
function sectionCard(key, title, number, count) {
  const card = el('details', 'section-card'); card.open = openSections.has(key);
  const summary = el('summary'); summary.append(el('span', 'section-number', String(number).padStart(2, '0')), document.createTextNode(title));
  if (count) summary.append(el('span', 'section-count', `${count} ${count === 1 ? 'entry' : 'entries'}`));
  card.append(summary); card.addEventListener('toggle', () => card.open ? openSections.add(key) : openSections.delete(key));
  const body = el('div', 'section-body'); card.append(body); return { card, body };
}
function downloadJSON() {
  persist(); const blob = new Blob([JSON.stringify({ ...workspace, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = el('a'); a.href = url; a.download = `Resume_Studio_Backup_${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Backup exported. Keep it somewhere safe.');
}
function sectionManagement(key, resume) {
  const bar = el('div', 'section-manage'), label = el('label'); const check = el('input'); check.type = 'checkbox'; check.checked = !resume.hidden.includes(key);
  check.addEventListener('change', () => mutate(() => { resume.hidden = check.checked ? resume.hidden.filter(k => k !== key) : [...resume.hidden, key]; }, false));
  label.append(check, document.createTextNode('Show on resume')); bar.append(label);
  const index = resume.order.indexOf(key);
  const move = direction => mutate(() => { const to = index + direction; [resume.order[index], resume.order[to]] = [resume.order[to], resume.order[index]]; });
  const up = button('↑', '', () => move(-1), `Move ${resume.titles[key] || definitionFor(key).title} up`); up.disabled = index === 0;
  const down = button('↓', '', () => move(1), `Move ${resume.titles[key] || definitionFor(key).title} down`); down.disabled = index === resume.order.length - 1;
  bar.append(up, down); return bar;
}
function contentEditor(container, resume) {
  if (resume.personal.email === 'alex@example.com') { const banner = el('div', 'sample-note'); banner.append(document.createTextNode('Exploring a fictional sample'), button('Start blank ↗', 'text-button', () => resetResume())); container.append(banner); }
  container.append(note('Make your experience count. Open a section to edit; your preview updates as you go.', 'intro-note'));
  const personal = sectionCard('personal', 'Personal information', 1);
  personal.body.append(note('Start with the essentials. Let people know who you are.', 'section-hint'));
  for (const definition of personalFields) personal.body.append(field(definition, resume.personal[definition[0]], value => resume.personal[definition[0]] = value));
  container.append(personal.card);
  let visibleNumber = 2;
  for (const key of resume.order) {
    if (!['summary', 'experience', 'education', 'skills', 'projects', 'certifications'].includes(key) && !key.startsWith('custom-') && !resume.sections[key].length && !openSections.has(key) && !resume.titles[key]) continue;
    const definition = definitionFor(key), card = sectionCard(key, resume.titles[key] || definition.title, visibleNumber++, resume.sections[key]?.length);
    if (key === 'summary') card.body.append(field(['summary', 'Professional summary', 'textarea', 'Separate paragraphs with an empty line.'], resume.summary, value => resume.summary = value));
    else {
      if (!resume.sections[key].length) card.body.append(note(`Your ${definition.title.toLowerCase()} will appear here. Add your first ${definition.singular} to get started.`, 'empty-state'));
      resume.sections[key].forEach((entry, index) => {
        const item = el('div', 'entry-editor'), top = el('div', 'entry-top');
        top.append(el('strong', '', `${definition.singular[0].toUpperCase() + definition.singular.slice(1)} ${index + 1}`));
        const actions = el('div');
        const move = direction => mutate(() => { const entries = resume.sections[key]; [entries[index], entries[index + direction]] = [entries[index + direction], entries[index]]; });
        const up = button('↑', 'icon-button', () => move(-1), 'Move entry up'); up.disabled = index === 0;
        const down = button('↓', 'icon-button', () => move(1), 'Move entry down'); down.disabled = index === resume.sections[key].length - 1;
        actions.append(up, down, button('×', 'icon-button', async () => {
          if (await confirmAction('Delete this entry?', 'This entry will be removed from this resume. You can undo this change.')) mutate(() => { resume.sections[key].splice(index, 1); resume.excluded = resume.excluded.filter(id => id !== entry.id); });
        }, `Delete ${definition.singular} ${index + 1}`)); top.append(actions); item.append(top);
        if (resume.id !== workspace.master.id) item.append(field(['included', 'Include in this version', 'checkbox'], !resume.excluded.includes(entry.id), value => { resume.excluded = value ? resume.excluded.filter(id => id !== entry.id) : [...resume.excluded, entry.id]; }));
        for (const f of definition.fields || genericFields) item.append(field(f, entry[f[0]], value => entry[f[0]] = value, { current: entry.current }));
        card.body.append(item);
      });
      card.body.append(button(`+ Add ${definition.singular}`, 'add-entry', () => mutate(() => {
        if (resume.sections[key].length >= 500) { toast('This section has reached its 500-entry limit.'); return; }
        const entry = { id: uid() }; for (const [key, , type] of definition.fields || genericFields) entry[key] = type === 'checkbox' ? false : '';
        resume.sections[key].push(entry); openSections.add(key);
      })));
    }
    if (key === 'custom' || key.startsWith('custom-')) card.body.append(field(['title', 'Section heading'], resume.titles[key] || definition.title, value => { resume.titles[key] = value; card.card.querySelector('summary').childNodes[1].textContent = value || definition.title; }));
    card.body.append(sectionManagement(key, resume)); container.append(card.card);
  }
  const picker = el('div', 'section-picker'), select = el('select'); select.setAttribute('aria-label', 'Additional section');
  Object.entries(sectionDefinitions).filter(([key]) => !['summary', 'experience', 'education', 'skills', 'projects', 'certifications'].includes(key)).forEach(([key, value]) => { const o = el('option', '', value.title); o.value = key; select.append(o); });
  select.value = sectionToAdd; select.addEventListener('change', () => sectionToAdd = select.value);
  picker.append(select, button('+ Add section', '', () => mutate(() => {
    let key = select.value;
    if (key === 'custom' && (resume.titles.custom || resume.sections.custom.length || openSections.has('custom'))) {
      const customCount = Object.keys(resume.sections).filter(k => k.startsWith('custom-')).length;
      if (customCount >= 20) { toast('You can add up to 20 extra custom sections.'); return; }
      key = `custom-${uid()}`; resume.sections[key] = []; resume.order.push(key); resume.titles[key] = `Custom section ${customCount + 2}`;
    } else resume.titles[key] ||= definitionFor(key).title;
    openSections.add(key);
  }))); container.append(picker);
  container.append(button('Reset this resume', 'text-button', resetResume));
  const backups = el('div', 'mobile-backup'); backups.append(button('↓ Back up JSON', 'text-button', downloadJSON), button('↑ Import JSON', 'text-button', () => $('import-file').click())); container.append(backups);
  container.append(note('Saved locally in this browser. Export a backup before clearing browser data. No information leaves your device.', 'storage-note intro-note'));
}
function templatesEditor(container, resume) {
  container.append(note('Five considered layouts. The same story, a different first impression. Switching keeps all your content.'));
  templates.forEach(template => {
    const card = button('', `template-card${resume.design.template === template.id ? ' selected' : ''}`, () => mutate(() => resume.design.template = template.id));
    card.setAttribute('aria-pressed', String(resume.design.template === template.id));
    const mini = el('div', `mini-sheet ${template.id}`); mini.setAttribute('aria-hidden', 'true'); mini.append(el('div', 'mini-name', 'Alex Morgan'));
    ['short', 'title', '', '', 'short', 'title', '', '', 'short'].forEach(cls => mini.append(el('i', `mini-line ${cls}`)));
    const info = el('div'); info.append(el('strong', '', template.name), el('small', '', template.tag), el('small', '', template.description)); card.append(mini, info); container.append(card);
  });
  container.append(note('All layouts use selectable text and a consistent reading order. For automated screening, Classic Professional is a straightforward starting point.', 'intro-note'));
}
function designEditor(container, resume) {
  const d = resume.design, set = key => value => d[key] = value;
  container.append(note('Small details, a polished result. These settings belong to this resume only.'));
  const typography = el('div', 'design-group'); typography.append(el('h2', '', 'Typography'));
  typography.append(field(['font', 'Font family', 'select'], d.font, set('font'), { choices: ['Arial', 'Georgia', 'Verdana', 'Times New Roman'].map(x => [x, x]) }), field(['fontSize', 'Body text size', 'range'], d.fontSize, set('fontSize'), { min: 8, max: 14, step: .5, unit: ' pt' }), field(['heading', 'Heading style', 'select'], d.heading, set('heading'), { choices: [['uppercase', 'UPPERCASE'], ['title', 'Title case']] })); container.append(typography);
  const colour = el('div', 'design-group'); colour.append(el('h2', '', 'A signature colour'));
  const swatches = el('div', 'swatches'); ['#31594e', '#273e65', '#633e59', '#865135', '#333333'].forEach(c => { const swatch = button('', `swatch${c === d.accent ? ' selected' : ''}`, () => mutate(() => d.accent = c), `Use accent ${c}`); swatch.style.background = c; swatch.setAttribute('aria-pressed', String(c === d.accent)); swatches.append(swatch); }); colour.append(swatches, field(['accent', 'Custom accent', 'color'], d.accent, set('accent'))); container.append(colour);
  const layout = el('div', 'design-group'); layout.append(el('h2', '', 'Room to breathe'));
  layout.append(field(['lineHeight', 'Line spacing', 'range'], d.lineHeight, set('lineHeight'), { min: 1, max: 2, step: .05 }), field(['sectionSpacing', 'Section spacing', 'range'], d.sectionSpacing, set('sectionSpacing'), { min: 6, max: 32, unit: ' px' }), field(['margin', 'Page margins', 'range'], d.margin, set('margin'), { min: 10, max: 28, unit: ' mm' }), field(['paper', 'Paper size', 'select'], d.paper, set('paper'), { choices: [['a4', 'A4 · 210 × 297 mm'], ['letter', 'US Letter · 8.5 × 11 in']] }), field(['dateFormat', 'Date format', 'select'], d.dateFormat, set('dateFormat'), { choices: [['short', 'Mar 2022'], ['long', 'March 2022'], ['numeric', '03/2022']] })); container.append(layout);
  container.append(note('Dark mode changes your workspace only. Your resume keeps its print colours. Choose a dark accent for clear, accessible headings.', 'intro-note'));
}
function versionsEditor(container, resume) {
  container.append(note('Keep your full history in your master profile. Create independent copies for each opportunity, then include just the entries that fit.'));
  [workspace.master, ...workspace.versions].forEach(version => {
    const isMaster = version.id === workspace.master.id;
    const card = el('div', `version-card${version.id === resume.id ? ' active' : ''}`);
    if (isMaster) card.append(el('h2', '', 'Master professional profile'));
    else { const rename = el('input', 'version-name'); rename.value = version.name; rename.maxLength = 120; rename.setAttribute('aria-label', `Rename ${version.name}`); rename.addEventListener('change', () => mutate(() => version.name = rename.value.trim() || 'Untitled resume')); card.append(rename); }
    card.append(note(isMaster ? 'Your complete career history. Versions copy this profile at creation; later changes stay independent.' : `${Object.values(version.sections).flat().filter(e => !version.excluded.includes(e.id)).length} included entries · ${templates.find(t => t.id === version.design.template).name}`, ''));
    const actions = el('div', 'version-actions'); actions.append(button(version.id === resume.id ? 'Currently editing' : 'Open', '', () => mutate(() => workspace.activeId = version.id)));
    actions.append(button(isMaster ? 'Create version' : 'Duplicate', '', () => mutate(() => appendVersion(duplicateResume(version, isMaster ? 'Tailored resume' : `${version.name} copy`)))));
    if (!isMaster) actions.append(button('Delete', '', async () => { if (await confirmAction('Delete this version?', `“${version.name}” will be deleted. Your master profile and other versions remain available.`)) mutate(() => { workspace.versions = workspace.versions.filter(v => v.id !== version.id); if (workspace.activeId === version.id) workspace.activeId = workspace.master.id; }); }));
    card.append(actions); container.append(card);
  });
  const create = el('div', 'new-version'), name = el('input'); name.placeholder = 'e.g. Research Assistant Resume'; name.maxLength = 120; name.setAttribute('aria-label', 'Name of new resume');
  create.append(name, button('+ Create from master profile', 'primary', () => mutate(() => appendVersion(duplicateResume(workspace.master, name.value.trim() || 'Tailored resume')))), button('+ Create blank resume', '', () => mutate(() => appendVersion(createResume(name.value.trim() || 'Untitled resume')))));
  container.append(create);
  if (resume.id !== workspace.master.id) {
    container.append(el('h2', 'selection-title', 'Include in this version'));
    const selections = el('div', 'selection-list');
    Object.entries(resume.sections).forEach(([key, entries]) => entries.forEach(entry => { const label = el('label'), check = el('input'); check.type = 'checkbox'; check.checked = !resume.excluded.includes(entry.id); check.addEventListener('change', () => mutate(() => { resume.excluded = check.checked ? resume.excluded.filter(id => id !== entry.id) : [...resume.excluded, entry.id]; }, false)); label.append(check, document.createTextNode(`${resume.titles[key] || definitionFor(key).title}: ${entry.title || entry.name || entry.institution || 'Untitled entry'}`)); selections.append(label); }));
    if (!selections.childNodes.length) selections.append(note('Add entries in Content to tailor this version.', 'empty-state'));
    container.append(selections);
  }
}
function renderEditor() {
  const resume = activeResume(workspace); $('panel-title').textContent = titles[tab];
  $('active-version').replaceChildren(...[workspace.master, ...workspace.versions].map(r => { const option = el('option', '', r.name); option.value = r.id; return option; })); $('active-version').value = resume.id;
  const container = $('editor-content'); container.replaceChildren();
  ({ content: contentEditor, templates: templatesEditor, design: designEditor, versions: versionsEditor })[tab](container, resume);
  document.querySelectorAll('[data-tab]').forEach(b => { const active = b.dataset.tab === tab; b.classList.toggle('active', active); b.setAttribute('aria-current', active ? 'page' : 'false'); });
  historyButtons();
}
function renderPreview() {
  const resume = activeResume(workspace), letter = resume.design.paper === 'letter';
  $('pages').style.setProperty('--paper-width', letter ? '215.9mm' : '210mm'); $('pages').style.setProperty('--paper-height', letter ? '279.4mm' : '297mm');
  totalPages = renderPages(resume, $('pages'), $('measure')); pageIndex = Math.min(pageIndex, totalPages - 1);
  $('paper-label').textContent = `${letter ? 'Letter' : 'A4'} · Print ready`; $('page-count').textContent = `${totalPages} ${totalPages === 1 ? 'page' : 'pages'}`;
  let printStyle = $('print-size'); if (!printStyle) { printStyle = el('style'); printStyle.id = 'print-size'; document.head.append(printStyle); }
  printStyle.textContent = `@page { size: ${letter ? 'letter' : 'A4'}; margin: 0; }`;
  updatePagePosition();
}
function updatePagePosition() { $('page-position').textContent = `${pageIndex + 1} / ${totalPages}`; $('previous-page').disabled = pageIndex === 0; $('next-page').disabled = pageIndex >= totalPages - 1; }
function renderAll() { document.body.classList.toggle('dark', workspace.theme === 'dark'); $('theme-toggle').setAttribute('aria-pressed', String(workspace.theme === 'dark')); renderEditor(); renderPreview(); }
function setZoom(value) { zoom = Math.max(.25, Math.min(1.5, value)); $('pages').style.setProperty('--zoom', zoom); $('zoom-value').textContent = `${Math.round(zoom * 100)}%`; }
function fitPage() { const scroll = $('preview-scroll'), available = scroll.clientWidth - 40, letter = activeResume(workspace).design.paper === 'letter'; if (available > 0) setZoom(Math.min(1, available / (letter ? 816 : 794), (scroll.clientHeight - 60) / (letter ? 1056 : 1123))); }
async function resetResume() {
  const current = activeResume(workspace);
  if (await confirmAction('Start with a blank resume?', `All content in “${current.name}” will be cleared. Other versions stay as they are. You can undo this change.`)) mutate(() => { const blank = createResume(current.name); blank.id = current.id; if (current.id === workspace.master.id) workspace.master = blank; else workspace.versions[workspace.versions.findIndex(v => v.id === current.id)] = blank; });
}
function printResume() {
  clearTimeout(renderTimer); renderPreview(); persist();
  const r = activeResume(workspace), oldTitle = document.title;
  document.title = `${r.personal.name || 'Resume'}_${r.name}`.replace(/[^\p{L}\p{N}_-]+/gu, '_');
  window.addEventListener('afterprint', () => document.title = oldTitle, { once: true });
  toast('Choose “Save as PDF”, matching paper size, no margins, and turn off browser headers and footers.');
  window.print();
}
$('active-version').addEventListener('change', e => { mutate(() => workspace.activeId = e.target.value); pageIndex = 0; });
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderEditor(); $('editor').scrollTop = 0; }));
$('theme-toggle').addEventListener('click', () => { mutate(() => workspace.theme = workspace.theme === 'dark' ? 'light' : 'dark', false); document.body.classList.toggle('dark', workspace.theme === 'dark'); $('theme-toggle').setAttribute('aria-pressed', String(workspace.theme === 'dark')); });
$('undo').addEventListener('click', () => undo()); $('redo').addEventListener('click', () => undo(true));
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) { e.preventDefault(); undo(e.shiftKey); } });
$('backup').addEventListener('click', downloadJSON); $('import-button').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Backup exceeds the 5 MB limit.');
    const next = parseBackup(await file.text());
    if (await confirmAction('Restore this workspace?', 'Import replaces your master profile and all versions. Export a backup first if you want to keep the current workspace. You can undo the import.')) { checkpoint(); workspace = next; renderAll(); persist(); toast('Workspace restored successfully.'); }
  } catch (error) { toast(error.message || 'Could not read this backup.'); }
  e.target.value = '';
});
$('zoom-in').addEventListener('click', () => setZoom(zoom + .1)); $('zoom-out').addEventListener('click', () => setZoom(zoom - .1)); $('fit-page').addEventListener('click', fitPage);
const goPage = direction => { pageIndex = Math.max(0, Math.min(totalPages - 1, pageIndex + direction)); const page = $('pages').children[pageIndex]; $('preview-scroll').scrollTo({ top: page.offsetTop - $('pages').firstElementChild.offsetTop, behavior: 'smooth' }); updatePagePosition(); };
$('previous-page').addEventListener('click', () => goPage(-1)); $('next-page').addEventListener('click', () => goPage(1));
$('preview-scroll').addEventListener('scroll', () => { const scroll = $('preview-scroll'); let nearest = 0; [...$('pages').children].forEach((page, index) => { if (page.getBoundingClientRect().top < scroll.getBoundingClientRect().top + scroll.clientHeight / 2) nearest = index; }); pageIndex = nearest; updatePagePosition(); }, { passive: true });
$('export-pdf').addEventListener('click', printResume); $('print-preview').addEventListener('click', printResume);
for (const preview of [false, true]) $(preview ? 'show-preview' : 'show-editor').addEventListener('click', () => { document.body.classList.toggle('mobile-preview', preview); $('show-preview').classList.toggle('active', preview); $('show-editor').classList.toggle('active', !preview); $('show-preview').setAttribute('aria-pressed', String(preview)); $('show-editor').setAttribute('aria-pressed', String(!preview)); if (preview) fitPage(); });
window.addEventListener('beforeunload', persist); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
window.addEventListener('resize', () => { if (window.innerWidth < 700 && document.body.classList.contains('mobile-preview')) fitPage(); });
window.addEventListener('beforeprint', renderPreview);
renderAll(); setZoom(.75); requestAnimationFrame(fitPage);
if (storageIssue) toast('Saved data could not be read. It has not been overwritten. Import a backup or export your current workspace.');
if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(() => {});
