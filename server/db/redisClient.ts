import "dotenv/config";

const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redisEnabled = !!baseUrl && !!token;

function buildUrl(path: string): string {
  const trimmed = (baseUrl || "").replace(/\/$/, "");
  return `${trimmed}${path}`;
}

async function safeFetch(input: string): Promise<any | null> {
  if (!redisEnabled) return null;
  try {
    const res = await fetch(input, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      console.error("Redis request failed", res.status, res.statusText);
      return null;
    }
    const json = await res.json();
    return json;
  } catch (error) {
    console.error("Redis request error", error);
    return null;
  }
}

export async function redisGet<T>(key: string): Promise<T | null> {
  if (!redisEnabled) return null;
  const url = buildUrl(`/get/${encodeURIComponent(key)}`);
  const data = await safeFetch(url);
  if (!data || data.result == null) return null;
  try {
    return JSON.parse(data.result) as T;
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: any,
  ttlSeconds: number = 60,
): Promise<void> {
  if (!redisEnabled) return;
  const payload = JSON.stringify(value);
  const url = buildUrl(
    `/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(payload)}`,
  );
  await safeFetch(url);
}

export async function redisDel(key: string): Promise<void> {
  if (!redisEnabled) return;
  const url = buildUrl(`/del/${encodeURIComponent(key)}`);
  await safeFetch(url);
}
