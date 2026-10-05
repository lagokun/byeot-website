import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist');
const data = JSON.parse(await readFile(resolve(root, 'content/legal-documents.json'), 'utf8'));
if (data.schemaVersion !== 1 || !data.contacts?.email || !data.documents?.privacy || !data.documents?.terms) {
  throw new Error('Missing public legal content.');
}
const { contacts, documents } = data;
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const text = (locale, ko, en) => locale === 'ko' ? ko : en;
const fileFor = (locale, page) => [
  ...(locale === 'en' ? ['en'] : []),
  ...(page === 'home' ? [] : [page]),
  'index.html',
].join('/');
const urlTo = (from, target) => {
  const path = relative(dirname(resolve(out, from)), resolve(out, target)).split(sep).join('/');
  if (target.endsWith('index.html')) {
    const directory = path.slice(0, -'index.html'.length);
    return directory || './';
  }
  return path || './';
};
const emailUrl = (subject) => 'mailto:' + contacts.email + '?subject=' + encodeURIComponent(subject);
const paragraphs = (value) => value.trim().split(/\n\s*\n/).map(
  (paragraph) => '<p>' + escape(paragraph).replace(/\n/g, '<br>\n') + '</p>',
).join('\n');

function shell(locale, page, title, description, content, extraMeta = '') {
  const file = page === '404' ? '404.html' : fileFor(locale, page);
  const href = (target) => escape(urlTo(file, target));
  const labels = [
    ['home', text(locale, '볕 소개', 'About byeot')],
    ['privacy', text(locale, '개인정보처리방침', 'Privacy')],
    ['terms', text(locale, '이용약관', 'Terms')],
    ['support', text(locale, '문의하기', 'Support')],
  ];
  const nav = labels.map(([key, label]) => '<a href="' + href(fileFor(locale, key)) + '"' +
    (key === page ? ' aria-current="page"' : '') + '>' + label + '</a>').join('\n');
  const altLocale = locale === 'ko' ? 'en' : 'ko';
  const alternate = href(fileFor(altLocale, page === '404' ? 'home' : page));
  const csp = "default-src 'none'; img-src 'self'; style-src 'self'; base-uri 'self'; form-action 'none'";
  return '<!doctype html>\n<html lang="' + locale + '">\n<head>\n' +
    '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="description" content="' + escape(description) + '">\n' +
    '<meta name="robots" content="noindex, nofollow">\n' +
    '<meta http-equiv="Content-Security-Policy" content="' + escape(csp) + '">\n' +
    extraMeta + '\n<title>' + escape(title) + ' | ' + text(locale, '볕', 'byeot') + '</title>\n' +
    '<link rel="icon" href="' + href('assets/favicon.svg') + '" type="image/svg+xml">\n' +
    '<link rel="stylesheet" href="' + href('assets/styles.css') + '">\n' +
    '<link rel="alternate" hreflang="' + altLocale + '" href="' + alternate + '">\n' +
    '</head>\n<body>\n<a class="skip-link" href="#main">' + text(locale, '본문으로 바로가기', 'Skip to content') + '</a>\n' +
    '<header class="site-header"><div class="header-inner">\n' +
    '<a class="brand" href="' + href(fileFor(locale, 'home')) + '" aria-label="' + text(locale, '볕 홈', 'byeot home') + '">' +
    '<img src="' + href('assets/logo.svg') + '" width="48" height="38" alt="">' +
    '<span class="brand-name">' + text(locale, '볕', 'byeot') + '</span></a>\n' +
    '<nav class="site-nav" aria-label="' + text(locale, '주 메뉴', 'Main navigation') + '">' + nav + '</nav>\n' +
    '<a class="language-link" href="' + alternate + '" lang="' + altLocale + '" hreflang="' + altLocale + '">' +
    text(locale, 'English', '한국어') + '</a>\n</div></header>\n' +
    '<main id="main" class="container">' + content + '</main>\n' +
    '<footer class="site-footer"><div class="footer-inner"><div><p class="footer-copy">' +
    text(locale, '볕 운영팀 · 취향이 머무는 작은 가게들', '볕 운영팀 · Small shops, thoughtful discoveries') + '</p>' +
    '<p class="small-text">© 2026 byeot. <a href="' + escape(emailUrl(text(locale, '볕 문의', 'byeot inquiry'))) + '">' +
    escape(contacts.email) + '</a></p></div>' +
    '<nav class="footer-nav" aria-label="' + text(locale, '문서 및 문의', 'Legal and support') + '">' +
    nav + '</nav></div></footer>\n</body>\n</html>\n';
}

