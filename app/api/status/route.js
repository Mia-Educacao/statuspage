const DATADOG_STATUS_PAGE_URL = process.env.DATADOG_STATUS_PAGE_URL;

function getBaseUrl(configUrl) {
  try {
    return new URL('/', configUrl).toString();
  } catch {
    return undefined;
  }
}

export async function GET() {
  if (!DATADOG_STATUS_PAGE_URL) {
    return Response.json(
      {
        ok: false,
        error: 'Variável de ambiente DATADOG_STATUS_PAGE_URL não configurada.',
      },
      { status: 500 },
    );
  }

  try {
    const baseUrl = getBaseUrl(DATADOG_STATUS_PAGE_URL);
    const response = await fetch(DATADOG_STATUS_PAGE_URL, {
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        Accept: '*/*',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'User-Agent': 'curl/8.7.1',
        ...(baseUrl ? { Referer: baseUrl } : {}),
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: `Datadog respondeu com status ${response.status}`,
          status: response.status,
          contentType,
          finalUrl: response.url,
          bodyPreview: body.slice(0, 180),
        },
        { status: 502 },
      );
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      const looksLikeHtml = /^\s*<!doctype html|^\s*<html/i.test(body);
      return Response.json(
        {
          ok: false,
          error: looksLikeHtml
            ? 'O Datadog retornou HTML em vez de JSON para config.json.'
            : 'A resposta do Datadog não é um JSON válido.',
          contentType,
          finalUrl: response.url,
          bodyPreview: body.slice(0, 180),
        },
        { status: 502 },
      );
    }

    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.components)) {
      return Response.json(
        {
          ok: false,
          error: 'O config.json respondeu, mas o atributo components não está no formato esperado.',
          source: 'datadog-config-json',
          contentType,
          finalUrl: response.url,
          payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 30) : [],
        },
        { status: 502 },
      );
    }

    // O config.json é a fonte única de verdade. Mantemos sua estrutura original,
    // incluindo ComponentGroup -> components, logo, favicon e metadados da página.
    return Response.json(
      {
        ...payload,
        ok: true,
        source: 'datadog-config-json',
        sourceUrl: DATADOG_STATUS_PAGE_URL,
        finalUrl: response.url,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=55, stale-while-revalidate=5',
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro inesperado ao consultar o config.json do Datadog',
      },
      { status: 502 },
    );
  }
}
