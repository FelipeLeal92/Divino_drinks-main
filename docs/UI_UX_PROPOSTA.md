# Divino Drinks — análise UI/UX e proposta

Atualização em 20/11/2026: implementado primeiro o novo painel e, em seguida, a reorganização editorial escolhida pelo usuário. Ver [validação atual](VALIDACAO.md) e capturas `ui-review/novo-painel-desktop.png` e `ui-review/novo-site-desktop.png`. O diagnóstico abaixo permanece como registro do estado avaliado em 19/11, anterior à implementação.

Data: 19/11/2026. Avaliações independentes de design e navegador, com autorização do usuário. Escopo: site, login e painel administrativo; preservar a paleta da marca. Nenhum redesign implementado nesta etapa.

## Diagnóstico

O site comunica o segmento com fotografia, logo e chamada de orçamento. A repetição de cartões, textos centralizados, destaques em maiúsculas e brilho dos botões reduz a sensação de curadoria. O painel funciona como formulário de desenvolvimento e exige do editor conhecer HTML, nomes de ícones e seções técnicas; sua organização precisa ser refeita.

Forças preservadas: identidade preto/dourado, material fotográfico, chamada de orçamento/WhatsApp e divisão funcional das seis seções do conteúdo.

## Prioridades

| Prioridade | Evidência e impacto | Proposta |
| --- | --- | --- |
| P1 — Painel e celular | Largura de documento 441 px numa viewport de 390 px. Saída cobre título. `.hero-badges` compartilha flex/animação da landing e estica botão Adicionar Badge até 153 px. | Estilos próprios do admin, navegação lateral no desktop e seletor no celular, uma seção por vez, cabeçalho compacto e controles sem cortes. |
| P1 — Linguagem e acessibilidade | 28 de 39 controles de texto/select examinados no DOM não têm label associado. Campos com Arial/monospace a 13,33 px; título mostra `<br>`, ícones exigem `star`/`award`. | Labels associados, fonte consistente de 16 px, termos em português, quebra natural de linha e seletor visual de ícone. |
| P1 — Segurança do trabalho | Título alterado se perde ao recarregar, sem aviso; zero regiões status/live no painel. Sucesso/erro por alert e exclusão por confirm. | Estado “Alterações não salvas”, salvar/descarte acessíveis, aviso de saída, mensagens próximas da ação/campo e recuperação sem perder edição. |
| P2 — Galeria e upload | Capa limitada a 100 px, fotos em 80×60 px; linhas inteiras dedicadas a caminhos de arquivo e botões vermelhos. | Grade visual, capa identificada, seleção, edição e reordenação com botões acessíveis além de arrastar; progresso de upload e limite real de 2 MB. |
| P2 — Site comercial | Hero mínimo de 100vh, serviços extensos semelhantes, seis campos obrigatórios no orçamento e carrossel automático. | Composição editorial mais curta, serviços diferenciados, fotos do portfólio, prova social controlada pelo visitante e formulário tolerante a planejamento incompleto. |

Referências: `public/css/styles.css:313`, `public/css/styles.css:324`, `public/css/styles.css:773`, `src/views/admin.html:44`, `public/js/admin.js:91`, `public/js/admin.js:278`, `public/js/admin.js:350`, `public/js/admin.js:365`, `public/index.html:344`.

## Proposta para o painel

Estudo visual: [proposta-painel.png](ui-review/proposta-painel.png), com [SVG editável](ui-review/proposta-painel.svg). A imagem é conceitual; os botões representados não são uma implementação funcional.

- Lateral: Página inicial, Quem somos, Serviços, Depoimentos, Galeria e Contato. Ver site e Sair da conta ficam separados da edição.
- Cabeçalho: seção atual e “Salvar alterações”. Formulário no centro, prévia da seção à direita.
- Separar conteúdo de contatos/redes, evitando mostrar tudo simultaneamente.
- Renomear Hero → Destaque inicial/Página inicial; Badges → Diferenciais; Cards → Serviços ou blocos; Footer → Contato e rodapé; Logout → Sair.
- Usar editor de texto simples para o título e formatação restrita para descrições; o usuário não precisa digitar HTML.
- Mostrar prévia de capa/recorte, formatos WebP/JPG/PNG e limite de 2 MB. Reordenação deve corresponder à ordem salva e exibida no site.
- Estado de edição persistente na tela, salvar/descarte e feedback não bloqueante. Rascunho local recuperável pode ser uma segunda etapa; não confundir com conteúdo publicado.
- No celular, navegação por seletor, campos em coluna, botões com alvo de toque de 44 px como meta de projeto e prévia aberta sob demanda.
- Login: logo, “Acesso ao painel”, email/senha com autocomplete, mostrar senha e mensagem de erro no formulário.

O backend atual salva diretamente no conteúdo do site. Manter o rótulo “Salvar alterações” com a indicação “Salvar atualiza o site imediatamente”. Um fluxo “Rascunho → Publicar” exige novos estados persistidos e não pode ser prometido apenas mudando o texto do botão. Tela de pedidos e biblioteca de mídia compartilhada são evoluções opcionais, fora da primeira entrega.

