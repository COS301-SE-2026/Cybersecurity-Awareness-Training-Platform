import type { FormEvent } from 'react';
import type { TrainingDocuemtnDraftInputDto } from '@insightful-phish/shared';
import Button from '../../components/ui/Button';
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
          <Button
            type="submit"
            text={pendingAction === 'save' ? 'Saving...' : 'Save draft'}
            disabled={hasPendingAction || saveDisabled}
            ariaBusy={pendingAction === 'save'}
          />
        ) : null}

        <Button
          text={pendingAction === 'preview' ? 'Previewing...' : 'Preview'}
          onClick={onPreview}
          disabled={hasPendingAction || previewDisabled}
          ariaBusy={pendingAction === 'preview'}
          backgroundColor="#FFFFFF"
          textColor="#39006E"
        />

        {showActivate === true ? (
          <Button
            text={pendingAction === 'activate' ? 'Activating...' : 'Activate'}
            onClick={onActivate}
            disabled={hasPendingAction || activateDisabled}
            ariaBusy={pendingAction === 'activate'}
          />
        ) : null}

        {showCopy === true ? (
          <Button
            text={pendingAction === 'copy' ? 'Copying...' : 'Copy to draft'}
            onClick={onCopy}
            disabled={hasPendingAction}
            ariaBusy={pendingAction === 'copy'}
          />
        ) : null}
      </div>
    </form>
  );
}

export default TrainingDocumentForm;
export { TrainingDocumentForm };