function home(locale) {
  const file = fileFor(locale, 'home');
  const href = (page) => escape(urlTo(file, fileFor(locale, page)));
  const heroArt = '<div class="hero-art" aria-hidden="true"><div class="sun-disc"></div>' +
    '<svg class="shop-lineart" viewBox="0 0 360 300" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M55 135L180 70l125 65M76 123v133h208V123" stroke="#702700" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M65 148h230l-11-25H76l-11 25Z" fill="#ffdccb" stroke="#702700" stroke-width="4"/>' +
    '<path d="M113 125v23m43-23v23m45-23v23m44-23v23" stroke="#702700" stroke-width="4"/>' +
    '<rect x="100" y="175" width="91" height="55" rx="3" fill="#fffdf9" stroke="#702700" stroke-width="4"/>' +
    '<path d="M111 204h69m-69 17h69m-60-19v-14h20v14m17 0v-12h12v12" stroke="#ac3b00" stroke-width="3"/>' +
    '<path d="M218 256v-82h43v82m-10-36h1M53 258h255" stroke="#702700" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M154 103h51" stroke="#702700" stroke-width="3" stroke-linecap="round"/>' +
    '</svg></div>';
  return '<section class="hero"><div><p class="eyebrow">SMALL SHOPS, THOUGHTFUL DISCOVERIES</p>' +
    '<h1 class="hero-title">' + text(locale, '취향이 머무는<br>작은 가게를 만나다.', 'Find a little shop.<br>Discover your taste.') + '</h1>' +
    '<p class="hero-copy">' + text(locale,
      '볕은 동네의 소품샵을 지도에서 발견하고,<br>마음에 드는 공간을 저장하는 앱입니다.',
      'byeot helps you discover gift shops on a map<br>and save places you would like to visit.') + '</p>' +
    '<div class="hero-actions"><a class="button primary" href="' + href('support') + '">' +
    text(locale, '문의하기', 'Contact us') + '</a><a class="button secondary" href="' + href('privacy') + '">' +
    text(locale, '개인정보처리방침', 'Read our privacy policy') + '</a></div></div>' + heroArt + '</section>' +
    '<section class="intro-strip" aria-label="' + text(locale, '볕의 기능', 'byeot features') + '">' +
    '<div><h2>' + text(locale, '지도에서 발견', 'Explore on a map') + '</h2><p>' +
    text(locale, '동네와 취향에 맞는 작은 가게를 찾아보세요.', 'Discover small shops by neighborhood and interests.') + '</p></div>' +
    '<div><h2>' + text(locale, '내 취향 저장', 'Save your favorites') + '</h2><p>' +
    text(locale, '다음에 가보고 싶은 매장을 모아두세요.', 'Keep a list of places you would like to visit.') + '</p></div>' +
    '<div><h2>' + text(locale, '방문 전 확인', 'Plan your visit') + '</h2><p>' +
    text(locale, '매장 소개와 방문 정보, 리뷰를 살펴보세요.', 'Read shop introductions, visit information and reviews.') + '</p></div></section>' +
    '<section class="page-header"><p class="page-kicker">' + text(locale, '볕 이용 안내', 'SERVICE INFORMATION') +
    '</p><h2>' + text(locale, '필요한 정보를 편하게 확인하세요.', 'Clear information, in one place.') + '</h2>' +
    '<p class="page-description">' + text(locale,
      '개인정보 처리 기준과 이용약관을 공개하고, 서비스 문의와 정보 정정 요청을 받는 공식 안내 웹사이트입니다.',
      'This website provides our privacy and service terms, and a contact channel for support and shop-information corrections.') + '</p>' +
    '<p class="small-text">' + text(locale,
      '개인정보처리방침은 기술 검증 중인 공개 준비본입니다. 해당 문서에서 현재 상태를 확인할 수 있습니다.',
      'The privacy policy is a preparation draft undergoing technical verification. Its current status is shown on the document.') +
    '</p></section>';
}

