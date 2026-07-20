@AGENTS.md

# PROJETO FPF — Dashboard de Performance

## 1. Visão geral

Dashboard que cruza a performance de campanhas do Gerenciador de Anúncios da Meta
com leads reais que hoje vivem em planilhas do Google Sheets (muitas coladas
manualmente, sem UTM).

**Conceito central: "Ação".** Uma Ação é a unidade de análise — ela amarra 1 conta
de anúncios + N campanhas dessa conta + N fontes de leads (abas de planilha) +
um período opcional. Todo cruzamento no dashboard parte de uma Ação, seja montada
na hora nos seletores ou salva pra reuso. É o que permite cruzar leads com
campanhas mesmo quando a planilha não tem UTM: nesse caso a atribuição é sempre no
nível do *grupo* de campanhas da Ação, nunca inventada por campanha individual.

## 2. Stack & versões

- Next.js **16.2.x** (App Router, Turbopack por padrão), React 19.2.
- Supabase (Postgres + Auth), cloud-only em dev (sem Docker nesta máquina).
- shadcn/ui sobre Radix (`-b radix`) + Tailwind v4 (tokens no bloco `@theme inline`
  do `globals.css`, não em `tailwind.config.ts`).
- `META_GRAPH_API_VERSION` em `src/lib/meta/constants.ts` — **única constante**,
  hoje `v25.0`. A Meta aposenta versões ~2 anos após lançamento; **revisar a cada
  6 meses** em https://developers.facebook.com/docs/graph-api/changelog/versions/.
- Sempre checar a versão estável mais recente antes de atualizar uma lib —
  não assumir pela memória de treinamento.

## 3. Comandos

```
npm run dev      # next dev (Turbopack)
npm run build    # next build
npm run start    # next start
npm run lint     # eslint
```

A partir da Fase 0.5 (Supabase linkado):
```
supabase db push                                          # aplica migrations
supabase gen types typescript --linked > src/types/database.types.ts
```

## 4. Mapa de pastas

- `src/app/(auth)/` — login, sem o shell do dashboard.
- `src/app/(dashboard)/` — shell com header + nav das 3 abas (`anuncios`,
  `planilhas`, `visualizacao`) + `configuracoes/{contas,fontes}`.
- `src/app/api/meta/sync`, `api/leads/import`, `api/cron/process-meta-jobs` —
  rotas server-only; a de cron usa segredo compartilhado, não sessão de usuário.
- `src/components/ui/` — gerado pelo shadcn, não editar à mão (reinstalar via
  `npx shadcn@latest add <componente>` se precisar mudar).
- `src/components/bento/` — `<BentoGrid>` + `<BentoCard span="1x1|2x1|2x2|4x1">`.
  Toda tela de dashboard se monta com eles.
- `src/components/glass/` — `<GlassSurface level="surface|card|popover">`, wrapper
  genérico pros casos que não são um `BentoCard`.
- `src/components/logo.tsx` — `<Logo>` usado no header e na tela de login.
  Logo original (`public/brand/fpf-logo-animated.webp`, 65 frames) tem
  letreiro escuro pensado pra fundo claro; a versão usada no app
  (`public/brand/fpf-logo.png`) é a última frame recortada e com o fundo
  removido (chroma-key), envolvida num selo branco fixo no componente — sem
  o selo o texto desaparece no tema escuro.
- `src/lib/supabase/{client,server,admin}.ts` — **`admin.ts` é o único arquivo
  autorizado a instanciar cliente com `service_role`**. Nunca importar de Client
  Component.
- `src/lib/meta/` — cliente da Graph API, constante de versão, fila de sync.
- `src/lib/leads/` — parse de TSV/CSV, normalização (telefone/email), cascata de
  match.
- `src/lib/format/` — formatação pt-BR centralizada (moeda BRL, número, data).
  Usar sempre essas funções, não `toLocaleString` solto pelo código.
- `supabase/migrations/` — schema como código; toda mudança de banco é uma
  migration, nunca alteração manual direto no dashboard cloud.

## 5. Convenções de código

