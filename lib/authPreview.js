// Local preview uses the existing Auth.js flow with a separate session cookie.
// Production and ordinary development retain Auth.js's default cookie settings.
export function previewSessionCookies(environment) {
  if (environment.NODE_ENV !== "development" || environment.COMMAND_LOCAL_PREVIEW !== "true") return undefined;
  return { sessionToken: {
    name: "hw-local-preview.session-token",
    options: { httpOnly: true, sameSite: /** @type {const} */ ("lax"), path: "/", secure: false },
  } };
}
