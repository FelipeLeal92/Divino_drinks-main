# Deploy e armazenamento

O `server.js` exporta o aplicativo Express e só abre uma porta quando executado diretamente (`npm start`). O `vercel.json` encaminha as rotas ao aplicativo e inclui os recursos públicos e o conteúdo inicial no pacote.

## Servidor com disco persistente

Esta é a implantação compatível com todas as funcionalidades atuais:

1. Instale Node.js 22+ e execute `npm ci` e `npm run build`.
2. Configure as variáveis de `.env.example`, incluindo `SESSION_SECRET` e `ADMIN_PASSWORD_HASH`.
3. Aponte `DB_PATH` e `UPLOAD_DIR` para o volume persistente ou mantenha os diretórios locais.
4. Execute `npm run db:init`, depois `npm start` com gerenciador de processos.
5. Configure proxy HTTPS para a porta do Node, com `NODE_ENV=production` e `HTTPS=true`.
6. Use uma única instância Node e agende `npm run backup`.

O backend confia em um proxy à frente do processo (`trust proxy = 1`). Ajuste essa configuração caso a topologia seja diferente. A sessão em memória não é compartilhada entre instâncias e desaparece após reinício.

## Vercel

O conteúdo inicial está em `data/content.default.json` e não contém leads. O `.env` e `data/db.json` são ignorados pelo Git. Configure variáveis de ambiente na hospedagem; não publique esses arquivos privados.

O banco JSON, os uploads em disco e as sessões em memória desta implementação não fornecem persistência adequada em funções serverless. Alterar `DB_PATH` para um diretório temporário não resolve essa limitação. O aplicativo responde com erro se uma gravação falhar, sem informar falsamente que o pedido foi salvo.

Antes de usar o formulário e o painel em produção serverless, migre dados, imagens enviadas e sessões para serviços persistentes compartilhados. A configuração atual permite empacotar e servir o site; não transforma o armazenamento local em um banco remoto.

Nenhum deploy é realizado por scripts deste repositório.
