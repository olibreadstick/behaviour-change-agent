const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

export interface ParticipantProfileResponse {
  participantId: string;
  displayName: string;
  bodyColour: string;
  glassesColour: string;
  updatedAt: number;
}

export interface ParticipantProfileUpdate {
  displayName: string;
  bodyColour: string;
  glassesColour: string;
}

export const getParticipantProfile = async (
  participantId: string
): Promise<ParticipantProfileResponse | null> => {
  const response = await fetch(
    `${API_BASE_URL}/api/participant-profiles/${participantId}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      "Unable to load participant profile."
    );
  }

  return response.json();
};

export const saveParticipantProfile = async (
  participantId: string,
  profile: ParticipantProfileUpdate
): Promise<ParticipantProfileResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/participant-profiles/${participantId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to save participant profile."
    );
  }

  return data as ParticipantProfileResponse;
};

export const deleteParticipantProfile = async (
  participantId: string
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/api/participant-profiles/${participantId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to delete participant profile."
    );
  }
};
