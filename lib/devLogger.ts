// lib/devLogger.ts

type LogLevel = "info" | "warn" | "error";

export function devLog(
  scope: string,
  message: string,
  level: LogLevel = "info",
  data?: unknown
) {
  if (process.env.NODE_ENV === "production") return;

  const prefix = `[${scope}]`;

  switch (level) {
    case "warn":
      console.warn(prefix, message, data ?? "");
      break;
    case "error":
      console.error(prefix, message, data ?? "");
      break;
    default:
      console.log(prefix, message, data ?? "");
  }
}
