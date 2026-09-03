const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_MAX_AGE_SECONDS = 55;

export const dynamic = 'force-dynamic';

function getConfiguredUrl() {
  const value = process.env.DATADOG_STATUS_PAGE_URL;
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function buildHeaders(configUrl) {
  return {
    Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'User-Agent': 'IonicaStatusPage/1.0',
    Referer: new URL('/', configUrl).toString(),
  };
}

function upstreamError(message, status = 502) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const configUrl = getConfiguredUrl();

  if (!configUrl) {
    return upstreamError(
      'Variável de ambiente DATADOG_STATUS_PAGE_URL ausente ou inválida.',
      500,
    );
  }

  try {
    const response = await fetch(configUrl, {
      cache: 'no-store',
      redirect: 'follow',
      headers: buildHeaders(configUrl),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error('Datadog status page request failed', {
        status: response.status,
        finalUrl: response.url,
      });
      return upstreamError(`Datadog respondeu com status ${response.status}.`);
    }

    const body = await response.text();
    let payload;

    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('Datadog status page returned invalid JSON', {
        contentType: response.headers.get('content-type'),
        finalUrl: response.url,
        error,
      });
      return upstreamError('A resposta da página de status não é um JSON válido.');
    }

    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.components)) {
      console.error('Unexpected Datadog status page schema', {
        finalUrl: response.url,
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
      });
      return upstreamError(
        'A página de status respondeu em um formato diferente do esperado.',
      );
    }

    return Response.json(
      {
        ...payload,
        incidents: Array.isArray(payload.incidents) ? payload.incidents : [],
        ok: true,
        source: 'datadog-config-json',
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=5`,
        },
      },
    );
  } catch (error) {
    const isTimeout = error?.name === 'TimeoutError';

    console.error('Datadog status page request error', error);

    return upstreamError(
      isTimeout
        ? 'A consulta à página de status excedeu o tempo limite.'
        : 'Não foi possível consultar a página de status neste momento.',
    );
  }
}