- Server Components por padrão; Client Component (`"use client"`) só quando
  precisa de interatividade (estado, hooks de evento, `next-themes`, etc.).
- Nomenclatura de domínio (tabelas, campos, rótulos de UI) em português —
  reflete a linguagem do negócio (Ação, Fonte, Regra de match). Identificadores
  de código (funções, tipos, variáveis) em inglês.
- Dinheiro e métricas no Postgres são sempre `numeric`, nunca `float`.
- Datas exibidas sempre no **timezone da conta de anúncios** (`meta_ad_accounts.timezone`),
  nunca no timezone do navegador — senão os totais não batem com o Gerenciador.
- Moeda: guardar a moeda por conta; nunca somar cego contas em moedas diferentes.
- Agregação pesada (somas, médias, rankings) em view/materialized view ou RPC no
  Postgres — nunca no cliente.
- **Next.js 16 tem mudanças que quebram padrões antigos.** Antes de escrever
  código de rota/middleware/cache, checar `node_modules/next/dist/docs/` ou a doc
  oficial — não assumir pelo que já foi visto em projetos Next mais antigos.
  Exemplos já mapeados neste projeto:
  - `middleware.ts` foi renomeado para **`proxy.ts`** (export `proxy`, não
    `middleware`) e roda **só server-side** — Server Functions ignoram o
    matcher dele, então cada Server Action sensível ainda precisa checar a
    sessão por conta própria (`requireUser()` nas actions de
    `configuracoes/contas`, por exemplo). Com `--src-dir`, o arquivo vai em
    **`src/proxy.ts`** (irmão de `src/app`), não na raiz do projeto — colocar
    na raiz faz o Next.js simplesmente não compilar/rodar o proxy, sem erro
    nenhum (mordido na Fase 1: rota ficava aberta sem sessão e não avisava).
  - O `matcher` do proxy precisa excluir qualquer arquivo estático novo em
    `public/` (ex.: `public/brand/*`), não só `_next/static`/`_next/image` —
    senão o proxy redireciona a própria imagem pra `/login` quando não há
    sessão (e o otimizador de imagem do Next recebe HTML em vez do arquivo,
    erro "isn't a valid image"). Padrão usado:
    `.*\.\w+$` como negative lookahead extra no matcher.
  - `cookies()`, `headers()`, `params`, `searchParams` são sempre assíncronos
    (`await`) — não há mais acesso síncrono.
  - `revalidateTag` agora exige um segundo argumento (`cacheLife` profile).

## 6. Design system

- Tema escuro é o padrão (`:root`), tema claro é a classe `.light` (via
  `next-themes`, `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`).
- Cores em HSL nas variáveis CSS (`src/app/globals.css`). Primária verde-neon:
  escuro `142 76% 58%`, claro `142 70% 26%`. Accents: `--accent-cyan`,
  `--accent-amber`. `--radius: 0.625rem`.
- Glass em 3 níveis de profundidade, cada um com suas próprias variáveis —
  **não espalhar valores mágicos de blur/opacidade pelos componentes**:
  - `.glass-surface` (nível 1) — superfícies grandes: header, sidebar.
  - `.glass-card` (nível 2) — `<BentoCard>`.
  - `.glass-popover` (nível 3) — modal/popover/dropdown, o mais opaco dos três.
  - Fallback de acessibilidade/performance já embutido nos tokens via
    `@media (prefers-reduced-transparency: reduce)` — zera blur e vira superfície
    sólida automaticamente. Não precisa tratar isso componente a componente.
  - **Nunca** aplicar `.glass-*`/`backdrop-filter` em linha de tabela ou item de
    lista repetido (custo de performance). Tabela densa usa superfície sólida
    (`bg-card`), não vidro — a legibilidade cede o efeito, nunca o contrário.
- `<BentoGrid>`: 12 colunas desktop (`xl:`) → 6 tablet (`md:`) → 1 mobile (base).
  `<BentoCard span="...">` usa classes Tailwind estáticas via CVA — nunca montar
  `col-span-${n}` em runtime (o JIT não detecta).
  **A ordem de colapso no mobile é a ordem de declaração dos `<BentoCard>` no
  JSX.** Sempre declarar KPIs primeiro, gráficos depois, tabelas por último.
