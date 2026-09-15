import {
  EMAIL_PERSONALISATION_MARKERS,
  SYSTEM_LINK_MARKER,
  contentCategories,
  type EmailRedFlagTypeDto,
  type OrganisationEmailDraftInput,
  type RedFlagSeverityDto,
} from '@insightful-phish/shared';
import { useRef } from 'react';
import { FormField, SelectField } from '../../components/ui/FormField';
import { EmailPreview } from './EmailPreview';
import './email-authoring.css';

export type EmailBuilderFieldErrors = Readonly<Record<string, string | undefined>>;

type EmailBuilderProps = Readonly<{
  value: OrganisationEmailDraftInput;
  onChange: (value: OrganisationEmailDraftInput) => void;
  disabled?: boolean;
  fieldErrors?: EmailBuilderFieldErrors;
}>;

const markerOptions = [
  { label: 'First name', marker: EMAIL_PERSONALISATION_MARKERS.FIRST_NAME },
  { label: 'Surname', marker: EMAIL_PERSONALISATION_MARKERS.SURNAME },
  { label: 'Email address', marker: EMAIL_PERSONALISATION_MARKERS.EMAIL_ADDRESS },
  { label: 'Managed link', marker: SYSTEM_LINK_MARKER },
] as const;

const redFlagTypes = [
  'SENDER',
  'LINK',
  'LANGUAGE',
  'ATTACHMENT',
  'REQUEST',
  'DOMAIN',
  'OTHER',
] as const satisfies readonly EmailRedFlagTypeDto[];

const redFlagSeverities = [
  'LOW',
  'MEDIUM',
  'HIGH',
] as const satisfies readonly RedFlagSeverityDto[];

const categoryLabels = {
  PHISHING_AND_SUSPICIOUS_MESSAGES: 'Phishing and suspicious messages',
  LINKS_DOMAINS_AND_SENDER_VERIFICATION: 'Links, domains and sender verification',
  PASSWORDS_AND_AUTHENTICATION: 'Passwords and authentication',
  SOCIAL_ENGINEERING_AND_INFORMATION_DISCLOSURE: 'Social engineering and information disclosure',
  DATA_DEVICE_AND_ACCOUNT_SAFETY: 'Data, device and account safety',
} as const;

function fieldClass(error?: string) {
  return `email-builder__control${error ? ' email-builder__control--invalid' : ''}`;
}

