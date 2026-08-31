import { type ChangeEventHandler, type ReactNode, useId } from 'react';

export type FormFieldControlProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

type FormFieldProps = Readonly<{
  id?: string;
  label: ReactNode;
  helperText?: ReactNode;
  errorText?: ReactNode;
  className?: string;
  children: (controlProps: FormFieldControlProps) => ReactNode;
}>;

function buildDescribedByIds(ids: readonly (string | undefined)[]) {
  return ids.filter((id): id is string => Boolean(id)).join(' ') || undefined;
}

export function FormField({
  id,
  label,
  helperText,
  errorText,
  className = '',
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const helperId = helperText ? `${controlId}-helper` : undefined;
  const errorId = errorText ? `${controlId}-error` : undefined;
  const describedBy = buildDescribedByIds([helperId, errorId]);

  return (
    <div className={className}>
      <label
        htmlFor={controlId}
        className="block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
      >
        {label}
      </label>
      {children({
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': errorText ? true : undefined,
      })}
      {helperText && (
        <p id={helperId} className="font-overpass text-xs text-gray-600 mt-1">
          {helperText}
        </p>
      )}
      {errorText && (
        <p id={errorId} role="alert" className="font-overpass text-xs text-red-600 mt-1">
          {errorText}
        </p>
      )}
    </div>
  );
}

export type ReadOnlyFieldProps = Readonly<{
  id?: string;
  label: ReactNode;
  value: string | null | undefined;
  helperText?: ReactNode;
  className?: string;
  valueClassName?: string;
  emptyValue?: string;
}>;

export function ReadOnlyField({
  id,
  label,
  value,
  helperText,
  className = '',
  valueClassName = '',
  emptyValue = 'Not provided',
}: ReadOnlyFieldProps) {
  const displayValue = value && value.trim().length > 0 ? value : emptyValue;

  return (
    <FormField id={id} label={label} helperText={helperText} className={className}>
      {(controlProps) => (
        <input
          {...controlProps}
          readOnly
          type="text"
          value={displayValue}
          className={`font-overpass text-[1.2rem] bg-faint-purple border border-default text-deep-purple block w-full min-w-0 p-2.5 cursor-text select-text overflow-x-auto focus:outline-none focus:ring-4 focus:ring-brand-medium ${valueClassName}`}
        />
      )}
    </FormField>
  );
}

export type SelectFieldOption = Readonly<{
  value: string;
  label: string;
  disabled?: boolean;
}>;

export type SelectFieldProps = Readonly<{
  id?: string;
  label: ReactNode;
  value: string;
  options: readonly SelectFieldOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  helperText?: ReactNode;
  errorText?: ReactNode;
  className?: string;
  selectClassName?: string;
}>;

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  helperText,
  errorText,
  className = '',
  selectClassName = '',
}: SelectFieldProps) {
  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    onChange(event.target.value);
  };

  return (
    <FormField
      id={id}
      label={label}
      helperText={helperText}
      errorText={errorText}
      className={className}
    >
      {(controlProps) => (
        <select
          {...controlProps}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full min-w-0 p-2.5 focus:outline-none focus:ring-4 focus:ring-brand-medium disabled:opacity-60 disabled:cursor-not-allowed ${selectClassName}`}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-white text-deep-purple"
            >
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}
