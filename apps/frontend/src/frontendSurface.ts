export function isOrdinaryApplicationOrigin(
  browserHref: string,
  configuredOrigin: string | undefined,
): boolean {
  if (!configuredOrigin) return false;

  try {
    const browserUrl = new URL(browserHref);
    const ordinaryUrl = new URL(configuredOrigin.trim());

    if (
      !['http:', 'https:'].includes(browserUrl.protocol) ||
      !['http:', 'https:'].includes(ordinaryUrl.protocol) ||
      ordinaryUrl.username !== '' ||
      ordinaryUrl.password !== '' ||
      ordinaryUrl.pathname !== '/' ||
      ordinaryUrl.search !== '' ||
      ordinaryUrl.hash !== ''
    ) {
      return false;
    }

    return browserUrl.origin === ordinaryUrl.origin;
  } catch {
    return false;
  }
}
