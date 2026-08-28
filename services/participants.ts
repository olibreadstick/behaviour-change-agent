const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

export interface ParticipantSummary {
  participantId: string;
  createdAt: number;
}

export const getParticipantSummary = async (
  participantId: string
): Promise<ParticipantSummary> => {
  const response = await fetch(
    `${API_BASE_URL}/api/participants/${participantId}`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load participant account."
    );
  }

  return response.json();
};
