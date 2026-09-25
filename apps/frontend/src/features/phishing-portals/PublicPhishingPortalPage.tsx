import type {
  PortalEducationalReveal,
  RecordPortalInteractionRequest,
  ResolvePhishingPortalResponse,
} from '@insightful-phish/shared';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  GenericAccountLoginPortal,
  GenericBankingLoginPortal,
  GenericDocumentAccessPortal,
} from './FixedPortalPresentations';
import { PortalStatus } from './PortalStatus';
import {
  PublicPortalNetworkError,
  recordPublicPortalInteraction,
  resolvePublicPortal,
} from './publicPortalApi';

function PortalJourney({ token }: Readonly<{ token: string }>) {
  const [resolution, setResolution] = useState<ResolvePhishingPortalResponse | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [reveal, setReveal] = useState<PortalEducationalReveal | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void resolvePublicPortal(token)
      .then((response) => {
        if (isCurrent) setResolution(response);
      })
      .catch(() => {
        if (isCurrent) setIsUnavailable(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [token]);

  const onInteraction = useCallback(
    async (interaction: RecordPortalInteractionRequest) => {
      try {
        let response;

        try {
          response = await recordPublicPortalInteraction(token, interaction);
        } catch (error) {
          if (!(error instanceof PublicPortalNetworkError)) throw error;
          response = await recordPublicPortalInteraction(token, interaction);
        }

        if (interaction.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED') {
          if (response.reveal === null) throw new Error('Public portal response is unavailable.');
          setReveal(response.reveal);
        } else if (response.reveal !== null) {
          throw new Error('Public portal response is unavailable.');
        }
      } catch {
        setIsUnavailable(true);
        throw new Error('Public portal interaction is unavailable.');
      }
    },
    [token],
  );

  if (isUnavailable) return <PortalStatus state="UNAVAILABLE" />;
  if (resolution === null) return <PortalStatus state="LOADING" />;
  if (resolution.state !== 'ACTIVE') return <PortalStatus state={resolution.state} />;

  const props = { reveal, onInteraction };

  switch (resolution.portal.templateId) {
    case 'GENERIC_ACCOUNT_LOGIN_V1':
      return <GenericAccountLoginPortal {...props} />;
    case 'GENERIC_DOCUMENT_ACCESS_V1':
      return <GenericDocumentAccessPortal {...props} />;
    case 'GENERIC_BANKING_LOGIN_V1':
      return <GenericBankingLoginPortal {...props} />;
  }
}

export default function PublicPhishingPortalPage() {
  const { token } = useParams<{ token: string }>();

  return token === undefined ? (
    <PortalStatus state="UNAVAILABLE" />
  ) : (
    <PortalJourney key={token} token={token} />
  );
}
