import {
  getPortalTemplateDefinition,
  portalEducationalRevealSchema,
  type PortalEducationalReveal,
  type PortalEmailRedFlag,
  type PortalTemplateId,
} from '@insightful-phish/shared';
import { useId } from 'react';
import { PortalLayout } from './PortalLayout';

type PortalRevealProps = Readonly<{
  templateId: PortalTemplateId;
  reveal: PortalEducationalReveal | null;
  onTrainingRequested?: (trainingPath: string) => void;
}>;

function WarningSigns({
  heading,
  signs,
}: Readonly<{ heading: string; signs: readonly Readonly<PortalEmailRedFlag>[] }>) {
  const headingId = useId();

  return (
    <section className="phishing-portal__warnings" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      {signs.length === 0 ? (
        <p>Email-specific warning signs are not available.</p>
      ) : (
        <ul>
          {signs.map((sign, index) => (
            <li key={`${headingId}-${index}`}>
              <strong>{sign.label}</strong>
              {sign.description !== null && <p>{sign.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PortalReveal({ templateId, reveal, onTrainingRequested }: PortalRevealProps) {
  const template = getPortalTemplateDefinition(templateId);
  const trainingPathResult = portalEducationalRevealSchema.shape.trainingPath.safeParse(
    reveal?.trainingPath ?? null,
  );
  const trainingPath = trainingPathResult.success === true ? trainingPathResult.data : null;
  const portalWarningSigns =
    reveal !== null && reveal.portalWarningSigns.length > 0
      ? reveal.portalWarningSigns
      : template.warningSigns;

  return (
    <PortalLayout heading="This was an authorised phishing simulation" focusHeading>
      <p className="phishing-portal__notice">
        Anything you entered stayed in your browser and was not submitted. This simulation is an
        opportunity to practise recognising suspicious requests.
      </p>
      <p className="phishing-portal__explanation">
        Opening an unexpected link can expose you to a deceptive page. Entering information and
        attempting to submit it take that risk further. In a real attack, those actions could expose
        your account details.
      </p>
      <WarningSigns heading="Warning signs in the email" signs={reveal?.emailRedFlags ?? []} />
      <WarningSigns heading="Warning signs on this portal" signs={portalWarningSigns} />
      <p className="phishing-portal__explanation">
        Pause before acting on an unexpected request. Open the service through a trusted route and
        verify the request with the sender using contact details you already know.
      </p>
      {trainingPath !== null && onTrainingRequested !== undefined && (
        <button
          type="button"
          className="phishing-portal__training"
          onClick={() => onTrainingRequested(trainingPath)}
        >
          Continue to training
        </button>
      )}
    </PortalLayout>
  );
}
