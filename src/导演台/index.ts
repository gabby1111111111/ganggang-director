// 杠杠の导演台 · 阶段 1+3: 导演人设 + 重 roll 防护
//
// 监听酒馆新楼 → 把剧情 POST 给本机 ST-bridge (DSH 导演 Agent) → 导演按人设判断这一楼
// 该呈现什么 (nothing / show_image / play_music, 阶段 1 假执行只打印) → 回显结果.
// 阶段 3: 动作登记表持久化, swipe/删除/编辑时作废, 下一楼告知导演.
// 工具往返协议见 E:\ST-bridge\EXTERNAL-TOOLS.md:
//   stream:false, 串行, 每次返回一个 tool_call, 按 tool_call_id 回填, 回填用新 request_id,
//   网络重试必须复用原 request_id 与相同请求内容.

// 模块导入即信标 (区分"模块没被导入"与"模块内初始化崩溃")
try {
  (top.window.__daoyantai_m ??= { importedAt: Date.now() });
} catch { /* ignore */ }

const TAG = '【导演台】';
const BRIDGE_URL = 'http://127.0.0.1:43121/v1/chat/completions';
const CLIENT_ID = 'daoyantai';
const TASK_ID = 'director';
const REQUEST_TIMEOUT_MS = 120_000;
/** 网络失败重试次数 (同 request_id 同内容, 符合桥的去重协议) */
const MAX_RETRY = 2;
/** 导演回合最大轮数 (工具调用次数上限), 防止意外死循环 */
const MAX_ROUNDS = 8;
/** 只处理这些类型的 MESSAGE_RECEIVED, 其余 (quiet/continue/append...) 忽略 */
const INTERESTING_TYPES = ['normal', 'first_message', 'swipe', 'regenerate'];
/** 等正文落楼的最长时间 (message_received 在本环境早于文本落楼触发) */
const WAIT_TEXT_MS = 60_000;

/** 导演人设与判断规则, 随每楼请求注入 (DSH 侧 Agent preset 之上) */
const DIRECTOR_RULES = `你是酒馆剧情的幕后导演, 每读完毕一楼剧情, 决定现实中要不要呈现画面或音乐。

判断规则:
- 关键楼 (考虑 show_image): 强情绪转折、新地点/新角色登场、重要物件或承诺、战斗或亲密时刻、有明确"画面感"的描写。
- 过场楼 (通常 nothing): 日常对话、内心独白、信息量低、赶路或等待。
- play_music 只在场景基调明确变化时给 (新场景、氛围转折); 同一场景不重复给同一首。
- show_image 要给出画面主体与视觉提示词 (场景/人物动作/氛围, 中文)。
- 宁可安静也不要硬凑: 没有合适的呈现就 nothing。
- 决定说明放在工具参数里, 最终回复一句话即可, 不要复述剧情。`;

/** 阶段 1 工具: 都在本脚本内假执行 (只打印), 阶段 2/4 接入生图机/调音台真管线 */
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'nothing',
      description: '这一楼不需要任何呈现',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: '一句话理由' },
        },
        required: ['reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_image',
      description: '在现实中呈现一幅画面',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: '画面主体' },
          prompt: { type: 'string', description: '视觉提示词: 场景/人物动作/氛围' },
        },
        required: ['subject', 'prompt'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'play_music',
      description: '为当前场景配乐',
      parameters: {
        type: 'object',
        properties: {
          mood: { type: 'string', description: '曲风与情绪' },
          title: { type: 'string', description: '可选: 具体歌名' },
        },
        required: ['mood'],
        additionalProperties: false,
      },
    },
  },
];

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

interface DshSession {
  protocol_version: number;
  client_id: string;
  chat_id: string;
  task_id: string;
  request_id: string;
  action: string;
  fixed_message_count: number;
  fixed_message_types: never[];
  session_id?: string;
}

interface BridgeResponse {
  choices?: { message?: ChatMessage; finish_reason?: string }[];
  dsh_session?: { session_id?: string };
}

// ---------------------------------------------------------------------------
// 与导演对话
// ---------------------------------------------------------------------------

async function postChat(messages: ChatMessage[], dsh_session: DshSession): Promise<BridgeResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'dsh-default',
        stream: false,
        tool_choice: 'auto',
        parallel_tool_calls: false,
        tools: TOOLS,
        messages,
        dsh_session,
      }),
      signal: controller.signal,
    });
    const text = await resp.text();
    if (!resp.ok) {
      const error = new Error(`桥返回 HTTP ${resp.status}: ${text.slice(0, 500)}`);
      (error as Error & { status?: number }).status = resp.status;
      throw error;
    }
    return JSON.parse(text) as BridgeResponse;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 失败重试: 协议要求复用同一 request_id 与相同请求内容, 因此在原地重试而非换 ID.
 * 只重试网络类错误 (fetch/超时) 与 5xx; 4xx (如 409 幂等冲突) 重试必然复现, 直接抛出.
 */
