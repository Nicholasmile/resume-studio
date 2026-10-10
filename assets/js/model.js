export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'resume-studio.workspace.v1';
export const templates = [
  { id: 'classic', name: 'Classic Professional', tag: 'Timeless & ATS friendly', description: 'A clear, confident single column. Let your experience do the talking.' },
  { id: 'modern', name: 'Modern Minimalist', tag: 'Clean & contemporary', description: 'Airy typography and a considered accent for a fresh first impression.' },
  { id: 'academic', name: 'Academic & Research', tag: 'Thoughtful & detailed', description: 'Traditional serif typography for research, publications, and academic careers.' },
  { id: 'technology', name: 'Technology Professional', tag: 'Structured & precise', description: 'Compact headings and technical clarity for builders and problem solvers.' },
  { id: 'creative', name: 'Creative Professional', tag: 'Distinctive & expressive', description: 'An expressive header with a strong visual identity and readable content.' }
];
export const sectionDefinitions = {
  summary: { title: 'Professional summary', hint: 'A few lines about what you bring to the table.' },
  experience: { title: 'Work experience', singular: 'experience', fields: [['title', 'Job title'], ['company', 'Company / organization'], ['location', 'Location'], ['type', 'Employment type'], ['start', 'Start date', 'month'], ['end', 'End date', 'month'], ['current', 'Currently working here', 'checkbox'], ['bullets', 'Responsibilities & achievements', 'textarea', 'One bullet per line']] },
  education: { title: 'Education', singular: 'qualification', fields: [['institution', 'Institution'], ['qualification', 'Qualification'], ['field', 'Field of study'], ['start', 'Start date', 'month'], ['end', 'Graduation date', 'month'], ['gpa', 'GPA / CGPA (optional)'], ['bullets', 'Academic achievements', 'textarea', 'One bullet per line']] },
  skills: { title: 'Skills', singular: 'skill group', fields: [['name', 'Group name'], ['items', 'Skills', 'textarea', 'Separate skills with commas or new lines']] },
  projects: { title: 'Projects', singular: 'project', fields: [['name', 'Project name'], ['description', 'Description', 'textarea'], ['technologies', 'Technologies'], ['url', 'Project URL', 'url'], ['github', 'GitHub repository', 'url'], ['bullets', 'Key achievements', 'textarea', 'One bullet per line']] },
  certifications: { title: 'Certifications', singular: 'certification', fields: [['name', 'Certification name'], ['issuer', 'Issuing organization'], ['date', 'Date obtained', 'month'], ['url', 'Credential URL', 'url']] },
  publications: { title: 'Publications', singular: 'publication' }, research: { title: 'Research experience', singular: 'research entry' }, volunteer: { title: 'Volunteer experience', singular: 'volunteer entry' }, leadership: { title: 'Leadership', singular: 'leadership entry' }, awards: { title: 'Awards & honours', singular: 'award' }, languages: { title: 'Languages', singular: 'language' }, memberships: { title: 'Professional memberships', singular: 'membership' }, references: { title: 'References', singular: 'reference' }, custom: { title: 'Custom section', singular: 'entry' }
};
export const genericFields = [['name', 'Title / name'], ['organization', 'Organization / context'], ['date', 'Date or period'], ['description', 'Description', 'textarea'], ['url', 'Link (optional)', 'url'], ['bullets', 'Details', 'textarea', 'One bullet per line']];
export const definitionFor = key => sectionDefinitions[key] || sectionDefinitions.custom;
export const personalFields = [['name', 'Full name'], ['headline', 'Professional headline'], ['email', 'Email address', 'email'], ['phone', 'Phone number', 'tel'], ['location', 'Location'], ['linkedin', 'LinkedIn URL', 'url'], ['github', 'GitHub URL', 'url'], ['website', 'Portfolio website', 'url'], ['links', 'Additional links', 'textarea', 'One URL per line']];
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clone = value => JSON.parse(JSON.stringify(value));
export function createResume(name = 'Untitled resume', sample = false) {
  const data = {
    id: uid(), name, personal: Object.fromEntries(personalFields.map(([key]) => [key, ''])), summary: '',
    sections: Object.fromEntries(Object.keys(sectionDefinitions).filter(key => key !== 'summary').map(key => [key, []])),
    order: Object.keys(sectionDefinitions), hidden: [], titles: {}, excluded: [],
    design: { template: 'classic', font: 'Arial', fontSize: 10.5, accent: '#31594e', lineHeight: 1.45, sectionSpacing: 16, margin: 18, heading: 'uppercase', dateFormat: 'short', paper: 'a4' }
  };
  if (sample) {
    data.personal = { name: 'Alex Morgan', headline: 'Product Designer', email: 'alex@example.com', phone: '+1 (555) 014-0286', location: 'Portland, OR', linkedin: 'https://linkedin.com/in/example', github: '', website: 'https://example.com', links: '' };
    data.summary = 'Product designer with 6+ years of experience turning complex problems into thoughtful, accessible digital experiences. I bring together research, systems thinking, and a love of craft to build products that work beautifully for people.';
    data.sections.experience = [
      { id: uid(), title: 'Senior Product Designer', company: 'Northstar Digital', location: 'Portland, OR', type: 'Full-time', start: '2022-03', end: '', current: true, bullets: 'Led end-to-end design for a B2B platform serving 12,000+ teams, improving activation by 28%.\nBuilt a design system with 60+ components, reducing design-to-development time by 35%.\nPartnered with product and engineering to translate user research into a focused product roadmap.' },
      { id: uid(), title: 'Product Designer', company: 'Studio Forma', location: 'Seattle, WA', type: 'Full-time', start: '2019-06', end: '2022-02', current: false, bullets: 'Designed web and mobile experiences for clients in education, wellness, and financial services.\nConducted 40+ user interviews and usability studies to inform evidence-based design decisions.' }
    ];
    data.sections.education = [{ id: uid(), institution: 'Pacific College of Design', qualification: 'Bachelor of Fine Arts', field: 'Interaction Design', start: '2015-09', end: '2019-05', gpa: '', bullets: 'Graduated with honours · Design Society member' }];
    data.sections.skills = [{ id: uid(), name: 'Design', items: 'Product strategy, User research, Interaction design, Prototyping, Accessibility' }, { id: uid(), name: 'Tools', items: 'Figma, FigJam, Adobe Creative Suite, HTML & CSS' }];
    data.sections.projects = [{ id: uid(), name: 'Open Path', description: 'An accessible trip-planning concept that helps people explore their city with confidence.', technologies: 'Figma, User testing', url: '', github: '', bullets: '' }];
  }
  return data;
}
export function createWorkspace(sample = true) {
  const master = createResume('Master profile', sample);
  const version = clone(master); version.id = uid(); version.name = sample ? 'Product Designer Resume' : 'My first resume';
  return { schemaVersion: SCHEMA_VERSION, master, versions: [version], activeId: version.id, theme: 'light' };
}
export function activeResume(workspace) { return workspace.activeId === workspace.master.id ? workspace.master : workspace.versions.find(r => r.id === workspace.activeId) || workspace.master; }
export function duplicateResume(resume, name) { const next = clone(resume); next.id = uid(); next.name = name; return next; }
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
function validateResume(resume) {
  if (!isObject(resume) || typeof resume.id !== 'string' || !resume.id || typeof resume.name !== 'string' || !isObject(resume.personal) || !isObject(resume.sections) || !isObject(resume.design)) throw new Error('The backup contains an invalid resume.');
  const base = createResume(resume.name);
  const result = { ...base, id: resume.id };
  const customKeys = Object.keys(resume.sections).filter(key => /^custom-[a-zA-Z0-9-]{1,80}$/.test(key));
  if (customKeys.length > 20) throw new Error('A resume can contain up to 20 additional custom sections.');
  customKeys.forEach(key => result.sections[key] = []);
  for (const [key] of personalFields) result.personal[key] = typeof resume.personal[key] === 'string' ? resume.personal[key].slice(0, 20000) : '';
  result.summary = typeof resume.summary === 'string' ? resume.summary.slice(0, 100000) : '';
  let allIds = new Set();
  for (const key of Object.keys(result.sections)) {
    const entries = resume.sections[key] ?? [];
    if (!Array.isArray(entries) || entries.length > 500) throw new Error('A resume section has too many or invalid entries.');
    result.sections[key] = entries.map(entry => {
      if (!isObject(entry) || typeof entry.id !== 'string' || !entry.id || allIds.has(entry.id)) throw new Error('Entries must have unique identifiers.');
      allIds.add(entry.id);
      const clean = { id: entry.id };
      for (const [field, , type] of definitionFor(key).fields || genericFields) {
        if (type === 'checkbox') clean[field] = entry[field] === true;
        else clean[field] = typeof entry[field] === 'string' ? entry[field].slice(0, 100000) : '';
      }
      return clean;
    });
  }
  const keys = [...Object.keys(sectionDefinitions), ...customKeys];
  result.order = [...new Set(Array.isArray(resume.order) ? resume.order.filter(k => keys.includes(k)) : [])];
  result.order.push(...keys.filter(k => !result.order.includes(k)));
  result.hidden = Array.isArray(resume.hidden) ? resume.hidden.filter(k => keys.includes(k)) : [];
  result.excluded = Array.isArray(resume.excluded) ? resume.excluded.filter(id => allIds.has(id)) : [];
  result.titles = Object.fromEntries(keys.filter(k => typeof resume.titles?.[k] === 'string').map(k => [k, resume.titles[k].slice(0, 120)]));
  const d = resume.design;
  result.design.template = templates.some(t => t.id === d.template) ? d.template : 'classic';
  result.design.font = ['Arial', 'Georgia', 'Verdana', 'Times New Roman'].includes(d.font) ? d.font : 'Arial';
  for (const [key, min, max] of [['fontSize', 8, 14], ['lineHeight', 1, 2], ['sectionSpacing', 6, 32], ['margin', 10, 28]]) result.design[key] = Number.isFinite(d[key]) ? Math.min(max, Math.max(min, d[key])) : base.design[key];
  result.design.accent = /^#[\da-f]{6}$/i.test(d.accent) ? d.accent : base.design.accent;
  result.design.heading = ['uppercase', 'title'].includes(d.heading) ? d.heading : 'uppercase';
  result.design.dateFormat = ['short', 'long', 'numeric'].includes(d.dateFormat) ? d.dateFormat : 'short';
  result.design.paper = d.paper === 'letter' ? 'letter' : 'a4';
  return result;
}
export function validateWorkspace(input) {
  if (!isObject(input) || input.schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported backup format. Use a Resume Studio v1 JSON backup.');
  if (!Array.isArray(input.versions) || input.versions.length > 100) throw new Error('The backup must contain a valid resume list (up to 100 versions).');
  const master = validateResume(input.master), versions = input.versions.map(validateResume);
  const ids = [master.id, ...versions.map(r => r.id)];
  if (new Set(ids).size !== ids.length) throw new Error('Resume identifiers must be unique.');
  return { schemaVersion: SCHEMA_VERSION, master, versions, activeId: ids.includes(input.activeId) ? input.activeId : master.id, theme: input.theme === 'dark' ? 'dark' : 'light' };
}
export function parseBackup(text) {
  if (text.length > 5 * 1024 * 1024) throw new Error('Backup exceeds the 5 MB limit.');
  let value; try { value = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  return validateWorkspace(value);
}
export function safeUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function formatDate(value, format = 'short') {
  if (!/^\d{4}-\d{2}$/.test(value || '')) return value || '';
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) return value;
  if (format === 'numeric') return `${String(month).padStart(2, '0')}/${year}`;
  return new Intl.DateTimeFormat('en', { month: format === 'long' ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}
