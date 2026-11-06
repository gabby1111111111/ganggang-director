# 杠杠の导演台

一个 [酒馆助手](https://n0vi028.github.io/JS-Slash-Runner-Doc/) 脚本: 给酒馆 (SillyTavern) 配一位**住在 DSH 里的导演 Agent** —— 每读完毕一楼剧情, 它就决定现实里该呈现什么: 出图、配乐、配音……

正文 AI 负责讲故事, 导演负责让故事"落到现实里来"。

## 架构

```
酒馆正文 AI (只管写剧情, 不用工具)
      │ 写完一楼剧情
      ▼
导演台脚本 (本仓库, 酒馆助手环境)
      │ 监听 MESSAGE_RECEIVED (含楼层 ID、swipe 序号)
      │ POST 本机 ST-bridge /v1 (带工具清单 + dsh_session, 按聊天隔离会话)
      ▼
ST-bridge ──► DSH 导演 Agent (持久会话, 原生 function calling)
      ▲                         │
      │ tool_calls: show_image / play_music / ...
      │
   脚本进程内直调各执行器 → 结果回填 → 导演继续
```

- 不需要额外的桥接服务、不需要 WebSocket —— 纯 HTTP 往返 (ST-bridge external-tools 模式)。
- 大脑在 DSH: 正文 AI 永远不用工具, 函数调用由 DSH 模型原生完成, 与中转站是否支持 function calling 无关。

## 当前状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 · 链路打通 | 监听新楼 → POST 给桥 → 导演 `report()` 读后感 | ✅ 已验收 |
| 1 · 导演人设 | 判断规则注入 (关键楼 vs 过场); 工具 `nothing/show_image/play_music` 假执行 | 进行中 |
| 2 · 接生图机 | `show_image` 直调生图机生成管线, 提交即回填不阻塞 | 待做 |
| 3 · 重 roll 防护 | 动作登记表绑 `(聊天ID, 楼层ID, swipe)`, swipe/删除/编辑时作废未完成动作 | 待做 |
| 4 · 调音台/配音室 | `play_music` 直调; 关键对白 TTS | 待做 |

**v1 明确不做**: 不可逆现实动作 (花钱/发消息/下单类 —— 将来也只做"导演提议→用户确认"制)、改动 ST-bridge 与 DSH 本体。

## 目录结构

```
src/导演台/          ← 本体脚本 (index.ts)
tools/dev_server.mjs ← 开发用: 5500 端口静态服务 (带 CORS, 供酒馆页面跨源 import 构建产物)
src/导演台/导入到酒馆中.json ← 酒馆助手脚本库条目 (导入用, 内容指向 localhost:5500)
util/ · @types/ · 示例/ · 初始模板/   ← StageDog 酒馆助手模板自带
```

## 开发方式

```bash
pnpm install          # 安装依赖 (本机没装 pnpm 先 npm i -g pnpm)
pnpm build:dev        # 构建到 dist/导演台/index.js
pnpm watch            # 或挂个监视
node tools/dev_server.mjs   # 起 5500 静态服务
```

然后:

1. 把 `src/导演台/导入到酒馆中.json` 导入酒馆助手的脚本库 (或手动新建脚本, 内容填
   `import 'http://localhost:5500/dist/导演台/index.js'`) 并启用;
2. 酒馆里正常游玩, 出新楼后看浏览器控制台 / 页面通知里的导演反应。

改完代码重新构建后刷新酒馆页面即可生效 (脚本从 5500 拉最新产物)。

### 依赖的环境

- 本机运行 [DSH](https://www.deepseek.com/) (导演 Agent 的大脑) 与 ST-bridge (OpenAI 兼容网关, external-tools 模式, 协议见其 `EXTERNAL-TOOLS.md`);
- 酒馆助手脚本库能访问 `http://localhost:5500`。

## 安全红线

- 一切密钥、聊天记录、剧情预览内容**永不打印进日志或对话**;
- 不可逆的现实动作永远隔一道用户确认, 导演无权自作主张。

## 致谢与许可

- 基于 [StageDog 的酒馆助手编写模板](https://github.com/StageDog/tavern_helper_template) 构建 (模板自带 CI 自动打包 / 依赖更新 / 模板同步);
- 工具往返协议参考 ST-bridge 的 external-tools 设计 (MIT)。

[PolyForm Noncommercial License 1.0.0](LICENSE)