export function EmailBuilder({
  value,
  onChange,
  disabled = false,
  fieldErrors = {},
}: EmailBuilderProps) {
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const updateField = <Key extends keyof OrganisationEmailDraftInput>(
    key: Key,
    fieldValue: OrganisationEmailDraftInput[Key],
  ) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const updateBody = (bodyHtml: string) => {
    const includesSystemLink = bodyHtml.includes(SYSTEM_LINK_MARKER);
    const link = includesSystemLink ? (value.link ?? { anchorText: '' }) : null;
    onChange({ ...value, bodyHtml, link });
  };

  const insertMarker = (marker: string) => {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? value.bodyHtml.length;
    const end = textarea?.selectionEnd ?? start;
    const bodyHtml = `${value.bodyHtml.slice(0, start)}${marker}${value.bodyHtml.slice(end)}`;
    const link =
      marker === SYSTEM_LINK_MARKER && value.link === null ? { anchorText: '' } : value.link;
    onChange({ ...value, bodyHtml, link });
    globalThis.setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + marker.length, start + marker.length);
    }, 0);
  };

  const updateRedFlag = (
    index: number,
    update: Partial<OrganisationEmailDraftInput['redFlags'][number]>,
  ) => {
    updateField(
      'redFlags',
      value.redFlags.map((redFlag, currentIndex) =>
        currentIndex === index ? { ...redFlag, ...update } : redFlag,
      ),
    );
  };

  return (
    <div className="email-builder">
      <div className="email-builder__form">
        <div className="email-builder__grid">
          <FormField label="Sender label" errorText={fieldErrors.senderLabel}>
            {(controlProps) => (
              <input
                {...controlProps}
                className={fieldClass(fieldErrors.senderLabel)}
                value={value.senderLabel}
                disabled={disabled}
                onChange={(event) => updateField('senderLabel', event.target.value)}
              />
            )}
          </FormField>
          <FormField label="Sender address" errorText={fieldErrors.senderAddress}>
            {(controlProps) => (
              <input
                {...controlProps}
                type="email"
                className={fieldClass(fieldErrors.senderAddress)}
                value={value.senderAddress}
                disabled={disabled}
                onChange={(event) => updateField('senderAddress', event.target.value)}
              />
            )}
          </FormField>
        </div>

        <FormField label="Subject" errorText={fieldErrors.subject}>
          {(controlProps) => (
            <input
              {...controlProps}
              className={fieldClass(fieldErrors.subject)}
              value={value.subject}
              disabled={disabled}
              onChange={(event) => updateField('subject', event.target.value)}
            />
          )}
        </FormField>

        <FormField label="Preview text" errorText={fieldErrors.preview}>
          {(controlProps) => (
            <input
              {...controlProps}
              className={fieldClass(fieldErrors.preview)}
              value={value.preview}
              disabled={disabled}
              onChange={(event) => updateField('preview', event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="Safe HTML body"
          helperText="Use basic email formatting. Scripts, forms, images, links and attributes are rejected."
          errorText={fieldErrors.bodyHtml}
        >
          {(controlProps) => (
            <textarea
              {...controlProps}
              ref={bodyRef}
              rows={10}
              className={fieldClass(fieldErrors.bodyHtml)}
              value={value.bodyHtml}
              disabled={disabled}
              onChange={(event) => updateBody(event.target.value)}
            />
          )}
        </FormField>

        <div className="email-builder__markers" aria-label="Insert email markers">
          <span>Insert marker</span>
          <div>
            {markerOptions.map((option) => (
              <button
                key={option.marker}
                type="button"
                disabled={disabled}
                onClick={() => insertMarker(option.marker)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <FormField
          label="Managed-link anchor text"
          helperText="Insert the managed-link marker in the body to enable this field. The destination is supplied by the system."
          errorText={fieldErrors['link.anchorText'] ?? fieldErrors.link}
        >
          {(controlProps) => (
            <input
              {...controlProps}
              className={fieldClass(fieldErrors['link.anchorText'] ?? fieldErrors.link)}
              value={value.link?.anchorText ?? ''}
              disabled={disabled || !value.bodyHtml.includes(SYSTEM_LINK_MARKER)}
              onChange={(event) => updateField('link', { anchorText: event.target.value })}
            />
          )}
        </FormField>

        <div className="email-builder__grid">
          <SelectField
            label="Expected classification"
            value={value.expectedClassification}
            disabled={disabled}
            errorText={fieldErrors.expectedClassification}
            options={[
              { value: 'SAFE', label: 'Safe' },
              { value: 'SUSPICIOUS', label: 'Suspicious' },
              { value: 'PHISHING', label: 'Phishing' },
            ]}
            onChange={(classification) =>
              updateField(
                'expectedClassification',
                classification as OrganisationEmailDraftInput['expectedClassification'],
              )
            }
            className="email-builder__select-field"
            selectClassName="email-builder__control"
          />
          <SelectField
            label="Difficulty"
            value={value.difficultyLevel}
            disabled={disabled}
            errorText={fieldErrors.difficultyLevel}
            options={[
              { value: 'EASY', label: 'Easy' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HARD', label: 'Hard' },
            ]}
            onChange={(difficulty) =>
              updateField(
                'difficultyLevel',
                difficulty as OrganisationEmailDraftInput['difficultyLevel'],
              )
            }
            className="email-builder__select-field"
            selectClassName="email-builder__control"
          />
        </div>

        <fieldset className="email-builder__fieldset">
          <legend>Categories</legend>
          {fieldErrors.categories && <p role="alert">{fieldErrors.categories}</p>}
          <div className="email-builder__category-grid">
            {contentCategories.map((category) => (
              <label key={category}>
                <input
                  type="checkbox"
                  checked={value.categories.includes(category)}
                  disabled={disabled}
                  onChange={(event) =>
                    updateField(
                      'categories',
                      event.target.checked
                        ? [...value.categories, category]
                        : value.categories.filter((current) => current !== category),
                    )
                  }
                />
                <span>{categoryLabels[category]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="email-builder__fieldset">
          <legend>Red flags</legend>
          <div className="email-builder__fieldset-heading">
            {!disabled && (
              <button
                type="button"
                onClick={() =>
                  updateField('redFlags', [
                    ...value.redFlags,
                    {
                      redFlagType: 'OTHER',
                      label: '',
                      description: null,
                      severity: 'MEDIUM',
                    },
                  ])
                }
              >
                Add red flag
              </button>
            )}
          </div>
          {fieldErrors.redFlags && <p role="alert">{fieldErrors.redFlags}</p>}
          {value.redFlags.length === 0 ? (
            <p className="email-builder__empty-flags">No red flags added.</p>
          ) : (
            <div className="email-builder__red-flags">
              {value.redFlags.map((redFlag, index) => (
                <section
                  key={`${redFlag.redFlagType}-${redFlag.label}-${index}`}
                  aria-label={`Red flag ${index + 1}`}
                >
                  <div className="email-builder__red-flag-heading">
                    <h3>Red flag {index + 1}</h3>
                    {!disabled && (
                      <button
                        type="button"
                        aria-label={`Remove red flag ${index + 1}`}
                        onClick={() =>
                          updateField(
                            'redFlags',
                            value.redFlags.filter((_, currentIndex) => currentIndex !== index),
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="email-builder__red-flag-grid">
                    <SelectField
                      label="Type"
                      value={redFlag.redFlagType}
                      disabled={disabled}
                      errorText={fieldErrors[`redFlags.${index}.redFlagType`]}
                      options={redFlagTypes.map((type) => ({
                        value: type,
                        label: type.charAt(0) + type.slice(1).toLowerCase(),
                      }))}
                      onChange={(redFlagType) =>
                        updateRedFlag(index, { redFlagType: redFlagType as EmailRedFlagTypeDto })
                      }
                      className="email-builder__select-field"
                      selectClassName="email-builder__control"
                    />
                    <SelectField
                      label="Severity"
                      value={redFlag.severity}
                      disabled={disabled}
                      errorText={fieldErrors[`redFlags.${index}.severity`]}
                      options={redFlagSeverities.map((severity) => ({
                        value: severity,
                        label: severity.charAt(0) + severity.slice(1).toLowerCase(),
                      }))}
                      onChange={(severity) =>
                        updateRedFlag(index, { severity: severity as RedFlagSeverityDto })
                      }
                      className="email-builder__select-field"
                      selectClassName="email-builder__control"
                    />
                    <FormField label="Label" errorText={fieldErrors[`redFlags.${index}.label`]}>
                      {(controlProps) => (
                        <input
                          {...controlProps}
                          className={fieldClass(fieldErrors[`redFlags.${index}.label`])}
                          value={redFlag.label}
                          disabled={disabled}
                          onChange={(event) => updateRedFlag(index, { label: event.target.value })}
                        />
                      )}
                    </FormField>
                    <FormField
                      label="Description"
                      errorText={fieldErrors[`redFlags.${index}.description`]}
                    >
                      {(controlProps) => (
                        <input
                          {...controlProps}
                          className={fieldClass(fieldErrors[`redFlags.${index}.description`])}
                          value={redFlag.description ?? ''}
                          disabled={disabled}
                          onChange={(event) =>
                            updateRedFlag(index, { description: event.target.value || null })
                          }
                        />
                      )}
                    </FormField>
                  </div>
                </section>
              ))}
            </div>
          )}
        </fieldset>
      </div>
      <EmailPreview email={value} />
    </div>
  );
}
