const { test, expect, request: requestFactory } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const bcrypt = require('bcrypt');
let server;
let base;
let temporary;
let initial;
let adminAuth;

test.beforeAll(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'divino-test-'));
  process.env.DB_PATH = path.join(temporary, 'db.json');
  process.env.UPLOAD_DIR = path.join(temporary, 'uploads');
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('integration-test-password', 4);
  process.env.SESSION_SECRET = 'isolated-test-session-secret-32-characters';
  process.env.NODE_ENV = 'test';
  process.env.EMAIL_HOST = '';
  initial = JSON.parse(await fs.readFile('data/content.default.json', 'utf8'));
  const app = require('../server');
  await app.ready;
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const session = await requestFactory.newContext();
  await login(session);
  await session.dispose();
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (temporary) await fs.rm(temporary, { recursive: true, force: true });
});
async function login(request) {
  const response = await request.post(`${base}/login`, { form: { email: 'admin@example.com', password: 'integration-test-password' }, maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe('/admin');
  adminAuth = await request.storageState();
}

test('conteúdo público, dados privados e login com email de tamanho diferente', async ({ request }) => {
  const response = await request.get(`${base}/api/content`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(initial);
  expect((await request.get(`${base}/api/leads`)).status()).toBe(401);
  for (const route of ['/admin', '/admin.html']) {
    expect((await request.get(base + route, { maxRedirects: 0 })).headers().location).toBe('/login.html');
  }
  const bad = await request.post(`${base}/login`, { form: { email: 'x@y.z', password: 'wrong' }, maxRedirects: 0 });
  expect(bad.status()).toBe(302);
  expect(bad.headers().location).toContain('error=1');
});

test('todas as seções do painel sobrevivem ao salvamento', async ({ request }) => {
  await login(request);
  for (const [section, content] of Object.entries(initial)) {
    const response = await request.post(`${base}/api/content/${section}`, { data: content });
    expect(response.status(), await response.text()).toBe(200);
  }
  expect(await (await request.get(`${base}/api/content`)).json()).toEqual(initial);
  const saved = JSON.parse(await fs.readFile(process.env.DB_PATH, 'utf8'));
  expect(saved.gallery).toEqual(initial.gallery);
  expect(saved.hero.background_image).toBe(initial.hero.background_image);
  expect(saved.footer.contact).toBe(initial.footer.contact);
  const missing = await request.post(`${base}/api/content/hero`, { data: { ...initial.hero, background_image: '/imagens/ausente.webp' } });
  expect(missing.status()).toBe(400);
  expect((await (await request.get(`${base}/api/content`)).json()).hero).toEqual(initial.hero);
});

test('uploads válidos carregam e arquivos inválidos são rejeitados', async ({ request }) => {
  await login(request);
  const buffer = await fs.readFile('public/imagens/hero.webp');
  const upload = await request.post(`${base}/api/upload`, { multipart: { image: { name: 'hero.webp', mimeType: 'image/webp', buffer } } });
  expect(upload.status(), await upload.text()).toBe(201);
  const { url } = await upload.json();
  const image = await request.get(base + url);
  expect(image.status()).toBe(200);
  expect(await image.body()).toEqual(buffer);
  const invalid = await request.post(`${base}/api/upload`, { multipart: { image: { name: 'fake.webp', mimeType: 'image/webp', buffer: Buffer.from('not an image') } } });
  expect(invalid.status()).toBe(400);
  const forbidden = await request.post(`${base}/api/upload`, { multipart: { image: { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('text') } } });
  expect(forbidden.status()).toBe(400);
});

test('leads válidos persistem e datas impossíveis são rejeitadas', async ({ request }) => {
  const lead = { nome: 'Teste Automatizado', email: 'test@example.com', telefone: '(71) 98793-3490', tipoEvento: 'Casamento', dataEvento: '2027-12-25', convidados: 150, mensagem: 'Teste isolado' };
  expect((await request.post(`${base}/api/lead`, { data: { ...lead, dataEvento: '2027-02-31' } })).status()).toBe(400);
  const responses = await Promise.all([1, 2].map(() => request.post(`${base}/api/lead`, { data: lead })));
  responses.forEach(response => expect(response.status()).toBe(201));
  const saved = JSON.parse(await fs.readFile(process.env.DB_PATH, 'utf8'));
  expect(saved.leads).toHaveLength(2);
  const content = await (await request.get(`${base}/api/content`)).json();
  expect(content).not.toHaveProperty('leads');
});

test('site desktop: fotos, lightbox, links e ausência de erros no navegador', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(base);
  await expect(page.locator('.gallery-item')).toHaveCount(3);
  await expect(page.locator('.testimonial')).toHaveCount(4);
  for (const image of await page.locator('img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBeTruthy();
  }
  const heroBackground = await page.locator('#home').evaluate(element => getComputedStyle(element).backgroundImage);
  expect(heroBackground).toContain('/imagens/hero.webp');
  const photos = initial.gallery.albums.flatMap(album => album.photos);
  for (const photo of photos) {
    expect(await page.evaluate(async url => {
      const response = await fetch('/' + url.replace(/^\//, ''));
      if (!response.ok) return false;
      const bitmap = await createImageBitmap(await response.blob());
      const valid = bitmap.width > 0 && bitmap.height > 0;
      bitmap.close();
      return valid;
    }, photo), photo).toBeTruthy();
  }
  await page.locator('.gallery-item').first().click();
  await expect(page.locator('.lightbox')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lightbox-image')).toHaveAttribute('src', '/imagens/large/large_drink2.webp');
  await page.keyboard.press('Escape');
  await expect(page.locator('.lightbox')).toBeHidden();
  await expect(page.locator('#hero-whatsapp-link')).toHaveAttribute('href', 'https://wa.me/5571987933490');
  await page.locator('.logo').first().click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
});

test('mobile: menu, rolagem sem chamadas repetidas e largura da página', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const calls = [];
  page.on('request', request => { if (request.url().includes('/api/')) calls.push(request.url()); });
  await page.goto(base);
  await expect(page.locator('.gallery-item')).toHaveCount(3);
  await page.locator('.menu-toggle').click();
  await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.nav a[href="#galeria"]').click();
  await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  for (let index = 0; index < 10; index++) await page.evaluate(index => window.scrollTo(0, index * 300), index);
  expect(calls.filter(url => url.includes('whatsapp-phone'))).toHaveLength(0);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].map(element => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })).filter(item => item.right > innerWidth + 1));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(overflow)).toBeTruthy();
});

