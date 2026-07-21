# PLANO.md — Roteiro de fases do PROJETO FPF

Este arquivo é o plano de implementação completo, para continuar o projeto em
qualquer máquina. Leia também o [`CLAUDE.md`](./CLAUDE.md) primeiro — ele tem
o glossário do domínio, convenções e regras de segurança que todo o código
abaixo precisa respeitar.

## Contexto

Dashboard que cruza a performance de campanhas do Gerenciador de Anúncios da
Meta com leads reais que hoje vivem em planilhas do Google Sheets (muitas
coladas manualmente, sem UTM). O cruzamento é declarado via o conceito de
**Ação** (conta + campanhas + fontes de leads + período), nunca adivinhado —
é o que permite atribuir leads a campanhas mesmo sem UTM (atribuição por
*grupo* de campanhas nesse caso, nunca fabricada por campanha individual).

Stack: Next.js 16 (App Router) + Supabase (Postgres + Auth) + GitHub + Vercel.

## Estado atual

- [x] **Fase 0** — Scaffold Next.js 16 + shadcn/ui (Radix) + Tailwind v4,
  design system completo (tokens HSL, glass em 3 níveis, `<BentoGrid>`/
  `<BentoCard>`, tema escuro padrão com toggle claro), shell com as 3 abas +
  Configurações. Deploy-esqueleto rodando em produção na Vercel.
- [x] **Fase 0.5** — Schema completo (13 tabelas) com RLS habilitada tabela a
  tabela, Supabase Vault para segredos (RPCs `save_secret`/`get_secret`/
  `update_secret`), clientes Supabase (`client.ts`/`server.ts`/`admin.ts`).
  Testado manualmente: RLS bloqueia `anon`, libera `service_role`; RPCs do
  Vault negam `anon` (401).
- [x] **Fase 1** — Auth por código único (não login por usuário — decisão do
  cliente, ver CLAUDE.md seção 7), `proxy.ts` protegendo `(dashboard)`, CRUD
  completo de `meta_ad_accounts` com token no Vault, "Testar conexão" real
  contra a Graph API, tela de settings gerais. Testado ponta a ponta com
  Playwright (login, CRUD, teste de conexão retornando erro real da Meta
  para um token inválido, logout).
- [x] **Fase 2** — Sync assíncrono da Meta (state machine em `meta_sync_jobs`,
  `pg_cron`/`pg_net` acordando `/api/cron/process-meta-jobs` a cada minuto,
  `CRON_SECRET` no Vault) + Aba 1 completa (KPIs, gráfico, árvore
  campanha→conjunto→anúncio, top criativos/públicos sem thumbnail ainda,
  status de sync via Realtime). **Validado com as 3 contas reais da FPF**
  (Escola Técnica, Superior, Técnico — token e IDs fornecidos pelo cliente):
  backfill completo desde 01/09/2025 rodou de ponta a ponta pras três,
  investimento e resultados batendo exatamente com uma chamada direta e
  independente à Graph API (R$17.378,99 e 1.059 resultados na primeira
  conta testada). "Resultado" configurável por conta/ação (do brief
  original) e thumbnails de criativo ficaram pra depois — ver CLAUDE.md
  seção 10.
- [x] **Fase 3** — Fontes (CRUD em Configurações), colagem em lote (parser
  TSV/CSV com papaparse, mapeador de colunas com sugestão automática por
  nome, preview server-side antes de gravar, UPSERT idempotente por
  `(source_id, chave)`) + Aba 2 completa (lista de fontes com contagem de
  leads/sem match, tabela de leads filtrável, exportar CSV). Testado ponta a
  ponta: colar o mesmo lote duas vezes (0 novas/3 atualizam na segunda,
  sem duplicar), e os três casos de erro (data inválida, chave vazia, chave
  duplicada no lote) todos detectados corretamente no preview. Cascata de
  match de verdade (Ação/UTM/regra) fica pra Fase 4 — `match_metodo` é
  gravado `null` por enquanto.
- [x] **Fase 4** — Cascata de match determinística (`match_leads()`) + CRUD
  de Ações + Aba 3 completa (KPIs Meta×Planilha, alerta de divergência,
  funil, gráfico, rankings, quebras). Ver detalhes na seção da fase abaixo.
