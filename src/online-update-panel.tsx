import React, { useCallback, useEffect, useState } from "react";
import {
  useExtensionContext,
  type ExtensionProps,
  type SaveAPI,
} from "@avg-studio/sdk";
import {
  DEFAULT_CURRENT_VERSION,
  createPlayerId,
  fetchOnlineStats,
  fetchUpdateInfo,
  isNewerVersion,
  sendHeartbeat,
  type OnlineStats,
  type UpdateInfo,
} from "./remote-api";

/**
 * 由 index.tsx 的 render() 注入的存档代理。
 * 形状与 defineSave 声明一致：只需 playerId 一个字段。
 */
export type PanelSave = SaveAPI<{ playerId: string }>;

export interface OnlineUpdatePanelProps extends ExtensionProps {
  /** 实例侧强类型存档代理，render() 注入。 */
  save: PanelSave;
  /** 关闭本面板，render() 注入。 */
  onClose: () => void;
  /** 面板大标题；剧本「显示界面」可以覆盖。 */
  title?: string;
}

// ─── 设计 tokens（全部系统字体，无 CDN 依赖） ────────────────────────────────
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
  fontBody:
    '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  fontMono: '"SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace',
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const OnlineUpdatePanel: React.FC<OnlineUpdatePanelProps> = ({
  save,
  onClose,
  title,
}) => {
  const ctx = useExtensionContext();
  const [releasesRepo] = ctx.settings.useValue<string>("releasesRepo");
  const [currentVersion] = ctx.settings.useValue<string>("currentVersion");
  const [statsEndpoint] = ctx.settings.useValue<string>("statsEndpoint");
  const [heartbeatSeconds] = ctx.settings.useValue<number>("heartbeatSeconds");

  const [playerId, setPlayerId] = useState<string>(() => save.get("playerId"));
  const [reloadToken, setReloadToken] = useState(0);

  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const [stats, setStats] = useState<OnlineStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [syncedAt, setSyncedAt] = useState("");

  // 首次进入时生成并持久化本机玩家标识；shared 作用域让它跨存档保持不变。
  useEffect(() => {
    if (playerId) return;
    const created = createPlayerId();
    save.set("playerId", created);
    setPlayerId(created);
  }, [playerId, save]);

  // 读取更新信息。
  useEffect(() => {
    const url = (releasesRepo ?? "").trim();
    if (!url) {
      setUpdate(null);
      setUpdateError("");
      return;
    }
    let cancelled = false;
    setLoadingUpdate(true);
    fetchUpdateInfo(url)
      .then((info) => {
        if (cancelled) return;
        setUpdate(info);
        setUpdateError("");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setUpdate(null);
        setUpdateError(messageOf(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingUpdate(false);
      });
    return () => {
      cancelled = true;
    };
  }, [releasesRepo, reloadToken]);

  // 面板打开期间：按间隔上报心跳并刷新在线人数。
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
        setSyncedAt(formatClock(new Date()));
      } catch (error: unknown) {
        if (cancelled) return;
        setStatsError(messageOf(error));
      }
    };

    void tick();
    const interval = Math.max(15, heartbeatSeconds ?? 60) * 1000;
    const timer = window.setInterval(() => {
      void tick();
    }, interval);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [statsEndpoint, heartbeatSeconds, playerId, reloadToken]);

  const handleDownload = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const version = (currentVersion ?? "").trim() || DEFAULT_CURRENT_VERSION;
  const latest = update?.latestVersion ?? "";
  const hasUpdate = update !== null && isNewerVersion(latest, version);
  const statsReady = (statsEndpoint ?? "").trim().length > 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tokens.bgStage,
        fontFamily: tokens.fontBody,
        color: tokens.fg,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <article
        style={{
          width: 1120,
          maxHeight: 800,
          background: tokens.bgCard,
          border: `1px solid ${tokens.border}`,
          borderRadius: 18,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.9) inset, 0 32px 64px -20px rgba(20,20,20,0.20), 0 10px 20px -6px rgba(20,20,20,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <RainbowStripe />

        <header
          style={{
            padding: "44px 48px 24px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Eyebrow>{ctx.game.title() || "本作品"}</Eyebrow>
            <h1
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: 400,
                fontSize: 48,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {title ?? "更新与在线"}
            </h1>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            关闭
          </button>
        </header>

        <div style={{ padding: "0 48px 40px", overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 18, marginBottom: 28 }}>
            <StatCard
              label="当前在线"
              value={stats ? String(stats.online) : "—"}
              hint={statsReady ? undefined : "未配置统计服务"}
            />
            <StatCard
              label="累计玩家"
              value={stats ? String(stats.total) : "—"}
              hint={statsReady ? undefined : "未配置统计服务"}
            />
            <VersionCard
              current={version || "未填写"}
              latest={latest || "未知"}
              hasUpdate={hasUpdate}
              loading={loadingUpdate}
            />
          </div>

          {statsError && <Notice tone="warn">在线统计读取失败：{statsError}</Notice>}
          {updateError && <Notice tone="warn">更新信息读取失败：{updateError}</Notice>}

          {update?.announcement && (
            <Section label="公告">
              <p
                style={{
                  margin: 0,
                  fontSize: 17,
                  lineHeight: 1.65,
                  color: tokens.fgSub,
                  whiteSpace: "pre-wrap",
                }}
              >
                {update.announcement}
              </p>
            </Section>
          )}

          <Section
            label="更新日志"
            badge={update?.changelog.length ? String(update.changelog.length) : undefined}
          >
            {update && update.changelog.length > 0 ? (
              <ol
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {update.changelog.map((entry) => (
                  <li
                    key={entry.version}
                    style={{
                      background: tokens.bgSub,
                      border: `1px solid ${tokens.hair}`,
                      borderRadius: 12,
                      padding: "16px 20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 12,
                        marginBottom: entry.changes.length > 0 ? 8 : 0,
                      }}
                    >
                      <span style={{ fontFamily: tokens.fontMono, fontSize: 15, fontWeight: 600 }}>
                        v{entry.version}
                      </span>
                      {entry.date && (
                        <span style={{ fontSize: 13, color: tokens.fgMuted }}>{entry.date}</span>
                      )}
                      {entry.version === latest && (
                        <span style={badgeStyle(tokens.accent)}>最新</span>
                      )}
                    </div>
                    {entry.changes.map((change, index) => (
                      <div
                        key={`${entry.version}-${index}`}
                        style={{
                          fontSize: 15.5,
                          lineHeight: 1.6,
                          color: tokens.fgSub,
                          paddingLeft: 14,
                          position: "relative",
                        }}
                      >
                        <span style={{ position: "absolute", left: 0, color: tokens.fgMuted }}>
                          ·
                        </span>
                        {change}
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyBox>
                {releasesRepo?.trim()
                  ? "还没有可显示的更新日志。"
                  : "尚未配置「GitHub 仓库」，在 Studio 的扩展设置里填入 owner/repo 即可。"}
              </EmptyBox>
            )}
          </Section>

          <footer
            style={{
              marginTop: 28,
              paddingTop: 22,
              borderTop: `1px solid ${tokens.hair}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div style={{ minWidth: 0 }}>
              {update?.downloadUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDownload(update.downloadUrl as string)}
                    style={primaryButtonStyle}
                  >
                    {hasUpdate ? "前往下载新版本" : "前往下载页"}
                  </button>
                  <div
                    title={update.downloadUrl}
                    style={{
                      marginTop: 8,
                      fontFamily: tokens.fontMono,
                      fontSize: 12,
                      color: tokens.fgMuted,
                      maxWidth: 620,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {update.downloadUrl}
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 14, color: tokens.fgMuted }}>
                  更新数据里没有提供 downloadUrl
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
              {syncedAt && (
                <span style={{ fontSize: 13, color: tokens.fgMuted }}>
                  同步于 {syncedAt}
                </span>
              )}
              <button
                type="button"
                onClick={() => setReloadToken((token) => token + 1)}
                style={ghostButtonStyle}
              >
                刷新
              </button>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
};

// ─── 子组件 ─────────────────────────────────────────────────────────────────

function RainbowStripe() {
  const palette = ["#E5675A", "#D89A3B", "#7E9650", "#4A9C8C", "#5A7DAF", "#9560A1"];
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, display: "flex" }}>
      {palette.map((color) => (
        <div key={color} style={{ flex: 1, background: color }} />
      ))}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: tokens.fontMono,
        fontSize: 12.5,
        fontWeight: 500,
        color: tokens.fgMuted,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 14,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: tokens.ok,
          boxShadow: `0 0 0 4px ${tokens.ok}2E`,
        }}
      />
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: tokens.bgSub,
        border: `1px solid ${tokens.hair}`,
        borderRadius: 14,
        padding: "18px 22px",
      }}
    >
      <div style={{ fontSize: 13, color: tokens.fgMuted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 12.5, color: tokens.fgMuted, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function VersionCard({
  current,
  latest,
  hasUpdate,
  loading,
}: {
  current: string;
  latest: string;
  hasUpdate: boolean;
  loading: boolean;
}) {
  const tone = hasUpdate ? tokens.accent : tokens.ok;
  const text = loading ? "检查中…" : hasUpdate ? "有新版本" : "已是最新";
  return (
    <div
      style={{
        flex: 1,
        background: tokens.bgSub,
        border: `1px solid ${tokens.hair}`,
        borderRadius: 14,
        padding: "18px 22px",
      }}
    >
      <div style={{ fontSize: 13, color: tokens.fgMuted, marginBottom: 8 }}>版本</div>
      <div
        style={{
          fontFamily: tokens.fontMono,
          fontSize: 22,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span>{current}</span>
        <span style={{ color: tokens.fgMuted, fontWeight: 400 }}>→</span>
        <span style={{ color: hasUpdate ? tokens.accent : tokens.fgSub }}>{latest}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={badgeStyle(tone)}>{text}</span>
      </div>
    </div>
  );
}

function Section({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: tokens.fontMono,
          fontSize: 12.5,
          fontWeight: 500,
          color: tokens.fgMuted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        <span>{label}</span>
        <span style={{ flex: 1, height: 1, background: tokens.hair }} />
        {badge !== undefined && (
          <span
            style={{
              background: tokens.bgSub,
              border: `1px solid ${tokens.hair}`,
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 12,
              color: tokens.fgSub,
              letterSpacing: 0,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Notice({ tone, children }: { tone: "warn"; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: `${tone === "warn" ? tokens.warn : tokens.ok}1A`,
        border: `1px solid ${tokens.warn}55`,
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 14.5,
        lineHeight: 1.6,
        color: tokens.fgSub,
        marginBottom: 22,
      }}
    >
      {children}
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "22px 24px",
        background: tokens.bgSub,
        border: `1px dashed ${tokens.border}`,
        borderRadius: 12,
        color: tokens.fgSub,
        fontSize: 15,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    background: `${color}22`,
    border: `1px solid ${color}66`,
    color,
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
  };
}

const closeButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  background: tokens.bgCard,
  border: `1px solid ${tokens.border}`,
  borderRadius: 10,
  padding: "9px 18px",
  fontSize: 14.5,
  color: tokens.fgSub,
  cursor: "pointer",
  fontFamily: "inherit",
};

const primaryButtonStyle: React.CSSProperties = {
  background: tokens.accent,
  border: "none",
  borderRadius: 10,
  padding: "12px 24px",
  fontSize: 15.5,
  fontWeight: 500,
  color: "#FFFFFF",
  cursor: "pointer",
  fontFamily: "inherit",
};

const ghostButtonStyle: React.CSSProperties = {
  background: tokens.bgCard,
  border: `1px solid ${tokens.border}`,
  borderRadius: 10,
  padding: "10px 20px",
  fontSize: 14.5,
  color: tokens.fgSub,
  cursor: "pointer",
  fontFamily: "inherit",
};