export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolveWebSocketBaseUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  if (!API_BASE_URL) {
    return "";
  }

  return API_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

export const WS_BASE_URL = resolveWebSocketBaseUrl();
