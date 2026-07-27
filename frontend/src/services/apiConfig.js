function resolveApiUrl({
  configuredUrl,
  platform,
  expoHost,
  windowOrigin,
} = {}) {
  const normalizedConfiguredUrl = configuredUrl?.trim();
  if (normalizedConfiguredUrl) {
    return normalizedConfiguredUrl.replace(/\/$/, '');
  }

  if (platform === 'web') {
    if (windowOrigin) {
      try {
        const { hostname } = new URL(windowOrigin);
        if (['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)) {
          return 'http://localhost:3001';
        }
      } catch (_) {
        // fall back to the default local backend URL below
      }
    }

    return '';
  }

  const hostname = expoHost?.split(':')[0];
  return hostname ? `http://${hostname}:3001` : '';
}

module.exports = { resolveApiUrl };
