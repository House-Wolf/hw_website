/** Server processing must finish before a selected cover can be saved or published. */
export async function uploadEventCover(file, send = globalThis.fetch) {
  // Browser MIME declarations can be empty/wrong; the server verifies magic bytes and pixels.
  if (!file || !file.size || file.size > 4 * 1024 * 1024)
    throw new Error("Choose PNG, JPEG or WebP up to 4 MB, or remove the selected file to continue without it.");
  const response = await send("/api/command/operations/cover", { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file, signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The cover could not be processed. Choose it again or remove it.");
  const imageData = result.data?.imageData;
  if (typeof imageData !== "string" || imageData.length > 750000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(imageData))
    throw new Error("The processed cover is invalid. Choose it again or remove it.");
  return imageData;
}