function legal(locale, kind) {
  const document = documents[kind];
  const title = text(locale, document.titleKo, document.titleEn);
  const date = text(locale, document.draftedOnKo, document.draftedOnEn);
  const bodyKey = locale === 'ko' ? 'bodyKo' : 'bodyEn';
  const titleKey = locale === 'ko' ? 'titleKo' : 'titleEn';
  const notice = document.isDraft ? '<div class="notice" role="note"><strong>' +
    text(locale, '공개 준비본 · 아직 시행되지 않은 초안', 'Preparation draft · Not yet in effect') + '</strong><p>' +
    escape(text(locale, document.releaseNoticeKo, document.releaseNoticeEn)) + '</p></div>' : '';
  const toc = '<aside class="document-toc" aria-label="' + text(locale, '문서 목차', 'Document contents') + '"><h2>' +
    text(locale, '목차', 'Contents') + '</h2><ol>' + document.sections.map((section, index) =>
      '<li><a href="#section-' + (index + 1) + '">' + escape(section[titleKey]) + '</a></li>').join('\n') + '</ol></aside>';
  const contact = '<div class="contact-card"><h2>' + text(locale, '운영 및 문의', 'Operator and contact') + '</h2><dl>' +
    '<dt>' + text(locale, '운영자', 'Operator') + '</dt><dd>' + escape(contacts.operatorName) + '</dd>' +
    (kind === 'privacy' ? '<dt>' + text(locale, '개인정보 보호책임자', 'Privacy officer') + '</dt><dd>' +
      escape(contacts.privacyOfficerName) + '</dd>' : '') +
    '<dt>' + text(locale, '문의처', 'Email') + '</dt><dd><a href="' +
    escape(emailUrl(text(locale, '볕 개인정보 및 서비스 문의', 'byeot privacy and support inquiry'))) + '">' +
    escape(contacts.email) + '</a></dd></dl></div>';
  const sections = document.sections.map((section, index) => '<section class="legal-section" id="section-' + (index + 1) +
    '"><h2>' + escape(section[titleKey]) + '</h2>' + paragraphs(section[bodyKey]) + '</section>').join('\n');
  return '<header class="page-header"><p class="page-kicker">' + text(locale, '볕 이용 안내', 'SERVICE INFORMATION') +
    '</p><h1>' + escape(title) + '</h1><p class="page-description">' +
    text(locale, kind === 'privacy' ? '개인정보 처리 목적과 보관 기준, 권리 행사 방법을 안내합니다.' : '볕을 이용할 때 적용되는 기준을 안내합니다.',
      kind === 'privacy' ? 'How we use personal data, retain it and respond to your rights.' : 'The terms that apply when you use byeot.') +
    '</p><p class="metadata">' + text(locale, '최종 수정일: ', 'Last updated: ') + escape(date) +
    (document.isDraft ? ' <span class="badge">' + text(locale, '공개 준비본', 'Preparation draft') + '</span>' : '') +
    '</p></header>' + notice + '<div class="document-layout">' + toc +
    '<article class="legal-document" aria-label="' + escape(title) + '">' + contact + sections + '</article></div>';
}

