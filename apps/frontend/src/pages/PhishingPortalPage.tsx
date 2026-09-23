import type {
  PortalEducationalReveal,
  RecordPortalInteractionRequest,
  ResolvePhishingPortalResponse,
} from '@insightful-phish/shared';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PortalExperience } from '../features/phishing-portals/PortalExperience';
import { PortalStatus } from '../features/phishing-portals/PortalStatus';
import {
  recordPhishingPortalInteraction,
  resolvePhishingPortal,
} from '../features/phishing-portals/phishingPortalClient';

type PortalResolution = Readonly<{
  token: string;
  response: ResolvePhishingPortalResponse;
}>;

type PortalRevealState = Readonly<{
  token: string;
  reveal: PortalEducationalReveal;
}>;

async function recordInteractionWithRetry(token: string, request: RecordPortalInteractionRequest) {
  try {
    return await recordPhishingPortalInteraction(token, request);
  } catch {
    return recordPhishingPortalInteraction(token, request);
  }
}

export default function PhishingPortalPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [resolution, setResolution] = useState<PortalResolution | null>(null);
  const [revealState, setRevealState] = useState<PortalRevealState | null>(null);
  const [failedInteractionToken, setFailedInteractionToken] = useState<string | null>(null);

  const handleInteraction = useCallback(
    async (request: RecordPortalInteractionRequest) => {
      if (token === undefined) {
        return;
      }

      try {
        const response = await recordInteractionWithRetry(token, request);
        if (request.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED' && response.reveal !== null) {
          setRevealState({ token, reveal: response.reveal });
        }
      } catch {
        setFailedInteractionToken(token);
        throw new Error('Portal interaction recording failed.');
      }
    },
    [token],
  );

  const handleTrainingRequested = useCallback(
    (trainingPath: string) => navigate(trainingPath),
    [navigate],
  );

  useEffect(() => {
    let isCurrent = true;

    if (token === undefined) {
      return () => {
        isCurrent = false;
      };
    }

    void resolvePhishingPortal(token)
      .then((response) => {
        if (isCurrent === true) {
          setResolution({ token, response });
        }
      })
      .catch(() => {
        if (isCurrent === true) {
          setResolution({ token, response: { state: 'UNAVAILABLE' } });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [token]);

  if (token === undefined) {
    return <PortalStatus state="UNAVAILABLE" />;
  }

  if (resolution === null || resolution.token !== token) {
    return <PortalStatus state="LOADING" />;
  }

  if (resolution.response.state !== 'ACTIVE') {
    return <PortalStatus state={resolution.response.state} />;
  }

  return (
    <PortalExperience
      presentation={resolution.response.portal}
      reveal={revealState?.token === token ? revealState.reveal : null}
      onInteraction={handleInteraction}
      onTrainingRequested={handleTrainingRequested}
      interactionFailed={failedInteractionToken === token}
    />
  );
}
