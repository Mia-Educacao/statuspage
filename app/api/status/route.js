import * as cheerio from 'cheerio';

const DATADOG_STATUS_PAGE_URL = 'https://status-servicos.statuspage.datadoghq.com/';

function cleanText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseComponent($, element, position, groupId = null, isGroup = false) {
  const node = $(element);
  const id = node.attr('data-component-id');
  const status = node.attr('data-component-status') || 'operational';
  const name = cleanText(node.find('.name').first().text());

  if (!id || !name) return null;

  return {
    id,
    name,
    status,
    position,
    group: isGroup,
    group_id: groupId,
  };
}

function parseStatusPageHtml(html) {
  const $ = cheerio.load(html);
  const components = [];
  let position = 0;

  $('.components-container > .component-container').each((_, container) => {
    const wrapper = $(container);
    const isGroup = wrapper.hasClass('is-group');

    if (isGroup) {
      const groupElement = wrapper.children('.component-inner-container').first();
      const group = parseComponent($, groupElement, position++, null, true);
      if (!group) return;

      components.push(group);

      wrapper
        .children('.child-components-container')
        .children('.component-inner-container')
        .each((__, child) => {
          const component = parseComponent($, child, position++, group.id, false);
          if (component) components.push(component);
        });

      return;
    }

    const standaloneElement = wrapper.children('.component-inner-container').first();
    const component = parseComponent($, standaloneElement, position++, null, false);
    if (component) components.push(component);
  });

  return components;
}

export async function GET() {
  try {
    const response = await fetch(DATADOG_STATUS_PAGE_URL, {
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: `Página pública do Datadog respondeu com status ${response.status}`,
        },
        { status: 502 },
      );
    }

    const html = await response.text();
    const components = parseStatusPageHtml(html);

    if (!components.length) {
      return Response.json(
        {
          ok: false,
          error: 'A página pública respondeu, mas nenhum serviço pôde ser identificado no HTML.',
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        ok: true,
        source: 'public-status-page-html',
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
        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao consultar a página pública do Datadog',
      },
      { status: 502 },
    );
  }
}
