export function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => {
    const titleCasedWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

    return word.replace(/[A-Z]{2,}(?=[^A-Za-z]|$)|./g, (segment, offset: number) => {
      if (/^[A-Z]{2,}$/.test(segment)) {
        return segment;
      }

      return titleCasedWord.slice(offset, offset + segment.length);
    });
  });
}
