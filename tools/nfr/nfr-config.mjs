export const DEMO4_QUALITY_REQUIREMENT_IDS = Object.freeze([
  'QR-AUTH-01',
  'QR-DATA-01',
  'QR-ACCESS-01',
  'QR-RELIABILITY-01',
  'QR-PERF-01',
  'QR-TRACE-01',
  'QR-AUDIT-01',
  'QR-DEPLOY-01',
]);

export const PERFORMANCE_WORKLOAD = Object.freeze({
  requestCount: 10,
  concurrency: 2,
  timeoutMs: 5000,
  p95TargetMs: 2000,
  errorRateTarget: 0.01,
});

export const DEMO4_AUTHENTICATED_PERFORMANCE_ROUTES = Object.freeze([
  { id: 'account-profile', method: 'GET', path: '/account' },
  { id: 'account-sessions', method: 'GET', path: '/account/sessions' },
  {
    id: 'organisation-trainees',
    method: 'GET',
    path: '/organisations/{organisationId}/trainees',
  },
  {
    id: 'organisation-admins',
    method: 'GET',
    path: '/organisations/{organisationId}/admins',
  },
  {
    id: 'organisation-campaigns',
    method: 'GET',
    path: '/organisations/{organisationId}/campaigns?page=1&limit=10',
  },
  {
    id: 'organisation-campaign-content-catalogue',
    method: 'GET',
    path: '/organisations/{organisationId}/campaign-content/catalog?page=1&limit=10',
  },
  {
    id: 'campaign-assignment-candidates',
    method: 'GET',
    path: '/organisations/{organisationId}/campaign-assignment-candidates?page=1&limit=10',
  },
]);

export function environmentValueForDemo(environment, demoVersion, name) {
  const prefix = demoVersion === 'demo3' ? 'DEMO3_NFR' : 'DEMO4_NFR';
  return environment[`${prefix}_${name}`];
}

export function markdownHeadingSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function markdownAnchors(content) {
  const anchors = new Set();
  const slugCounts = new Map();

  for (const match of content.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const baseSlug = markdownHeadingSlug(match[1]);
    if (!baseSlug) continue;
    const count = slugCounts.get(baseSlug) ?? 0;
    anchors.add(count === 0 ? baseSlug : `${baseSlug}-${count}`);
    slugCounts.set(baseSlug, count + 1);
  }

  for (const match of content.matchAll(/<(?:a\s+[^>]*name|[^>]+id)=["']([^"']+)["'][^>]*>/gi)) {
    anchors.add(match[1]);
  }

  return anchors;
}
