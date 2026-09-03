type EmailTimeFormat = 'detail' | 'inbox';

export function formatEmailTime(dateString: string, format: EmailTimeFormat = 'detail'): string {
  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateString;
  }

  if (format === 'inbox') {
    return parsedDate.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  const day = parsedDate.getDate().toString().padStart(2, '0');

  const month = parsedDate.toLocaleString('en-GB', {
    month: 'short',
  });

  const year = parsedDate.getFullYear();

  const time = parsedDate.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${day} ${month} ${year}, ${time}`;
}

export { toTitleCase } from './text.utils';