async function postChatWithRetry(messages: ChatMessage[], dsh_session: DshSession): Promise<BridgeResponse> {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      return await postChat(messages, dsh_session);
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      const retryable = status === undefined || status >= 500;
      if (attempt === MAX_RETRY || !retryable) {
        throw error;
      }
      console.warn(`${TAG}请求失败 (第 ${attempt} 次), 复用 request_id=${dsh_session.request_id} 重试:`, error);
      await new Promise(resolve => setTimeout(resolve, 3_000));
    }
  }
  throw new Error('unreachable');
}

/**
 * 跑完一个导演回合: 请求 → (工具调用则假执行并回填) → 最终正文.
 * 回填请求使用新的 request_id (`-rN` 后缀), 重试复用同一 request_id.
 */
async function runDirectorRound(dyt_chat_id: string, base_request_id: string, messages: ChatMessage[]) {
  let session_id: string | undefined;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const dsh_session: DshSession = {
      protocol_version: 1,
      client_id: CLIENT_ID,
      chat_id: dyt_chat_id,
      task_id: TASK_ID,
      request_id: round === 0 ? base_request_id : `${base_request_id}-r${round}`,
      action: 'generate',
      fixed_message_count: 0,
      fixed_message_types: [],
      ...(session_id ? { session_id } : {}),
    };
    const resp = await postChatWithRetry(messages, dsh_session);
    session_id = resp.dsh_session?.session_id ?? session_id;

    const choice = resp.choices?.[0]?.message;
    if (!choice) {
      throw new Error('桥返回缺少 choices[0].message');
    }

    if (choice.tool_calls?.length) {
      messages.push(choice);
      for (const call of choice.tool_calls) {
        // 回填必须最先做: 协议要求 DSH 原生执行器在等回填, 假执行/登记绝不能挡住它
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ ok: true }) });
        try {
          executeTool(call, base_request_id);
          beacon(`tool ${base_request_id} ${call.function.name}`);
          // 登记动作 (阶段 3): show_image/play_music 才算"呈现动作", nothing 不登记
          if (call.function.name !== 'nothing') {
            const [floorStr, ...rest] = base_request_id.split('-');
            recordAction({
              key: `${dyt_chat_id}:${base_request_id}`,
              // 存裸 chat_id (不带 dyt- 前缀), 与作废事件里的 getCurrentChatId() 一致
              chat_id: dyt_chat_id.replace(/^dyt-/, ''),
              floor: Number(floorStr),
              swipe: Number(rest.join('-')) || 0,
              tool: call.function.name,
              args: call.function.arguments,
            });
          }
        } catch (error) {
          // 假执行自身的错误不影响回合继续
          console.error(`${TAG}工具 ${call.function.name} 假执行出错:`, error);
        }
      }
      continue;
    }

    console.info(`${TAG}导演: ${choice.content ?? '(空回复)'}`);
    beacon(`done ${base_request_id} ${(choice.content ?? '').slice(0, 80).replace(/\s+/g, ' ')}`);
    return;
  }
  console.warn(`${TAG}导演回合超过 ${MAX_ROUNDS} 轮, 放弃等待`);
  toastr.warn(`导演回合超过 ${MAX_ROUNDS} 轮, 放弃等待`, TAG);
}

/** 阶段 1 假执行: 只打印与提示; show_image/play_music 弹 toast, nothing 保持安静 */
function executeTool(call: ToolCall, base_request_id: string) {
  console.info(`${TAG}导演调用 ${call.function.name}(${call.function.arguments})`);
  const floor = base_request_id.split('-', 1)[0];
  if (call.function.name === 'show_image') {
    const args = JSON.parse(call.function.arguments) as { subject?: string; prompt?: string };
    toastr.success(`出图: ${args.subject ?? ''} —— ${args.prompt ?? ''}`, `${TAG}第 ${floor} 楼`, { timeOut: 30000 });
  } else if (call.function.name === 'play_music') {
    const args = JSON.parse(call.function.arguments) as { mood?: string; title?: string };
    toastr.success(`配乐: ${args.title ? `《${args.title}》` : ''}${args.mood ?? ''}`, `${TAG}第 ${floor} 楼`, { timeOut: 30000 });
  }
}

