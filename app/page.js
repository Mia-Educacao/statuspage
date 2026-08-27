'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_META = {
  operational: { label: 'Operacional', className: 'ok', weight: 0 },
  degraded: { label: 'Desempenho degradado', className: 'warning', weight: 1 },
  degraded_performance: { label: 'Desempenho degradado', className: 'warning', weight: 1 },
  partial_outage: { label: 'Indisponibilidade parcial', className: 'warning', weight: 2 },
  major_outage: { label: 'Indisponível', className: 'danger', weight: 3 },
  under_maintenance: { label: 'Em manutenção', className: 'maintenance', weight: 1 },
  maintenance: { label: 'Em manutenção', className: 'maintenance', weight: 1 },
};

function getStatusMeta(status) {
  return STATUS_META[status] ?? { label: status || 'Desconhecido', className: 'neutral', weight: 0 };
}

function sortByPosition(items = []) {
  return [...items].sort((a, b) => Number(a?.position ?? 0) - Number(b?.position ?? 0));
}

function getGroupStatus(group) {
  const children = Array.isArray(group?.components) ? group.components : [];
  if (!children.length) return 'operational';

  return children.reduce((worst, component) => {
    const current = getStatusMeta(component.status);
    const previous = getStatusMeta(worst);
    return current.weight > previous.weight ? component.status : worst;
  }, 'operational');
}

function collectLeafComponents(groups = []) {
  return groups.flatMap((group) => {
    if (group?.type === 'ComponentGroup' && Array.isArray(group.components)) {
      return group.components;
    }
    return group ? [group] : [];
  });
}

export default function Home() {
  const [data, setData] = useState({ components: [], fetchedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secondsAgo, setSecondsAgo] = useState(0);

  const loadStatus = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/status', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível consultar o status atual.');
      }

      setData(payload);
      setSecondsAgo(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar os serviços.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const refresh = setInterval(loadStatus, 60_000);
    return () => clearInterval(refresh);
  }, [loadStatus]);

  useEffect(() => {
    const timer = setInterval(() => setSecondsAgo((value) => value + 1), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data.favicon) {
      let favicon = document.querySelector("link[rel~='icon']");
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = data.favicon;
    }

    if (data.name) {
      document.title = `${data.name} | iônica`;
    }
  }, [data.favicon, data.name]);

  const groups = useMemo(() => sortByPosition(data.components ?? []), [data.components]);
  const leafComponents = useMemo(() => collectLeafComponents(groups), [groups]);
  const operationalCount = leafComponents.filter((component) => component.status === 'operational').length;
  const availability = leafComponents.length
    ? Math.floor((operationalCount / leafComponents.length) * 10000) / 100
    : 100;
  const allOperational = leafComponents.length > 0 && operationalCount === leafComponents.length;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="brand-row">
          {data.companyLogoThumbnail ? (
            <img src={data.companyLogoThumbnail} alt="iônica" className="brand-logo" />
          ) : (
            <div className="brand-placeholder">iônica</div>
          )}
          <div className="brand-tag">status</div>
        </div>

        <div className={`hero-status ${allOperational ? 'hero-ok' : 'hero-alert'}`}>
          <div className="hero-copy">
            <span className="eyebrow">DISPONIBILIDADE EM TEMPO REAL</span>
            <h1>{loading ? 'Atualizando...' : `${availability.toFixed(2).replace('.', ',')}% disponível agora`}</h1>
            <p>
              {loading
                ? 'Estou conferindo o estado atual dos serviços para você.'
                : allOperational
                  ? 'Tudo em ordem por aqui. Os serviços monitorados estão operando normalmente.'
                  : 'Identifiquei impacto em um ou mais serviços. Veja abaixo onde está a indisponibilidade.'}
            </p>
          </div>
          <div className="live-pill"><span className="pulse" /> Monitoramento ativo</div>
        </div>

        <div className="update-row">
          <span>Atualização automática a cada 60 segundos</span>
          <span>{data.fetchedAt ? `Atualizado há ${secondsAgo}s` : 'Aguardando primeira atualização'}</span>
          <button onClick={loadStatus} type="button">Atualizar agora</button>
        </div>
      </section>

      <section className="services-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow dark">STATUS DOS SERVIÇOS</span>
            <h2>{data.name || 'Serviços monitorados'}</h2>
            <p className="section-description">
              Acompanhe o funcionamento dos ambientes e recursos da iônica neste momento.
            </p>
          </div>
          <span className="source-label">Organização sincronizada com o Datadog</span>
        </div>

        {error && <div className="error-card">{error}</div>}

        {!loading && !error && groups.map((group) => {
          const isGroup = group.type === 'ComponentGroup' || Array.isArray(group.components);
          const groupStatus = isGroup ? getGroupStatus(group) : group.status;
          const groupMeta = getStatusMeta(groupStatus);
          const children = isGroup ? sortByPosition(group.components ?? []) : [];

          return (
            <article className="service-group" key={group.id}>
              <header className="group-header">
                <div>
                  <h3>{group.name}</h3>
                  {isGroup && <span className="component-count">{children.length} {children.length === 1 ? 'serviço monitorado' : 'serviços monitorados'}</span>}
                </div>
                <span className={`status-chip ${groupMeta.className}`}>{groupMeta.label}</span>
              </header>

              {isGroup ? (
                <div className="service-list">
                  {children.map((component) => {
                    const meta = getStatusMeta(component.status);
                    return (
                      <div className="service-row" key={component.id}>
                        <div className="service-name"><span className={`status-dot ${meta.className}`} />{component.name}</div>
                        <span className={`status-text ${meta.className}`}>{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="service-list">
                  <div className="service-row">
                    <div className="service-name"><span className={`status-dot ${groupMeta.className}`} />{group.name}</div>
                    <span className={`status-text ${groupMeta.className}`}>{groupMeta.label}</span>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
