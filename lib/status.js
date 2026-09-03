export const STATUS_META = Object.freeze({
  operational: { label: 'Operacional', className: 'ok', weight: 0 },
  degraded: { label: 'Desempenho degradado', className: 'warning', weight: 1 },
  degraded_performance: { label: 'Desempenho degradado', className: 'warning', weight: 1 },
  partial_outage: { label: 'Indisponibilidade parcial', className: 'warning', weight: 2 },
  major_outage: { label: 'Indisponível', className: 'danger', weight: 3 },
  under_maintenance: { label: 'Em manutenção', className: 'maintenance', weight: 1 },
  maintenance: { label: 'Em manutenção', className: 'maintenance', weight: 1 },
});

const DEFAULT_STATUS_META = Object.freeze({
  label: 'Desconhecido',
  className: 'neutral',
  weight: 0,
});

export function getStatusMeta(status) {
  if (!status) return DEFAULT_STATUS_META;
  return STATUS_META[status] ?? { ...DEFAULT_STATUS_META, label: String(status) };
}

export function sortByPosition(items = []) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => Number(a?.position ?? 0) - Number(b?.position ?? 0));
}

export function isComponentGroup(component) {
  return component?.type === 'ComponentGroup' || Array.isArray(component?.components);
}

export function getGroupStatus(group) {
  const children = Array.isArray(group?.components) ? group.components : [];
  if (!children.length) return 'operational';

  return children.reduce((worstStatus, component) => {
    const current = getStatusMeta(component?.status);
    const worst = getStatusMeta(worstStatus);
    return current.weight > worst.weight ? component.status : worstStatus;
  }, 'operational');
}

export function collectLeafComponents(groups = []) {
  return sortByPosition(groups).flatMap((group) => {
    if (isComponentGroup(group)) return sortByPosition(group.components);
    return group ? [group] : [];
  });
}

export function calculateAvailability(groups = []) {
  const components = collectLeafComponents(groups);
  if (!components.length) {
    return { availability: 100, allOperational: false, total: 0, operational: 0 };
  }

  const operational = components.filter((component) => component?.status === 'operational').length;
  const availability = Math.floor((operational / components.length) * 10000) / 100;

  return {
    availability,
    allOperational: operational === components.length,
    total: components.length,
    operational,
  };
}

export function getActiveIncidents(incidents = []) {
  if (!Array.isArray(incidents)) return [];

  return incidents.filter((incident) => {
    if (!incident || typeof incident !== 'object') return false;
    if (incident.resolved === true) return false;
    return String(incident.currentStatus ?? '').toLowerCase() !== 'resolved';
  });
}

export function buildComponentIndex(groups = []) {
  const index = new Map();

  for (const group of sortByPosition(groups)) {
    if (!group?.id) continue;

    if (isComponentGroup(group)) {
      index.set(String(group.id), {
        component: group,
        group,
      });

      for (const component of sortByPosition(group.components)) {
        if (!component?.id) continue;
        index.set(String(component.id), {
          component,
          group,
        });
      }
      continue;
    }

    index.set(String(group.id), {
      component: group,
      group: null,
    });
  }

  return index;
}

export function resolveIncidentImpact(incident, componentIndex) {
  const affected = Array.isArray(incident?.componentsAffected) ? incident.componentsAffected : [];
  const modules = new Map();
  const components = [];

  for (const affectedComponent of affected) {
    const id = affectedComponent?.id ? String(affectedComponent.id) : null;
    const resolved = id ? componentIndex.get(id) : null;
    const componentName = resolved?.component?.name ?? affectedComponent?.name;
    const group = resolved?.group;

    if (componentName) components.push(componentName);
    if (group?.id && group?.name) modules.set(String(group.id), group.name);
  }

  return {
    modules: [...modules.values()],
    components: [...new Set(components)],
  };
}
