import type { ContentCategoryDto, TrainingDocuemtnDraftInputDto } from '@insightful-phish/shared';
import { FormField } from '../../components/ui/FormField';
import {
  TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH,
  trainingDocumentCategoryOptions,
  type TrainingDocumentDraftErrors,
} from './trainingDocumentAuthoring';

type TrainingDocumentContentFieldsProps = Readonly<{
  draft: TrainingDocuemtnDraftInputDto;
  errors: TrainingDocumentDraftErrors;
  disabled?: boolean;
  onChange: (patch: Partial<TrainingDocuemtnDraftInputDto>) => void;
}>;

function TrainingDocumentContentFields({
  draft,
  errors,
  disabled = false,
  onChange,
}: TrainingDocumentContentFieldsProps) {
  const categoryErrorId = errors.categories === undefined ? undefined : 'training-categories-error';

  function updateCategory(category: ContentCategoryDto, checked: boolean) {
    const categories =
      checked === true
        ? [...draft.categories, category]
        : draft.categories.filter((currentCategory) => currentCategory !== category);

    onChange({ categories });
  }

  return (
    <div className="training-document-form__content-fields">
      <FormField
        id="training-document-markdown"
        label="Markdown content"
        helperText={`${draft.rawMarkdown.length}/${TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH} characters`}
        errorText={errors.rawMarkdown}
      >
        {(controlProps) => (
          <textarea
            {...controlProps}
            name="rawMarkdown"
            rows={22}
            disabled={disabled}
            value={draft.rawMarkdown}
            spellCheck
            className="training-document-form__markdown font-mono bg-gray-50 border border-gray-300 text-deep-purple block w-full min-w-0 p-3 focus:outline-none focus:ring-4 focus:ring-brand-medium disabled:opacity-60 disabled:cursor-not-allowed"
            onChange={(event) => onChange({ rawMarkdown: event.target.value })}
          />
        )}
      </FormField>

      <fieldset
        className="training-document-form__categories"
        disabled={disabled}
        aria-describedby={categoryErrorId}
        aria-invalid={errors.categories === undefined ? undefined : true}
      >
        <legend className="font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink">
          Categories
        </legend>
        <p className="font-overpass text-xs text-gray-600 mt-1">
          Select at least one category before activation.
        </p>

        <div className="training-document-form__category-options">
          {trainingDocumentCategoryOptions.map((option) => (
            <label
              key={option.value}
              className="training-document-form__category-option font-overpass text-deep-purple"
            >
              <input
                type="checkbox"
                name="categories"
                value={option.value}
                checked={draft.categories.includes(option.value)}
                onChange={(event) => updateCategory(option.value, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        {errors.categories === undefined ? null : (
          <p
            id="training-categories-error"
            className="font-overpass text-xs text-red-600 mt-1"
            role="alert"
          >
            {errors.categories}
          </p>
        )}
      </fieldset>
    </div>
  );
}

export default TrainingDocumentContentFields;
export { TrainingDocumentContentFields };
