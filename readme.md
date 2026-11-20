# Divino Drinks

Site de coquetelaria com Express, painel administrativo, galeria e formulário de orçamento. Armazenamento em JSON local; notificações SMTP opcionais.

## Executar

Requisitos: Node.js 22+ e npm 10+.

```powershell
npm ci
Copy-Item .env.example .env
# Configure SESSION_SECRET e ADMIN_PASSWORD_HASH no .env antes de iniciar.
npm run db:init
npm start
```

Acesse http://localhost:3000 e `/admin` para administrar. `db:init` cria o banco com o conteúdo padrão ou preserva os registros existentes. Não substitua um `.env` já configurado.

Gere o segredo de sessão com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Para o hash da senha, use bcrypt com custo 12 em uma sessão local segura; salve somente o hash em `ADMIN_PASSWORD_HASH`. Configure `ADMIN_EMAIL` para o login.

## Pastas

```text
server.js                  Entrada CLI e exportação do aplicativo
src/app.js                 Express, autenticação, APIs e upload
src/store.js               Leitura e gravação atômica do banco JSON
src/views/admin.html       Página protegida do painel
public/                    Páginas e recursos públicos, ícones e manifesto
  css/                     Estilos
  js/                      Scripts e utilitários do conteúdo
  fonts/                   Fontes locais
  imagens/                 Fotos, logos, miniaturas e uploads
data/content.default.json  Conteúdo inicial versionado, sem leads
data/db.json               Dados locais e leads (ignorado pelo Git)
data/local/                Arquivos locais privados (ignorado pelo Git)
docs/                      Configuração de e-mail, deploy e validações
scripts/                   Inicialização, backup e conferência de recursos
tests/                     Testes de API e navegador
archive/                   Implementações antigas fora da execução atual
```

Os caminhos das fotos existentes foram preservados. Instalações antigas com `db.json` na raiz são lidas automaticamente quando o banco novo ainda não existe. `DB_PATH` e `UPLOAD_DIR` permitem usar um volume persistente externo. Execute somente uma instância do servidor para o banco JSON; a fila de gravação protege concorrência dentro do processo.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm start` | Iniciar servidor |
| `npm run dev` | Desenvolvimento com reinício automático |
| `npm run build` | Conferir referências locais a fotos, fontes e scripts |
| `npm run lint` | Verificar JavaScript |
| `npm test` | Testes de API, desktop e celular com banco temporário |
| `npm run db:init` | Preparar banco sem apagar registros |
| `npm run backup` | Copiar banco e uploads para `backups/` |

Os testes usam Google Chrome instalado. Para Chromium do Playwright, remova `channel: 'chrome'` de `playwright.config.js` e execute `npx playwright install chromium`. Evidências são gravadas em `test-results/`.

## Configuração

O painel em `/admin` permite editar uma seção por vez, conferir a prévia e salvar diretamente no site. Alterações pendentes são marcadas por seção; há descarte e desfazer para a última remoção antes de salvar. A galeria permite definir capa e reordenar fotos sem arrastar. A prévia é uma representação do conteúdo; o layout final é conferido em “Ver site”.

No orçamento, “Ainda não defini” permite enviar data vazia (`dataEvento: ""`) e quantidade indefinida (`convidados: null`). Datas preenchidas continuam validadas. Notificações por e-mail exibem esses campos como “Ainda não definido”.

`SESSION_SECRET` exige ao menos 32 caracteres. Preencha `ADMIN_PASSWORD_HASH` para habilitar login. `WHATSAPP_PHONE` aceita telefone brasileiro com ou sem 55; prefira o formato internacional. `INSTAGRAM_URL` define a rede social. O conteúdo salvo no painel tem prioridade sobre as variáveis de contato.

Para notificações, configure `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` e `MAIL_TO`; veja [manual](docs/MANUAL_EMAIL.md). Sem configuração completa, o lead é salvo e nenhum e-mail é enviado.

Em produção com TLS, use `NODE_ENV=production` e `HTTPS=true`. As sessões ficam em memória e exigem novo login após reiniciar o processo. O armazenamento JSON e os uploads precisam de disco persistente; veja [deploy](docs/DEPLOY_VERCEL.md).