- Fontes: Manrope (`--font-sans`, texto) e JetBrains Mono (`--font-mono`,
  números/JSON). Números tabulares via classe utilitária `.tabular-data` ou
  `tabular-nums` do Tailwind.
- Formatação pt-BR sempre via `src/lib/format/` (BRL, milhar com ponto, decimal
  com vírgula, datas dd/mm/aaaa).

## 7. Segurança — regras inegociáveis

- RLS ligada em **toda tabela nova, na mesma migration que a cria** — nunca numa
  migration separada de "ligar RLS depois". Leitura só `authenticated`, escrita
  só `service_role`.
- `service_role` só é instanciado em `src/lib/supabase/admin.ts`, chamado
  exclusivamente de código server-only (Server Actions, Route Handlers). Nunca
  em Client Component, nunca em resposta HTTP exposta ao browser.
- Segredos (token Meta, credencial de service account do Google) só via
  **Supabase Vault** (`vault.create_secret` / `vault.decrypted_secrets`), nunca
  em coluna plaintext e nunca via `pgcrypto` cru passando chave por SQL. RPCs de
  leitura/escrita de segredo com `GRANT EXECUTE` restrito a `service_role`.
- Nada sensível com prefixo `NEXT_PUBLIC_`. `.env.local` nunca commitado.
- Cadastro público desligado (painel Auth do Supabase + nenhuma rota de signup
  exposta na UI).
- Validar toda entrada no servidor, inclusive as colagens em lote da Aba 2.
- **Auth é por código único, não login por usuário** (decisão do cliente na
  Fase 1: o link vai ser compartilhado com o cliente final, que só quer um
  código, não cadastro). Por baixo continua sendo uma sessão real do Supabase
  Auth — o código é a senha de um usuário fixo (`SHARED_LOGIN_EMAIL` em
  `src/app/(auth)/login/actions.ts`). **Não trocar as policies de RLS para
  `to anon`** para "simplificar" — isso abriria as tabelas pra qualquer um com
  a chave `anon` (pública, vai no bundle do browser), sem precisar nem do
  código. A proteção real é a sessão `authenticated`, não o código em si.
  Se algum dia precisar isolar dados por cliente (múltiplos códigos, cada um
  vendo só a própria Ação), isso exige RLS por linha, não só um código a mais.

## 8. Glossário do domínio

- **Ação** — conta + campanhas + fontes de leads + período opcional. Unidade de
  análise central (ver seção 1).
- **Fonte de leads** — uma aba de planilha, tipo `crm` ou `leads_utm`, com
  mapeamento de colunas salvo (`lead_sources.mapeamento`).
- **Cascata de match** (nessa ordem, sempre a mesma RPC determinística):
  1. **Ação** — sempre funciona; atribuição no nível de grupo de campanhas.
  2. **UTM** — `utm_campaign` → campanha (id exato ou nome normalizado, sem
     acento/pontuação); `utm_content` → anúncio quando der.
  3. **Regra manual** (`regras_match`) — mapeamento editável, sugerido por
     similaridade de nome (`pg_trgm`).
  Lead nunca é descartado sem match — cai no balde "sem origem identificada".
- **"Resultado"** — configurável por conta/ação: quais `action_types` do payload
  `actions` da Meta contam como resultado (lead, mensagem iniciada, conversão
  personalizada). O `actions` cru é sempre preservado em jsonb pra não travar essa
  definição.
- **`import_batches`** — auditoria de cada colagem/sync de leads (linhas
  recebidas/novas/atualizadas/erros).

## 9. Regras de negócio críticas

- **Regra de honestidade na atribuição**: quando o match é só por Ação (sem UTM),
  a UI nunca fabrica métricas por campanha *individual* — mostra no nível de
  grupo e deixa explícito que o rateio por campanha não está disponível pra
  aquela fonte. Onde há UTM, desce o nível.
- Nunca descartar um lead sem match.
- Sempre mostrar a taxa de match e uma lista dos leads não casados, com atalho
  pra criar regra.
