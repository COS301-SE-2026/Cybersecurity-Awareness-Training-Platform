import type {
  BrowserPortalInteractionEventType,
  RecordPortalInteractionRequest,
} from '@insightful-phish/shared';

export type PortalInteractionHandler = (
  request: RecordPortalInteractionRequest,
) => void | Promise<void>;

export type PortalInteractionOperation = Readonly<{
  request: Readonly<RecordPortalInteractionRequest>;
  record: (handler: PortalInteractionHandler) => Promise<boolean>;
}>;

export function createPortalInteractionOperation(
  eventType: BrowserPortalInteractionEventType,
): PortalInteractionOperation {
  const request = Object.freeze({
    eventType,
    clientEventId: crypto.randomUUID(),
  }) satisfies Readonly<RecordPortalInteractionRequest>;

  return Object.freeze({
    request,
    async record(handler: PortalInteractionHandler) {
      try {
        await handler(request);
        return true;
      } catch {
        return false;
      }
    },
  });
}