// ---------------------------------------------------------------------------
// 调试信标: 供外部确认脚本存活与事件流 (调试期手段, 稳定后移除)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __daoyantai?: { loadedAt: number; events: string[] };
  }
}

function beacon(event: string) {
  try {
    const b = (top.window.__daoyantai ??= { loadedAt: Date.now(), events: [] });
    b.events.push(`${new Date().toISOString().slice(11, 19)} ${event}`);
    if (b.events.length > 50) b.events.shift();
  } catch {
    /* 跨源不可达时静默 */
  }
}

// ---------------------------------------------------------------------------
// 动作登记表 (阶段 3): 持久化导演决定, 楼层重写/删除时作废
// ---------------------------------------------------------------------------

const ActionEntry = z.object({
  key: z.string(),
  chat_id: z.string(),
  floor: z.number(),
  swipe: z.number(),
  tool: z.string(),
  args: z.string(),
  at: z.number(),
  status: z.enum(['submitted', 'void']),
  /** 作废原因是否已告知导演 (只告知一次, 省调用) */
  told: z.boolean().default(false),
});
type ActionEntry = z.infer<typeof ActionEntry>;

const ActionLog = z.object({ version: z.literal(1), actions: z.array(ActionEntry).max(100) }).default({ version: 1, actions: [] });

/** 登记表变量名 (脚本变量空间) */
const ACTION_LOG_KEY = '导演台动作登记表';
/** 内存中的登记表, 写盘走串行链 */
let actionLog: z.infer<typeof ActionLog> = ActionLog.parse(undefined);
let actionLogDirty = false;

function loadActionLog() {
  try {
    const vars = getVariables({ type: 'script', script_id: getScriptId() });
    actionLog = ActionLog.parse(vars[ACTION_LOG_KEY]);
  } catch (error) {
    console.warn(`${TAG}动作登记表读取失败, 使用空表:`, error);
    actionLog = ActionLog.parse(undefined);
  }
}

function flushActionLog() {
  if (!actionLogDirty) {
    return;
  }
  actionLogDirty = false;
  try {
    replaceVariables({ [ACTION_LOG_KEY]: actionLog }, { type: 'script', script_id: getScriptId() });
  } catch (error) {
    console.error(`${TAG}动作登记表写盘失败:`, error);
    actionLogDirty = true;
  }
}

/** 登记一个动作 (submitted); 同 key 只登记一次 */
function recordAction(entry: Omit<ActionEntry, 'at' | 'status' | 'told'>) {
  if (actionLog.actions.some(a => a.key === entry.key)) {
    return;
  }
  actionLog.actions.push({ ...entry, at: Date.now(), status: 'submitted', told: false });
  // 只保留最近 100 条
  if (actionLog.actions.length > 100) {
    actionLog.actions.splice(0, actionLog.actions.length - 100);
  }
  actionLogDirty = true;
  flushActionLog();
}

/** 作废某楼层的所有未作废动作; 返回本次作废的条目 (供告知导演) */
function voidActionsFor(chatId: string, floor: number, reason: string): ActionEntry[] {
  const hit = actionLog.actions.filter(
    a => a.chat_id === chatId && a.floor === floor && a.status === 'submitted',
  );
  beacon(`void ${floor} ${reason} hit=${hit.length} mem=${actionLog.actions.length} chat=${String(chatId).slice(0, 10)}`);
  for (const a of hit) {
    a.status = 'void';
    a.told = false;
    console.info(`${TAG}动作作废 (${reason}): 第 ${floor} 楼 ${a.tool}`);
  }
  if (hit.length) {
    actionLogDirty = true;
    flushActionLog();
  }
  return hit;
}

/** 取一条未告知的作废, 标记 told 并返回描述 (下一楼带给导演, 每次只带一条) */
function nextUntoldVoid(): string | null {
  const entry = actionLog.actions.find(a => a.status === 'void' && !a.told);
  if (!entry) {
    return null;
  }
  entry.told = true;
  actionLogDirty = true;
  flushActionLog();
  return `注意: 第 ${entry.floor} 楼已被重写, 你此前对它的 ${entry.tool} 决定已作废, 请以最新内容为准。`;
}

// ---------------------------------------------------------------------------
// 楼层监听
// ---------------------------------------------------------------------------

/** 已处理过的 (聊天, 楼层, swipe) 去重, 防止同一事件重复进桥 */
const handled = new Set<string>();
/** 串行队列: 桥的导演回合必须串行, 不能并发抢占 */
let queue: Promise<void> = Promise.resolve();

async function handleFloor(message_id: number) {
  try {
    await handleFloorInner(message_id);
  } catch (error) {
    console.error(`${TAG}处理第 ${message_id} 楼时出错:`, error);
    toastr.error(String((error as Error)?.message ?? error).slice(0, 300), `${TAG}处理出错`);
  }
}

