export async function commandApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const writing = method !== "GET";
  const timeoutMessage = writing
    ? "The save request timed out. Your text is still here. Reload the saved version to check whether it saved before trying again."
    : "The request timed out. Please try loading the saved version again.";
  try {
    return await Promise.race([
      (async () => {
        let response: Response;
        try {
          response = await fetch(`/api/command/${path}`, { method, cache: "no-store", signal: controller.signal, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
        } catch {
          if (controller.signal.aborted) throw new Error(timeoutMessage);
          throw new Error(writing ? "Could not reach the website. Your text is still here. Check your connection and reload the saved version before retrying." : "Could not reach the website. Check your connection and try again.");
        }
        let result;
        try { result = await response.json(); }
        catch { throw new Error(controller.signal.aborted ? timeoutMessage : "The website returned an unreadable response. Please reload the saved version and try again."); }
        if (!response.ok) throw new Error(result?.error || "Request failed. Please retry.");
        if (!result || typeof result !== "object" || !("data" in result)) throw new Error("The website returned an unexpected response. Please reload the saved version and try again.");
        return result.data as T;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error(timeoutMessage)); }, 45_000);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