## Proposta para o site

Direção: apresentação editorial de coquetelaria, com contraste preto/dourado e fotografias bem selecionadas.

1. Cabeçalho com marca, navegação curta e orçamento identificável.
2. Destaque com título curto em Playfair Display e descrição em Poppins; caixa normal, um CTA principal dourado e alternativa discreta para portfólio.
3. Seleção de fotos reais do portfólio e introdução curta da Divino.
4. Serviços com diferenças claras: Coquetelaria de luxo, Open bar, Welcome drink e Degustação. Resumo de uma ou duas frases, detalhes sob demanda e menos repetição de cartões iguais.
5. Explicação breve de como contratar, somente com etapas confirmadas pela operação. Não inventar prazo de resposta, avaliações, número de eventos ou promessas comerciais.
6. Depoimentos legíveis, avanço manual ou com pausa acessível; identidade e associação entre foto/autor devem ser conferidas antes de publicar.
7. Orçamento com agrupamentos claros, autocomplete e opção “Ainda não defini” para data/convidados. Avaliar tornar e-mail opcional, priorizando nome, WhatsApp e tipo de evento, se compatível com o atendimento.
8. Contato e rodapé concisos. No celular, apenas uma ação flutuante principal, sem sobrepor formulário ou avisos.

Alterar campos obrigatórios exige atualizar validação da API e tratamento de dados no painel/email. A hipótese de reduzir atrito precisa de validação com usuários ou métricas; não se afirma aumento de conversão.

## Paleta e componentes

| Papel | Cor existente | Uso proposto |
| --- | --- | --- |
| Fundo | `#0A0A0A` / `#0E0E0E` | Base do site e painel |
| Superfície | `#121212` | Áreas de edição e elementos de apoio |
| Ação/seleção | `#D4A817` | Ação primária, seção ativa e foco |
| Texto | `#E9E9E9` | Leitura principal |
| Apoio | `#B5B5B5` | Instruções e metadados |

Dourado seletivo, menos halos e degradês repetidos, mais espaçamento e hierarquia. Texto escuro sobre botão dourado. Vermelho reservado a erro/remoção; não vira cor de navegação. Fonte da interface consistente, texto de formulário com 16 px, larguras de leitura contidas. Respeitar preferência de movimento reduzido e foco visível.

## Avaliação heurística

Pontuação qualitativa de 0 a 4 por heurística. Não é um teste de usabilidade com clientes, certificação de acessibilidade ou métrica de conversão. Flexibilidade avançada e documentação não foram pontuadas na landing comercial.

| Heurística | Site | Painel |
| --- | ---: | ---: |
| Visibilidade do estado | 3 | 2 |
| Linguagem próxima do usuário | 3 | 1 |
| Controle e liberdade | 2 | 1 |
| Consistência | 3 | 1 |
| Prevenção de erros | 2 | 2 |
| Reconhecer em vez de memorizar | 3 | 1 |
| Eficiência | n/a | 1 |
| Estética e simplicidade | 2 | 1 |
| Recuperação de erros | 2 | 1 |
| Ajuda contextual | n/a | 1 |
| Total | 20/32 | 12/40 |

Carga cognitiva alta no editor: traduzir jargões, imaginar resultado, lembrar alterações e localizar salvar após rolar. A presença de seis itens no menu não é, por si só, defeito; a navegação persistente deve ajudar a localizar a tarefa.

Visitante mobile: deseja identificar o serviço e iniciar contato; textos longos e dados ainda indefinidos dificultam a jornada. Editor iniciante: precisa trocar texto/foto sem conhecer HTML. Editor frequente: precisa salvar e revisar sem interrupções. Usuário de teclado/leitor de tela: depende de associação de labels, foco visível, ordem de navegação e anúncios de estado.

## Evidências, limites e sequência

Capturas atuais em `ui-review/`; medidas detalhadas em `ui-review/browser-evidence-B.json`. Menu mobile validado num contexto novo de 390×844: funciona e não apresenta transbordamento; a captura após resize continha um estado transitório e foi descartada como prova de bug.

O detector retornou um alerta `flat-type-hierarchy` no admin, falso positivo por não resolver o CSS fora da pasta pública. O navegador confirmou títulos de 32/24/18,72 px. O teste de execução de script inline foi bloqueado pela CSP; não houve overlay visual humano. As evidências principais são navegador e código, não contagem automática.

Sequência recomendada: (1) estrutura responsiva do painel e labels; (2) estado de edição/salvamento e mídia; (3) refinamento do site e formulário; (4) validação de teclado, mobile, uploads, perda/recuperação de edição e fluxos comerciais. Os testes funcionais anteriores não substituem essas verificações de UX.

Perguntas para orientar a implementação: priorizar o painel primeiro ou as duas experiências juntas? No site, refinar a composição atual ou reorganizar as seções com direção editorial? Paleta preta/dourada preservada em ambas as opções.