async function handleFloorInner(message_id: number) {
  beacon(`handle ${message_id}`);
  const chat_id = SillyTavern.getCurrentChatId();
  if (!chat_id) {
    toastr.warn('拿不到聊天 ID, 跳过', TAG);
    return;
  }

  // 等正文落楼: message_received 可能在文本写入前触发 (本环境实测如此).
  // 期间若切了聊天, 本楼作废 (新聊天的楼层有自己的事件), 避免把别的聊天内容发进旧会话.
  let text = '';
  let swipe_id = 0;
  for (let waited = 0; waited < WAIT_TEXT_MS; waited += 2_000) {
    if (SillyTavern.getCurrentChatId() !== chat_id) {
      beacon(`bail ${message_id} chat changed`);
      console.info(`${TAG}第 ${message_id} 楼等待期间聊天已切换, 放弃`);
      return;
    }
    const cur = getChatMessages(message_id, { include_swipes: true })[0];
    swipe_id = cur?.swipe_id ?? 0;
    text = (cur?.message ?? '').trim() || String(cur?.swipes?.[swipe_id] ?? '').trim();
    if (text) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }
  beacon(`floor ${message_id} swipe=${swipe_id} text_len=${text.length}`);
  if (!text) {
    console.warn(`${TAG}第 ${message_id} 楼迟迟没有正文, 放弃`);
    return;
  }

  const key = `${chat_id}:${message_id}:${swipe_id}`;
  if (handled.has(key)) {
    console.info(`${TAG}第 ${message_id} 楼 (swipe ${swipe_id}) 已处理过, 跳过`);
    return;
  }
  handled.add(key);

  console.info(`${TAG}第 ${message_id} 楼 (swipe ${swipe_id}) 已生成, 交给导演审阅…`);
  toastr.info(`第 ${message_id} 楼 (swipe ${swipe_id})`, `${TAG}交给导演审阅`, { timeOut: 5000 });
  // 阶段 3: 若有未告知的作废, 让导演知道楼被重写过
  const untold = nextUntoldVoid();
  const messages: ChatMessage[] = [
    { role: 'system', content: DIRECTOR_RULES },
    {
      role: 'user',
      content:
        (untold ? `${untold}\n\n` : '') +
        `第 ${message_id} 楼剧情已生成 (swipe ${swipe_id})。` +
        `请阅读以下内容, 按你的判断调用工具 (nothing / show_image / play_music):\n\n${text}`,
    },
  ];
  await runDirectorRound(`dyt-${chat_id}`, `${message_id}-${swipe_id}`, messages);
}

function enqueueFloor(message_id: number, type: string) {
  beacon(`enqueue ${message_id} type=${type}`);
  if (!INTERESTING_TYPES.includes(type)) {
    console.info(`${TAG}忽略楼层事件 (第 ${message_id} 楼, type=${type})`);
    return;
  }
  queue = queue
    .then(() => errorCatched(handleFloor)(message_id))
    .catch(error => {
      console.error(`${TAG}队列异常:`, error);
      toastr.error(String(error).slice(0, 200), `${TAG}出错`);
    });
}

$(() => {
  beacon('loaded');
  loadActionLog();
  eventOn(tavern_events.MESSAGE_RECEIVED, (message_id: number, type: string) => enqueueFloor(message_id, type));
  // 阶段 3: 楼层被切走/删除/编辑 → 该楼未完成动作作废
  eventOn(tavern_events.MESSAGE_SWIPED, (message_id: number) => {
    beacon(`evt swiped ${message_id}`);
    const chat_id = SillyTavern.getCurrentChatId();
    if (chat_id) {
      voidActionsFor(chat_id, message_id, 'swipe 切换');
    }
  });
  eventOn(tavern_events.MESSAGE_DELETED, (message_id: number) => {
    beacon(`evt deleted ${message_id}`);
    const chat_id = SillyTavern.getCurrentChatId();
    if (chat_id) {
      voidActionsFor(chat_id, message_id, '楼层删除');
    }
  });
  eventOn(tavern_events.MESSAGE_EDITED, (message_id: number) => {
    beacon(`evt edited ${message_id}`);
    const chat_id = SillyTavern.getCurrentChatId();
    if (chat_id) {
      voidActionsFor(chat_id, message_id, '楼层编辑');
    }
  });
  console.info(`${TAG}已加载 (阶段 1+3), 监听新楼中 (桥: ${BRIDGE_URL})`);
  toastr.success('导演出勤, 剧情到了就叫!', TAG);
});
