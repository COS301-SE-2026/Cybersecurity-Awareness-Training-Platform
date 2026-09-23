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

type ContextRecord = OwnOrganisationDetailDto['contexts'][number];
type SaveContextDraft = Extract<OrganisationContextActionDto, { action?: 'SAVE' }> & {
  action: 'SAVE';
};
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
  const usedExampleEmailSlots = contexts.filter(
    (context) =>
      context.contextType !== 'LOGO' &&
      context.processingStatus !== 'ARCHIVED' &&
      context.metadata?.kind === 'EXAMPLE_EMAIL',
  ).length;

  const contextGroups = [
    { title: 'Active', items: contexts.filter((context) => context.processingStatus === 'READY') },
    {
      title: 'Archived',
      items: contexts.filter((context) => context.processingStatus === 'ARCHIVED'),
    },
    {
      title: 'Other',
      items: contexts.filter(
        (context) =>
          context.processingStatus !== 'READY' && context.processingStatus !== 'ARCHIVED',
      ),
    },
  ];

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

  const handleContextAction = async (
    action: OrganisationContextActionDto,
    successMessage: string,
  ) => {
    if (!canEdit || draft !== null || isSaving) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await onSave(action);
      setSuccess(successMessage);
    } catch (saveError: unknown) {
      const details =
        saveError instanceof ApiError
          ? (saveError.body as { details?: Array<{ message: string }> } | undefined)?.details
          : undefined;
      setError(
        details?.[0]?.message ??
          (saveError instanceof ApiError ? saveError.message : 'Failed to update context'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
            AI Context
          </h3>
          <p className="font-jost text-[1.1rem] text-gray-500">
            Add text and example emails for AI drafts. You can decide separately whether AI can use
            each item.
          </p>
        </div>
        {canEdit && draft === null && (
          <button
            type="button"
            onClick={startAdd}
            disabled={
              isSaving || usedContextSlots >= ORGANISATION_INFORMATION_LIMITS.context.maxActiveItems
            }
            className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-icons-sharp">add</span>
            <span>Add Context</span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-overpass text-sm text-gray-500">
        <p>
          {usedContextSlots} of {ORGANISATION_INFORMATION_LIMITS.context.maxActiveItems} Context
          slots
        </p>
        <p>
          {usedExampleEmailSlots} of {ORGANISATION_INFORMATION_LIMITS.context.maxExampleEmailItems}{' '}
          Email slots
        </p>
      </div>
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

      <div className="mt-6 space-y-6">
        {contexts.length === 0 ? (
          <p className="font-overpass text-gray-600">No organisation context has been added yet.</p>
        ) : (
          contextGroups.map((group) =>
            group.items.length > 0 ? (
              <div key={group.title} className="space-y-3">
                <h4 className="font-jost text-xl font-medium text-deep-purple">{group.title}</h4>
                {group.items.map((context) => {
                  const kind = context.metadata?.kind;
                  const canManageContext =
                    canEdit &&
                    draft === null &&
                    context.contextType !== 'LOGO' &&
                    context.contentRef === null &&
                    (kind === 'FREE_TEXT' || kind === 'EXAMPLE_EMAIL');
                  const canEditContext = canManageContext && context.processingStatus === 'READY';
                  const canReactivateContext =
                    canManageContext &&
                    context.processingStatus === 'ARCHIVED' &&
                    Boolean(context.contentSummary?.trim());
                  return (
                    <article key={context.id} className="border border-default bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h5 className="font-jost text-xl font-medium text-dark-pink">
                            {context.name}
                          </h5>
                          <p className="font-overpass text-sm text-gray-600">
                            <span className="font-medium text-gray-700">Category:</span>{' '}
                            {contextTypeOptions.find(
                              (option) => option.value === context.contextType,
                            )?.label ?? 'Logo'}
                            <span aria-hidden="true"> · </span>
                            <span className="font-medium text-gray-700">Content:</span>{' '}
                            {getContextKindLabel(kind)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1 text-sm font-medium ring-1 ring-inset ${context.processingStatus === 'READY' ? 'ring-success-subtle text-fg-success-strong bg-success-soft' : 'ring-default-medium text-heading bg-neutral-secondary-medium'}`}
                        >
                          {getContextProcessingStatusLabel(context.processingStatus)}
                        </span>
                      </div>

                      {context.description && (
                        <p className="mt-3 font-overpass text-gray-700">{context.description}</p>
                      )}
                      {canEditContext ? (
                        <label
                          htmlFor={`organisation-context-ai-${context.id}`}
                          className="mt-3 flex items-center gap-2 font-jost text-[1rem] text-body"
                        >
                          <input
                            id={`organisation-context-ai-${context.id}`}
                            type="checkbox"
                            checked={context.aiUsable}
                            disabled={isSaving}
                            onChange={(event) =>
                              void handleContextAction(
                                {
                                  action: 'SET_AI_USABLE',
                                  contextId: context.id,
                                  aiUsable: event.target.checked,
                                },
                                event.target.checked ? 'AI use enabled' : 'AI use disabled',
                              )
                            }
                            className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          />
                          <span>Allow this context to be used by AI</span>
                        </label>
                      ) : (
                        <p className="mt-2 font-overpass text-sm text-gray-600">
                          AI use:{' '}
                          {context.processingStatus === 'READY' && context.aiUsable
                            ? 'Allowed'
                            : 'Off'}
                        </p>
                      )}
                      {context.contentSummary && (
                        <details className="group mt-3 border border-gray-300 bg-white">
                          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 font-overpass text-deep-purple hover:bg-faint-purple [&::-webkit-details-marker]:hidden">
                            <span>View Text</span>
                            <span
                              className="material-icons-sharp transition-transform group-open:rotate-180"
                              aria-hidden="true"
                            >
                              expand_more
                            </span>
                          </summary>
                          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-gray-300 p-3 font-overpass text-gray-700">
                            {context.contentSummary}
                          </div>
                        </details>
                      )}
                      {(canEditContext || canReactivateContext) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {canEditContext && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(context)}
                                disabled={isSaving}
                                className="cursor-pointer px-4 inline-flex items-center justify-center text-deep-purple font-jost font-regular tracking-wider bg-white hover:bg-faint-purple border border-purple focus:ring-4 focus:ring-brand-medium py-2 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleContextAction(
                                    { action: 'ARCHIVE', contextId: context.id },
                                    'Context Archived. AI use for this context has also been turned off.',
                                  )
                                }
                                disabled={isSaving}
                                className="cursor-pointer px-4 inline-flex items-center justify-center text-red-700 font-jost font-regular tracking-wider bg-white hover:bg-danger hover:text-white hover:border-danger border border-red-300 focus:ring-4 focus:ring-red-200 py-2 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                Archive
                              </button>
                            </>
                          )}
                          {canReactivateContext && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleContextAction(
                                  { action: 'REACTIVATE', contextId: context.id },
                                  'Context Reactivated. AI use for this context remains off.',
                                )
                              }
                              disabled={
                                isSaving ||
                                usedContextSlots >=
                                  ORGANISATION_INFORMATION_LIMITS.context.maxActiveItems
                              }
                              className="cursor-pointer px-4 inline-flex items-center justify-center text-deep-purple font-jost font-regular tracking-wider bg-white hover:bg-faint-purple border border-purple focus:ring-4 focus:ring-brand-medium py-2 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : null,
          )
        )}
      </div>
    </section>
  );
}

function getContextKindLabel(kind: unknown): string {
  if (kind === 'EXAMPLE_EMAIL') {
    return 'Example Email';
  }
  if (kind === 'FREE_TEXT') {
    return 'Free Text';
  }
  return 'Stored Record';
}

function getContextProcessingStatusLabel(status: ContextRecord['processingStatus']): string {
  if (status === 'READY') {
    return 'Active';
  }
  if (status === 'ARCHIVED') {
    return 'Archived';
  }
  return 'Inactive';
}

export default OrganisationContextSection;
