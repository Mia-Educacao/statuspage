const DATADOG_COMPONENTS_URL = 'https://status-servicos.statuspage.datadoghq.com/api/v2/components.json';

export async function GET() {
  try {
    const response = await fetch(DATADOG_COMPONENTS_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'IonicaStatusPage/1.0',
      },
    });

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: `Datadog respondeu com status ${response.status}`,
        },
        { status: 502 },
      );
    }

    const payload = await response.json();
    const components = Array.isArray(payload?.components) ? payload.components : [];

    return Response.json(
      {
        ok: true,
        page: payload?.page ?? null,
        components,
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
        error: error instanceof Error ? error.message : 'Erro inesperado ao consultar o Datadog',
      },
      { status: 502 },
    );
  }
}
