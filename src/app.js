require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const fs = require('fs').promises;
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const crypto = require('crypto');
const fileType = import('file-type');
const store = require('./store');
const ROOT = path.resolve(__dirname, '..');
const escapeHtml = require('escape-html');

const app = express();

const IS_PROD = process.env.NODE_ENV === 'production';

// --- Configuração de Autenticação Segura ---
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'divinodrinks@gmail.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD_HASH) {
  console.warn('⚠️  ADMIN_PASSWORD_HASH não definido! Gere com: node -e "console.log(require(\'bcrypt\').hashSync(\'sua_senha\', 12))"');
}
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error('❌ SESSION_SECRET ausente ou fraco! Gere com: openssl rand -hex 32');
  process.exit(1);
}

// Detecta HTTPS behind proxy (ex: Nginx, Cloudflare)
app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PROD && process.env.HTTPS !== 'false',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 24h
  }
}));

const checkAuth = (req, res, next) => {
  if (req.session.loggedin) {
    next();
  } else {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Faça login para continuar.' });
    res.redirect('/login.html');
  }
};

// --- Rate Limiting ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente mais tarde.' }
});
app.use('/api', globalLimiter);

const leadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de envio. Aguarde um minuto.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// --- Validação de Lead (Zod) ---
const leadSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Telefone inválido. Use (00) 00000-0000'),
  tipoEvento: z.enum(['Casamento', 'Formatura', 'Aniversário', 'Inauguração', 'Corporativo', 'Outro']),
  dataEvento: z.union([z.iso.date('Data inválida (YYYY-MM-DD)'), z.literal('')]),
  convidados: z.union([z.null(), z.coerce.number().int().min(1, 'Mínimo 1 convidado').max(2000)]),
  mensagem: z.string().max(2000).optional()
});

// Sanitização básica para prevenir header injection no e-mail
const sanitize = (str) => String(str).replace(/[\r\n]/g, ' ').trim();

// Escape HTML para prevenir XSS em e-mails e armazenamento
const escapeForHtml = (str) => escapeHtml(String(str));

// --- Banco de Dados JSON com Lock (evita race condition) ---
let db = {};
app.ready = store.load().then(data => { db = data; });
app.use((req, res, next) => app.ready.then(() => next()).catch(next));
async function updateDb(change) {
  await store.update(change);
  db = await store.load();
}

// --- Helmet CSP com Nonce ---
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      fontSrc: ["'self'", 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: IS_PROD ? [] : null
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));

// Headers extras de segurança
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Rota Principal (SSR com placeholders) ---
app.get(['/', '/index.html'], async (req, res) => {
  try {
    const indexPath = path.join(ROOT, 'public', 'index.html');
    let html = await fs.readFile(indexPath, 'utf8');

    const instagramUrl = db.hero?.instagram_url || process.env.INSTAGRAM_URL || '#';
    const whatsappPhone = whatsappNumber();
    const heroTitle = db.hero?.title || 'Alta coquetelaria para<br>eventos inesquecíveis';
    const heroSubtitle = db.hero?.subtitle || 'Somos especialistas em criar experiências exclusivas de alta coquetelaria.';

    html = html
      .replace(/INSTAGRAM_PLACEHOLDER/g, () => escapeForHtml(instagramUrl))
      .replace(/WHATSAPP_PLACEHOLDER/g, `https://wa.me/${whatsappPhone}`)
      .replace(/(<h1 id="hero-title">)(.*?)(<\/h1>)/, (_, open, text, close) => open + escapeForHtml(heroTitle).replace(/&lt;br\s*\/?&gt;|\n/gi, '<br>') + close)
      .replace(/(<p id="hero-subtitle">)(.*?)(<\/p>)/, (_, open, text, close) => open + escapeForHtml(heroSubtitle) + close)
      .replace(/https:\/\/wa\.me\/5571992771930/g, `https://wa.me/${whatsappPhone}`);

    // Injeta nonce no HTML para scripts/estilos inline que não podem ser removidos ainda
    html = html.replace(/<script(?=\s|>)/g, `<script nonce="${res.locals.cspNonce}"`)
               .replace(/<style>/g, `<style nonce="${res.locals.cspNonce}">`);

    res.send(html);
  } catch (err) {
    console.error('Erro ao servir index.html:', err);
    res.status(500).send('Erro interno do servidor');
  }
});

// Proteção antes do middleware de arquivos estáticos.
app.get(['/admin', '/admin.html'], checkAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'views/admin.html'));
});

// Arquivos estáticos
app.use(express.static(path.join(ROOT, 'public')));

