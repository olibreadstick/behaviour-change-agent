import { EXTRA_USAGE_KEYS } from "./cloudPersistenceConfig";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080"
).replace(/\/$/, "");

const AUTH_SESSION_KEY = "support_agent_auth_session";
const ACCOUNTS_KEY = "uc_accounts";
const COMMUNITY_KEY = "behaviour_change_community_posts";

const KNOWN_USAGE_KEYS = Array.from(
  new Set([
    "behaviour_change_usage_events",
    "behaviour_change_usage",
    "behaviour_change_usage_log",
    "behaviour-change-usage-events",
    "uc_usage_events",
    ...EXTRA_USAGE_KEYS,
  ])
);

interface AuthSession {
  role: "participant" | "admin";
  userId?: string;
}

interface ParticipantRemoteRecord {
  key: string;
  payload: string;
  updatedAt: string;
}

interface SharedRemoteRecord {
  id: string;
  payload: string;
  updatedAt: string;
}

interface AdminParticipant {
  id: string;
  createdAt?: string | null;
}

interface AdminParticipantData {
  participantId: string;
  key: string;
  payload: string;
  updatedAt: string;
}

interface UsageEventLike {
  id?: string;
  userId: string;
  type: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

let started = false;
let activeParticipantId: string | null = null;
let participantSnapshot = new Map<string, string | null>();
let communitySnapshot = new Map<string, string>();
let sentUsageIds = new Set<string>();
let participantSyncBusy = false;
let communityBusy = false;
let adminBusy = false;
let lastParticipantRefresh = 0;
let lastCommunityRefresh = 0;
let lastAdminRefresh = 0;

const fetchJson = async <T>(
  path: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Cloud persistence request failed (${response.status}): ${body}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

const getAuthSession = (): AuthSession | null => {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (
      parsed?.role !== "participant" &&
      parsed?.role !== "admin"
    ) {
      return null;
    }

    return parsed as AuthSession;
  } catch {
    return null;
  }
};

const isParticipantScopedKey = (
  key: string,
  participantId: string
) => {
  if (!key.includes(participantId)) {
    return false;
  }

  // Profile/onboarding/penguin already use the dedicated participant_profiles API.
  if (
    key.startsWith("uc_profile_") ||
    key.startsWith("behaviour_change_penguin_")
  ) {
    return false;
  }

  // Never copy authentication material into generic cloud storage.
  const lower = key.toLowerCase();

  if (
    lower.includes("password") ||
    lower.includes("credential") ||
    lower.includes("auth")
  ) {
    return false;
  }

  return true;
};

const getParticipantLocalRecords = (
  participantId: string
) => {
  const records = new Map<string, string>();

  for (
    let index = 0;
    index < localStorage.length;
    index += 1
  ) {
    const key = localStorage.key(index);

    if (
      !key ||
      !isParticipantScopedKey(key, participantId)
    ) {
      continue;
    }

    const value = localStorage.getItem(key);

    if (value !== null) {
      records.set(key, value);
    }
  }

  return records;
};

const putParticipantRecord = async (
  participantId: string,
  key: string,
  payload: string
) => {
  await fetchJson(
    `/api/cloud/participants/${encodeURIComponent(participantId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ key, payload }),
    }
  );
};

const deleteParticipantRecord = async (
  participantId: string,
  key: string
) => {
  await fetchJson(
    `/api/cloud/participants/${encodeURIComponent(
      participantId
    )}?key=${encodeURIComponent(key)}`,
    { method: "DELETE" }
  );
};

const fetchParticipantRecords = (
  participantId: string
) =>
  fetchJson<ParticipantRemoteRecord[]>(
    `/api/cloud/participants/${encodeURIComponent(participantId)}`
  );

const hydrateParticipant = async (
  participantId: string
) => {
  const remoteRecords =
    await fetchParticipantRecords(participantId);

  const remoteByKey = new Map(
    remoteRecords.map((record) => [record.key, record])
  );

  // Neon wins for records that already exist there.
  remoteRecords.forEach((record) => {
    localStorage.setItem(record.key, record.payload);
  });

  // First migration only: preserve old browser data that Neon does not have yet.
  const localRecords =
    getParticipantLocalRecords(participantId);

  for (const [key, payload] of localRecords) {
    if (!remoteByKey.has(key)) {
      await putParticipantRecord(
        participantId,
        key,
        payload
      );
    }
  }

  participantSnapshot =
    getParticipantLocalRecords(participantId);
};

const syncParticipantLocal = async (
  participantId: string
) => {
  if (participantSyncBusy) {
    return;
  }

  participantSyncBusy = true;

  try {
    const current =
      getParticipantLocalRecords(participantId);

    for (const [key, payload] of current) {
      if (
        participantSnapshot.get(key) !== payload
      ) {
        await putParticipantRecord(
          participantId,
          key,
          payload
        );
        participantSnapshot.set(key, payload);
      }
    }

    for (const key of [
      ...participantSnapshot.keys(),
    ]) {
      if (!current.has(key)) {
        await deleteParticipantRecord(
          participantId,
          key
        );
        participantSnapshot.delete(key);
      }
    }
  } catch (error) {
    console.error(
      "Unable to sync participant data:",
      error
    );
  } finally {
    participantSyncBusy = false;
  }
};

const refreshParticipantRemote = async (
  participantId: string
) => {
  try {
    const records =
      await fetchParticipantRecords(participantId);

    const remoteKeys = new Set<string>();

    for (const record of records) {
      remoteKeys.add(record.key);

      const current =
        localStorage.getItem(record.key);

      const baseline =
        participantSnapshot.get(record.key) ??
        null;

      // Do not overwrite an unsynced change made in this browser.
      if (
        current === baseline &&
        current !== record.payload
      ) {
        localStorage.setItem(
          record.key,
          record.payload
        );
        participantSnapshot.set(
          record.key,
          record.payload
        );
      }
    }

    for (const key of [
      ...participantSnapshot.keys(),
    ]) {
      const current =
        localStorage.getItem(key);

      if (
        !remoteKeys.has(key) &&
        current === participantSnapshot.get(key)
      ) {
        localStorage.removeItem(key);
        participantSnapshot.delete(key);
      }
    }
  } catch (error) {
    console.error(
      "Unable to refresh participant data:",
      error
    );
  }
};

const readCommunityPosts = (): any[] => {
  try {
    const raw =
      localStorage.getItem(COMMUNITY_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const postMap = (posts: any[]) =>
  new Map<string, string>(
    posts
      .filter(
        (post) =>
          post &&
          typeof post.id === "string"
      )
      .map((post) => [
        post.id,
        JSON.stringify(post),
      ])
  );

const fetchCommunityRecords = () =>
  fetchJson<SharedRemoteRecord[]>(
    "/api/cloud/community"
  );

const putCommunityRecord = async (
  id: string,
  payload: string
) => {
  await fetchJson(
    `/api/cloud/community/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ payload }),
    }
  );
};

