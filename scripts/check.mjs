import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dependency-free static checks. These do not replace browser or visual QA.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const failures = [];
let checks = 0;
const assert = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};
const email = 'byeot93@gmail.com';
const required = [
  'index.html', 'privacy/index.html', 'terms/index.html', 'support/index.html',
  'en/index.html', 'en/privacy/index.html', 'en/terms/index.html', 'en/support/index.html',
  '404.html', 'assets/styles.css', 'assets/logo.svg', 'assets/favicon.svg',
];
const legalHosts = ['privacy.go.kr', 'law.go.kr', 'pipc.go.kr'];
const githubPrivacyPath = '/en/site-policy/privacy-policies/github-general-privacy-statement';
const productionHome = 'https://lagokun.github.io/byeot-website/';

function decode(value) {
  return value.replace(/&#(x[\da-f]+|\d+);/gi, (_, number) => {
    const code = number[0].toLowerCase() === 'x'
      ? Number.parseInt(number.slice(1), 16) : Number.parseInt(number, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, entity) => ({
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  }[entity]));
}

function visibleText(html) {
  return decode(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}

function attributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3]);
  }
  return attrs;
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const stat = await lstat(absolute);
    assert(!stat.isSymbolicLink(), `Published output must not contain symlinks: ${path.relative(dist, absolute)}`);
    if (stat.isDirectory()) files.push(...await walk(absolute));
    else if (stat.isFile()) files.push(absolute);
  }
  return files;
}

function resolveInternal(file, href) {
  let url;
  try { url = new URL(href, `https://static.invalid/${file}`); }
  catch { return null; }
  if (url.origin !== 'https://static.invalid') return null;
  let pathname;
  let anchor;
  try {
    pathname = decodeURIComponent(url.pathname).slice(1);
    anchor = decodeURIComponent(url.hash.slice(1));
  } catch { return null; }
  const relativePath = href.split(/[?#]/)[0];
  try {
    const withinSite = path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(relativePath)));
    if (withinSite === '..' || withinSite.startsWith('../')) return null;
  } catch { return null; }
  if (!pathname) pathname = 'index.html';
  else if (pathname.endsWith('/')) pathname += 'index.html';
  else if (!path.posix.extname(pathname)) pathname += '/index.html';
  return { file: pathname, anchor };
}

function sectionText(section, lang) {
  const suffix = lang === 'en' ? 'En' : 'Ko';
  const heading = section[`title${suffix}`];
  const body = section[`body${suffix}`];
  assert(typeof heading === 'string' && typeof body === 'string',
    `Legal source sections must have title${suffix} and body${suffix} strings.`);
  // Source strings are plaintext, not HTML. Preserve literal punctuation/entities.
  return `${heading ?? ''} ${body ?? ''}`.replace(/\s+/g, ' ').trim();
}

let files;
let source;
try {
  files = await walk(dist);
  source = JSON.parse(await readFile(path.join(root, 'content/legal-documents.json'), 'utf8'));
} catch (error) {
  console.error(`Static verification could not run: ${error.message}`);
  console.error('Build the site first, then run this checker again.');
  process.exit(1);
}

const contents = new Map();
let bytes = 0;
for (const file of files) {
  const relative = path.relative(dist, file).split(path.sep).join('/');
  const buffer = await readFile(file);
  bytes += buffer.length;
  contents.set(relative, buffer.toString('utf8'));
  assert(!/\.(?:js|mjs|cjs|map|wasm)$/i.test(relative), `No executable or source-map files should be published: ${relative}`);
  assert(!/(?:^|\/)(?:\.env(?:\..*)?|node_modules|\.git)(?:\/|$)/i.test(relative), `Private/build-only file in published output: ${relative}`);
}
for (const file of required) assert(contents.has(file), `Required published file is missing: ${file}`);
assert(bytes < 1024 * 1024, `Published output is unnecessarily large: ${bytes} bytes (limit: 1 MiB).`);
assert(Buffer.byteLength(contents.get('assets/styles.css') ?? '') < 100 * 1024,
  'styles.css must remain under 100 KiB.');

