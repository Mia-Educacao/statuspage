'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_META = {
  operational: { label: 'Operacional', className: 'ok' },
  degraded_performance: { label: 'Desempenho degradado', className: 'warning' },
  partial_outage: { label: 'Indisponibilidade parcial', className: 'warning' },
  major_outage: { label: 'Indisponível', className: 'danger' },
  under_maintenance: { label: 'Em manutenção', className: 'maintenance' },
};

function getStatusMeta(status) {
  return STATUS_META[status] ?? { label: status || 'Desconhecido', className: 'neutral' };
}

function deriveGroups(components) {
  const groups = components.filter((component) => component.group === true);
  const childrenByGroup = new Map();

  for (const component of components) {
    if (!component.group_id) continue;
    if (!childrenByGroup.has(component.group_id)) childrenByGroup.set(component.group_id, []);
    childrenByGroup.get(component.group_id).push(component);
  }

  return groups.map((group) => ({
    ...group,
    children: (childrenByGroup.get(group.id) ?? []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  }));
}

function deriveStandalone(components) {
  return components
    .filter((component) => component.group !== true && !component.group_id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Não foi possível consultar o status');
      setData({ components: payload.components ?? [], fetchedAt: payload.fetchedAt ?? new Date().toISOString() });
      setSecondsAgo(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar os serviços');
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

  const leafComponents = useMemo(
    () => data.components.filter((component) => component.group !== true),
    [data.components],
  );

  const operationalCount = leafComponents.filter((component) => component.status === 'operational').length;
  const availability = leafComponents.length ? Math.floor((operationalCount / leafComponents.length) * 10000) / 100 : 100;
  const allOperational = leafComponents.length > 0 && operationalCount === leafComponents.length;
  const groups = useMemo(() => deriveGroups(data.components), [data.components]);
  const standalone = useMemo(() => deriveStandalone(data.components), [data.components]);

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="brand-row">
          <img src="/logo.png" alt="iônica" className="brand-logo" />
          <div className="brand-tag">status</div>
        </div>

        <div className={`hero-status ${allOperational ? 'hero-ok' : 'hero-alert'}`}>
          <div className="hero-copy">
            <span className="eyebrow">DISPONIBILIDADE EM TEMPO REAL</span>
            <h1>{loading ? 'Atualizando...' : `${availability.toFixed(2).replace('.', ',')}% disponível agora`}</h1>
            <p>
              {loading
                ? 'Consultando o estado atual dos serviços.'
                : allOperational
                  ? 'Todos os serviços monitorados estão operando normalmente.'
                  : 'Identificamos um ou mais serviços com impacto no momento.'}
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
            <h2>Serviços monitorados</h2>
          </div>
          <span className="source-label">Organização sincronizada com o Datadog</span>
        </div>

        {error && <div className="error-card">{error}</div>}

        {!loading && !error && groups.map((group) => {
          const groupMeta = getStatusMeta(group.status);
          return (
            <article className="service-group" key={group.id}>
              <header className="group-header">
                <h3>{group.name}</h3>
                <span className={`status-chip ${groupMeta.className}`}>{groupMeta.label}</span>
              </header>
              <div className="service-list">
                {group.children.map((component) => {
                  const meta = getStatusMeta(component.status);
                  return (
                    <div className="service-row" key={component.id}>
                      <div className="service-name"><span className={`status-dot ${meta.className}`} />{component.name}</div>
                      <span className={`status-text ${meta.className}`}>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}

        {!loading && !error && standalone.length > 0 && (
          <article className="service-group">
            <header className="group-header"><h3>Outros serviços</h3></header>
            <div className="service-list">
              {standalone.map((component) => {
                const meta = getStatusMeta(component.status);
                return (
                  <div className="service-row" key={component.id}>
                    <div className="service-name"><span className={`status-dot ${meta.className}`} />{component.name}</div>
                    <span className={`status-text ${meta.className}`}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
