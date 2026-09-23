import type { ResolvePhishingPortalResponse } from '@insightful-phish/shared';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PortalExperience } from '../features/phishing-portals/PortalExperience';
import { PortalStatus } from '../features/phishing-portals/PortalStatus';
import { resolvePhishingPortal } from '../features/phishing-portals/phishingPortalClient';

type PortalResolution = Readonly<{
  token: string;
  response: ResolvePhishingPortalResponse;
}>;

const pendingInteraction = () => {};

export default function PhishingPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [resolution, setResolution] = useState<PortalResolution | null>(null);

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
      reveal={null}
      onInteraction={pendingInteraction}
    />
  );
}
