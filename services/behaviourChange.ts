export type BehaviourChangeResponse = unknown;

const N8N_CHAT_URL = import.meta.env.VITE_N8N_CHAT_URL;

export async function sendBehaviourChangeMessage(
  sessionId: string,
  chatInput: string
): Promise<BehaviourChangeResponse> {
  if (!N8N_CHAT_URL) {
    throw new Error("VITE_N8N_CHAT_URL is not configured.");
  }

  const response = await fetch(N8N_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "sendMessage",
      sessionId,
      chatInput,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `n8n request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}