- [ ] Fase 5 em diante — abaixo.

**Setup necessário numa máquina nova:**
1. `git clone` do repositório, `npm install`.
2. Copiar `.env.local.example` para `.env.local` e preencher com os valores
   do projeto Supabase (Project Settings → API): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Para rodar migrations (`supabase db push`) sem Docker: usar a connection
   string do **pooler** (Project → Connect → Session pooler), não o host
   direto `db.<ref>.supabase.co` — nesta configuração ele só resolve em IPv6.
   Ver seção 12 do CLAUDE.md para o formato exato e os gotchas já mapeados
   (incluindo o de `ALTER DEFAULT PRIVILEGES` vazando `EXECUTE` de RPCs para
   `anon`/`authenticated` por padrão).
4. Se a máquina nova tiver Docker instalado, considerar rodar
   `supabase login` (ou setar `SUPABASE_ACCESS_TOKEN`) e usar `supabase link`
   — destrava `supabase gen types typescript --linked`, que aqui teve que ser
   escrito à mão em `src/types/database.types.ts` por falta de Docker/token.
5. Repositório GitHub e projeto Vercel já existem e estão conectados — só
   dar `git push` normalmente acorda o deploy automático.
6. `CRON_SECRET` (Fase 2) precisa estar em **dois lugares batendo**: nas env
   vars da Vercel (`process.env.CRON_SECRET`, lido pela rota) e no Supabase
   Vault com `name = 'cron_secret'` (lido pelo job do `pg_cron` via
   `vault.decrypted_secrets` — ver migration `20260720170008_meta_sync_pg_cron.sql`).
   Trocar o valor exige atualizar os dois.

---

## Fase 1 — Auth + RLS de acesso + Configurações (contas Meta) ✅ concluída

- ~~Supabase Auth (email/senha)~~ — trocado por **código único** a pedido do
  cliente (o link é compartilhado com o cliente final, que só quer um
  código, não cadastro). Por baixo é uma sessão real do Supabase Auth: o
  código é a senha de um usuário fixo (`SHARED_LOGIN_EMAIL` em
  `src/app/(auth)/login/actions.ts`) — a RLS continua exigindo
  `authenticated`, nunca mudar para `to anon`. Signup público **desligado**
  no painel Auth **e** sem nenhuma rota de signup exposta na UI.
- `proxy.ts` (não `middleware.ts` — renomeado no Next.js 16; **com
  `--src-dir` precisa ficar em `src/proxy.ts`**, não na raiz) com
  `@supabase/ssr` protegendo todas as rotas de `(dashboard)`.
- Tela Configurações → Contas: CRUD de `meta_ad_accounts` (label,
  ad_account_id, token, `data_inicio`, timezone, janela de atribuição, ativo)
  via Server Actions passando pelas RPCs do Vault (`save_secret`/
  `get_secret`, já existem desde a Fase 0.5); valores mascarados na listagem.
- Botão **"Testar conexão"**: Server Action → RPC de leitura do Vault
  (server-side) → `GET /{ad_account_id}?fields=name,account_status` na
  Graph API (`META_GRAPH_API_VERSION` de `src/lib/meta/constants.ts`) →
  retorna `{nome, status}` ao cliente, nunca o token.
- Tela Configurações → `settings` (moeda padrão, timezone padrão, janela de
  atribuição padrão) — a tabela já existe e já tem uma linha default.

**Verificação:** signup bloqueado (tentar acessar rota de signup deve
falhar), login funciona, "Testar conexão" retorna nome real da conta Meta.

---

## Fase 2 — Sync Meta assíncrono + Aba 1 (Gerenciador de Anúncios) ✅ concluída

**Arquitetura de sync (state machine em Postgres — a tabela `meta_sync_jobs`
já existe desde a Fase 0.5 — não polling via Vercel Cron, que no Hobby roda
1x/dia, insuficiente pra acompanhar um `report_run_id`):**

- **Despertador**: `pg_cron` (Supabase, granularidade de 1 min) chama via
  `pg_net` `POST /api/cron/process-meta-jobs` a cada minuto, com header
  secreto (`CRON_SECRET`, já reservado em `.env.local.example`) validado na
  rota. `pg_net` é fire-and-forget — a fonte de verdade do estado é sempre a
  linha em `meta_sync_jobs`, nunca a garantia de entrega do cron.
