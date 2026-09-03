'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildComponentIndex,
  calculateAvailability,
  getActiveIncidents,
  getGroupStatus,
  getStatusMeta,
  isComponentGroup,
  resolveIncidentImpact,
  sortByPosition,
} from '../lib/status';

const REFRESH_INTERVAL_MS = 60_000;

function IncidentCard({ incident, componentIndex }) {
  const impact = resolveIncidentImpact(incident, componentIndex);
  const hasRelationship = impact.modules.length > 0 || impact.components.length > 0;

  return (
    <article className="incident-card">
      <div className="incident-content">
        <strong className="incident-title">{incident.title || 'Incidente em andamento'}</strong>
        {incident.description && <p className="incident-description">{incident.description}</p>}

        {hasRelationship && (
          <div className="incident-impact">
            {impact.modules.length > 0 && (
              <span>
                <strong>Módulos afetados:</strong> {impact.modules.join(', ')}
              </span>
            )}
            {impact.components.length > 0 && (
              <span>
                <strong>Serviços relacionados:</strong> {impact.components.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ServiceGroup({ group }) {
  const grouped = isComponentGroup(group);
  const groupStatus = grouped ? getGroupStatus(group) : group.status;
  const groupMeta = getStatusMeta(groupStatus);
  const children = grouped ? sortByPosition(group.components) : [group];

  return (
    <article className="service-group">
      <header className="group-header">
        <div>
          <h3>{group.name}</h3>
          {grouped && (
            <span className="component-count">
              {children.length} {children.length === 1 ? 'serviço monitorado' : 'serviços monitorados'}
            </span>
          )}
        </div>
        <span className={`status-chip ${groupMeta.className}`}>{groupMeta.label}</span>
      </header>

      <div className="service-list">
        {children.map((component) => {
          const meta = getStatusMeta(component.status);
          return (
            <div className="service-row" key={component.id}>
              <div className="service-name">
                <span className={`status-dot ${meta.className}`} aria-hidden="true" />
                {component.name}
              </div>
              <span className={`status-text ${meta.className}`}>{meta.label}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function Home() {
  const [data, setData] = useState({ components: [], incidents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível consultar o status atual.');
      }

      setData(payload);
      setError('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Falha ao atualizar os serviços.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const refreshTimer = window.setInterval(loadStatus, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadStatus]);

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

    if (data.name) document.title = `${data.name} | iônica`;
  }, [data.favicon, data.name]);

  const groups = useMemo(() => sortByPosition(data.components), [data.components]);
  const componentIndex = useMemo(() => buildComponentIndex(groups), [groups]);
  const activeIncidents = useMemo(() => getActiveIncidents(data.incidents), [data.incidents]);
  const { availability, allOperational } = useMemo(
    () => calculateAvailability(groups),
    [groups],
  );

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="topbar-inner">
          {data.companyLogoThumbnail ? (
            <img src={data.companyLogoThumbnail} alt="iônica" className="brand-logo" />
          ) : (
            <div className="brand-placeholder">iônica</div>
          )}
        </div>
      </header>

      <section className="status-band" aria-live="polite">
        <div className={`status-card ${allOperational ? 'status-card-ok' : 'status-card-alert'}`}>
          <div className="status-copy">
            <span className="eyebrow">DISPONIBILIDADE EM TEMPO REAL</span>
            <h1>
              {loading
                ? 'Atualizando...'
                : `${availability.toFixed(2).replace('.', ',')}% disponível agora`}
            </h1>
            <p>
              {loading
                ? 'Estou conferindo o estado atual dos serviços para você.'
                : allOperational
                  ? 'Tudo em ordem por aqui. Os serviços monitorados estão operando normalmente.'
                  : 'Identifiquei impacto em um ou mais serviços. Veja abaixo onde está a indisponibilidade.'}
            </p>
          </div>
          <div className="live-pill">
            <span className="pulse" aria-hidden="true" /> Monitoramento ativo
          </div>
        </div>
      </section>

      <div className="content-shell">
        {error && <div className="error-card" role="alert">{error}</div>}

        {activeIncidents.length > 0 && (
          <section className="incidents-section" aria-labelledby="incidents-title">
            <div className="incidents-heading">
              <span className="eyebrow dark">INCIDENTES EM ANDAMENTO</span>
              <h2 id="incidents-title">
                {activeIncidents.length === 1 ? 'Incidente identificado' : 'Incidentes identificados'}
              </h2>
            </div>
            <div className="incidents-list">
              {activeIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id ?? `${incident.title}-${incident.publishedDate}`}
                  incident={incident}
                  componentIndex={componentIndex}
                />
              ))}
            </div>
          </section>
        )}

        <section className="services-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow dark">STATUS DOS SERVIÇOS</span>
              <h2>Status dos serviços</h2>
              <p className="section-description">
                Acompanhe o funcionamento dos ambientes e recursos da iônica neste momento.
              </p>
            </div>
            <span className="source-label">Organização sincronizada com o Datadog</span>
          </div>

          {!loading && groups.map((group) => (
            <ServiceGroup key={group.id} group={group} />
          ))}
        </section>
      </div>
    </main>
  );
}
