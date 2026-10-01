import {
  Extension,
  defineSave,
  extension,
  settings,
  type ExtensionContext,
  type ExtensionRenderData,
} from "@avg-studio/sdk";
import manifest from "../extension.json";
import {
  OnlineUpdatePanel,
  type OnlineUpdatePanelProps,
} from "./online-update-panel";
import {
  DEFAULT_CURRENT_VERSION,
  fetchUpdateInfo,
  isNewerVersion,
} from "./remote-api";

/**
 * 扩展入口。
 *
 * 一个类 = 一个子模块：UI（render）、启动期行为（onRegister）、项目设置
 * （settings）、玩家存档（withSave）全在同一个类上。
 *
 * 数据来源有两处，都由创作者在 Studio 的扩展设置里配置：
 *   - releasesRepo  : 发布 Release 的公开仓库（版本号 / 更新日志 / 下载入口）
 *   - statsEndpoint : 自建统计服务的根地址（在线人数 / 累计玩家）
 * 两者都留空时，本扩展不发起任何网络请求。
 */

/** 面板在剧本里的引用路径是 `<扩展id>/<模块id>`，即 online-update-58685e/panel。 */
const PANEL_MODULE_ID = "panel";

const onlineUpdateSave = defineSave({
  playerId: {
    type: "string",
    persistence: "shared",
    default: "",
    label: "本机玩家标识（在线统计用，跨存档保持不变）",
  },
});

/**
 * 注意：这里**不能**加 `autonomous: true`。
 *
 * autonomous 的语义是「引擎启动即自动注册（常驻 HUD / 全局快捷键）」，Studio 会把这类
 * 模块当成常驻后台系统，**不再向 UI host 和「显示界面」选择器导出它的 React UI** ——
 * 表现就是个性化里的预览消失、剧本里也找不到这个界面。
 *
 * 本项目要靠 ctx.ui.show("panel") 弹面板，所以必须保持默认（false）。
 */
@extension({ id: PANEL_MODULE_ID, label: "更新与在线" })
export class OnlineUpdateExtension extends Extension.withSave(onlineUpdateSave)<OnlineUpdatePanelProps> {
  static settings = settings((s) => ({
    releasesRepo: s
      .string("GitHub 仓库（owner/repo）")
      .default("")
      .describe(
        "发布 Release 的公开仓库，例如 Structuretxwd/letsgal-update。版本号取 Release 的 tag，更新日志取 Release 正文；留空则不检查更新",
      ),
    currentVersion: s
      .string("当前游戏版本")
      .default(DEFAULT_CURRENT_VERSION)
      .describe("本作品当前发布的版本号，与最新 Release 的 tag 比较（v 前缀可省略）"),
    checkOnLaunch: s.boolean("启动时自动检查更新").default(true),
    autoOpenOnUpdate: s
      .boolean("发现新版本时自动打开面板")
      .default(true)
      .enabledWhen("checkOnLaunch"),
    statsEndpoint: s
      .string("在线统计服务地址")
      .default("")
      .describe("自建统计服务的根地址，例如 https://example.workers.dev；留空则不统计在线人数"),
    heartbeatSeconds: s
      .number("心跳与刷新间隔（秒）")
      .default(60)
      .range(15, 600),
  }));

  /**
   * 启动期钩子：注册全局快捷键 + 可选的一次更新检查。
   * 这里是静态方法，拿不到 this.save，因此心跳/在线统计只能发生在面板打开期间。
   */
  static async onRegister(ctx: ExtensionContext): Promise<void> {
    // 第一行就无条件打日志。
    // 否则「引擎没调用 onRegister」「调用了但设置不满足静默返回」「中途抛异常」三种
    // 情况在日志里长得一模一样 —— 全是空的，没法定位到底卡在哪一步。
    console.log("[online-update] onRegister 已执行");

    try {
      const actionId = `${manifest.id}.open-panel`;
      ctx.input.registerAction({
        id: actionId,
        label: "打开更新与在线面板",
        defaultKeys: ["KeyU"],
      });
      console.log(`[online-update] 已注册快捷键 U（action = ${actionId}）`);
      ctx.input.onAction(actionId, () => {
        void ctx.ui.show(PANEL_MODULE_ID);
      });

      const checkOnLaunch = ctx.settings.get<boolean>("checkOnLaunch");
      const repo = ctx.settings.get<string>("releasesRepo");
      console.log(
        `[online-update] 读取设置：checkOnLaunch = ${String(checkOnLaunch)}，releasesRepo = "${repo ?? ""}"`,
      );

      if (checkOnLaunch === false) {
        console.log("[online-update] checkOnLaunch 为 false，跳过启动检查");
        return;
      }
      await notifyUpdateOnLaunch(ctx);
    } catch (error) {
      // 前面任何一步抛异常都会让 onRegister 静默失败，必须留痕。
      console.error("[online-update] onRegister 执行失败", error);
    }
  }

  render(): ExtensionRenderData<OnlineUpdatePanelProps> {
    return {
      component: OnlineUpdatePanel,
      props: {
        ...(this.data ?? {}),
        save: this.save,
        onClose: () => this.close(),
      },
    };
  }
}

/**
 * 启动时读一次 GitHub Releases，有新版本就（按设置）直接打开面板。
 *
 * 不做"已提示过就跳过"的去重 —— 启动检查没有可用的持久化通道，
 * 玩家没更新前每次启动都会看到提示。对催更新而言这是可接受的。
 */
async function notifyUpdateOnLaunch(ctx: ExtensionContext): Promise<void> {
  const repo = (ctx.settings.get<string>("releasesRepo") ?? "").trim();
  const currentVersion =
    ctx.settings.get<string>("currentVersion") || DEFAULT_CURRENT_VERSION;
  if (!repo) {
    console.log("[online-update] releasesRepo 未填，跳过启动检查");
    return;
  }

  try {
    const info = await fetchUpdateInfo(repo);
    if (!isNewerVersion(info.latestVersion, currentVersion)) {
      // 没有新版时也留一行日志：否则"检查过了"和"根本没跑"在日志里长得一模一样，
      // 创作者无法确认启动检查是否真的生效。
      console.log(
        `[online-update] 已是最新版本 ${info.latestVersion}（当前 ${currentVersion}）`,
      );
      return;
    }
    console.log(
      `[online-update] 发现新版本 ${info.latestVersion}（当前 ${currentVersion}）`,
    );
    if (ctx.settings.get<boolean>("autoOpenOnUpdate") !== false) {
      await ctx.ui.show(PANEL_MODULE_ID);
    }
  } catch (error) {
    // 网络问题不该影响游戏启动，只记日志。
    console.warn("[online-update] 启动检查更新失败", error);
  }
}

export default OnlineUpdateExtension;