function support(locale) {
  const file = fileFor(locale, 'support');
  const privacy = escape(urlTo(file, fileFor(locale, 'privacy')));
  const email = escape(emailUrl(text(locale, '볕 문의', 'byeot support')));
  return '<header class="page-header"><p class="page-kicker">CONTACT & SUPPORT</p><h1>' +
    text(locale, '무엇을 도와드릴까요?', 'How can we help?') + '</h1><p class="page-description">' +
    text(locale, '서비스 문의와 매장 정보 정정, 리뷰 신고, 개인정보 요청을 받고 있습니다.',
      'Contact us about the service, shop corrections, review reports or privacy requests.') + '</p></header>' +
    '<div class="support-grid"><section class="support-card"><h2>' + text(locale, '볕 운영팀에 문의', 'Contact the byeot team') +
    '</h2><p>' + text(locale, '아래 이메일로 문의 내용을 보내주세요.', 'Send your inquiry to the email below.') +
    '</p><a class="email-link" href="' + email + '">' + escape(contacts.email) + '</a>' +
    '<p class="small-text">' + text(locale, '클릭하면 기기의 메일 앱이 열립니다. 직접 전송해야 문의가 접수됩니다.',
      'This opens your mail app. You must send the message for us to receive it.') + '</p>' +
    '<div class="support-detail"><p>' + text(locale, '운영자: ', 'Operator: ') + escape(contacts.operatorName) + '</p>' +
    '<p>' + text(locale, '개인정보 보호책임자: ', 'Privacy officer: ') + escape(contacts.privacyOfficerName) + '</p>' +
    '<p>' + text(locale, '접수 확인은 영업일 3일 이내를 목표로 합니다. 추가 확인이 필요한 경우 진행 상황을 안내합니다.',
      'We aim to acknowledge inquiries within three business days and explain any additional checks or progress.') + '</p></div></section>' +
    '<section class="support-card"><h2>' + text(locale, '이렇게 보내주시면 좋아요', 'What to include') + '</h2>' +
    '<p>' + text(locale, '앱 오류: 기기 종류, 앱 버전, 문제가 발생한 화면과 재현 순서',
      'App issues: device type, app version, screen and steps to reproduce.') + '</p>' +
    '<p>' + text(locale, '매장 정보 정정: 매장 이름, 잘못된 정보와 확인할 수 있는 공식 자료',
      'Shop corrections: shop name, incorrect information and an official source.') + '</p>' +
    '<p>' + text(locale, '리뷰·사진 신고: 매장 이름, 대상 리뷰·사진, 신고 사유와 필요한 근거',
      'Review or photo reports: shop name, the material, reason and necessary evidence.') + '</p>' +
    '<p>' + text(locale, '개인정보 요청: 열람·정정·삭제·처리정지 등 요청 종류와 연락받을 이메일',
      'Privacy requests: the right you want to exercise and an email for our response.') + '</p></section></div>' +
    '<section class="support-card"><h2>' + text(locale, '계정 삭제와 개인정보 요청', 'Account deletion and privacy requests') + '</h2>' +
    '<p>' + text(locale, '앱 마이페이지의 계정 삭제에서 탈퇴를 요청할 수 있습니다. 앱에 접근할 수 없으면 위 이메일로 요청해주세요. 필요한 최소 정보로 본인 여부를 확인합니다.',
      'You can request account deletion from My page in the app. If you cannot access the app, contact the email above. We verify identity using the minimum necessary information.') + '</p>' +
    '<p>' + text(locale, '비밀번호, 인증 코드, 주민등록번호 또는 신분증 사본은 보내지 마세요. 개인정보 처리 기준과 보유기간은 ',
      'Do not send passwords, verification codes, resident registration numbers or ID copies. Read retention and processing details in the ') +
    '<a href="' + privacy + '">' + text(locale, '개인정보처리방침', 'privacy policy') + '</a>' +
    text(locale, '에서 확인할 수 있습니다.', '.') + '</p></section>' +
    '<section class="page-header"><h2>' + text(locale, '웹사이트 이용 안내', 'About this website') + '</h2><p class="small-text">' +
    text(locale, '이 안내 웹사이트에는 로그인, 문의 양식, 광고 또는 별도의 분석 스크립트를 사용하지 않습니다. GitHub Pages의 호스팅 접속정보 처리에는 ',
      'This information site has no login, inquiry form, ads or separate analytics scripts. Hosting-related connection data is handled under the ') +
    '<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">' +
    text(locale, 'GitHub 개인정보처리방침', 'GitHub Privacy Statement') + '</a>' + text(locale, '이 적용됩니다.', '.') +
    '</p></section>';
}

await mkdir(resolve(out, 'assets'), { recursive: true });
for (const asset of ['styles.css', 'logo.svg', 'favicon.svg']) {
  await copyFile(resolve(root, 'assets', asset), resolve(out, 'assets', asset));
}
for (const locale of ['ko', 'en']) {
  for (const page of ['home', 'privacy', 'terms', 'support']) {
    const title = text(locale, {
      home: '취향이 머무는 작은 가게들', privacy: documents.privacy.titleKo, terms: documents.terms.titleKo, support: '문의하기',
    }[page], {
      home: 'Small shops, thoughtful discoveries', privacy: documents.privacy.titleEn, terms: documents.terms.titleEn, support: 'Support',
    }[page]);
    const content = page === 'home' ? home(locale) : page === 'support' ? support(locale) : legal(locale, page);
    const description = text(locale, '볕의 공식 안내, 개인정보처리방침, 이용약관 및 문의처입니다.', 'Official information, privacy, service terms and support for byeot.');
    const meta = ['privacy', 'terms'].includes(page) ? '<meta name="legal-document-status" content="' +
      (documents[page].isDraft ? 'draft' : 'published') + '">' : '';
    const file = resolve(out, fileFor(locale, page));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, shell(locale, page, title, description, content, meta));
  }
}
await writeFile(resolve(out, '.nojekyll'), '');
await writeFile(resolve(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
await writeFile(resolve(out, '404.html'), '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">' +
  '<title>페이지를 찾을 수 없습니다 | 볕</title></head><body><a href="#main">본문으로 바로가기</a>' +
  '<main id="main"><h1>페이지를 찾을 수 없습니다.</h1><p>주소를 확인하거나 볕의 안내 페이지로 돌아가주세요.</p>' +
  '<nav aria-label="돌아가기"><a href="https://lagokun.github.io/byeot-website/">볕 홈으로</a>' +
  '<a href="mailto:' + escape(contacts.email) + '">문의하기</a></nav></main></body></html>\n');
process.stdout.write('Built 8 bilingual information pages, assets and a 404 page in dist/.\n');