test('formulário envia orçamento e informa sucesso', async ({ page }) => {
  await page.goto(base);
  await page.locator('#nome').fill('Teste no Navegador');
  await page.locator('#email').fill('browser@example.com');
  await page.locator('#telefone').fill('71987933490');
  await page.locator('#tipoEvento').selectOption('Casamento');
  await page.locator('#dataEvento').fill('2027-12-25');
  await page.locator('#convidados').fill('100');
  await page.locator('#mensagem').fill('Teste sem envio de e-mail.');
  await page.locator('#lead-form button[type="submit"]').click();
  await expect(page.locator('.form-status')).toContainText('Recebemos seu pedido!');
  const saved = JSON.parse(await fs.readFile(process.env.DB_PATH, 'utf8'));
  expect(saved.leads.at(-1).nome).toBe('Teste no Navegador');
});

test('site editorial: portfólio em destaque, detalhes expansíveis e orçamento sem data definida', async ({ page }) => {
  await page.goto(base);
  await expect(page.locator('#services-cards .service-copy')).toHaveCount(4);
  const order=await page.locator('section[id]').evaluateAll(elements => elements.map(element => element.id));
  expect(order.indexOf('galeria')).toBeLessThan(order.indexOf('homes'));
  expect(order.indexOf('homes')).toBeLessThan(order.indexOf('quem-somos'));
  const details=page.locator('.service-copy details').first();
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open','');
  await page.locator('#nome').fill('Evento em Planejamento');
  await page.locator('#email').fill('planejamento@example.com');
  await page.locator('#telefone').fill('7132345678');
  await page.locator('#tipoEvento').selectOption('Outro');
  await page.locator('#data-indefinida').check();
  await page.locator('#convidados-indefinidos').check();
  await expect(page.locator('#dataEvento')).toBeDisabled();
  await expect(page.locator('#convidados')).toBeDisabled();
  await page.locator('#lead-form button[type=submit]').click();
  await expect(page.locator('.form-status')).toContainText('Recebemos seu pedido!');
  const saved=JSON.parse(await fs.readFile(process.env.DB_PATH,'utf8'));
  expect(saved.leads.at(-1)).toMatchObject({nome:'Evento em Planejamento',dataEvento:'',convidados:null,telefone:'(71) 3234-5678'});
  await expect(page.locator('#dataEvento')).toBeEnabled();
});