const ids = new Map();
for (const [file, html] of contents) {
  if (!file.endsWith('.html')) continue;
  const found = [...html.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map(match => decode(match[1] ?? match[2]));
  ids.set(file, new Set(found));
  assert(found.length === new Set(found).size, `${file}: duplicate HTML IDs.`);
}

const documents = source.documents ?? {};
assert(source.schemaVersion === 1, 'Legal-source schemaVersion must be 1.');
assert(source.contacts?.operatorName === '볕 운영팀', 'Legal source operatorName must be 볕 운영팀.');
assert(source.contacts?.privacyOfficerName === '김유진', 'Legal source privacyOfficerName must be 김유진.');
assert(source.contacts?.email === email, 'Legal source must retain the configured support email.');
const secretPattern = /(?:NEXT_PUBLIC_|DATABASE_URL|SUPABASE_(?:URL|KEY|SERVICE)|API[_-]?KEY\s*[:=]|SECRET[_-]?KEY\s*[:=]|EDGE[_-]?CONFIG|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|\b(?:sk_live|sk_test|ghp|github_pat)_[A-Za-z0-9_]+|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/i;

for (const [file, content] of contents) {
  assert(!secretPattern.test(content), `${file}: potential API key, secret, database, or edge-config material.`);
  assert(!/<script\b|\bon[a-z]+\s*=|javascript\s*:|<iframe\b|<object\b|<embed\b/i.test(content), `${file}: executable scripts, inline handlers, or embedded remote content are not allowed.`);
  assert(!/(?:google-analytics|googletagmanager|facebook\.net|hotjar|plausible\.io|segment\.com|clarity\.ms|vercel-insights)/i.test(content), `${file}: tracking code or tracking endpoint detected.`);
  if (file.endsWith('.css') || file.endsWith('.svg')) {
    const assetReferences = file.endsWith('.css')
      ? [...content.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)].map(match => match[1])
      : [...content.matchAll(/\b(?:href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
        .map(match => decode(match[1] ?? match[2]));
    for (const href of assetReferences) {
      if (href.startsWith('#')) continue;
      const target = resolveInternal(file, href);
      assert(!href.startsWith('/') && target && contents.has(target.file),
        `${file}: asset reference must resolve locally within the GitHub project: ${href}`);
    }
    assert(!/@import\b/i.test(content), `${file}: CSS imports add an unnecessary external/build dependency.`);
  }
  if (!file.endsWith('.html')) continue;

  const html = content;
  const text = visibleText(html);
  const lang = file.startsWith('en/') ? 'en' : 'ko';
  const htmlAttrs = attributes(html.match(/<html\b[^>]*>/i)?.[0] ?? '');
  assert(new RegExp(`^${lang}(?:-|$)`, 'i').test(htmlAttrs.lang ?? ''), `${file}: expected html lang="${lang}".`);
  assert(visibleText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').length > 0,
    `${file}: a nonempty page title is required.`);
  const viewport = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]))
    .find(attrs => attrs.name?.toLowerCase() === 'viewport');
  assert(viewport?.content?.includes('width=device-width'), `${file}: responsive viewport metadata is missing.`);
  assert((html.match(/<main\b/gi) ?? []).length === 1, `${file}: exactly one semantic main landmark is required.`);
  assert((html.match(/<h1\b/gi) ?? []).length === 1, `${file}: exactly one h1 is required.`);
  if (file !== '404.html') assert(/<header\b/i.test(html) && /<nav\b/i.test(html) && /<footer\b/i.test(html),
    `${file}: header, navigation, and footer landmarks are required.`);
  assert(!/<(?:form|input|textarea|select)\b/i.test(html), `${file}: contact must not submit an unimplemented form.`);

  const mainId = attributes(html.match(/<main\b[^>]*>/i)?.[0] ?? '').id;
  const links = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map(match => ({
    attrs: attributes(match[0].match(/^<a\b[^>]*>/i)?.[0] ?? ''), html: match[0],
  }));
  if (file !== '404.html') assert(mainId && links.some(link => link.attrs.href === `#${mainId}`
    && /skip|바로|건너/i.test(`${link.attrs.class ?? ''} ${visibleText(link.html)}`)),
  `${file}: a skip link must point to the main landmark.`);
  for (const link of links) {
    assert(visibleText(link.html).length > 0 || (link.attrs['aria-label'] ?? '').length > 0,
      `${file}: link without an accessible text label.`);
    if (link.attrs.target === '_blank') assert(/\bnoopener\b/.test(link.attrs.rel ?? ''),
      `${file}: new-tab link must use rel="noopener".`);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    assert(Object.hasOwn(attributes(match[0]), 'alt'), `${file}: image requires alt text (empty for decorative images).`);
  }

  for (const match of html.matchAll(/<[a-z][^>]*>/gi)) {
    const tag = match[0];
    const attrs = attributes(tag);
    for (const attribute of ['href', 'src']) {
      if (!Object.hasOwn(attrs, attribute)) continue;
      const href = attrs[attribute];
      assert(href.length > 0, `${file}: empty ${attribute}.`);
      assert(!href.startsWith('/'), `${file}: root-absolute link breaks GitHub project subpaths: ${href}`);
      if (/^mailto:/i.test(href)) {
        assert(attribute === 'href' && href.slice(7).split('?')[0].toLowerCase() === email,
          `${file}: unexpected contact address: ${href}`);
        continue;
      }
      if (/^[a-z][a-z\d+.-]*:/i.test(href)) {
        let external;
        try { external = new URL(href); } catch { /* Report below. */ }
        const approved = external?.protocol === 'https:' && (legalHosts.some(host =>
          external.hostname === host || external.hostname.endsWith(`.${host}`))
          || (external.hostname === 'docs.github.com' && external.pathname.replace(/\/$/, '') === githubPrivacyPath)
          || (file === '404.html' && href === productionHome));
        assert(attribute === 'href' && /^<a\b/i.test(tag) && approved,
          `${file}: external links are limited to approved primary legal sources: ${href}`);
        continue;
      }
      const target = resolveInternal(file, href);
      assert(target && contents.has(target.file), `${file}: broken internal ${attribute}: ${href}`);
      if (target?.anchor) assert(ids.get(target.file)?.has(target.anchor),
        `${file}: broken fragment identifier: ${href}`);
    }
  }

  if (file !== '404.html') {
    const counterpart = lang === 'en' ? file.slice(3) : `en/${file}`;
    const alternateLang = lang === 'en' ? 'ko' : 'en';
    assert(links.some(link => resolveInternal(file, link.attrs.href ?? '')?.file === counterpart
      && link.attrs.hreflang === alternateLang),
    `${file}: missing matching ${alternateLang} translation link (${counterpart}).`);
  }

  const kind = /(?:^|\/)privacy\//.test(file) ? 'privacy'
    : /(?:^|\/)terms\//.test(file) ? 'terms' : /(?:^|\/)support\//.test(file) ? 'support' : null;
  if (kind) {
    assert(text.replace(/\s/g, '').includes('볕운영팀'), `${file}: official operator name 볕 운영팀 is missing.`);
    assert(text.includes(email), `${file}: support email is missing.`);
    assert(links.some(link => /^mailto:/i.test(link.attrs.href ?? '')
      && link.attrs.href.slice(7).split('?')[0].toLowerCase() === email),
    `${file}: email must be a usable mailto link.`);
  }
  if (kind === 'terms') assert(!/개인정보\s*보호\s*책임자|privacy\s+officer/i.test(text)
    && !text.includes(source.contacts?.privacyOfficerName ?? '\u0000'),
  `${file}: terms should not include privacy-officer details.`);

  if (kind === 'privacy' || kind === 'terms') {
    const expectedCount = kind === 'privacy' ? 10 : 13;
    const sections = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)]
      .filter(match => /(?:^|\s)legal-section(?:\s|$)/.test(attributes(`<section ${match[1]}>`).class ?? ''));
    assert(sections.length === expectedCount, `${file}: expected ${expectedCount} legal sections, found ${sections.length}.`);
    const document = documents[kind];
    assert(Boolean(document), `${file}: corresponding ${lang}/${kind} legal source document could not be found.`);
    if (document) {
      assert(document.sections.length === expectedCount, `${file}: legal source must have ${expectedCount} sections.`);
      for (let index = 0; index < document.sections.length; index += 1) {
        const actual = sections[index];
        const attrs = attributes(`<section ${actual?.[1] ?? ''}>`);
        assert(attrs.id === `section-${index + 1}`, `${file}: section ${index + 1} must have its stable section-N anchor.`);
        assert(visibleText(actual?.[2] ?? '') === sectionText(document.sections[index], lang),
          `${file}: section ${index + 1} differs from content/legal-documents.json.`);
      }
      const status = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]))
        .find(attrs => attrs.name === 'legal-document-status');
      assert(status?.content === (document.isDraft ? 'draft' : 'published'),
        `${file}: legal-document-status metadata must match the source draft status.`);
      const suffix = lang === 'en' ? 'En' : 'Ko';
      assert(visibleText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '') === document[`title${suffix}`],
        `${file}: legal document h1 must match the source title.`);
      assert(text.includes(document[`releaseNotice${suffix}`]),
        `${file}: legal source release notice must be shown without changes.`);
      if (kind === 'privacy') {
        assert(typeof document.isDraft === 'boolean', `${file}: privacy source metadata must explicitly set its draft status.`);
        assert(text.includes(source.contacts.privacyOfficerName), `${file}: privacy officer name is missing.`);
      }
    }
    if (kind === 'privacy' && document?.isDraft) {
      assert(lang === 'ko' ? /초안/.test(text) : /\bdraft\b/i.test(text), `${file}: visible privacy draft notice is missing.`);
      assert(!/(?:현재\s*(?:시행|적용)\s*중|현재\s*시행|now\s+in\s+effect|currently\s+in\s+effect|effective\s+(?:from|as\s+of)\s+\d)/i.test(text),
        `${file}: a draft privacy document must not claim it is currently effective.`);
    }
  }
}

if (failures.length) {
  console.error(`Static verification failed (${failures.length} failures across ${checks} checks):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Static verification passed: ${checks} checks, ${files.length} files, ${bytes} bytes.`);
console.log('Checked legal-source fidelity, links, accessibility structure, privacy draft status, and static-only output.');
console.log('This is static validation, not browser-based visual QA.');
