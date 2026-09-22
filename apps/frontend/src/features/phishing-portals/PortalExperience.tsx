import type {
  BrowserPortalInteractionEventType,
  PortalEducationalReveal,
  PortalTemplatePresentation,
} from '@insightful-phish/shared';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { PortalLayout } from './PortalLayout';
import { PortalReveal } from './PortalReveal';
import {
  createPortalInteractionOperation,
  type PortalInteractionHandler,
} from './portalInteraction';

type PortalExperienceProps = Readonly<{
  presentation: PortalTemplatePresentation;
  reveal: PortalEducationalReveal | null;
  onInteraction: PortalInteractionHandler;
  onTrainingRequested?: (trainingPath: string) => void;
}>;

function useFirstInteraction(
  eventType: BrowserPortalInteractionEventType,
  onInteraction: PortalInteractionHandler,
) {
  const hasRecorded = useRef(false);

  return useCallback(() => {
    if (hasRecorded.current === true) {
      return;
    }

    hasRecorded.current = true;
    void createPortalInteractionOperation(eventType).record(onInteraction);
  }, [eventType, onInteraction]);
}

export function PortalExperience({
  presentation,
  reveal,
  onInteraction,
  onTrainingRequested,
}: PortalExperienceProps) {
  const identifierId = useId();
  const credentialId = useId();
  const [identifier, setIdentifier] = useState('');
  const [credential, setCredential] = useState('');
  const [isRevealVisible, setIsRevealVisible] = useState(false);
  const recordVisit = useFirstInteraction('PORTAL_VISITED', onInteraction);
  const recordIdentifierInteraction = useFirstInteraction(
    'PORTAL_IDENTIFIER_FIELD_INTERACTED',
    onInteraction,
  );
  const recordCredentialInteraction = useFirstInteraction(
    'PORTAL_CREDENTIAL_FIELD_INTERACTED',
    onInteraction,
  );
  const recordRevealViewed = useFirstInteraction('PORTAL_EDUCATIONAL_REVEAL_VIEWED', onInteraction);

  useEffect(() => {
    recordVisit();
  }, [recordVisit]);

  useEffect(() => {
    if (isRevealVisible === true) {
      recordRevealViewed();
    }
  }, [isRevealVisible, recordRevealViewed]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIdentifier('');
    setCredential('');
    setIsRevealVisible(true);
    void createPortalInteractionOperation('CREDENTIAL_SUBMISSION_ATTEMPTED').record(onInteraction);
  }

  if (isRevealVisible === true) {
    return (
      <PortalReveal
        templateId={presentation.templateId}
        reveal={reveal}
        onTrainingRequested={onTrainingRequested}
      />
    );
  }

  return (
    <PortalLayout heading={presentation.heading} templateId={presentation.templateId}>
      <form className="phishing-portal__form" autoComplete="off" onSubmit={handleSubmit}>
        <label htmlFor={identifierId}>{presentation.identifierLabel}</label>
        <input
          id={identifierId}
          type="text"
          value={identifier}
          autoComplete="off"
          onFocus={recordIdentifierInteraction}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <label htmlFor={credentialId}>{presentation.credentialLabel}</label>
        <input
          id={credentialId}
          type="password"
          value={credential}
          autoComplete="off"
          onFocus={recordCredentialInteraction}
          onChange={(event) => setCredential(event.target.value)}
        />
        <button type="submit" className="phishing-portal__submit">
          {presentation.submitLabel}
        </button>
      </form>
    </PortalLayout>
  );
}
