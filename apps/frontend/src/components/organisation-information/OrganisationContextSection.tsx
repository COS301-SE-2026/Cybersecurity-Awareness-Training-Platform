import { useState } from 'react';
import {
  ORGANISATION_INFORMATION_LIMITS,
  editableOrganisationContextTypeSchema,
  organisationContextContentKindSchema,
  organisationContextActionSchema,
  type OrganisationContextActionDto,
  type OwnOrganisationDetailDto,
} from '@insightful-phish/shared';
import { ApiError } from '../../lib/apiClient';
import BasicAlert from '../alerts/BasicAlert';
import { FormField, SelectField } from '../ui/FormField';
import StatusBadge from '../ui/StatusBadge';

type ContextRecord = OwnOrganisationDetailDto['contexts'][number];
type SaveContextDraft = Extract<OrganisationContextActionDto, { action: 'SAVE' }>;
type OrganisationContextSectionProps = Readonly<{
  contexts: OwnOrganisationDetailDto['contexts'];
  canEdit: boolean;
  onSave: (action: OrganisationContextActionDto) => Promise<void>;
}>;

const contextTypeOptions = [
  { value: 'BRAND_GUIDELINES', label: 'Brand Guidelines' },
  { value: 'SECURITY_POLICY', label: 'Security Policy' },
  { value: 'STAFF_STRUCTURE', label: 'Staff Structure' },
  { value: 'INTERNAL_TERMINOLOGY', label: 'Internal Terminology' },
  { value: 'APPROVED_DOMAINS', label: 'Approved Domains' },
  { value: 'EMAIL_SIGNATURE_FORMAT', label: 'Email Signature Format' },
  { value: 'OTHER', label: 'Other' },
];
const contentKindOptions = [
  { value: 'FREE_TEXT', label: 'Free Text' },
  { value: 'EXAMPLE_EMAIL', label: 'Example Email' },
];

function OrganisationContextSection({
  contexts,
  canEdit,
  onSave,
}: OrganisationContextSectionProps) {
  const [draft, setDraft] = useState<SaveContextDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const usedContextSlots = contexts.filter(
    (context) => context.contextType !== 'LOGO' && context.processingStatus !== 'ARCHIVED',
  ).length;

  const startAdd = () => {
    if (
      !canEdit ||
      draft !== null ||
      isSaving ||
      usedContextSlots >= ORGANISATION_INFORMATION_LIMITS.context.maxActiveItems
    )
      return;
    setDraft({
      action: 'SAVE',
      contextId: null,
      contextType: 'OTHER',
      name: '',
      description: '',
      contentSummary: '',
      metadata: { kind: 'FREE_TEXT' },
    });
    setError(null);
    setSuccess(null);
  };

  const startEdit = (context: ContextRecord) => {
    const kind = context.metadata?.kind;
    if (
      !canEdit ||
      draft !== null ||
      isSaving ||
      context.processingStatus !== 'READY' ||
      context.contextType === 'LOGO' ||
      context.contentRef !== null ||
      (kind !== 'FREE_TEXT' && kind !== 'EXAMPLE_EMAIL')
    )
      return;
    setDraft({
      action: 'SAVE',
      contextId: context.id,
      contextType: context.contextType,
      name: context.name,
      description: context.description ?? '',
      contentSummary: context.contentSummary ?? '',
      metadata: { kind },
    });
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (draft === null || !canEdit || isSaving) return;
    const parsed = organisationContextActionSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the context fields');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(parsed.data);
      setDraft(null);
      setSuccess('Organisation Context Saved');
    } catch (saveError: unknown) {
      const details =
        saveError instanceof ApiError
          ? (saveError.body as { details?: Array<{ message: string }> } | undefined)?.details
          : undefined;
      setError(
        details?.[0]?.message ??
          (saveError instanceof ApiError ? saveError.message : 'Failed to Save Context'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    setDraft(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <section className="mt-8 border-t border-default pt-6">
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Context
      </h3>
      <p className="font-jost text-[1.1rem] text-gray-500">
        Add text and example emails for AI drafts. You can decide separately whether AI can use each
        item.
      </p>
      <p className="font-overpass text-sm text-gray-500">
        {usedContextSlots} of {ORGANISATION_INFORMATION_LIMITS.context.maxActiveItems} context slots
        used
      </p>
      {canEdit && draft === null && (
        <button
          type="button"
          onClick={startAdd}
          disabled={usedContextSlots >= ORGANISATION_INFORMATION_LIMITS.context.maxActiveItems}
          className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-icons-sharp">add</span>
          <span>Add Context</span>
        </button>
      )}
      {error && (
        <BasicAlert variant="danger" onClose={() => setError(null)}>
          {error}
        </BasicAlert>
      )}
      {success && (
        <BasicAlert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </BasicAlert>
      )}

      {draft !== null && (
        <div className="mt-6 border border-default bg-neutral-primary-soft p-4">
          <h4 className="font-jost text-xl font-medium text-dark-pink">
            {draft.contextId === null ? 'Add Context' : 'Edit Context'}
          </h4>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              id="organisation-context-category"
              label="Context Category"
              value={draft.contextType}
              options={contextTypeOptions}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  contextType: editableOrganisationContextTypeSchema.parse(value),
                })
              }
              disabled={isSaving}
            />
            <SelectField
              id="organisation-context-kind"
              label="Context Kind"
              value={draft.metadata.kind}
              options={contentKindOptions}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  metadata: { kind: organisationContextContentKindSchema.parse(value) },
                })
              }
              disabled={isSaving}
            />
          </div>

          <FormField id="organisation-context-name" label="Name" className="mt-4">
            {(controlProps) => (
              <input
                {...controlProps}
                type="text"
                value={draft.name}
                maxLength={ORGANISATION_INFORMATION_LIMITS.context.nameMaxLength}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full p-2.5 rounded-none"
              />
            )}
          </FormField>
          <FormField id="organisation-context-description" label="Description" className="mt-4">
            {(controlProps) => (
              <input
                {...controlProps}
                type="text"
                value={draft.description ?? ''}
                maxLength={ORGANISATION_INFORMATION_LIMITS.context.descriptionMaxLength}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full p-2.5 rounded-none"
              />
            )}
          </FormField>
        </div>
      )}
    </section>
  );
}
