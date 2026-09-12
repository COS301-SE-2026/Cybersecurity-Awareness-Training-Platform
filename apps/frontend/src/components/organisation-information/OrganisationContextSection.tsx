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
          <FormField
            id="organisation-context-text"
            label="Text"
            className="mt-4"
            helperText={`${draft.contentSummary.length}/${ORGANISATION_INFORMATION_LIMITS.context.contentSummaryMaxLength} characters`}
          >
            {(controlProps) => (
              <textarea
                {...controlProps}
                rows={6}
                value={draft.contentSummary}
                maxLength={ORGANISATION_INFORMATION_LIMITS.context.contentSummaryMaxLength}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, contentSummary: event.target.value })}
                className="mt-1 block w-full border border-gray-300 bg-white p-3 font-overpass text-[1rem] text-gray-700 focus:border-purple focus:ring-purple disabled:cursor-not-allowed disabled:opacity-60"
              />
            )}
          </FormField>
          <p className="mt-3 font-overpass text-sm text-gray-600">
            Saving will activate this context. AI use will remain off until you enable it
            separately.
          </p>

          <div className="mt-6 flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-gray-700 font-jost text-[1.2rem] font-regular tracking-wider bg-gray-100 hover:bg-gray-200 box-border border border-gray-300 focus:ring-2 focus:ring-gray-300 leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-icons-sharp">close</span>
              <span>Cancel</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !canEdit}
              className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-icons-sharp">{isSaving ? 'sync' : 'save'}</span>
              <span>{isSaving ? 'Saving...' : 'Save Context'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {contexts.length === 0 ? (
          <p className="font-overpass text-gray-600">No organisation context has been added yet.</p>
        ) : (
          contexts.map((context) => {
            const kind = context.metadata?.kind;
            const canEditContext =
              canEdit &&
              draft === null &&
              context.processingStatus === 'READY' &&
              context.contextType !== 'LOGO' &&
              context.contentRef === null &&
              (kind === 'FREE_TEXT' || kind === 'EXAMPLE_EMAIL');
            return (
              <article key={context.id} className="border border-default bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-jost text-xl font-medium text-dark-pink">{context.name}</h4>
                    <p className="font-overpass text-sm text-gray-600">
                      {contextTypeOptions.find((options) => options.value === context.contextType)
                        ?.label ?? 'Logo'}
                      {' ('}
                      {kind === 'EXAMPLE_EMAIL'
                        ? 'Example Email'
                        : kind === 'FREE_TEXT'
                          ? 'Free Text'
                          : 'Stored Record'}
                      {')'}
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      context.processingStatus === 'READY'
                        ? 'Active'
                        : context.processingStatus === 'ARCHIVED'
                          ? 'Archived'
                          : 'Inactive'
                    }
                  />
                </div>

                {context.description && (
                  <p className="mt-3 font-overpass text-gray-700">{context.description}</p>
                )}
                <p className="mt-2 font-overpass text-sm text-gray-600">
                  AI use:{' '}
                  {context.processingStatus === 'READY' && context.aiUsable ? 'Allowed' : 'Off'}
                </p>
                {context.contentSummary && (
                  <details>
                    <summary className="cursor-pointer font-jost text-purple">Review Text</summary>
                    <p className="mt-2 whitespace-pre-wrap font-overpass text-gray-700">
                      {context.contentSummary}
                    </p>
                  </details>
                )}
                {canEditContext && (
                  <button
                    type="button"
                    onClick={() => startEdit(context)}
                    className="mt-3 cursor-pointer font-jost text-purple hover:underline"
                  >
                    Edit
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export default OrganisationContextSection;
