/**
 * 远端取数：更新信息（GitHub Releases）与在线统计（自建统计服务）。
 *
 * 这里只做「发请求 + 校验外部数据形状」，不碰 React、不碰扩展上下文，
 * 因此 onRegister 的启动检查和面板里的手动刷新可以复用同一份逻辑。
 */

export interface UpdateEntry {
  version: string;
  date?: string;
  changes: string[];
}

export interface UpdateInfo {
  latestVersion: string;
  releasedAt?: string;
  downloadUrl?: string;
  announcement?: string;
  changelog: UpdateEntry[];
}

export interface OnlineStats {
  online: number;
  total: number;
}

/** 一次取多少个 Release 作为更新日志的历史长度。 */
const RELEASE_PAGE_SIZE = 10;
/** 单个版本最多列出多少条变更，防止超长 Release 正文把面板撑爆。 */
const MAX_CHANGES_PER_RELEASE = 20;

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * 把创作者填的仓库标识归一化成 "owner/repo"。
 * 接受 owner/repo、https://github.com/owner/repo、带 .git 后缀三种写法。
 */
export function normalizeRepo(input: string): string {
  const value = input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");
  const parts = value.split("/").filter((part) => part.length > 0);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "";
}

/** tag 常写成 "v1.2.3"，去掉前缀再交给 isNewerVersion 比较。 */
function stripVersionPrefix(tag: string): string {
  return tag.trim().replace(/^v/i, "");
}

/** "2025-12-02T20:48:10Z" → "2025-12-02"；面板只展示到天。 */
function toDateOnly(value: unknown): string | undefined {
  const raw = asNonEmptyString(value);
  if (!raw) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  return match ? match[1] : raw;
}

/**
 * 把 Release 正文（Markdown）拆成一行一条的变更说明。
 * 只做最保守的清洗：去掉标题井号、列表符号和链接语法，丢掉空行。
 */
function parseReleaseBody(body: unknown): string[] {
  const text = typeof body === "string" ? body : "";
  const changes: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine
      .trim()
      .replace(/^#{1,6}\s*/, "")
      .replace(/^[-*+]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .trim();
    if (!line) continue;
    changes.push(line);
    if (changes.length >= MAX_CHANGES_PER_RELEASE) break;
  }
  return changes;
}

/** GitHub 返回的是不可信输入，逐字段收窄后再交给 UI。 */
function parseReleases(raw: unknown, repo: string): UpdateInfo {
  if (!Array.isArray(raw)) {
    throw new Error(`仓库 ${repo} 的 Release 列表格式异常`);
  }

  const releases: Record<string, unknown>[] = [];
  for (const item of raw as unknown[]) {
    const release = asRecord(item);
    if (!release) continue;
    // 草稿和预发布都不该提示玩家更新。
    if (release.draft === true || release.prerelease === true) continue;
    releases.push(release);
  }
  if (releases.length === 0) {
    throw new Error(`仓库 ${repo} 还没有正式 Release`);
  }

  const changelog: UpdateEntry[] = [];
  for (const release of releases) {
    const tag = asNonEmptyString(release.tag_name);
    if (!tag) continue;
    const changes = parseReleaseBody(release.body);
    changelog.push({
      version: stripVersionPrefix(tag),
      date: toDateOnly(release.published_at),
      changes: changes.length > 0 ? changes : ["（该版本未填写更新说明）"],
    });
  }
  if (changelog.length === 0) {
    throw new Error(`仓库 ${repo} 的 Release 缺少 tag_name`);
  }

  // GitHub 按发布时间倒序返回，第一条就是最新。
  const latest = releases[0];
  const latestTag = asNonEmptyString(latest.tag_name) ?? "";
  const title = asNonEmptyString(latest.name);
  return {
    latestVersion: stripVersionPrefix(latestTag),
    releasedAt: toDateOnly(latest.published_at),
    downloadUrl: asNonEmptyString(latest.html_url),
    // 标题和 tag 相同时不当公告，免得面板里把 "v1.2.0" 显示两遍。
    announcement: title && title !== latestTag ? title : undefined,
    changelog,
  };
}

/**
 * 读 GitHub Releases 推导更新信息。
 * 未登录时 GitHub 限制每 IP 每小时 60 次；一次启动检查只消耗 1 次。
 */
export async function fetchUpdateInfo(repo: string): Promise<UpdateInfo> {
  const slug = normalizeRepo(repo);
  if (!slug) {
    throw new Error(`仓库标识 "${repo}" 无法解析，应形如 owner/repo`);
  }
  const response = await fetch(
    `https://api.github.com/repos/${slug}/releases?per_page=${RELEASE_PAGE_SIZE}`,
    { cache: "no-store", headers: { Accept: "application/vnd.github+json" } },
  );
  if (response.status === 404) {
    throw new Error(`仓库 ${slug} 不存在，或者不是公开仓库`);
  }
  if (response.status === 403) {
    throw new Error(
      "GitHub API 调用过于频繁（未登录时每 IP 每小时 60 次），请稍后再试",
    );
  }
  if (!response.ok) {
    throw new Error(`读取 Release 失败：HTTP ${response.status}`);
  }
  return parseReleases(await response.json(), slug);
}

/**
 * 「当前游戏版本」的默认值 —— index.tsx 的 settings 声明也用它，保持单一来源。
 *
 * 为什么读取处还要再兜一次：宿主对「只在 schema 里声明过默认值、作者从没在设置面板
 * 手动改过」的字段，运行时可能读回空值。若不兜底，isNewerVersion 会因为「当前版本为空」
 * 恒返回 false，整个更新提示永远不会触发。
 */
export const DEFAULT_CURRENT_VERSION = "0.1.0";

function versionParts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => {
      const parsed = Number.parseInt(part, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    });
}

/** latest 比 current 新时返回 true；任一侧为空或无法比较时返回 false。 */
export function isNewerVersion(latest: string, current: string): boolean {
  if (latest.trim().length === 0 || current.trim().length === 0) return false;
  const next = versionParts(latest);
  const now = versionParts(current);
  const length = Math.max(next.length, now.length);
  for (let i = 0; i < length; i += 1) {
    const a = next[i] ?? 0;
    const b = now[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

function endpointBase(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "");
}

function asCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export async function fetchOnlineStats(endpoint: string): Promise<OnlineStats> {
  const response = await fetch(`${endpointBase(endpoint)}/stats`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`读取在线人数失败：HTTP ${response.status}`);
  }
  const raw = (await response.json()) as Record<string, unknown>;
  return { online: asCount(raw.online), total: asCount(raw.total) };
}

export async function sendHeartbeat(
  endpoint: string,
  playerId: string,
): Promise<void> {
  const response = await fetch(`${endpointBase(endpoint)}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
  if (!response.ok) {
    throw new Error(`上报心跳失败：HTTP ${response.status}`);
  }
}

/**
 * 生成本机玩家标识。用 getRandomValues 而不是 randomUUID ——
 * 后者要求安全上下文，打包后的 Player 可能从 file:// 加载。
 */
export function createPlayerId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}