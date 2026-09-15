import type { DifficultyLevelDto, TrainingDocuemtnDraftInputDto } from '@insightful-phish/shared';
import { FormField, SelectField } from '../../components/ui/FormField';
import {
  TRAINING_DOCUMENT_SUMMARY_MAX_LENGTH,
  TRAINING_DOCUMENT_TITLE_MAX_LENGTH,
  trainingDocumentDifficultyOptions,
  type TrainingDocumentDraftErrors,
} from './trainingDocumentAuthoring';

type TrainingDocumentMetadataFieldsProps = Readonly<{
  draft: TrainingDocuemtnDraftInputDto;
  errors: TrainingDocumentDraftErrors;
  disabled?: boolean;
  onChange: (patch: Partial<TrainingDocuemtnDraftInputDto>) => void;
}>;

const textControlClassName =
  'font-overpass text-[1.05rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full min-w-0 p-2.5 focus:outline-none focus:ring-4 focus:ring-brand-medium disabled:opacity-60 disabled:cursor-not-allowed';

function TrainingDocumentMetadataFields({
  draft,
  errors,
  disabled = false,
  onChange,
}: TrainingDocumentMetadataFieldsProps) {
  const summaryLength = draft.contentSummary?.length ?? 0;

  function handleReadTimeChange(value: string) {
    const parsedValue = value.length === 0 ? null : Number(value);
    onChange({ estimatedReadTimeMinutes: parsedValue });
  }

  return (
    <div className="training-document-form__metadata">
      <FormField
        id="training-document-title"
        label="Title"
        helperText={`${draft.title.length}/${TRAINING_DOCUMENT_TITLE_MAX_LENGTH} characters`}
        errorText={errors.title}
      >
        {(controlProps) => (
          <input
            {...controlProps}
            name="title"
            type="text"
            required
            maxLength={TRAINING_DOCUMENT_TITLE_MAX_LENGTH}
            disabled={disabled}
            value={draft.title}
            className={textControlClassName}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        )}
      </FormField>

      <FormField
        id="training-document-summary"
        label="Summary"
        helperText={`${summaryLength}/${TRAINING_DOCUMENT_SUMMARY_MAX_LENGTH} characters`}
        errorText={errors.contentSummary}
      >
        {(controlProps) => (
          <textarea
            {...controlProps}
            name="contentSummary"
            rows={4}
            maxLength={TRAINING_DOCUMENT_SUMMARY_MAX_LENGTH}
            disabled={disabled}
            value={draft.contentSummary ?? ''}
            className={textControlClassName}
            onChange={(event) => onChange({ contentSummary: event.target.value })}
          />
        )}
      </FormField>

      <div className="training-document-form__metadata-row">
        <FormField
          id="training-document-read-time"
          label="Estimated read time"
          helperText="Optional, in whole minutes"
          errorText={errors.estimatedReadTimeMinutes}
        >
          {(controlProps) => (
            <input
              {...controlProps}
              name="estimatedReadTimeMinutes"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              disabled={disabled}
              value={draft.estimatedReadTimeMinutes ?? ''}
              className={textControlClassName}
              onChange={(event) => handleReadTimeChange(event.target.value)}
            />
          )}
        </FormField>

        <SelectField
          id="training-document-difficulty"
          label="Difficulty"
          value={draft.difficultyLevel}
          options={trainingDocumentDifficultyOptions}
          disabled={disabled}
          errorText={errors.difficultyLevel}
          onChange={(value) => onChange({ difficultyLevel: value as DifficultyLevelDto })}
        />
      </div>
    </div>
  );
}

export default TrainingDocumentMetadataFields;
export { TrainingDocumentMetadataFields };