- Sync da Meta é **sob demanda** (botão) ou em intervalo espaçado — nunca um
  loop de request por linha, nunca polling contínuo indiscriminado.

## 10. Integrações externas — limites

- Meta: códigos de throttle **17, 80000–80004** (`src/lib/meta/constants.ts`) →
  nunca retry imediato, backoff exponencial. Capturar header
  `X-Business-Use-Case-Usage` e pausar contas acima de ~75% de uso.
- Sync assíncrono da Meta é uma state machine em Postgres (`meta_sync_jobs`),
  acordada a cada 1 min por `pg_cron`/`pg_net` — o Vercel Cron não tem
  granularidade suficiente pra fazer polling de `report_run_id`. Implementada
  na Fase 2 e validada com dados reais (ver seção 11). A fase a retomar
  (iniciar relatório / checar status / paginar) é deduzida de
  `meta_report_run_id`/`cursor` no job, nunca do campo `status` — `status`
  é só pra exibição/elegibilidade de claim. `status = 'throttled'` não é uma
  fase própria, é o mesmo job de antes com `next_poll_at` empurrado.
  `use_unified_attribution_setting=true` sempre, sem passar
  `action_attribution_windows` manual — usa a janela já configurada na
  conta no Gerenciador, é o que faz os números baterem.
- **Gotcha sério já mordido**: uma function Postgres declarada `returns
  public.minha_tabela` (linha única, não `setof`) que não encontra nada pra
  retornar (`RETURNING` de um `UPDATE` que não bateu em nenhuma linha) não
  vira `null` no JSON — o PostgREST serializa o composite nulo como um
  objeto com **todos os campos `null`** (`{"id": null, "status": null, ...}`),
  que é *truthy* em JS. `claim_next_meta_sync_job()` retorna assim quando não
  há job elegível. Um `if (!job) break` não pega isso — precisa checar
  `!job?.id` (ou qualquer coluna `not null`). Sem essa checagem, a rota de
  cron entrava num loop rápido chamando `processJob` com um job todo `null`,
  que falhava rápido em cada volta (por isso não estourava rate limit da
  Meta, só desperdiçava — mas ainda assim é bug real, corrigido em
  `src/app/api/cron/process-meta-jobs/route.ts`). Motivo pra sempre testar
  explicitamente o caminho "fila vazia" de qualquer RPC que devolve linha
  única, não só o caminho feliz.
- **CRON_SECRET usado pelo `pg_cron`/`pg_net` fica no Supabase Vault**
  (`save_secret('cron_secret', ...)`), lido dinamicamente dentro do job SQL
  via `vault.decrypted_secrets` — nunca em texto puro numa migration
  (migrations são versionadas no git). Trocar o valor: `update_secret` no
  Vault, não precisa nova migration. O valor também precisa estar em
  `CRON_SECRET` nas env vars da Vercel (é comparado em
  `src/app/api/cron/process-meta-jobs/route.ts`) — os dois têm que bater.
- **"Resultado" (MVP da Fase 2)**: conjunto fixo de `action_types` (`lead`,
  `offsite_conversion.fb_pixel_lead`, `onsite_conversion.lead_grouped`,
  `onsite_conversion.messaging_conversation_started_7d`) somado direto nas
  RPCs `get_meta_ads_report`/`get_meta_daily_totals`. A definição
  configurável por conta/ação do brief original fica pra quando as Ações
  existirem (Fase 4).
- **Ranking de criativos/públicos (Fase 2) não tem thumbnail** — usa só
  `ad_name`/`adset_name` já desnormalizados em `meta_insights_daily`. Buscar
  thumbnail exige sincronizar `meta_entities.creative` separadamente (outro
  endpoint da Graph API por entidade) — deferido, não implementado ainda.
- Google Sheets API: leitura read-only via service account, cota a respeitar
  (fase 5).

## 11. Estado do projeto