const deleteCommunityRecord = async (
  id: string
) => {
  await fetchJson(
    `/api/cloud/community/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
};

const parseRemotePosts = (
  records: SharedRemoteRecord[]
) =>
  records
    .map((record) => {
      try {
        return JSON.parse(record.payload);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

const hydrateCommunity = async () => {
  const remoteRecords =
    await fetchCommunityRecords();

  const remotePosts =
    parseRemotePosts(remoteRecords);

  const localPosts = readCommunityPosts();

  if (remotePosts.length === 0) {
    for (const post of localPosts) {
      if (
        post &&
        typeof post.id === "string"
      ) {
        await putCommunityRecord(
          post.id,
          JSON.stringify(post)
        );
      }
    }

    communitySnapshot = postMap(localPosts);
    return;
  }

  const remoteMap = postMap(remotePosts);

  // Preserve pre-migration local posts that are not yet in Neon.
  for (const post of localPosts) {
    if (
      post &&
      typeof post.id === "string" &&
      !remoteMap.has(post.id)
    ) {
      const payload = JSON.stringify(post);

      await putCommunityRecord(
        post.id,
        payload
      );

      remotePosts.push(post);
      remoteMap.set(post.id, payload);
    }
  }

  localStorage.setItem(
    COMMUNITY_KEY,
    JSON.stringify(remotePosts)
  );

  communitySnapshot = postMap(remotePosts);

  window.dispatchEvent(
    new Event(
      "behaviour-change-community-updated"
    )
  );
};

const syncCommunityLocal = async () => {
  if (communityBusy) {
    return;
  }

  communityBusy = true;

  try {
    const currentMap =
      postMap(readCommunityPosts());

    for (const [id, payload] of currentMap) {
      if (
        communitySnapshot.get(id) !== payload
      ) {
        await putCommunityRecord(id, payload);
        communitySnapshot.set(id, payload);
      }
    }

    for (const id of [
      ...communitySnapshot.keys(),
    ]) {
      if (!currentMap.has(id)) {
        await deleteCommunityRecord(id);
        communitySnapshot.delete(id);
      }
    }
  } catch (error) {
    console.error(
      "Unable to sync Community Board:",
      error
    );
  } finally {
    communityBusy = false;
  }
};

const refreshCommunityRemote = async () => {
  try {
    const remotePosts =
      parseRemotePosts(
        await fetchCommunityRecords()
      );

    const remoteMap = postMap(remotePosts);
    const currentMap =
      postMap(readCommunityPosts());

    const currentSerialized =
      JSON.stringify(
        [...currentMap.entries()].sort()
      );
    const remoteSerialized =
      JSON.stringify(
        [...remoteMap.entries()].sort()
      );

    if (
      currentSerialized !== remoteSerialized
    ) {
      localStorage.setItem(
        COMMUNITY_KEY,
        JSON.stringify(remotePosts)
      );
      communitySnapshot = remoteMap;

      window.dispatchEvent(
        new Event(
          "behaviour-change-community-updated"
        )
      );
    }
  } catch (error) {
    console.error(
      "Unable to refresh Community Board:",
      error
    );
  }
};

const looksLikeUsageEvent = (
  value: any
): value is UsageEventLike =>
  value &&
  typeof value === "object" &&
  typeof value.userId === "string" &&
  typeof value.type === "string" &&
  typeof value.timestamp === "string";

const collectUsageEvents = () => {
  const result: Array<{
    key: string;
    event: UsageEventLike;
    index: number;
  }> = [];

  for (
    let storageIndex = 0;
    storageIndex < localStorage.length;
    storageIndex += 1
  ) {
    const key = localStorage.key(storageIndex);

    if (!key) {
      continue;
    }

    try {
      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        continue;
      }

      parsed.forEach((event, eventIndex) => {
        if (looksLikeUsageEvent(event)) {
          result.push({
            key,
            event,
            index: eventIndex,
          });
        }
      });
    } catch {
      // Ignore non-JSON localStorage values.
    }
  }

  return result;
};

const syncUsageEvents = async () => {
  for (const {
    event,
    index,
  } of collectUsageEvents()) {
    const id =
      event.id ||
      [
        event.userId,
        event.timestamp,
        event.type,
        String(index),
      ].join("::");

    if (sentUsageIds.has(id)) {
      continue;
    }

    try {
      await fetchJson(
        "/api/cloud/usage",
        {
          method: "POST",
          body: JSON.stringify({
            id,
            userId: event.userId,
            type: event.type,
            timestamp: event.timestamp,
            metadata: event.metadata || {},
          }),
        }
      );

      sentUsageIds.add(id);
    } catch (error) {
      console.error(
        "Unable to sync usage event:",
        error
      );
    }
  }
};

const toCreatedAtMillis = (
  value?: string | null
) => {
  if (!value) {
    return Date.now();
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed)
    ? parsed
    : Date.now();
};

const writeUsageCache = (
  events: UsageEventLike[]
) => {
  const payload = JSON.stringify(events);

  const detectedUsageKeys = Array.from(
    new Set(
      collectUsageEvents().map(
        ({ key }) => key
      )
    )
  );

  const allKeys = Array.from(
    new Set([
      ...KNOWN_USAGE_KEYS,
      ...detectedUsageKeys,
    ])
  );

  allKeys.forEach((key) => {
    localStorage.setItem(key, payload);
  });

  window.dispatchEvent(
    new Event(
      "behaviour-change-usage-updated"
    )
  );
};

const hydrateAdminCache = async (
  allowReload: boolean
) => {
  if (adminBusy) {
    return;
  }

  adminBusy = true;

  try {
    const [
      participants,
      usageEvents,
      participantData,
      communityRecords,
    ] = await Promise.all([
      fetchJson<AdminParticipant[]>(
        "/api/cloud/admin/participants"
      ),
      fetchJson<UsageEventLike[]>(
        "/api/cloud/admin/usage"
      ),
      fetchJson<AdminParticipantData[]>(
        "/api/cloud/admin/participant-data"
      ),
      fetchCommunityRecords(),
    ]);

    const anonymousAccounts =
      participants.map((participant) => ({
        id: participant.id,
        // Admin intentionally receives Participant ID only.
        name: participant.id,
        createdAt: toCreatedAtMillis(
          participant.createdAt
        ),
      }));

    let previousIds: string[] = [];

    try {
      const raw =
        localStorage.getItem(ACCOUNTS_KEY);
      const previous = raw
        ? JSON.parse(raw)
        : [];

      previousIds = Array.isArray(previous)
        ? previous
            .map((item) => item?.id)
            .filter(Boolean)
            .sort()
        : [];
    } catch {
      previousIds = [];
    }

    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify(anonymousAccounts)
    );

    participantData.forEach((record) => {
      // Profile/name and penguin data remain private to the participant profile API.
      if (
        !record.key.startsWith("uc_profile_") &&
        !record.key.startsWith(
          "behaviour_change_penguin_"
        )
      ) {
        localStorage.setItem(
          record.key,
          record.payload
        );
      }
    });

    writeUsageCache(usageEvents);

    const communityPosts =
      parseRemotePosts(communityRecords);

    localStorage.setItem(
      COMMUNITY_KEY,
      JSON.stringify(communityPosts)
    );

    communitySnapshot =
      postMap(communityPosts);

    window.dispatchEvent(
      new Event(
        "behaviour-change-community-updated"
      )
    );

    const newIds = anonymousAccounts
      .map((account) => account.id)
      .sort();

    const accountsChanged =
      JSON.stringify(previousIds) !==
      JSON.stringify(newIds);

    const bootstrapFlag =
      "cloud_admin_bootstrap_complete";

    if (
      allowReload &&
      (
        !sessionStorage.getItem(bootstrapFlag) ||
        accountsChanged
      )
    ) {
      sessionStorage.setItem(
        bootstrapFlag,
        "true"
      );
      window.location.reload();
    }
  } catch (error) {
    console.error(
      "Unable to hydrate administrator data:",
      error
    );
  } finally {
    adminBusy = false;
  }
};

const handleParticipantSession = async (
  participantId: string
) => {
  const changedParticipant =
    activeParticipantId !== participantId;

  if (changedParticipant) {
    activeParticipantId = participantId;
    participantSnapshot = new Map();
    sentUsageIds = new Set();

    try {
      await hydrateParticipant(participantId);
      await hydrateCommunity();
      await syncUsageEvents();

      const flag =
        `cloud_participant_bootstrap_reloaded_${participantId}`;

      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, "true");
        window.location.reload();
        return;
      }
    } catch (error) {
      console.error(
        "Unable to initialize participant cloud data:",
        error
      );
    }
  }

  await syncParticipantLocal(participantId);
  await syncCommunityLocal();
  await syncUsageEvents();

  const now = Date.now();

  if (
    now - lastParticipantRefresh > 5000
  ) {
    lastParticipantRefresh = now;
    await refreshParticipantRemote(
      participantId
    );
  }

  if (
    now - lastCommunityRefresh > 4000
  ) {
    lastCommunityRefresh = now;
    await refreshCommunityRemote();
  }
};

const tick = async () => {
  const session = getAuthSession();

  if (!session) {
    activeParticipantId = null;
    return;
  }

  if (
    session.role === "participant" &&
    session.userId
  ) {
    await handleParticipantSession(
      session.userId
    );
    return;
  }

  if (session.role === "admin") {
    activeParticipantId = null;
    await syncCommunityLocal();

    const now = Date.now();

    if (now - lastAdminRefresh > 5000) {
      lastAdminRefresh = now;
      await hydrateAdminCache(true);
    }
  }
};

export const startCloudPersistence = () => {
  if (
    started ||
    typeof window === "undefined"
  ) {
    return;
  }

  started = true;

  void tick();

  window.setInterval(() => {
    void tick();
  }, 900);

  window.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState === "visible"
      ) {
        void tick();
      }
    }
  );

  window.addEventListener(
    "online",
    () => {
      void tick();
    }
  );
};

startCloudPersistence();