test('formulário compacto e logos do cabeçalho e rodapé retornam ao topo', async ({ page }) => {
  await page.goto(base);
  await expect(page.locator('#services-cards .service-copy')).toHaveCount(4);
  const desktop=await page.locator('#lead-form').evaluate(element => ({
    height:element.getBoundingClientRect().height,
    columns:getComputedStyle(element.querySelector('.form-grid')).gridTemplateColumns.split(' ').length,
    background:getComputedStyle(element).backgroundColor
  }));
  expect(desktop.columns).toBe(2);
  expect(desktop.height).toBeLessThan(650);
  expect(desktop.background).toBe('rgb(255, 255, 255)');
  await page.locator('#contato').scrollIntoViewIfNeeded();
  await page.locator('#contato > .container').screenshot({path:'test-results/formulario-compacto-desktop.png'});
  await page.locator('.footer .logo').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.nav')).toBeHidden();
  await page.locator('#contato').scrollIntoViewIfNeeded();
  const mobile=await page.locator('#lead-form').boundingBox();
  expect(mobile.height).toBeLessThan(900);
  expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.evaluate(() => window.scrollTo({top:document.getElementById('lead-form').getBoundingClientRect().top+scrollY-100,behavior:'instant'}));
  await page.locator('#lead-form').screenshot({path:'test-results/formulario-compacto-mobile.png'});
  await page.locator('.header .logo').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.locator('.menu-toggle').click();
  await page.locator('.header .logo').click();
  await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','false');
});

test('painel: álbuns novos recebem IDs únicos e textos especiais são preservados', async ({ page, request }) => {
  await login(request);
  await page.context().addCookies((await request.storageState()).cookies);
  await page.goto(`${base}/admin`);
  await expect(page.locator('.album-item')).toHaveCount(3);
  await page.getByRole('button', { name: 'Galeria', exact: true }).click();
  await page.locator('#add-album').click();
  const ids = await page.locator('.album-item').evaluateAll(elements => elements.map(element => element.dataset.albumId));
  expect(new Set(ids).size).toBe(4);
  await page.getByRole('button', { name: 'Página inicial', exact: true }).click();
  await page.locator('#hero-title').fill('Drinks & "Festas"\nexclusivos');
  await expect(page.locator('#section-preview h3')).toContainText('Drinks & "Festas"');
  await page.locator('#save-current').click();
  await expect(page.locator('#save-status')).toHaveText('Alterações salvas no site');
  page.once('dialog', dialog => dialog.accept()); // Another section still has an unsaved new album.
  await page.reload();
  await expect(page.locator('#hero-title')).toHaveValue('Drinks & "Festas"\nexclusivos');
});

test('painel mobile: todas as seções cabem na tela, campos têm labels e ações de toque', async ({ page }) => {
  await page.context().addCookies(adminAuth.cookies);
  await page.setViewportSize({ width:390, height:844 });
  await page.goto(`${base}/admin`);
  await expect(page.locator('#editing-layout')).toBeVisible();
  for (const key of ['hero','about','services','testimonials','gallery','footer']) {
    await page.locator('#section-picker').selectOption(key);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),key).toBeTruthy();
    const accessibility = await page.locator(`[data-panel="${key}"]`).evaluate(root => ({
      unlabeled:[...root.querySelectorAll('input:not([type=hidden]),textarea,select')].filter(element => !element.labels?.length).length,
      small:[...root.querySelectorAll('input:not([type=hidden]):not([type=file]),textarea,select')].filter(element => parseFloat(getComputedStyle(element).fontSize)<16).length,
      smallButtons:[...root.querySelectorAll('button')].filter(button => button.getBoundingClientRect().height<44).length
    }));
    expect(accessibility,key).toEqual({unlabeled:0,small:0,smallButtons:0});
  }
  await page.locator('#section-picker').selectOption('hero');
  await page.screenshot({path:'test-results/admin-mobile.png',fullPage:true});
});