- **A rota faz o polling de verdade internamente**, dentro de um orçamento de
  tempo seguro (~90-120s): pega jobs elegíveis com `FOR UPDATE SKIP LOCKED`;
  se `queued`, dispara o relatório assíncrono (`level=ad`,
  `time_increment=1`, range desde `data_inicio`, campos completos incl.
  `actions`/`action_values`, `use_unified_attribution_setting`) e vira
  `polling`; se `polling`, faz `GET /{report_run_id}` a cada ~10-15s até
  completar ou o orçamento acabar; ao completar, pagina e faz upsert em lote
  em `meta_entities`/`meta_insights_daily`; se o orçamento acabar antes,
  persiste o `cursor` (coluna já existe) e devolve pro próximo minuto
  continuar.
- **Rate limit**: captura `X-Business-Use-Case-Usage` por resposta, persiste
  em `meta_ad_accounts.rate_limit_state` (coluna já existe); dispatcher pula
  contas acima de ~75% de uso. Erros de throttle (código 17, 80000-80004, já
  em `META_THROTTLE_ERROR_CODES`) → status `throttled` + backoff exponencial
  (cap ~30min). Nunca retry imediato, nunca loop de request por linha.
- **Backfill**: range longo desde `data_inicio` quebrado em sub-jobs (ex. por
  mês/trimestre). **Incremental**: job pequeno reprocessando últimos 7 dias,
  disparado sob demanda (botão) — nunca automático em alta frequência.
- Resolução de nomes de conversões personalizadas via endpoint de custom
  conversions, cacheado em `meta_custom_conversions` (tabela já existe).
  "Resultado" (quais `action_types` somam) configurável por conta/ação —
  `actions` cru sempre preservado em jsonb.

**Aba 1 (UI):**
- Filtro conta (todas|específica) + período + busca.
- Tabela árvore campanha→conjunto→anúncio alimentada por **view/RPC de
  agregação** sobre `meta_insights_daily` (nunca agregação client-side):
  investimento, resultados, custo/resultado, impressões, alcance,
  frequência, CTR, CPM, CPC.
- Ranking de criativos (thumbnail via `meta_entities.creative`) e de
  públicos, com filtro de investimento mínimo.
- Gráfico investimento×resultados no tempo.
- Progresso de sync via Supabase Realtime assinando `meta_sync_jobs` (sem
  polling do cliente); "último sync" = `MAX(updated_at) WHERE status='done'`
  por conta.

**Verificação:** rodar backfill numa conta real, comparar totais de
investimento/resultados com o Gerenciador de Anúncios da Meta (mesmo
timezone/janela de atribuição).

---

## Fase 3 — Fontes + colagem em lote + Aba 2 (Planilhas/Leads) ✅ concluída

- Parser de TSV/CSV robusto (lib madura tipo papaparse, delimiter
  auto-detect `\t`/`,`, suporta quebras de linha dentro de campos entre
  aspas — split ingênuo por `\n` não funciona aqui). Fica em
  `src/lib/leads/parse.ts` (pasta já existe, vazia).
- Detecção de cabeçalho → mapeador de colunas → salvo em
  `lead_sources.mapeamento` jsonb (coluna já existe), reaproveitado na
  próxima colagem. Coluna não mapeada cai em `leads.extra` jsonb.
- Preview server-side (linhas novas/atualizam/erro: data inválida, CHAVE
  vazia, duplicada no lote) usando a **mesma** função de normalização de
  telefone/email que o commit final usa (`src/lib/leads/normalize.ts`) — uma
  única fonte de verdade.
- UPSERT `ON CONFLICT (source_id, chave) DO UPDATE` — idempotente, recolar o
  lote inteiro não duplica (constraint unique já existe na tabela `leads`).
- Suporte aos dois layouts (CRM completo; Leads+UTM) via mapeador, sem
  engessar colunas fixas no código.
- `import_batches` (tabela já existe) grava auditoria de cada lote +
  relatório de importação na UI.
