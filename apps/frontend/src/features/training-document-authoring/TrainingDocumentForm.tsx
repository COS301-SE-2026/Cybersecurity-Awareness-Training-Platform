import type { FormEvent } from 'react';
import type { TrainingDocuemtnDraftInputDto } from '@insightful-phish/shared';
import TrainingDocumentContentFields from './TrainingDocumentContentFields';
import TrainingDocumentMetadataFields from './TrainingDocumentMetadataFields';
import type { TrainingDocumentDraftErrors } from './trainingDocumentAuthoring';

export type TrainingDocumentFormAction = 'save' | 'preview' | 'activate' | 'copy' | 'reload';

type TrainingDocumentFormProps = Readonly<{
  draft: TrainingDocuemtnDraftInputDto;
  errors: TrainingDocumentDraftErrors;
  readOnly?: boolean;
  pendingAction?: TrainingDocumentFormAction | null;
  showSave?: boolean;
  showActivate?: boolean;
  showCopy?: boolean;
  saveDisabled?: boolean;
  previewDisabled?: boolean;
  activateDisabled?: boolean;
  onChange: (patch: Partial<TrainingDocuemtnDraftInputDto>) => void;
  onSave?: () => void;
  onPreview: () => void;
  onActivate?: () => void;
  onCopy?: () => void;
}>;

function TrainingDocumentForm({
  draft,
  errors,
  readOnly = false,
  pendingAction = null,
  showSave = true,
  showActivate = false,
  showCopy = false,
  saveDisabled = false,
  previewDisabled = false,
  activateDisabled = false,
  onChange,
  onSave,
  onPreview,
  onActivate,
  onCopy,
}: TrainingDocumentFormProps) {
  const hasPendingAction = pendingAction !== null;
  const fieldsDisabled =
    readOnly === true ||
    pendingAction === 'save' ||
    pendingAction === 'activate' ||
    pendingAction === 'copy' ||
    pendingAction === 'reload';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave?.();
  }

  return (
    <form
      className="training-document-form"
      aria-label="Training document"
      aria-busy={hasPendingAction}
      noValidate
      onSubmit={handleSubmit}
    >
      <TrainingDocumentMetadataFields
        draft={draft}
        errors={errors}
        disabled={fieldsDisabled}
        onChange={onChange}
      />

      <TrainingDocumentContentFields
        draft={draft}
        errors={errors}
        disabled={fieldsDisabled}
        onChange={onChange}
      />

      <div className="training-document-form__actions">
        {showSave === true ? (
          <button
            type="submit"
            disabled={hasPendingAction || saveDisabled}
            aria-busy={pendingAction === 'save'}
            className="disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-40 font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-3 focus:outline-none"
          >
            {pendingAction === 'save' ? 'Saving...' : 'Save Draft'}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onPreview}
          disabled={hasPendingAction || previewDisabled}
          aria-busy={pendingAction === 'preview'}
          className="disabled:hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-40 font-jost tracking-wider text-xl text-body font-regular bg-gray-200 hover:bg-gray-300 leading-5 px-4 py-3 focus:outline-none"
        >
          {pendingAction === 'preview' ? 'Previewing...' : 'Preview'}
        </button>

        {showActivate === true ? (
          <button
            type="button"
            onClick={onActivate}
            disabled={hasPendingAction || activateDisabled}
            aria-busy={pendingAction === 'activate'}
            className="disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-40 font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-3 focus:outline-none"
          >
            {pendingAction === 'activate' ? 'Activating...' : 'Activate'}
          </button>
        ) : null}

        {showCopy === true ? (
          <button
            type="button"
            onClick={onCopy}
            disabled={hasPendingAction}
            aria-busy={pendingAction === 'copy'}
            className="disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-48 whitespace-nowrap font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-3 focus:outline-none"
          >
            {pendingAction === 'copy' ? 'Copying...' : 'Copy To Draft'}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default TrainingDocumentForm;
export { TrainingDocumentForm };
