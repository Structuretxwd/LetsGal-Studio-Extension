var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name2, symbol) => (symbol = Symbol[name2]) ? symbol : Symbol.for("Symbol." + name2);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => [, , , __create((base == null ? void 0 : base[__knownSymbol("metadata")]) ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name2, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name: name2, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name2, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name2]() {
    return __privateGet(this, extra);
  }, set [name2](x) {
    return __privateSet(this, extra, x);
  } }, name2));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name2) : __name(target, name2);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name2, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name2 in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name2];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name2] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name2, desc), p ? k ^ 4 ? extra : desc : target;
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _OnlineUpdateExtension_decorators, _init, _a;
import { useExtensionContext, defineSave, Extension, settings, extension } from "@avg-studio/sdk";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
const id = "com.structuretxwd.game-update";
const name = "online-update";
const description = "启动自动检查新版本，弹出公告与更新日志，按玩家平台一键直达安装包。";
const author = "Structure";
const version = "0.1.0";
const entry = "dist/index.mjs";
const sdkVersion = "^2.0.0";
const manifest = {
  id,
  name,
  description,
  author,
  version,
  entry,
  sdkVersion
};
const RELEASE_PAGE_SIZE = 10;
const MAX_CHANGES_PER_RELEASE = 20;
function asNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
function asRecord(value) {
  return typeof value === "object" && value !== null ? value : void 0;
}
function normalizeRepo(input) {
  const value = input.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  const parts = value.split("/").filter((part) => part.length > 0);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "";
}
function stripVersionPrefix(tag) {
  return tag.trim().replace(/^v/i, "");
}
function toDateOnly(value) {
  const raw = asNonEmptyString(value);
  if (!raw) return void 0;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  return match ? match[1] : raw;
}
function parseReleaseBody(body) {
  const text = typeof body === "string" ? body : "";
  const changes = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^#{1,6}\s*/, "").replace(/^[-*+]\s+/, "").replace(/^\d+[.)]\s+/, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
    if (!line) continue;
    changes.push(line);
    if (changes.length >= MAX_CHANGES_PER_RELEASE) break;
  }
  return changes;
}
function detectPlatform() {
  const ua = typeof navigator === "object" && navigator ? navigator.userAgent : "";
  if (/android/i.test(ua)) return "android";
  if (/windows|win32|win64/i.test(ua)) return "windows";
  if (/macintosh|mac os x/i.test(ua)) return "macos";
  if (/linux|x11/i.test(ua)) return "linux";
  return "unknown";
}
const PLATFORM_PATTERNS = {
  windows: [/\.exe$/i, /\.msi$/i, /\.zip$/i],
  android: [/\.apk$/i, /\.zip$/i],
  macos: [/\.dmg$/i, /\.pkg$/i, /\.zip$/i],
  linux: [/\.appimage$/i, /\.deb$/i, /\.tar\.gz$/i, /\.zip$/i]
};
function pickAsset(assets) {
  if (assets.length === 0) return void 0;
  const platform = detectPlatform();
  if (platform !== "unknown") {
    for (const pattern of PLATFORM_PATTERNS[platform]) {
      const hit = assets.find((asset) => pattern.test(asset.name));
      if (hit) return hit;
    }
  }
  return assets.length === 1 ? assets[0] : void 0;
}
function parseAssets(raw) {
  if (!Array.isArray(raw)) return [];
  const assets = [];
  for (const item of raw) {
    const asset = asRecord(item);
    if (!asset) continue;
    const name2 = asNonEmptyString(asset.name);
    const url = asNonEmptyString(asset.browser_download_url);
    if (!name2 || !url) continue;
    const size = typeof asset.size === "number" && asset.size > 0 ? asset.size : void 0;
    assets.push({ name: name2, url, size });
  }
  return assets;
}
function parseReleases(raw, repo) {
  if (!Array.isArray(raw)) {
    throw new Error(`仓库 ${repo} 的 Release 列表格式异常`);
  }
  const releases = [];
  for (const item of raw) {
    const release = asRecord(item);
    if (!release) continue;
    if (release.draft === true || release.prerelease === true) continue;
    releases.push(release);
  }
  if (releases.length === 0) {
    throw new Error(`仓库 ${repo} 还没有正式 Release`);
  }
  const changelog = [];
  for (const release of releases) {
    const tag = asNonEmptyString(release.tag_name);
    if (!tag) continue;
    const changes = parseReleaseBody(release.body);
    changelog.push({
      version: stripVersionPrefix(tag),
      date: toDateOnly(release.published_at),
      changes: changes.length > 0 ? changes : ["（该版本未填写更新说明）"]
    });
  }
  if (changelog.length === 0) {
    throw new Error(`仓库 ${repo} 的 Release 缺少 tag_name`);
  }
  const latest = releases[0];
  const latestTag = asNonEmptyString(latest.tag_name) ?? "";
  const title = asNonEmptyString(latest.name);
  const asset = pickAsset(parseAssets(latest.assets));
  return {
    latestVersion: stripVersionPrefix(latestTag),
    releasedAt: toDateOnly(latest.published_at),
    // 优先给安装包直链，省掉玩家在 Release 页面里翻找文件；挑不出才退回页面。
    downloadUrl: (asset == null ? void 0 : asset.url) ?? asNonEmptyString(latest.html_url),
    downloadKind: asset ? "asset" : "page",
    assetName: asset == null ? void 0 : asset.name,
    assetSize: asset == null ? void 0 : asset.size,
    // 标题和 tag 相同时不当公告，免得面板里把 "v1.2.0" 显示两遍。
    announcement: title && title !== latestTag ? title : void 0,
    changelog
  };
}
async function fetchUpdateInfo(repo) {
  const slug = normalizeRepo(repo);
  if (!slug) {
    throw new Error(`仓库标识 "${repo}" 无法解析，应形如 owner/repo`);
  }
  const response = await fetch(
    `https://api.github.com/repos/${slug}/releases?per_page=${RELEASE_PAGE_SIZE}`,
    { cache: "no-store", headers: { Accept: "application/vnd.github+json" } }
  );
  if (response.status === 404) {
    throw new Error(`仓库 ${slug} 不存在，或者不是公开仓库`);
  }
  if (response.status === 403) {
    throw new Error(
      "GitHub API 调用过于频繁（未登录时每 IP 每小时 60 次），请稍后再试"
    );
  }
  if (!response.ok) {
    throw new Error(`读取 Release 失败：HTTP ${response.status}`);
  }
  return parseReleases(await response.json(), slug);
}
const DEFAULT_CURRENT_VERSION = "0.1.0";
function versionParts(version2) {
  return version2.trim().replace(/^v/i, "").split(".").map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}
