# Validação — 19/11/2026

## Atualização — 20/11/2026

Refinamento posterior solicitado pelo usuário: alternância clara nas seções de serviços/orçamento, formulário compacto e logos com retorno ao topo. Lint/build e os cinco testes públicos afetados passaram; envio, opção de dados indefinidos e teste específico de compactação/logos foram revalidados após o acabamento. Capturas inspecionadas em `docs/ui-review/formulario-compacto-desktop.png` (1200×595, seção de orçamento) e `formulario-compacto-mobile.png` (350×750, formulário). O teste confere duas colunas e altura abaixo de650px no desktop, altura abaixo de900px e ausência de transbordamento no celular, retorno real a scrollY0 pelas duas logos e fechamento do menu mobile ao clicar na logo.

Novo painel, login e reorganização editorial implementados, preservando preto/dourado e os 12 leads reais. `npm run lint`, `npm run build` (110 referências), `npm test` (16 testes) e `git diff --check` aprovados. Testes usam banco e uploads temporários, sem envio SMTP real.

Cobertura adicional: seis seções administrativas sem overflow em 390 px, labels associados, campos de 16 px, botões com mínimo de 44 px; prévia durante edição; salvar/descarte; proteção real de navegação com beforeunload; desfazer remoção; ordem e capa persistidas; preservação de formatação antiga; resposta de erro mantém texto; upload pela interface e persistência; login com senha visível/oculta; ordem editorial das seções e orçamento com data/convidados indefinidos; telefone fixo com máscara correta.

Capturas finais estáveis em `docs/ui-review/`: `novo-painel-desktop.png`, `novo-painel-mobile.png`, `nova-galeria.png`, `novo-login-mobile.png`, `novo-site-desktop.png` e `novo-site-mobile.png`. Geradas com conteúdo inicial sem leads e inspecionadas após a implementação. A suíte completa passou com 16 testes; após ajuste final do recorte das fotos, os dois testes públicos desktop/mobile passaram novamente. Inspeção em Chrome headless, com viewports 1440×1000 e 390×844. Não houve deploy, teste físico de Safari/iOS ou teste com leitor de tela real.

Detector estático: aviso de hierarquia no painel é falso positivo por resolução de `/css/admin.css` fora de public; navegador carrega o arquivo correto. Três avisos de padding nos blocos institucionais correspondem a linhas superiores sem bordas laterais; conferidos visualmente. O menu mobile foi retestado após remover o filtro do cabeçalho que limitava o contêiner da navegação fixa.

## Resultado

- `npm run lint`: aprovado.
- `npm run build`: 104 referências locais conferidas, nenhum arquivo ausente.
- `npm test`: 10 testes aprovados em Chrome, incluindo viewport desktop 1440×1000 e celular 390×844.
- `npm audit --omit=dev`: zero vulnerabilidades reportadas. A instalação final também reportou zero incluindo desenvolvimento.
- `git diff --check`: aprovado; apenas avisos de conversão LF/CRLF do Git no Windows.
- `npm run backup`: executado com sucesso em `backups/backup-2026-11-19T22-09-28-606Z/`.
- Banco local mantém os 12 leads preexistentes; conteúdo inicial versionado não contém leads. Banco, cookies locais e backups permanecem ignorados pelo Git.

## Cobertura

1. API de conteúdo pública, sem leads; painel e API de leads protegidos.
2. Login inválido com e-mail de tamanho diferente sem erro do servidor.
3. Salvamento das seis seções sem perda de campos; rejeição de imagem inexistente.
4. Upload de foto válida e leitura do arquivo; rejeição de arquivo falso e tipo proibido.
5. Leads gravados simultaneamente, sem perda; datas impossíveis rejeitadas.
6. Fotos visíveis e todas as 17 fotos de álbuns decodificadas no navegador, lightbox e teclado, links de WhatsApp.
7. Menu mobile, ausência de chamadas da API durante rolagem e largura sem transbordamento.
8. Envio do orçamento pelo formulário com mensagem de sucesso e persistência.
9. IDs únicos ao adicionar álbuns; texto com aspas e caracteres especiais após salvar/recarregar o painel.
10. Banco corrompido preservado; falha de gravação sem alterar estado, com recuperação na próxima tentativa.

Os testes usam banco e uploads temporários; o SMTP foi desativado nesse ambiente. Nenhum e-mail real foi enviado.

## Evidências e limites

Screenshots em `test-results/desktop.png` e `test-results/mobile.png`; resultados em `test-results/.last-run.json`. A inspeção de interface usou a skill Impeccable; foram corrigidos transbordamento horizontal e contraste dos botões dourados. O detector estático não resolveu o CSS do painel fora de `public/`; a rota real e os estilos foram carregados nos testes de navegador.

Não houve deploy nem validação de entrega SMTP real. Sessões continuam em memória e dados/uploads em disco, com suporte a uma instância Node. Para produção serverless é necessário armazenamento persistente compartilhado; detalhes em `DEPLOY_VERCEL.md`.
