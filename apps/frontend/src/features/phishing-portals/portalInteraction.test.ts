import { describe, expect, it, vi } from 'vitest';
import { createPortalInteractionOperation } from './portalInteraction';

describe('portal interaction operations', () => {
  it('emits only the closed interaction request', async () => {
    const handler = vi.fn();
    const operation = createPortalInteractionOperation('PORTAL_CREDENTIAL_FIELD_INTERACTED');

    await operation.record(handler);

    expect(handler).toHaveBeenCalledWith({
      eventType: 'PORTAL_CREDENTIAL_FIELD_INTERACTED',
      clientEventId: expect.any(String),
    });
    expect(Object.keys(handler.mock.calls[0][0])).toEqual(['eventType', 'clientEventId']);
  });

  it('reuses the client event identifier when an operation is retried', async () => {
    const receivedIds: string[] = [];
    const handler = vi.fn((request: { clientEventId: string }) => {
      receivedIds.push(request.clientEventId);
    });
    const operation = createPortalInteractionOperation('CREDENTIAL_SUBMISSION_ATTEMPTED');

    await operation.record(handler);
    await operation.record(handler);

    expect(receivedIds).toHaveLength(2);
    expect(receivedIds[0]).toBe(receivedIds[1]);
  });

  it('uses a new identifier for a later deliberate credential submission', () => {
    const first = createPortalInteractionOperation('CREDENTIAL_SUBMISSION_ATTEMPTED');
    const later = createPortalInteractionOperation('CREDENTIAL_SUBMISSION_ATTEMPTED');

    expect(later.request.clientEventId).not.toBe(first.request.clientEventId);
  });

  it('reports callback failure without throwing', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Request failed'));
    const operation = createPortalInteractionOperation('CREDENTIAL_SUBMISSION_ATTEMPTED');

    await expect(operation.record(handler)).resolves.toBe(false);
  });
});