function isNewerVersion(latest, current) {
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
function endpointBase(endpoint) {
  return endpoint.trim().replace(/\/+$/, "");
}
function asCount(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}
async function fetchOnlineStats(endpoint) {
  const response = await fetch(`${endpointBase(endpoint)}/stats`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`读取在线人数失败：HTTP ${response.status}`);
  }
  const raw = await response.json();
  return { online: asCount(raw.online), total: asCount(raw.total) };
}
async function sendHeartbeat(endpoint, playerId) {
  const response = await fetch(`${endpointBase(endpoint)}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId })
  });
  if (!response.ok) {
    throw new Error(`上报心跳失败：HTTP ${response.status}`);
  }
}
function createPlayerId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
const tokens = {
  bgStage: "#E8EAED",
  bgCard: "#FAFAF7",
  bgSub: "#F4F4EF",
  border: "#E2E2DC",
  hair: "#ECEBE5",
  fg: "#1A1A1A",
  fgSub: "#57564F",
  fgMuted: "#8B8A83",
  ok: "#7E9650",
  warn: "#D89A3B",
  accent: "#E5675A",
  fontDisplay: '"Georgia", "Songti SC", "Times New Roman", serif',
  fontBody: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  fontMono: '"SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace'
};
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
function formatClock(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function formatSize(bytes) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}
const OnlineUpdatePanel = ({
  save,
  onClose,
  title
}) => {
  const ctx = useExtensionContext();
  const [releasesRepo] = ctx.settings.useValue("releasesRepo");
  const [currentVersion] = ctx.settings.useValue("currentVersion");
  const [statsEndpoint] = ctx.settings.useValue("statsEndpoint");
  const [heartbeatSeconds] = ctx.settings.useValue("heartbeatSeconds");
  const [playerId, setPlayerId] = useState(() => save.get("playerId"));
  const [reloadToken, setReloadToken] = useState(0);
  const [update, setUpdate] = useState(null);
  const [updateError, setUpdateError] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [syncedAt, setSyncedAt] = useState("");
  useEffect(() => {
    if (playerId) return;
    const created = createPlayerId();
    save.set("playerId", created);
    setPlayerId(created);
  }, [playerId, save]);
  useEffect(() => {
    const url = (releasesRepo ?? "").trim();
    if (!url) {
      setUpdate(null);
      setUpdateError("");
      return;
    }
    let cancelled = false;
    setLoadingUpdate(true);
    fetchUpdateInfo(url).then((info) => {
      if (cancelled) return;
      setUpdate(info);
      setUpdateError("");
    }).catch((error) => {
      if (cancelled) return;
      setUpdate(null);
      setUpdateError(messageOf(error));
    }).finally(() => {
      if (!cancelled) setLoadingUpdate(false);
    });
    return () => {
      cancelled = true;
    };
  }, [releasesRepo, reloadToken]);
  useEffect(() => {
    const endpoint = (statsEndpoint ?? "").trim();
    if (!endpoint || !playerId) {
      setStats(null);
      setStatsError("");
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        await sendHeartbeat(endpoint, playerId);
        const next = await fetchOnlineStats(endpoint);
        if (cancelled) return;
        setStats(next);
        setStatsError("");
        setSyncedAt(formatClock(/* @__PURE__ */ new Date()));
      } catch (error) {
        if (cancelled) return;
        setStatsError(messageOf(error));
      }
    };
    void tick();
    const interval = Math.max(15, heartbeatSeconds ?? 60) * 1e3;
    const timer = window.setInterval(() => {
      void tick();
    }, interval);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [statsEndpoint, heartbeatSeconds, playerId, reloadToken]);
  const handleDownload = useCallback((url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);
  const version2 = (currentVersion ?? "").trim() || DEFAULT_CURRENT_VERSION;
  const latest = (update == null ? void 0 : update.latestVersion) ?? "";
  const hasUpdate = update !== null && isNewerVersion(latest, version2);
  const statsReady = (statsEndpoint ?? "").trim().length > 0;
  const downloadLabel = hasUpdate ? "前往下载新版本" : (update == null ? void 0 : update.downloadKind) === "asset" ? "重新下载" : "前往下载页";
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tokens.bgStage,
        fontFamily: tokens.fontBody,
        color: tokens.fg,
        WebkitFontSmoothing: "antialiased"
      },
      children: /* @__PURE__ */ jsxs(
        "article",
        {
          style: {
            width: 1120,
            maxHeight: 800,
            background: tokens.bgCard,
            border: `1px solid ${tokens.border}`,
            borderRadius: 18,
            boxShadow: "0 1px 0 rgba(255,255,255,0.9) inset, 0 32px 64px -20px rgba(20,20,20,0.20), 0 10px 20px -6px rgba(20,20,20,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative"
          },
          children: [
            /* @__PURE__ */ jsx(RainbowStripe, {}),
            /* @__PURE__ */ jsxs(
              "header",
              {
                style: {
                  padding: "44px 48px 24px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 24
                },
                children: [
                  /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx(Eyebrow, { children: ctx.game.title() || "本作品" }),
                    /* @__PURE__ */ jsx(
                      "h1",
                      {
                        style: {
                          fontFamily: tokens.fontDisplay,
                          fontWeight: 400,
                          fontSize: 48,
                          lineHeight: 1.1,
                          letterSpacing: "-0.02em",
                          margin: 0
                        },
                        children: title ?? "游戏更新"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, style: closeButtonStyle, children: "关闭" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs("div", { style: { padding: "0 48px 40px", overflowY: "auto" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 18, marginBottom: 28 }, children: [
                /* @__PURE__ */ jsx(
                  StatCard,
                  {
                    label: "当前在线",
                    value: stats ? String(stats.online) : "—",
                    hint: statsReady ? void 0 : "暂不支持"
                  }
                ),
                /* @__PURE__ */ jsx(
                  StatCard,
                  {
                    label: "累计玩家",
                    value: stats ? String(stats.total) : "—",
                    hint: statsReady ? void 0 : "暂不支持"
                  }
                ),
                /* @__PURE__ */ jsx(
                  VersionCard,
                  {
                    current: version2,
                    latest: latest || "未知",
                    hasUpdate,
                    loading: loadingUpdate
                  }
                )
              ] }),
              (update == null ? void 0 : update.downloadUrl) && /* @__PURE__ */ jsx(
                DownloadCta,
                {
                  hasUpdate,
                  version: latest,
                  label: downloadLabel,
                  fileName: update.downloadKind === "asset" ? update.assetName : void 0,
                  fileSize: update.assetSize,
                  url: update.downloadUrl,
                  onDownload: handleDownload
                }
              ),
              statsError && /* @__PURE__ */ jsxs(Notice, { tone: "warn", children: [
                "在线统计读取失败：",
                statsError
              ] }),
              updateError && /* @__PURE__ */ jsxs(Notice, { tone: "warn", children: [
                "更新信息读取失败：",
                updateError
              ] }),
              (update == null ? void 0 : update.announcement) && /* @__PURE__ */ jsx(Section, { label: "公告", children: /* @__PURE__ */ jsx(
                "p",
                {
                  style: {
                    margin: 0,
                    fontSize: 17,
                    lineHeight: 1.65,
                    color: tokens.fgSub,
                    whiteSpace: "pre-wrap"
                  },
                  children: update.announcement
                }
              ) }),
              /* @__PURE__ */ jsx(
                Section,
                {
                  label: "更新日志",
                  badge: (update == null ? void 0 : update.changelog.length) ? String(update.changelog.length) : void 0,
                  children: update && update.changelog.length > 0 ? /* @__PURE__ */ jsx(
                    "ol",
                    {
                      style: {
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14
                      },
                      children: update.changelog.map((entry2) => /* @__PURE__ */ jsxs(
                        "li",
                        {
                          style: {
                            background: tokens.bgSub,
                            border: `1px solid ${tokens.hair}`,
                            borderRadius: 12,
                            padding: "16px 20px"
                          },
                          children: [
                            /* @__PURE__ */ jsxs(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  alignItems: "baseline",
                                  gap: 12,
                                  marginBottom: entry2.changes.length > 0 ? 8 : 0
                                },
                                children: [
                                  /* @__PURE__ */ jsxs("span", { style: { fontFamily: tokens.fontMono, fontSize: 15, fontWeight: 600 }, children: [
                                    "v",
                                    entry2.version
                                  ] }),
                                  entry2.date && /* @__PURE__ */ jsx("span", { style: { fontSize: 13, color: tokens.fgMuted }, children: entry2.date }),
                                  entry2.version === latest && /* @__PURE__ */ jsx("span", { style: badgeStyle(tokens.accent), children: "最新" })
                                ]
                              }
                            ),
                            entry2.changes.map((change, index) => /* @__PURE__ */ jsxs(
                              "div",
                              {
                                style: {
                                  fontSize: 15.5,
                                  lineHeight: 1.6,
                                  color: tokens.fgSub,
                                  paddingLeft: 14,
                                  position: "relative"
                                },
                                children: [
                                  /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 0, color: tokens.fgMuted }, children: "·" }),
                                  change
                                ]
                              },
                              `${entry2.version}-${index}`
                            ))
                          ]
                        },
                        entry2.version
                      ))
                    }
                  ) : /* @__PURE__ */ jsx(EmptyBox, { children: "暂时没有可显示的更新日志。" })
                }
              ),
              /* @__PURE__ */ jsxs(
                "footer",
                {
                  style: {
                    marginTop: 28,
                    paddingTop: 22,
                    borderTop: `1px solid ${tokens.hair}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 20
                  },
                  children: [
                    /* @__PURE__ */ jsx("div", { style: { minWidth: 0 }, children: !(update == null ? void 0 : update.downloadUrl) && /* @__PURE__ */ jsx("span", { style: { fontSize: 14, color: tokens.fgMuted }, children: "暂不提供下载入口" }) }),
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }, children: [
                      syncedAt && /* @__PURE__ */ jsxs("span", { style: { fontSize: 13, color: tokens.fgMuted }, children: [
                        "同步于 ",
                        syncedAt
                      ] }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => setReloadToken((token) => token + 1),
                          style: ghostButtonStyle,
                          children: "刷新"
                        }
                      )
                    ] })
                  ]
                }
              )
            ] })
          ]
        }
      )
    }
  );
};
function RainbowStripe() {
  const palette = ["#E5675A", "#D89A3B", "#7E9650", "#4A9C8C", "#5A7DAF", "#9560A1"];
  return /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 4, display: "flex" }, children: palette.map((color) => /* @__PURE__ */ jsx("div", { style: { flex: 1, background: color } }, color)) });
}
function Eyebrow({ children }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: tokens.fontMono,
        fontSize: 12.5,
        fontWeight: 500,
        color: tokens.fgMuted,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 14
      },
      children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            style: {
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: tokens.ok,
              boxShadow: `0 0 0 4px ${tokens.ok}2E`
            }
          }
        ),
        children
      ]
    }
  );
}
function StatCard({
  label,
  value,
  hint
}) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        flex: 1,
        background: tokens.bgSub,
        border: `1px solid ${tokens.hair}`,
        borderRadius: 14,
        padding: "18px 22px"
      },
      children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 13, color: tokens.fgMuted, marginBottom: 8 }, children: label }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 40, fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.02em" }, children: value }),
        hint && /* @__PURE__ */ jsx("div", { style: { fontSize: 12.5, color: tokens.fgMuted, marginTop: 6 }, children: hint })
      ]
    }
  );
}
function VersionCard({
  current,
  latest,
  hasUpdate,
  loading
}) {
  const tone = hasUpdate ? tokens.accent : tokens.ok;
  const text = loading ? "检查中…" : hasUpdate ? "有新版本" : "已是最新";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        flex: 1,
        background: tokens.bgSub,
        border: `1px solid ${tokens.hair}`,
        borderRadius: 14,
        padding: "18px 22px"
      },
      children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 13, color: tokens.fgMuted, marginBottom: 8 }, children: "版本" }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              fontFamily: tokens.fontMono,
              fontSize: 22,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 10
            },
            children: [
              /* @__PURE__ */ jsx("span", { children: current }),
              /* @__PURE__ */ jsx("span", { style: { color: tokens.fgMuted, fontWeight: 400 }, children: "→" }),
              /* @__PURE__ */ jsx("span", { style: { color: hasUpdate ? tokens.accent : tokens.fgSub }, children: latest })
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { style: { marginTop: 8 }, children: /* @__PURE__ */ jsx("span", { style: badgeStyle(tone), children: text }) })
      ]
    }
  );
}
function DownloadCta({
  hasUpdate,
  version: version2,
  label,
  fileName,
  fileSize,
  url,
  onDownload
}) {
  const headline = hasUpdate ? "下载最新版本" : "已是最新版本";
  const detail = fileName ? `${fileName}${fileSize ? ` · ${formatSize(fileSize)}` : ""}` : url;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: 28,
        padding: "24px 28px",
        borderRadius: 16,
        border: `1px solid ${hasUpdate ? `${tokens.accent}55` : tokens.hair}`,
        background: hasUpdate ? `${tokens.accent}12` : tokens.bgSub
      },
      children: [
        /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                fontFamily: tokens.fontDisplay,
                fontSize: 25,
                lineHeight: 1.2,
                marginBottom: 8
              },
              children: version2 ? `${headline} ${version2}` : headline
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              title: url,
              style: {
                fontFamily: tokens.fontMono,
                fontSize: 12.5,
                color: tokens.fgSub,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              },
              children: detail
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => onDownload(url),
            style: {
              flexShrink: 0,
              background: hasUpdate ? tokens.accent : tokens.fgSub,
              border: "none",
              borderRadius: 12,
              padding: "19px 38px",
              fontSize: 19,
              fontWeight: 600,
              color: "#FFFFFF",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              boxShadow: hasUpdate ? `0 14px 26px -12px ${tokens.accent}` : "none"
            },
            children: label
          }
        )
      ]
    }
  );
}
function Section({
  label,
  badge,
  children
}) {
  return /* @__PURE__ */ jsxs("section", { style: { marginBottom: 26 }, children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: tokens.fontMono,
          fontSize: 12.5,
          fontWeight: 500,
          color: tokens.fgMuted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 14
        },
        children: [
          /* @__PURE__ */ jsx("span", { children: label }),
          /* @__PURE__ */ jsx("span", { style: { flex: 1, height: 1, background: tokens.hair } }),
          badge !== void 0 && /* @__PURE__ */ jsx(
            "span",
            {
              style: {
                background: tokens.bgSub,
                border: `1px solid ${tokens.hair}`,
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: 12,
                color: tokens.fgSub,
                letterSpacing: 0
              },
              children: badge
            }
          )
        ]
      }
    ),
    children
  ] });
}
function Notice({ tone, children }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        background: `${tone === "warn" ? tokens.warn : tokens.ok}1A`,
        border: `1px solid ${tokens.warn}55`,
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 14.5,
        lineHeight: 1.6,
        color: tokens.fgSub,
        marginBottom: 22
      },
      children
    }
  );
}
function EmptyBox({ children }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        padding: "22px 24px",
        background: tokens.bgSub,
        border: `1px dashed ${tokens.border}`,
        borderRadius: 12,
        color: tokens.fgSub,
        fontSize: 15,
        lineHeight: 1.6
      },
      children
    }
  );
}
function badgeStyle(color) {
  return {
    display: "inline-block",
    background: `${color}22`,
    border: `1px solid ${color}66`,
    color,
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500
  };
}
const closeButtonStyle = {
  flexShrink: 0,
  background: tokens.bgCard,
  border: `1px solid ${tokens.border}`,
  borderRadius: 10,
  padding: "9px 18px",
  fontSize: 14.5,
  color: tokens.fgSub,
  cursor: "pointer",
  fontFamily: "inherit"
};
const ghostButtonStyle = {
  background: tokens.bgCard,
  border: `1px solid ${tokens.border}`,
  borderRadius: 10,
  padding: "10px 20px",
  fontSize: 14.5,
  color: tokens.fgSub,
  cursor: "pointer",
  fontFamily: "inherit"
};
const PANEL_MODULE_ID = "panel";
const onlineUpdateSave = defineSave({
  playerId: {
    type: "string",
    persistence: "shared",
    default: "",
    label: "本机玩家标识（在线统计用，跨存档保持不变）"
  }
});
_OnlineUpdateExtension_decorators = [extension({ id: PANEL_MODULE_ID, label: "游戏更新" })];
let _OnlineUpdateExtension = class _OnlineUpdateExtension extends (_a = Extension.withSave(onlineUpdateSave)) {
  /**
   * 启动期钩子：注册全局快捷键 + 可选的一次更新检查。
   * 这里是静态方法，拿不到 this.save，因此心跳/在线统计只能发生在面板打开期间。
   */
  static async onRegister(ctx) {
    console.log("[online-update] onRegister 已执行");
    try {
      const actionId = `${manifest.id}.open-panel`;
      ctx.input.registerAction({
        id: actionId,
        label: "打开游戏更新面板",
        defaultKeys: ["KeyU"]
      });
      console.log(`[online-update] 已注册快捷键 U（action = ${actionId}）`);
      ctx.input.onAction(actionId, () => {
        void ctx.ui.show(PANEL_MODULE_ID);
      });
      const checkOnLaunch = ctx.settings.get("checkOnLaunch");
      const repo = ctx.settings.get("releasesRepo");
      console.log(
        `[online-update] 读取设置：checkOnLaunch = ${String(checkOnLaunch)}，releasesRepo = "${repo ?? ""}"`
      );
      if (checkOnLaunch === false) {
        console.log("[online-update] checkOnLaunch 为 false，跳过启动检查");
        return;
      }
      await notifyUpdateOnLaunch(ctx);
    } catch (error) {
      console.error("[online-update] onRegister 执行失败", error);
    }
  }
  render() {
    return {
      component: OnlineUpdatePanel,
      props: {
        ...this.data ?? {},
        save: this.save,
        onClose: () => this.close()
      }
    };
  }
};
_init = __decoratorStart(_a);
_OnlineUpdateExtension = __decorateElement(_init, 0, "OnlineUpdateExtension", _OnlineUpdateExtension_decorators, _OnlineUpdateExtension);
_OnlineUpdateExtension.settings = settings((s) => ({
  releasesRepo: s.string("GitHub 仓库（owner/repo）").default("").describe(
    "发布 Release 的公开仓库，例如 Structuretxwd/letsgal-update。版本号取 Release 的 tag，更新日志取 Release 正文；留空则不检查更新"
  ),
  currentVersion: s.string("当前游戏版本").default(DEFAULT_CURRENT_VERSION).describe("本作品当前发布的版本号，与最新 Release 的 tag 比较（v 前缀可省略）"),
  checkOnLaunch: s.boolean("启动时自动检查更新").default(true),
  autoOpenOnUpdate: s.boolean("发现新版本时自动打开面板").default(true).enabledWhen("checkOnLaunch"),
  statsEndpoint: s.string("在线统计服务地址").default("").describe("自建统计服务的根地址，例如 https://example.workers.dev；留空则不统计在线人数"),
  heartbeatSeconds: s.number("心跳与刷新间隔（秒）").default(60).range(15, 600)
}));
__runInitializers(_init, 1, _OnlineUpdateExtension);
let OnlineUpdateExtension = _OnlineUpdateExtension;
async function notifyUpdateOnLaunch(ctx) {
  const repo = (ctx.settings.get("releasesRepo") ?? "").trim();
  const currentVersion = ctx.settings.get("currentVersion") || DEFAULT_CURRENT_VERSION;
  if (!repo) {
    console.log("[online-update] releasesRepo 未填，跳过启动检查");
    return;
  }
  try {
    const info = await fetchUpdateInfo(repo);
    if (!isNewerVersion(info.latestVersion, currentVersion)) {
      console.log(
        `[online-update] 已是最新版本 ${info.latestVersion}（当前 ${currentVersion}）`
      );
      return;
    }
    console.log(
      `[online-update] 发现新版本 ${info.latestVersion}（当前 ${currentVersion}）`
    );
    if (ctx.settings.get("autoOpenOnUpdate") !== false) {
      await ctx.ui.show(PANEL_MODULE_ID);
    }
  } catch (error) {
    console.warn("[online-update] 启动检查更新失败", error);
  }
}
export {
  OnlineUpdateExtension,
  OnlineUpdateExtension as default
};
//# sourceMappingURL=index.mjs.map
