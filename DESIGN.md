# Design — Divino Drinks

## Identidade preservada

Preto #0A0A0A/#0E0E0E, superfícies #121212, dourado #D4A817, texto #E9E9E9 e apoio #B5B5B5. Texto escuro sobre botões dourados. Vermelho apenas para erros e exclusão.

## Painel administrativo

Direção apresentada em docs/ui-review/proposta-painel.png: navegação persistente, editor de uma seção por vez e prévia lateral. Interface de operação: Poppins local, campos16px, controles44px, sem animações da landing. CSS independente em public/css/admin.css.

Estado de alterações não salvas, salvar/descarte, erros contextuais e exclusões reversíveis antes de salvar. No celular, seletor de seção e prévia sob demanda. Layout adaptado sem transbordamento.

## Site público

Reorganização editorial implementada após o painel: abertura, portfólio, serviços, apresentação institucional, depoimentos e orçamento. Fotografia e marca preservadas, textos complementares expansíveis e depoimentos sem avanço automático. Estilos em public/css/editorial.css. Formulário aceita data e quantidade de convidados ainda indefinidas.

Após revisão do usuário, serviços e orçamento alternam o preto com o neutro claro existente #E9E9E9; formulário branco com texto escuro e CTA dourado. Tons mais escuros de dourado são usados nos links sobre fundo claro para legibilidade. A fotografia de abertura tem menos escurecimento. Formulário em duas colunas no desktop, mensagem de duas linhas; no celular, contato em coluna e data/convidados lado a lado. Logos do cabeçalho e rodapé retornam ao topo com respeito a movimento reduzido.
