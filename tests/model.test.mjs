import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, createResume, duplicateResume, parseBackup, validateWorkspace, activeResume, safeUrl, formatDate, templates, clone } from '../assets/js/model.js';
test('sample is fictional and a blank resume has no professional data', () => {
  const sample = createWorkspace(); assert.equal(sample.master.personal.email, 'alex@example.com');
  const blank = createResume(); assert.equal(blank.summary, ''); assert.equal(blank.personal.name, ''); assert.ok(Object.values(blank.sections).every(s => s.length === 0));
});
test('master and tailored versions are independent, including nested entries and design', () => {
  const w = createWorkspace(); const copy = duplicateResume(w.master, 'Research CV');
  copy.personal.name = 'Changed'; copy.sections.experience[0].title = 'Researcher'; copy.design.template = 'academic'; copy.excluded.push(copy.sections.experience[0].id);
  assert.equal(w.master.personal.name, 'Alex Morgan'); assert.equal(w.master.sections.experience[0].title, 'Senior Product Designer'); assert.equal(w.master.design.template, 'classic'); assert.equal(w.master.excluded.length, 0); assert.notEqual(copy.id, w.master.id);
  w.versions[0].personal.name = 'Tailored'; assert.equal(w.master.personal.name, 'Alex Morgan');
});
test('workspace backups round trip section order, entries, hidden selections, and customization', () => {
  const w = createWorkspace(); const r = activeResume(w); r.order.reverse(); r.hidden = ['education']; r.excluded = [r.sections.experience[0].id]; r.design.paper = 'letter'; r.design.accent = '#273e65';
  assert.deepEqual(parseBackup(JSON.stringify(w)), w);
});
test('all five templates accept the shared data model without losing content', () => {
  const w = createWorkspace(); for (const t of templates) { w.master.design.template = t.id; const restored = validateWorkspace(w); assert.equal(restored.master.design.template, t.id); assert.deepEqual(restored.master.sections, w.master.sections); }
});
test('imports reject malformed JSON, unsupported schemas, invalid sections and duplicate IDs', () => {
  assert.throws(() => parseBackup('{broken'), /valid JSON/); assert.throws(() => parseBackup('{}'), /Unsupported/);
  const w = createWorkspace(); w.master.sections.skills = {}; assert.throws(() => validateWorkspace(w), /invalid entries/);
  const duplicate = createWorkspace(); duplicate.versions[0].id = duplicate.master.id; assert.throws(() => validateWorkspace(duplicate), /unique/);
  const entries = createWorkspace(); entries.master.sections.experience.push(clone(entries.master.sections.experience[0])); assert.throws(() => validateWorkspace(entries), /unique/);
  assert.throws(() => parseBackup(' '.repeat(5 * 1024 * 1024 + 1)), /limit/);
});
test('import normalizes untrusted design and section configuration', () => {
  const w = createWorkspace(); w.master.design.accent = 'red; background:url(evil)'; w.master.design.font = 'evil'; w.master.design.fontSize = 1000; w.master.order = ['__proto__', 'skills', 'skills']; w.master.hidden = ['fake'];
  const clean = validateWorkspace(w).master; assert.equal(clean.design.accent, '#31594e'); assert.equal(clean.design.font, 'Arial'); assert.equal(clean.design.fontSize, 14); assert.equal(clean.order[0], 'skills'); assert.equal(new Set(clean.order).size, 15); assert.deepEqual(clean.hidden, []);
});
test('URLs reject executable schemes while retaining ordinary web links', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///c:/private', 'not a url']) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl('https://example.com'), 'https://example.com/'); assert.equal(safeUrl('http://example.com/path'), 'http://example.com/path');
});
test('date formats are stable and incomplete dates are handled', () => {
  assert.equal(formatDate('2022-03'), 'Mar 2022'); assert.equal(formatDate('2022-03', 'long'), 'March 2022'); assert.equal(formatDate('2022-03', 'numeric'), '03/2022'); assert.equal(formatDate(''), ''); assert.equal(formatDate('2022-15'), '2022-15');
});
test('multiple custom sections survive backups and duplicate independently', () => {
  const w = createWorkspace(); const r = activeResume(w), key = 'custom-community';
  r.sections[key] = [{ id: 'entry-community', name: 'Mentoring', organization: 'Community group', date: '2024', description: 'Supported new designers.', url: '', bullets: 'Hosted portfolio reviews' }];
  r.titles[key] = 'Community impact'; r.order.push(key); r.hidden.push(key);
  assert.deepEqual(parseBackup(JSON.stringify(w)), w);
  const copied = duplicateResume(r, 'Community Resume'); copied.sections[key][0].name = 'Changed'; assert.equal(r.sections[key][0].name, 'Mentoring');
});
