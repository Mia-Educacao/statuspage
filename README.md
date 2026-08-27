# Status Page iônica

Página pública de status da iônica, com identidade visual própria e organização de serviços sincronizada com a Status Page do Datadog.

## Arquitetura

- Next.js
- Front-end consulta apenas `/api/status`
- `/api/status` acessa o `config.json` da Status Page no backend
- A resposta é normalizada server-side para o modelo usado pela interface
- Atualização automática a cada 60 segundos
- Sem histórico de incidentes ou disponibilidade passada

## Configuração

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Variável obrigatória:

```env
DATADOG_STATUS_PAGE_URL=https://status-servicos.statuspage.datadoghq.com/config.json
```

A URL não fica hardcoded no código.

## Fonte de dados atual

O backend executa uma requisição equivalente a:

```bash
curl --location 'https://status-servicos.statuspage.datadoghq.com/config.json'
```

O navegador não acessa o Datadog diretamente. A interface consome apenas o endpoint interno:

```text
GET /api/status
```

O backend lê `DATADOG_STATUS_PAGE_URL`, consulta o JSON e normaliza grupos, serviços, ordem e status para a estrutura usada pela página.

Essa estratégia substitui temporariamente o endpoint `/api/v2/components.json`, que estava retornando HTTP 403.

## Executar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`.

## Deploy na Vercel

1. Importe o repositório `Mia-Educacao/statuspage` na Vercel.
2. Framework preset: Next.js.
3. Configure a variável `DATADOG_STATUS_PAGE_URL` em **Settings > Environment Variables**.
4. Valor atual:

```text
https://status-servicos.statuspage.datadoghq.com/config.json
```

5. Habilite a variável nos ambientes desejados, principalmente Production e Preview.
6. Faça o redeploy.

## Fluxo

```text
Browser
  ↓
GET /api/status
  ↓
Next.js server-side
  ↓
DATADOG_STATUS_PAGE_URL
  ↓
GET .../config.json
  ↓
Normalização do JSON
  ↓
JSON com grupos + serviços + status
  ↓
Renderização da página iônica
```

## Observação

O normalizador aceita algumas variações comuns de estrutura (`components`, `groups`, `component_groups` e equivalentes). Caso o schema efetivo do `config.json` seja diferente, o endpoint retorna um erro explícito em vez de assumir dados inexistentes.
