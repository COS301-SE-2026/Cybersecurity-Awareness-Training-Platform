export function toDateTimeLocal(value?: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localTime.toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
