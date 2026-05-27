const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAppToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required.");
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error(`Twitch token error: ${res.status}`);

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

function twitchHeaders(token: string) {
  return {
    "Client-Id": CLIENT_ID!,
    Authorization: `Bearer ${token}`,
  };
}

export interface TwitchUserInfo {
  login: string;
  displayName: string;
  profileImageUrl: string;
}

export interface TwitchLiveStream {
  userLogin: string;
  title: string;
  viewerCount: number;
  gameName: string;
  thumbnailUrl: string; // Replace {width}x{height} before use
}

export interface TwitchStreamerStatus extends TwitchUserInfo {
  isLive: boolean;
  stream?: TwitchLiveStream;
}

/** Fetch display names and avatars for a list of Twitch usernames. */
export async function fetchUserInfos(logins: string[]): Promise<TwitchUserInfo[]> {
  if (!logins.length || !CLIENT_ID || !CLIENT_SECRET) return [];

  const token = await getAppToken();
  const params = logins.map((l) => `login=${encodeURIComponent(l)}`).join("&");
  const res = await fetch(`https://api.twitch.tv/helix/users?${params}`, {
    headers: twitchHeaders(token),
    next: { revalidate: 3600 }, // Cache user info for 1h
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.data ?? []).map((u: Record<string, string>) => ({
    login: u.login,
    displayName: u.display_name,
    profileImageUrl: u.profile_image_url,
  }));
}

/** Fetch live status for a list of Twitch usernames. Only live channels appear. */
export async function fetchLiveStreams(logins: string[]): Promise<TwitchLiveStream[]> {
  if (!logins.length || !CLIENT_ID || !CLIENT_SECRET) return [];

  const token = await getAppToken();
  const params = logins.map((l) => `user_login=${encodeURIComponent(l)}`).join("&");
  const res = await fetch(`https://api.twitch.tv/helix/streams?${params}&first=100`, {
    headers: twitchHeaders(token),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`[twitch] fetchLiveStreams error ${res.status}:`, await res.text().catch(() => ""));
    return [];
  }

  const data = await res.json();
  return (data.data ?? []).map((s: Record<string, string | number>) => ({
    userLogin: s.user_login as string,
    title: s.title as string,
    viewerCount: s.viewer_count as number,
    gameName: s.game_name as string,
    thumbnailUrl: (s.thumbnail_url as string)
      .replace("{width}", "440")
      .replace("{height}", "248"),
  }));
}

/** Combines user info + live status for all given logins. */
export async function fetchStreamersStatus(
  logins: string[]
): Promise<TwitchStreamerStatus[]> {
  if (!logins.length) return [];

  const [users, liveStreams] = await Promise.all([
    fetchUserInfos(logins),
    fetchLiveStreams(logins),
  ]);

  const liveMap = new Map(liveStreams.map((s) => [s.userLogin.toLowerCase(), s]));
  const userMap = new Map(users.map((u) => [u.login.toLowerCase(), u]));

  return logins.map((login) => {
    const lower = login.toLowerCase();
    const user = userMap.get(lower);
    const stream = liveMap.get(lower);
    return {
      login: lower,
      displayName: user?.displayName ?? login,
      profileImageUrl: user?.profileImageUrl ?? "",
      isLive: !!stream,
      stream,
    };
  });
}