test('painel: prévia, descarte, remoção reversível, ordem de fotos e proteção de saída', async ({ page }) => {
  await page.context().addCookies(adminAuth.cookies);
  await page.goto(`${base}/admin`);
  await expect(page.locator('#save-current')).toBeDisabled();
  const original = await page.locator('#hero-title').inputValue();
  await page.locator('#hero-title').click();
  await page.locator('#hero-title').fill('Título para conferir a prévia');
  await expect(page.locator('#section-preview h3')).toHaveText('Título para conferir a prévia');
  await expect(page.locator('#save-status')).toHaveText('Alterações não salvas');
  const dialogEvent = page.waitForEvent('dialog');
  const navigation = page.reload({timeout:2000}).catch(() => {});
  const dialog = await dialogEvent;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await navigation;
  await expect(page.locator('#hero-title')).toHaveValue('Título para conferir a prévia');
  await page.locator('#discard-current').click();
  await page.locator('#confirm-discard').click();
  await expect(page.locator('#hero-title')).toHaveValue(original);
  await page.getByRole('button',{name:'Galeria',exact:true}).click();
  const firstAlbum=page.locator('.album-item').first();
  const photos=firstAlbum.locator('.photo-item');
  const originalFirst=await photos.first().locator('input').inputValue();
  await photos.first().getByRole('button',{name:'Remover',exact:true}).click();
  await page.locator('#undo-remove').click();
  await expect(photos.first().locator('input')).toHaveValue(originalFirst);
  await photos.nth(1).getByRole('button',{name:'Mover foto para antes'}).click();
  expect(await photos.first().locator('input').inputValue()).not.toBe(originalFirst);
  await photos.first().getByRole('button',{name:'Usar capa',exact:true}).click();
  await expect(photos.first()).toHaveClass(/is-cover/);
  await page.locator('#save-current').click();
  await expect(page.locator('#save-status')).toHaveText('Alterações salvas no site');
  await page.reload();
  await page.getByRole('button',{name:'Galeria',exact:true}).click();
  expect(await page.locator('.photo-item').first().locator('input').inputValue()).not.toBe(originalFirst);
  await page.screenshot({path:'test-results/admin-gallery.png',fullPage:true});
});

test('painel: salvar preserva formatação antiga e erros mantêm o texto editado', async ({ page }) => {
  await page.context().addCookies(adminAuth.cookies);
  await page.goto(`${base}/admin`);
  await expect(page.locator('#editing-layout')).toBeVisible();
  await page.getByRole('button',{name:'Quem somos',exact:true}).click();
  expect(await page.locator('#about-desc').inputValue()).not.toContain('<strong>');
  await page.locator('#about-cards input[name=title]').first().fill('Título atualizado');
  await page.locator('#save-current').click();
  await expect(page.locator('#save-status')).toHaveText('Alterações salvas no site');
  const saved=JSON.parse(await fs.readFile(process.env.DB_PATH,'utf8'));
  expect(saved.about.description).toBe(initial.about.description);
  await page.getByRole('button',{name:'Página inicial',exact:true}).click();
  await page.locator('#hero-title').fill('Meu texto continua aqui');
  await page.route('**/api/content/hero',route => route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Falha simulada. Tente novamente.'})}));
  await page.locator('#save-current').click();
  await expect(page.locator('#feedback')).toContainText('Falha simulada');
  await expect(page.locator('#hero-title')).toHaveValue('Meu texto continua aqui');
  await expect(page.locator('#save-current')).toBeEnabled();
  await page.locator('#discard-current').click();
  await page.locator('#confirm-discard').click();
  await page.screenshot({path:'test-results/admin-desktop.png',fullPage:true});
});

test('painel: imagem enviada pela interface entra na prévia e persiste', async ({ page }) => {
  await page.context().addCookies(adminAuth.cookies);
  await page.goto(`${base}/admin`);
  const buffer=await fs.readFile('public/imagens/hero.webp');
  await page.locator('#hero-bg-file').setInputFiles({name:'nova-capa.webp',mimeType:'image/webp',buffer});
  await expect(page.locator('#panel-hero .upload-status').first()).toContainText('Imagem enviada.');
  const url=await page.locator('#hero-bg-url').inputValue();
  expect(url).toContain('/imagens/uploads/');
  await expect(page.locator('#section-preview img')).toHaveAttribute('src',url);
  await page.locator('#save-current').click();
  await expect(page.locator('#save-status')).toHaveText('Alterações salvas no site');
  expect(JSON.parse(await fs.readFile(process.env.DB_PATH,'utf8')).hero.background_image).toBe(url);
});

test('login: identidade, erro contextual e visibilidade da senha', async ({ page }) => {
  await page.goto(`${base}/login.html?error=1`);
  await expect(page.getByRole('heading',{name:'Acesso ao painel'})).toBeVisible();
  await expect(page.locator('#error-message')).toBeVisible();
  await page.locator('#password').fill('texto-local');
  await page.locator('#show-password').click();
  await expect(page.locator('#password')).toHaveAttribute('type','text');
  await page.locator('#show-password').click();
  await expect(page.locator('#password')).toHaveAttribute('type','password');
  await page.screenshot({path:'test-results/login-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:'test-results/login-mobile.png'});
});
