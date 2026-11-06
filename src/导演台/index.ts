// 杠杠の导演台 · 阶段 0: 链路打通
//
// 监听酒馆新楼 → 把剧情 POST 给本机 ST-bridge (DSH 导演 Agent) → 控制台打印导演回复.
// 工具往返协议见 E:\ST-bridge\EXTERNAL-TOOLS.md:
//   stream:false, 串行, 每次返回一个 tool_call, 按 tool_call_id 回填, 回填用新 request_id.

const TAG = '【导演台】';
const BRIDGE_URL = 'http://127.0.0.1:43121/v1/chat/completions';
const CLIENT_ID = 'daoyantai';
const TASK_ID = 'director';
const REQUEST_TIMEOUT_MS = 120_000;
/** 导演回合最大轮数 (工具调用次数上限), 防止意外死循环 */
const MAX_ROUNDS = 8;
/** 只处理这些类型的 MESSAGE_RECEIVED, 其余 (quiet/continue/append...) 忽略 */
const INTERESTING_TYPES = ['normal', 'first_message', 'swipe', 'regenerate'];

/** 阶段 0 只给 report(): 让导演汇报读后感, 本地假执行 */
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'report',
      description: '读完这一楼剧情后, 用它汇报你的读后感',
      parameters: {
        type: 'object',
        properties: {
          thought: { type: 'string', description: '一两句话的读后感' },
        },
        required: ['thought'],
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
  role: 'user' | 'assistant' | 'tool';
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
      throw new Error(`桥返回 HTTP ${resp.status}: ${text.slice(0, 500)}`);
    }
    return JSON.parse(text) as BridgeResponse;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 跑完一个导演回合: 请求 → (工具调用则假执行并回填) → 最终正文.
 * 网络重试需复用同一 request_id (桥按 request_id 去重), 因此重试逻辑放在 postChat 外层由调用方决定;
 * 这里每轮回填使用新的 request_id.
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
    const resp = await postChat(messages, dsh_session);
    session_id = resp.dsh_session?.session_id ?? session_id;

    const choice = resp.choices?.[0]?.message;
    if (!choice) {
      throw new Error('桥返回缺少 choices[0].message');
    }

    // 阶段 0: 工具只有 report, 假执行 (打印) 后回填成功结果, 让导演继续
    if (choice.tool_calls?.length) {
      messages.push(choice);
      for (const call of choice.tool_calls) {
        console.info(`${TAG}导演调用 ${call.function.name}(${call.function.arguments})`);
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ ok: true }) });
      }
      continue;
    }

    console.info(`${TAG}导演读后感: ${choice.content ?? '(空回复)'}`);
    toastr.info(String(choice.content ?? '(空回复)'), `${TAG}第 ${base_request_id.split('-')[0]} 楼`, { timeOut: 10000 });
    return;
  }
  console.warn(`${TAG}导演回合超过 ${MAX_ROUNDS} 轮, 放弃等待`);
}

// ---------------------------------------------------------------------------
// 调试信标: 供外部确认脚本存活与事件流 (阶段 0 临时手段, 后续移除)
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
  beacon(`chat_id=${String(chat_id).slice(0, 40)}`);
  if (!chat_id) {
    toastr.warn('拿不到聊天 ID, 跳过', TAG);
    return;
  }

  // 等正文落楼: message_received 可能在文本写入前触发 (本环境实测如此)
  let text = '';
  let swipe_id = 0;
  for (let waited = 0; waited < 180_000; waited += 2_000) {
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
    toastr.warn(`第 ${message_id} 楼迟迟没有正文, 放弃`, TAG);
    return;
  }

  const key = `${chat_id}:${message_id}:${swipe_id}`;
  if (handled.has(key)) {
    console.info(`${TAG}第 ${message_id} 楼 (swipe ${swipe_id}) 已处理过, 跳过`);
    return;
  }
  handled.add(key);

  console.info(`${TAG}第 ${message_id} 楼 (swipe ${swipe_id}) 已生成, 交给导演审阅…`);
  toastr.info(`第 ${message_id} 楼 (swipe ${swipe_id})`, `${TAG}交给导演审阅`);
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content:
        `第 ${message_id} 楼剧情已生成 (swipe ${swipe_id})。` +
        `请阅读以下内容, 然后调用 report() 汇报你的读后感:\n\n${text}`,
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
  eventOn(tavern_events.MESSAGE_RECEIVED, (message_id: number, type: string) => enqueueFloor(message_id, type));
  console.info(`${TAG}已加载, 监听新楼中 (桥: ${BRIDGE_URL})`);
  toastr.success('监听新楼中, 导演出勤！', TAG);
});
