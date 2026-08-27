const DATADOG_STATUS_PAGE_URL = process.env.DATADOG_STATUS_PAGE_URL;

function normalizeStatus(status) {
  if (!status) return 'operational';

  const value = String(status).toLowerCase();
  const aliases = {
    operational: 'operational',
    ok: 'operational',
    up: 'operational',
    degraded: 'degraded_performance',
    degraded_performance: 'degraded_performance',
    partial_outage: 'partial_outage',
    major_outage: 'major_outage',
    outage: 'major_outage',
    under_maintenance: 'under_maintenance',
    maintenance: 'under_maintenance',
  };

  return aliases[value] ?? value;
}

function toComponent(item, position, groupId = null, isGroup = false) {
  if (!item || typeof item !== 'object') return null;

  const id = item.id ?? item.component_id ?? item.componentId ?? item.slug ?? `component-${position}`;
  const name = item.name ?? item.display_name ?? item.displayName ?? item.title;
  if (!name) return null;

  return {
    id: String(id),
    name: String(name),
    status: normalizeStatus(item.status ?? item.state ?? item.component_status ?? item.componentStatus),
    position: Number(item.position ?? item.order ?? position),
    group: isGroup,
    group_id: groupId,
  };
}

function normalizeConfig(payload) {
  const components = [];
  let position = 0;

  const directComponents =
    payload?.components ??
    payload?.data?.components ??
    payload?.page?.components ??
    payload?.status_page?.components ??
    [];

  const groups =
    payload?.groups ??
    payload?.component_groups ??
    payload?.componentGroups ??
    payload?.data?.groups ??
    payload?.data?.component_groups ??
    [];

  if (Array.isArray(groups)) {
    for (const rawGroup of groups) {
      const group = toComponent(rawGroup, position++, null, true);
      if (!group) continue;
      components.push(group);

      const children = rawGroup.components ?? rawGroup.children ?? rawGroup.items ?? [];
      if (Array.isArray(children)) {
        for (const rawChild of children) {
          const child = toComponent(rawChild, position++, group.id, false);
          if (child) components.push(child);
        }
      }
    }
  }

  if (Array.isArray(directComponents)) {
    for (const rawComponent of directComponents) {
      const isGroup = rawComponent?.group === true || rawComponent?.is_group === true || rawComponent?.isGroup === true;
      const groupId = rawComponent?.group_id ?? rawComponent?.groupId ?? rawComponent?.parent_id ?? rawComponent?.parentId ?? null;
      const component = toComponent(rawComponent, position++, groupId ? String(groupId) : null, isGroup);
      if (component && !components.some((existing) => existing.id === component.id)) {
        components.push(component);
      }
    }
  }

  return components.sort((a, b) => a.position - b.position);
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
    const response = await fetch(DATADOG_STATUS_PAGE_URL, {
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
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
    const components = normalizeConfig(payload);

    if (!components.length) {
      return Response.json(
        {
          ok: false,
          error: 'O config.json respondeu, mas não foi possível identificar grupos ou serviços no payload.',
          source: 'datadog-config-json',
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        ok: true,
        source: 'datadog-config-json',
        sourceUrl: DATADOG_STATUS_PAGE_URL,
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
        error: error instanceof Error ? error.message : 'Erro inesperado ao consultar o config.json do Datadog',
      },
      { status: 502 },
    );
  }
}
