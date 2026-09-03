# Status Page iônica

Página pública de status da iônica, com identidade visual própria e organização de serviços sincronizada com a Status Page do Datadog.

## Arquitetura

- Next.js
- Front-end consulta apenas `/api/status`
- `/api/status` acessa o `config.json` da Status Page no backend
- O `config.json` é a fonte única de verdade para logo, favicon, componentes, agrupamentos, status e incidentes
- A hierarquia `ComponentGroup -> components` é preservada
- Atualização automática a cada 60 segundos
- Sem histórico de disponibilidade passada

### Separação de responsabilidades

- `app/api/status/route.js`: integração server-side com o Datadog, validação da resposta e tratamento de falhas
- `lib/status.js`: regras puras de domínio, como status do agrupamento, disponibilidade e relacionamento de incidentes
- `app/page.js`: estado da interface, atualização periódica e renderização
- `app/styles.css`: apresentação visual responsiva

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

## Fonte de dados

O backend executa uma requisição server-side para a URL configurada em `DATADOG_STATUS_PAGE_URL`.

O navegador não acessa o Datadog diretamente. A interface consome apenas:

```text
GET /api/status
```

O endpoint preserva o payload do `config.json` e acrescenta somente metadados internos de leitura, como `ok`, `source` e `fetchedAt`.

## Incidentes

O nó `incidents` é usado para exibir incidentes ativos entre o quadro de disponibilidade e a lista de serviços.

Um incidente é considerado ativo quando não está marcado como resolvido. Para cada incidente, a interface apresenta:

- `title` em destaque
- `description`
- módulos afetados, quando os IDs de `componentsAffected` pertencem a um `ComponentGroup`
- serviços relacionados

O relacionamento é feito por ID. Não existem associações de módulos hardcoded na interface.

Incidentes resolvidos não são apresentados na página atual.

## Status dos agrupamentos

O status de um `ComponentGroup` é derivado do componente filho com maior impacto. A ordem de severidade utilizada é:

1. `major_outage`
2. `partial_outage`
3. `degraded` / `degraded_performance`
4. `maintenance` / `under_maintenance`
5. `operational`

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
3. Configure `DATADOG_STATUS_PAGE_URL` em **Settings > Environment Variables**.
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
config.json
  ↓
Validação e preservação do payload
  ↓
UI + regras de domínio em lib/status.js
  ↓
Disponibilidade + incidentes + agrupamentos + componentes
```

## Resiliência

A integração possui timeout, validação HTTP, validação de JSON e validação mínima do schema. Detalhes técnicos da resposta upstream são registrados no servidor, evitando expor conteúdo de diagnóstico desnecessário para o navegador.