// --- Rotas de Autenticação ---
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 254 || password.length > 200) {
    return res.redirect('/login.html?error=1');
  }

  // Constant-time comparison for email to prevent timing attacks
  const emailBuffer = Buffer.from(email);
  const adminEmailBuffer = Buffer.from(ADMIN_EMAIL);
  const emailMatch = emailBuffer.length === adminEmailBuffer.length && crypto.timingSafeEqual(emailBuffer, adminEmailBuffer);

  const passwordMatch = ADMIN_PASSWORD_HASH && await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

  if (emailMatch && passwordMatch) {
    return req.session.regenerate(err => {
      if (err) return res.status(500).send('Erro ao iniciar sessão');
      req.session.loggedin = true;
      req.session.email = email;
      req.session.save(error => error ? res.status(500).send('Erro ao salvar sessão') : res.redirect('/admin'));
    });
  }

  // Delay constante para evitar timing attacks
  await new Promise(r => setTimeout(r, 100));
  res.redirect('/login.html?error=1');
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/admin');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login.html');
  });
});



// --- Multer Seguro ---
const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.resolve(process.env.UPLOAD_DIR || path.join(ROOT, 'public', 'imagens', 'uploads'));
    fs.mkdir(uploadPath, { recursive: true }).then(() => cb(null, uploadPath)).catch(cb);
  },
  filename: (req, file, cb) => {
    // Sanitiza nome original, mantém apenas extensão segura
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.webp', '.jpg', '.jpeg', '.png'];
    const safeExt = allowedExts.includes(ext) ? ext : '.webp';
    const uniqueName = `${file.fieldname}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido. Use WebP, JPEG ou PNG.'), false);
    }
    cb(null, true);
  }
});

app.use('/imagens/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || path.join(ROOT, 'public/imagens/uploads'))));

// --- Rota de Leads (Pública, com rate limit e validação) ---
app.post('/api/lead', leadLimiter, async (req, res) => {
  const parseResult = leadSchema.safeParse(req.body);

  if (!parseResult.success) {
    const errors = parseResult.error.flatten().fieldErrors;
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors
    });
  }

  const data = parseResult.data;

  const newLead = {
    id: crypto.randomUUID(),
    dataRecebimento: new Date().toISOString(),
    nome: sanitize(data.nome),
    email: sanitize(data.email).toLowerCase(),
    telefone: sanitize(data.telefone),
    tipoEvento: data.tipoEvento,
    dataEvento: data.dataEvento,
    convidados: data.convidados,
    mensagem: data.mensagem ? sanitize(data.mensagem) : '',
    status: 'novo'
  };

  try {
    await updateDb(next => next.leads.push(newLead));
  } catch (error) {
    console.error('Falha ao salvar lead:', error.message);
    return res.status(500).json({ error: 'Não foi possível salvar seu pedido. Tente novamente.' });
  }

  // Envio de e-mail (assíncrono, não bloqueia resposta)
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.MAIL_TO) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `Divino Drinks <${process.env.EMAIL_USER}>`,
      to: process.env.MAIL_TO,
      subject: 'Novo Lead - Divino Drinks',
      html: `
        <h1>Novo Pedido de Orçamento</h1>
        <p><strong>Nome:</strong> ${escapeForHtml(newLead.nome)}</p>
        <p><strong>Email:</strong> ${escapeForHtml(newLead.email)}</p>
        <p><strong>Telefone:</strong> ${escapeForHtml(newLead.telefone)}</p>
        <p><strong>Tipo de Evento:</strong> ${escapeForHtml(newLead.tipoEvento)}</p>
        <p><strong>Data do Evento:</strong> ${escapeForHtml(newLead.dataEvento || 'Ainda não definida')}</p>
        <p><strong>Nº de Convidados:</strong> ${escapeForHtml(String(newLead.convidados ?? 'Ainda não definido'))}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${escapeForHtml(newLead.mensagem || '(vazio)')}</p>
      `
    };

    transporter.sendMail(mailOptions)
      .then(info => console.log('✅ E-mail enviado:', info.messageId))
      .catch(err => console.error('❌ Erro ao enviar e-mail:', err.message));
  }

  res.status(201).json({ message: 'Lead recebido com sucesso!' });
});

// --- Rotas da API Admin (Protegidas) ---
app.post('/api/upload', checkAuth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  // Valida assinatura do arquivo (magic bytes)
  try {
    const buffer = await fs.readFile(req.file.path);
    const type = await (await fileType).fileTypeFromBuffer(buffer);
    if (!type || !ALLOWED_MIME.includes(type.mime)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Arquivo inválido ou tipo não permitido.' });
    }
  } catch (err) {
    await fs.unlink(req.file.path).catch(() => {});
    console.error('Erro ao validar arquivo:', err);
    return res.status(500).json({ error: 'Erro ao processar upload.' });
  }

  const imageUrl = `/imagens/uploads/${req.file.filename}`;
  res.status(201).json({ url: imageUrl });
});

app.get('/api/content', (req, res) => {
  // Não expõe leads (PII) no endpoint de conteúdo público
  const publicContent = Object.fromEntries(['hero', 'about', 'services', 'testimonials', 'gallery', 'footer'].filter(key => db[key]).map(key => [key, db[key]]));
  res.setHeader('Cache-Control', 'no-store');
  res.json(publicContent);
});

app.get('/api/leads', checkAuth, (req, res) => {
  res.json(db.leads || []);
});

// Caminhos locais de imagens, servidos pela mesma origem da página.
const imagePath = z.string().max(500).refine(value => value === '' || /^\/?imagens\/[\p{L}\p{N}_ .()/-]+\.(webp|jpe?g|png)$/iu.test(value) && !value.includes('..'), 'Caminho de imagem inválido');
// Esquemas de validação por seção (Zod)
const contentSchemas = {
  hero: z.object({
    background_image: imagePath.optional(),
    title: z.string().max(200).optional(),
    subtitle: z.string().max(500).optional(),
    instagram_url: z.string().url().optional(),
    whatsapp_phone: z.string().regex(/^\d+$/).optional(),
    badges: z.array(z.object({
      icon: z.string().max(500).optional(),
      text: z.string().max(100).optional()
    })).max(10).optional()
  }),
  about: z.object({
    description: z.string().max(2000).optional(),
    cards: z.array(z.object({
      title: z.string().max(100).optional(),
      text: z.string().max(500).optional()
    })).max(10).optional()
  }),
  services: z.object({
    cards: z.array(z.object({
      title: z.string().max(100).optional(),
      text: z.string().max(1000).optional(),
      image: imagePath.optional()
    })).max(20).optional()
  }),
  testimonials: z.object({
    testimonials: z.array(z.object({
      quote: z.string().max(2000).optional(),
      author: z.string().max(100).optional(),
      image: imagePath.optional()
    })).max(50).optional()
  }),
  gallery: z.object({
    albums: z.array(z.object({
      name: z.string().max(100).optional(),
      thumbnail: imagePath.optional(),
      photos: z.array(imagePath).max(100).optional()
    })).max(20).optional()
  }),
  footer: z.object({
    description: z.string().max(500).optional(),
    contact: z.union([z.string().email(), z.literal('')]).optional(),
    phone: z.string().max(50).optional(),
    contact_address: z.string().max(200).optional(),
    instagram_url: z.string().url().optional(),
    whatsapp_phone: z.string().regex(/^\d+$/).optional()
  })
};

app.post('/api/content/:section', checkAuth, async (req, res) => {
  const { section } = req.params;
  const schema = Object.hasOwn(contentSchemas, section) ? contentSchemas[section] : null;

  if (!schema) {
    return res.status(404).json({ error: `Seção '${section}' não permitida.` });
  }

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parseResult.error.flatten().fieldErrors
    });
  }

  const images = [];
  const collectImages = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (['image', 'background_image', 'thumbnail'].includes(key) && item) images.push(item);
      else if (key === 'photos') images.push(...item.filter(Boolean));
      else if (item && typeof item === 'object') collectImages(item);
    }
  };
  collectImages(parseResult.data);
  for (const image of images) {
    const relative = image.replace(/^\//, '');
    const target = relative.startsWith('imagens/uploads/') && process.env.UPLOAD_DIR
      ? path.join(process.env.UPLOAD_DIR, relative.slice('imagens/uploads/'.length))
      : path.join(ROOT, 'public', relative);
    try { await fs.access(target); }
    catch { return res.status(400).json({ error: `Imagem não encontrada: ${image}` }); }
  }

  try {
    await updateDb(next => { next[section] = parseResult.data; });
  } catch (error) {
    console.error('Falha ao salvar conteúdo:', error.message);
    return res.status(500).json({ error: 'Não foi possível salvar a seção.' });
  }
  res.json({ message: `Seção '${section}' atualizada com sucesso!` });
});

function whatsappNumber() {
  const phone = String(db.hero?.whatsapp_phone || process.env.WHATSAPP_PHONE || '5571987933490').replace(/\D/g, '');
  return phone.length === 10 || phone.length === 11 ? '55' + phone : phone;
}

// --- API para WhatsApp button (pública) ---
app.get('/api/whatsapp-phone', (req, res) => {
  res.json({ phone: whatsappNumber() });
});

// Tratamento consistente para uploads e JSON inválido.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const badRequest = error instanceof multer.MulterError || error.type === 'entity.parse.failed' || error.message.startsWith('Tipo de arquivo');
  const status = error.code === 'LIMIT_FILE_SIZE' || error.type === 'entity.too.large' ? 413 : badRequest ? 400 : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 413 ? 'Arquivo ou dados excedem o tamanho permitido.' : status === 400 ? 'Arquivo ou dados inválidos.' : 'Erro interno do servidor.' });
});

module.exports = app;
