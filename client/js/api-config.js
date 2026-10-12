"use strict";

(() => {
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLocalPage = window.location.protocol === "file:" || LOCAL_HOSTS.has(window.location.hostname);
  const configuredOrigin = String(window.CATMATCH_API_BASE_URL || "").trim();
  const fallbackOrigin = isLocalPage ? "http://127.0.0.1:3000" : window.location.origin;
  const apiOrigin = (configuredOrigin || fallbackOrigin).replace(/\/+$/, "");

  window.CATMATCH_API_BASE_URL = apiOrigin;
  window.CATMATCH_API_URL = `${apiOrigin}/api`;

  function resolveApiUrl(value = "") {
    const raw = String(value || "");
    if (!raw) return raw;

    if (/^http:\/\/(localhost|127\.0\.0\.1):3000(?=\/|$)/i.test(raw)) {
      return raw.replace(/^http:\/\/(localhost|127\.0\.0\.1):3000/i, apiOrigin);
    }

    return raw;
  }

  const nativeFetch = window.fetch?.bind(window);
  if (nativeFetch) {
    window.fetch = (input, init) => {
      if (input instanceof Request) {
        const nextUrl = resolveApiUrl(input.url);
        return nativeFetch(nextUrl === input.url ? input : new Request(nextUrl, input), init);
      }

      if (input instanceof URL) {
        return nativeFetch(resolveApiUrl(input.href), init);
      }

      return nativeFetch(resolveApiUrl(input), init);
    };
  }

  window.CatMatchApi = Object.freeze({
    origin: apiOrigin,
    apiUrl: `${apiOrigin}/api`,
    resolve: resolveApiUrl,
  });
})();
