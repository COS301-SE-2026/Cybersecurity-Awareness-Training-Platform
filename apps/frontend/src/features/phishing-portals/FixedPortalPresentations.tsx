import {
  getPortalTemplatePresentation,
  type PortalEducationalReveal,
  type PortalTemplateId,
} from '@insightful-phish/shared';
import { PortalExperience } from './PortalExperience';
import type { PortalInteractionHandler } from './portalInteraction';

type FixedPortalProps = Readonly<{
  reveal: PortalEducationalReveal | null;
  onInteraction: PortalInteractionHandler;
  onTrainingRequested?: (trainingPath: string) => void;
}>;

type FixedPortalExperienceProps = FixedPortalProps &
  Readonly<{
    templateId: PortalTemplateId;
  }>;

function FixedPortalExperience({
  templateId,
  reveal,
  onInteraction,
  onTrainingRequested,
}: FixedPortalExperienceProps) {
  return (
    <PortalExperience
      presentation={getPortalTemplatePresentation(templateId)}
      reveal={reveal}
      onInteraction={onInteraction}
      onTrainingRequested={onTrainingRequested}
    />
  );
}

export function GenericAccountLoginPortal(props: FixedPortalProps) {
  return <FixedPortalExperience {...props} templateId="GENERIC_ACCOUNT_LOGIN_V1" />;
}

export function GenericDocumentAccessPortal(props: FixedPortalProps) {
  return <FixedPortalExperience {...props} templateId="GENERIC_DOCUMENT_ACCESS_V1" />;
}

export function GenericBankingLoginPortal(props: FixedPortalProps) {
  return <FixedPortalExperience {...props} templateId="GENERIC_BANKING_LOGIN_V1" />;
}
