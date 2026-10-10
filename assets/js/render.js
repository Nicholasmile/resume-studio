import { definitionFor, safeUrl, formatDate } from './model.js';
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function link(value, label) { const url = safeUrl(value); if (!url) return el('span', '', label || value); const a = el('a', '', label || value.replace(/^https?:\/\//, '').replace(/\/$/, '')); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function paragraphs(text, className = '') { return (text || '').split(/\n\s*\n/).filter(t => t.trim()).map(t => el('p', className, t)); }
function bullets(text) { const lines = (text || '').split('\n').map(t => t.replace(/^\s*[•*-]\s*/, '').trim()).filter(Boolean); if (!lines.length) return null; const ul = el('ul', 'resume-bullets'); lines.forEach(t => ul.append(el('li', '', t))); return ul; }
function entryNode(key, entry, resume) {
  const article = el('article', 'resume-entry');
  const row = el('div', 'entry-title-row');
  const date = value => formatDate(value, resume.design.dateFormat);
  const range = [date(entry.start), entry.current ? 'Present' : date(entry.end)].filter(Boolean).join(' – ');
  let title, meta, period;
  if (key === 'experience') { title = entry.title; meta = [entry.company, entry.location, entry.type].filter(Boolean).join(' · '); period = range; }
  else if (key === 'education') { title = entry.institution; meta = [entry.qualification, entry.field, entry.gpa && `GPA: ${entry.gpa}`].filter(Boolean).join(' · '); period = range; }
  else if (key === 'skills') { const p = el('p', 'skill-line'); p.append(el('strong', '', entry.name ? `${entry.name}: ` : ''), document.createTextNode((entry.items || '').split(/[\n,]/).map(s => s.trim()).filter(Boolean).join(' · '))); article.append(p); return article; }
  else if (key === 'certifications') { title = entry.name; meta = entry.issuer; period = date(entry.date); }
  else { title = entry.name; meta = entry.organization; period = entry.date; }
  if (title) row.append(el('h3', '', title));
  if (period) row.append(el('span', 'entry-date', period));
  if (row.childNodes.length) article.append(row);
  if (meta) article.append(el('p', 'entry-meta', meta));
  article.append(...paragraphs(entry.description));
  if (entry.technologies) article.append(el('p', 'entry-meta', entry.technologies));
  const list = bullets(entry.bullets); if (list) article.append(list);
  const links = [entry.url, entry.github].filter(Boolean);
  if (links.length) { const p = el('p', 'entry-links'); links.forEach((url, i) => { if (i) p.append(document.createTextNode(' · ')); p.append(link(url)); }); article.append(p); }
  return article;
}
function header(resume) {
  const h = el('header', 'resume-header');
  h.append(el('h1', '', resume.personal.name || 'Your name'));
  if (resume.personal.headline) h.append(el('p', 'resume-headline', resume.personal.headline));
  const contacts = el('div', 'resume-contact');
  const p = resume.personal;
  [p.location, p.phone].filter(Boolean).forEach(value => contacts.append(el('span', '', value)));
  if (p.email) { const a = el('a', '', p.email); a.href = `mailto:${encodeURIComponent(p.email)}`; contacts.append(a); }
  [p.website, p.linkedin, p.github, ...(p.links || '').split('\n')].filter(Boolean).forEach(value => contacts.append(link(value)));
  if (contacts.childNodes.length) h.append(contacts);
  return h;
}
export function resumeBlocks(resume) {
  const blocks = [header(resume)];
  for (const key of resume.order) {
    if (resume.hidden.includes(key)) continue;
    const entries = key === 'summary' ? paragraphs(resume.summary, 'summary-paragraph') : (resume.sections[key] || []).filter(e => !resume.excluded.includes(e.id) && Object.entries(e).some(([k, v]) => k !== 'id' && k !== 'current' && typeof v === 'string' && v.trim())).map(entry => entryNode(key, entry, resume));
    if (!entries.length) continue;
    const heading = el('h2', 'resume-section-title', resume.titles[key] || definitionFor(key).title); heading.dataset.keepNext = 'true';
    blocks.push(heading, ...entries);
  }
  return blocks;
}
export function applyDesign(node, design) {
  node.className = `resume-page template-${design.template} headings-${design.heading}`;
  node.style.setProperty('--resume-font', design.font);
  node.style.setProperty('--resume-size', `${design.fontSize}pt`);
  node.style.setProperty('--resume-accent', design.accent);
  node.style.setProperty('--resume-leading', design.lineHeight);
  node.style.setProperty('--section-gap', `${design.sectionSpacing}px`);
  node.style.setProperty('--page-margin', `${design.margin}mm`);
  node.style.setProperty('--paper-width', design.paper === 'letter' ? '215.9mm' : '210mm');
  node.style.setProperty('--paper-height', design.paper === 'letter' ? '279.4mm' : '297mm');
}
// Split only entries that exceed a whole page; ordinary entries stay together.
function splitLargeBlock(block, available, measuringContent) {
  const measureHeight = node => { measuringContent.replaceChildren(node); measuringContent.style.height = 'auto'; const height = measuringContent.scrollHeight; measuringContent.style.height = ''; return height; };
  // Preserve ancestor padding, list indentation, and margins while measuring
  // nested fragments. Measuring a bare bullet would overestimate its width.
  function split(node, wrap = part => part) {
    const shell = () => { const part = node.cloneNode(false); delete part.dataset.keepNext; return part; };
    const result = [];
    const structural = node.children.length && [...node.childNodes].every(child => child.nodeType === 1 || !child.textContent.trim());
    if (structural) {
      let fragment = shell();
      for (const child of [...node.children]) {
        const trial = fragment.cloneNode(true); trial.append(child.cloneNode(true));
        if (measureHeight(wrap(trial)) <= available) fragment.append(child.cloneNode(true));
        else {
          if (fragment.childNodes.length) result.push(wrap(fragment));
          fragment = shell();
          const solo = shell(); solo.append(child.cloneNode(true));
          if (measureHeight(wrap(solo)) <= available) fragment.append(child.cloneNode(true));
          else result.push(...split(child, part => { const parent = shell(); parent.append(part); return wrap(parent); }));
        }
      }
      if (fragment.childNodes.length) result.push(wrap(fragment));
      return result;
    }
    const words = node.textContent.split(/\s+/).filter(Boolean);
    let start = 0;
    while (start < words.length) {
      let low = start + 1, high = words.length, end = low;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2), part = shell(); part.textContent = words.slice(start, middle).join(' ');
        if (measureHeight(wrap(part)) <= available) { end = middle; low = middle + 1; } else high = middle - 1;
      }
      const part = shell(); part.textContent = words.slice(start, end).join(' '); result.push(wrap(part)); start = end;
    }
    return result;
  }
  return split(block);
}
export function renderPages(resume, container, measureContainer) {
  const page = el('div'); applyDesign(page, resume.design);
  const content = el('div', 'resume-content'); page.append(content); measureContainer.replaceChildren(page);
  const available = content.clientHeight - 2;
  const raw = resumeBlocks(resume), blocks = [];
  for (const block of raw) {
    content.replaceChildren(block);
    if (content.scrollHeight > available + 2) blocks.push(...splitLargeBlock(block, available, content).map(part => { part.dataset.splittable = 'true'; return part; })); else blocks.push(block);
  }
  content.replaceChildren();
  const pages = []; let current = [];
  const commit = () => { if (current.length) pages.push(current); current = []; content.replaceChildren(); };
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    content.append(block);
    const next = blocks[i + 1];
    const flexibleNext = block.dataset.keepNext && next?.dataset.splittable;
    if (block.dataset.keepNext && next && !flexibleNext) content.append(next.cloneNode(true));
    let over = content.scrollHeight > available + 2;
    if (flexibleNext) { content.style.height = 'auto'; over = available - content.scrollHeight < available * .2; content.style.height = ''; }
    if (block.dataset.keepNext && next && !flexibleNext) content.lastChild.remove();
    if (over && current.length) {
      block.remove();
      content.style.height = 'auto'; const remaining = available - content.scrollHeight; content.style.height = '';
      if (block.dataset.splittable && remaining >= available * .2) {
        const parts = splitLargeBlock(block, remaining - 2, content).map(part => { part.dataset.splittable = 'true'; return part; });
        content.replaceChildren(...current); blocks.splice(i, 1, ...parts); i--; continue;
      }
      commit(); content.append(block);
    }
    current.push(block);
  }
  commit();
  container.replaceChildren(...pages.map((children, index) => {
    const wrapper = el('div', 'page-wrapper'), sheet = el('div'); applyDesign(sheet, resume.design);
    sheet.setAttribute('aria-label', `Resume page ${index + 1}`);
    const body = el('div', 'resume-content'); body.append(...children); sheet.append(body);
    const number = el('span', 'printed-page-number', `${index + 1}`); sheet.append(number); wrapper.append(sheet); return wrapper;
  }));
  return pages.length;
}