- Tela: lista de fontes (tipo, ação vinculada, nº leads, último import,
  importar); tabela de leads filtrável+busca+exportar CSV; taxa de match por
  fonte.

**Verificação:** colar um lote real do Sheets duas vezes seguidas — segunda
vez não deve duplicar linhas.

---

- [x] **Fase 4** — Cascata de match determinística em SQL (`match_leads()`,
  Ação → UTM → `regras_match` → "sem origem identificada", nunca descarta
  lead), CRUD de `acoes`/`acao_campanhas`/`acao_fontes`, Aba 3 completa
  (`AcaoBuilder` com Ação salva ou montagem na hora, KPIs Meta×Planilha,
  alerta de divergência configurável, funil CRM, gráfico leads/dia+CPL, top
  criativos/públicos, quebras por dimensão, árvore de campanhas). `commitImport`
  (Aba 2) agora dispara `match_leads()` automaticamente ao final de cada
  colagem. Testado ponta a ponta no navegador (sessão autenticada real via
  API do Supabase Auth, não só `curl` anônimo) contra os 3 fontes/943 leads
  reais de produção: estado vazio, estado com Ação montada, alerta de
  divergência disparando corretamente (leads da planilha muito acima dos
  resultados da Meta pras fontes CRM, que ainda não têm nenhuma Ação
  vinculada em produção) e a regra de honestidade escondendo a árvore por
  campanha quando não há match individual (hoje é sempre o caso — as 3
  fontes reais são CRM sem UTM). **Simplificação assumida nesta fase**: o
  funil CRM não é clicável (não abre lista de leads por etapa) — mostra só
  as contagens; o modelo de filtro da Aba 2 hoje só suporta uma fonte por
  vez, então um drill-down de etapa×múltiplas-fontes ficaria maior que o
  resto da fase. Fica pra Fase 6 se o cliente pedir.

---

## Fase 5 — Sync Google Sheets por link

- Google Sheets API v4, leitura read-only via service account; credencial
  cifrada no Vault (mesmo padrão de `meta_ad_accounts.ads_token_secret_id` —
  usar `save_secret`/`get_secret`, adicionar `google_credentials` como nova
  tabela com RLS na mesma migration que a cria).
- Reaproveita 100% o pipeline de mapeamento/preview/upsert da Fase 3 — só
  troca a origem dos dados. Botão "Sincronizar agora"; agendamento espaçado
  se fizer sentido.

---

## Fase 6 — Refino mobile + performance

- Colapso do bento em mobile (KPIs→gráficos→tabelas com scroll horizontal)
  já é a ordem de declaração dos `<BentoCard>` no JSX (convenção estabelecida
  desde a Fase 0) — revisar se todas as telas novas das Fases 2-5 seguiram
  essa ordem.
- Custo de `backdrop-filter` em mobile mitigado reduzindo camadas de glass
  simultâneas; fallback sólido de `prefers-reduced-transparency` já embutido
  nos tokens desde a Fase 0 (`src/app/globals.css`).
- Materialized views para agregações pesadas, refrescadas via `pg_cron`
  (`REFRESH MATERIALIZED VIEW CONCURRENTLY`). Revisão de índices.

---

## Fase 7 — Auditoria de segurança final + deploy de produção

Checklist consolidado (já vinha sendo verificado fase a fase, não é
surpresa): RLS em toda tabela, `service_role` só server-side (`admin.ts`),
signup desligado, segredos só via Vault, nada `NEXT_PUBLIC_` sensível,
validação de entrada em todo endpoint (inclusive colagens em lote). Checklist
de env vars da Vercel. Primeiro backfill real de produção acompanhado de
perto (rate limit, tempo, volume de dados).

Vale reler a seção 7 e a seção 12 (pitfalls) do `CLAUDE.md` inteiras antes de
fechar essa fase — vários dos gotchas de segurança já mordidos (grants de
RPC vazando pra `anon`, por exemplo) merecem virar item explícito do
checklist final.

---

## Regra de processo (vale para todas as fases acima)

Cada fase termina com commit e **espera aprovação explícita do usuário antes
de seguir para a próxima** — não pular esse passo mesmo que o roteiro acima
pareça claro o suficiente para seguir direto.
