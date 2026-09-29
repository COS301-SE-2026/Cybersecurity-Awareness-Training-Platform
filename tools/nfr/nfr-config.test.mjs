import assert from 'node:assert/strict';
import test from 'node:test';
import { environmentValueForDemo, markdownAnchors, markdownHeadingSlug } from './nfr-config.mjs';

test('Demo 4 environment lookup never falls back to Demo 3 values', () => {
  const environment = {
    DEMO3_NFR_AUTH_TOKEN: 'demo-3-token',
    DEMO4_NFR_ORGANISATION_ID: 'organisation-4',
  };

  assert.equal(environmentValueForDemo(environment, 'demo4', 'AUTH_TOKEN'), undefined);
  assert.equal(environmentValueForDemo(environment, 'demo4', 'ORGANISATION_ID'), 'organisation-4');
  assert.equal(environmentValueForDemo(environment, 'demo3', 'AUTH_TOKEN'), 'demo-3-token');
});

test('Markdown anchors follow repository heading and duplicate conventions', () => {
  assert.equal(
    markdownHeadingSlug('`QR-AUTH-01` Protected Access & Authorisation Boundaries'),
    'qr-auth-01-protected-access-authorisation-boundaries',
  );
  assert.deepEqual(
    [...markdownAnchors('# Heading\n## Heading\n<a id="explicit-anchor"></a>')].sort(),
    ['explicit-anchor', 'heading', 'heading-1'],
  );
});