- [x] Fase 0 — Scaffold + design system + CLAUDE.md + deploy-esqueleto
- [x] Fase 0.5 — Schema completo + RLS + Supabase Vault
- [x] Fase 1 — Auth + Configurações (contas Meta)
- [x] Fase 2 — Sync Meta assíncrono + Aba 1
- [ ] Fase 3 — Fontes + colagem em lote + Aba 2
- [ ] Fase 4 — Ações + cruzamento + Aba 3
- [ ] Fase 5 — Sync Google Sheets por link
- [ ] Fase 6 — Refino mobile + performance
- [ ] Fase 7 — Auditoria de segurança final + deploy de produção

Plano completo com detalhes de cada fase: [`PLANO.md`](./PLANO.md) — vive no
repositório (não num caminho local), então acompanha o projeto em qualquer
máquina.

## 12. Pitfalls conhecidos

- O nome da pasta do projeto (`PROJETO FPF`) tem espaço e maiúsculas — inválido
  como nome de pacote npm. `package.json` usa `"name": "projeto-fpf"`
  manualmente; não deixar nenhum tooling tentar re-derivar o nome do diretório.
  Também é um risco conhecido (não confirmado) para builds nativos no Windows
  que não lidam bem com espaço no path — se algo estranho acontecer em
  build/Turbopack, esse é o primeiro suspeito.
- Sem Docker nesta máquina — Supabase em dev é **cloud-only**, projeto dedicado
  separado do de produção. Migrations aplicadas via `supabase db push`, não
  `supabase start`.
- GitHub: repositório é criado manualmente pelo usuário no github.com (sem `gh`
  CLI instalado nesta máquina); o agente configura o remote e faz o push depois.
- **Conexão com o Postgres remoto**: o host de conexão direta
  (`db.<ref>.supabase.co`) só resolve em IPv6, sem rota funcional nesta máquina.
  Use sempre a **connection string do pooler** (Session pooler, porta 5432,
  formato `postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:5432`) via
  `supabase db push --db-url "..."`. Sem Docker nem `supabase login` feito,
  `supabase link` e `gen types --linked/--project-id` não funcionam (pedem
  access token); `db push --db-url` funciona porque fala direto com o Postgres,
  sem passar pela Management API.
- `supabase gen types typescript --db-url` **também não funciona sem Docker**
  (ele sobe um container de introspecção). `src/types/database.types.ts` foi
  escrito à mão a partir das migrations — está correto, mas regenerar com o
  comando oficial assim que houver `supabase login` ou Docker disponível.
- **Gotcha de segurança já mordido uma vez**: toda função nova em `public`
  recebe `EXECUTE` para `anon`/`authenticated` automaticamente via
  `ALTER DEFAULT PRIVILEGES` do Supabase — `revoke ... from public` **não**
  revoga isso, porque o grant é feito direto às roles, não via `PUBLIC`.
  Qualquer RPC nova sensível (ex.: outra função tipo `save_secret`/`get_secret`)
  precisa de `revoke execute on function ... from anon, authenticated;`
  explícito, senão o RPC fica publicamente chamável mesmo com `security definer`
  e RLS em dia. Testado e confirmado do jeito difícil em
  `20260717212000_fix_vault_rpc_grants.sql`.
- **`curl -d`/`--data-raw` com acento nesta máquina corrompe o UTF-8**
  (vira mojibake tipo "TÃ©cnica" em vez de "Técnica") — é a passagem do
  argumento pela linha de comando no Git Bash/Windows, não o servidor. Pra
  mandar JSON com acento via Bash aqui, gerar o body com `node -e
  "console.log(JSON.stringify(...))"`/`fetch` em vez de literal direto no
  `-d` do curl. Mordido corrigindo o label de uma conta na Fase 2.
- **Rota de cron não pode fazer `while` sem pausa quando não há job
  imediatamente elegível** — sem um `sleep` entre tentativas de claim
  vazias, ela martela a RPC `claim_next_meta_sync_job` em loop apertado
  esperando `next_poll_at` chegar, gastando chamadas à toa (funciona, mas
  desperdiça). `src/app/api/cron/process-meta-jobs/route.ts` só espera
  (`IDLE_RETRY_MS`) se já reivindicou algum job nesta invocação — se nunca
  achou nada, desiste rápido em vez de ficar girando.
