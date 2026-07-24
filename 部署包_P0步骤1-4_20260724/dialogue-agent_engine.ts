/**
 * 对话引擎 — 统一入口
 *
 * 所有场景共用一个 respond() 函数。
 * NPC行为、陷阱规则、引导者提示、回应池全部来自场景卡JSON。
 * 引擎不含任何场景硬编码。
 *
 * AI调用通过 AICaller 接口注入——引擎不直接依赖妙搭SDK。
 */

import type { ScenarioCard, ResponseVariant } from './场景卡数据协议_v2.0';
import { evaluateConditions } from './场景卡条件引擎_condition-evaluator';
import { updateContextFromInput } from './场景卡条件引擎_condition-evaluator';

// ============================================================
// 类型
// ============================================================

export interface HistoryEntry { role: 'user' | 'assistant'; content: string; }

export interface EngineState {
  round: number;
  npcMood: string;
  phase: string;
  ctx: Record<string, boolean>;
  scores: Record<string, number>;
  traps: Record<string, number>;
}

export interface DialogueEvent {
  type: 'trap' | 'whisper';
  id?: string; msg?: string; delay_ms?: number;
}

export interface RespondResult {
  response: string;
  layer: 'L1' | 'L2' | 'L3' | 'L4';
  events: DialogueEvent[];
  state: EngineState;
}

/** AI调用函数签名 — 由调用方（TG001EnginePage.tsx）注入妙搭SDK */
export type AICaller = (
  systemPrompt: string,
  history: HistoryEntry[],
  timeoutMs: number
) => Promise<string | null>;

// ============================================================
// 初始化
// ============================================================

export function createInitialState(): EngineState {
  return {
    round: 0, npcMood: 'WATCH', phase: 'TRUST',
    ctx: { bizMentioned: false, questionAsked: false, strategySet: false, demoPromised: false, orderGiven: false, pressureUsed: false },
    scores: {}, traps: {},
  };
}

// ============================================================
// 意图分类
// ============================================================

function classifyInput(text: string): string {
  if (/来不及|只剩.*天|赶紧|再.*不.*就|倒计时|必须.*完成|没.*时间/.test(text)) return 'pressure';
  if (/加油|相信.*你们|会好.*的|慢慢来|你们.*行|一定.*可以|能.*做到/.test(text) && text.length < 50) return 'vague_pep';
  if (/从今天.*开始|你们.*要|必须|全员.*动员|宣布|给大家.*打气|安排.*一下|通知.*下去|马上去|立刻.*做/.test(text)) return 'give_directive';
  if (/户型|客户|数据|来访|认筹|成交|转化|沙盘|佣金|说辞|竞品|示范区|爬楼|采光|登记|样板|合同|逼定/.test(text)) return 'talk_biz';
  if (/你觉得|你怎么看|你帮.*看|你.*意见|你.*想法|你.*经验|说说.*你|问你|请教|你.*知道/.test(text)) return 'ask_opinion';
  if (/辛苦|不容.*易|理解.*你|知道.*难|压力.*大|累.*了|撑.*住|没.*关系/.test(text)) return 'show_empathy';
  if (/项目.*怎么|最近.*情况|现在.*什么|告诉.*我|数据.*多少|来.*多少|卖.*多少/.test(text)) return 'ask_info';
  if (/有道理|说得对|没错|嗯|好.*的|明白了|了解|收到|知道.*了|行.*就.*这样/.test(text) && text.length < 30) return 'acknowledge';
  return 'other';
}

// ============================================================
// 陷阱检测
// ============================================================

function detectTraps(text: string, state: EngineState, trapRules: ScenarioCard['prompt_rules']['traps']): DialogueEvent[] {
  const events: DialogueEvent[] = [];
  for (const rule of trapRules) {
    if (new RegExp(rule.pattern).test(text) && evaluateConditions(rule.conditions, state.ctx)) {
      state.traps[rule.id] = (state.traps[rule.id] || 0) + 1;
      state.scores[rule.dim] = Math.max(0, (state.scores[rule.dim] || 0) + rule.score);
      events.push({ type: 'trap', id: rule.id, msg: rule.msg, delay_ms: 300 });
    }
  }
  return events;
}

// ============================================================
// 上下文推进
// ============================================================

function advanceContext(text: string, state: EngineState, sceneConfig: ScenarioCard): void {
  const rules = sceneConfig.prompt_rules;
  state.ctx = updateContextFromInput(text, rules.context_vars, state.ctx);

  for (const rule of rules.auto_advance) {
    if (state.round >= rule.round && evaluateConditions(rule.conditions, state.ctx)) {
      state.ctx[rule.set_var] = true;
    }
  }

  if (sceneConfig.dialogue_mode === 'narrative') {
    const ctx = state.ctx;
    if (ctx.demoPromised) { state.phase = 'DEMO'; state.npcMood = 'FOLLOW'; }
    else if (ctx.strategySet) { state.phase = 'SIMPLIFY'; state.npcMood = 'VERIFY'; }
    else if (ctx.bizMentioned && ctx.questionAsked) { state.phase = 'DIAGNOSE'; state.npcMood = 'TEST'; }
    else if (ctx.bizMentioned) { state.phase = 'DIAGNOSE'; state.npcMood = 'TEST'; }
  }
}

// ============================================================
// 引导者提示
// ============================================================

function getFacilitatorHints(state: EngineState, whisperRules: ScenarioCard['prompt_rules']['whispers']): DialogueEvent[] {
  const events: DialogueEvent[] = [];
  for (const rule of whisperRules) {
    if (rule.pattern === '' || new RegExp(rule.pattern).test('')) {
      if (evaluateConditions(rule.conditions, state.ctx)) {
        events.push({ type: 'whisper', id: rule.id, msg: rule.msg, delay_ms: rule.delay_ms });
      }
    }
  }
  return events;
}

// ============================================================
// 回应池
// ============================================================

const poolUsed: Record<string, number[]> = {};

function matchFromPool(mood: string, intent: string, pool: ScenarioCard['response_pool']): ResponseVariant | null {
  if (!pool[mood]) return null;
  const variants = pool[mood][intent] || pool[mood]['other'];
  if (!variants || variants.length === 0) return null;

  const trackKey = `${mood}:${intent}`;
  if (!poolUsed[trackKey]) poolUsed[trackKey] = [];
  const available: number[] = [];
  for (let i = 0; i < variants.length; i++) {
    if (poolUsed[trackKey].indexOf(i) === -1) available.push(i);
  }
  if (available.length === 0) { poolUsed[trackKey] = []; for (let i = 0; i < variants.length; i++) available.push(i); }
  const idx = available[Math.floor(Math.random() * available.length)];
  poolUsed[trackKey].push(idx);
  if (poolUsed[trackKey].length > 5) poolUsed[trackKey] = poolUsed[trackKey].slice(-5);
  return variants[idx];
}

// ============================================================
// AI调用（带重试 + 超时）
// ============================================================

async function callAIWithRetry(
  callAI: AICaller,
  sceneConfig: ScenarioCard,
  history: HistoryEntry[],
  maxRetries: number = 1
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await new Promise<void>(r => setTimeout(r, 500));
    try {
      const result = await callAI(sceneConfig.system_prompt, history, 3000);
      if (result) return result;
    } catch { /* retry */ }
  }
  return null;
}

// ============================================================
// 缓存
// ============================================================

const responseCache: Record<string, string> = {};
const CACHE_MAX = 60;

(function loadCache() {
  try { const raw = localStorage.getItem('dialogue_response_cache'); if (raw) Object.assign(responseCache, JSON.parse(raw)); } catch { /* */ }
})();

let cacheDirty = false;
function saveCacheDeferred() {
  if (cacheDirty) return;
  cacheDirty = true;
  setTimeout(() => {
    try {
      const keys = Object.keys(responseCache);
      if (keys.length > CACHE_MAX) { const remove = keys.slice(0, keys.length - CACHE_MAX); for (const k of remove) delete responseCache[k]; }
      localStorage.setItem('dialogue_response_cache', JSON.stringify(responseCache));
    } catch { /* */ }
    cacheDirty = false;
  }, 2000);
}

function setCache(key: string, value: string) { responseCache[key] = value; saveCacheDeferred(); }
function makeCacheKey(text: string, mood: string): string {
  const intent = classifyInput(text);
  const words = text.replace(/[，。！？、；：""''（）\s\d]/g, '').match(/[一-鿿]{2,}/g) || [];
  return `${mood}:${intent}:${words.slice(0, 5).join('')}`;
}

// ============================================================
// 主入口
// ============================================================

export async function respond(
  sceneConfig: ScenarioCard,
  userMsg: string,
  history: HistoryEntry[],
  state: EngineState,
  callAI?: AICaller  // ← 由调用方注入，默认undefined表示纯回应池模式
): Promise<RespondResult> {
  const events: DialogueEvent[] = [];
  state.round++;

  advanceContext(userMsg, state, sceneConfig);
  events.push(...detectTraps(userMsg, state, sceneConfig.prompt_rules.traps));
  events.push(...getFacilitatorHints(state, sceneConfig.prompt_rules.whispers));

  const intent = classifyInput(userMsg);
  let npcResp = '';
  let layer: RespondResult['layer'] = 'L4';

  // L1: 缓存
  const cacheKey = makeCacheKey(userMsg, state.npcMood);
  if (responseCache[cacheKey]) { npcResp = responseCache[cacheKey]; layer = 'L1'; }

  // L2: 按模式分发
  if (!npcResp) {
    if (sceneConfig.dialogue_mode === 'narrative' && callAI) {
      const aiResp = await callAIWithRetry(callAI, sceneConfig, history, 1);
      if (aiResp) { npcResp = aiResp; layer = 'L2'; setCache(cacheKey, aiResp); }
    }

    // L3: 回应池
    if (!npcResp) {
      const poolResult = matchFromPool(state.npcMood, intent, sceneConfig.response_pool);
      if (poolResult) {
        npcResp = poolResult.text;
        layer = sceneConfig.dialogue_mode === 'training' ? 'L2' : 'L3';
        setCache(cacheKey, npcResp);
        await new Promise<void>(r => setTimeout(r, 250 + Math.random() * 300));
      }
    }

    // L4: 兜底
    if (!npcResp) {
      if (sceneConfig.dialogue_mode === 'training') {
        npcResp = '老周看着你，等你说下去。';
        events.push({ type: 'whisper', msg: '💡 试试问老周"你觉得哪两个户型值得主力推？"', delay_ms: 500 });
        layer = 'L3';
      } else {
        npcResp = '老周看了你一眼。他没说话——在等。看你是继续在表面转，还是会问到点子上。';
        layer = 'L4';
      }
    }
  }

  // 加分
  if (sceneConfig.dialogue_mode === 'narrative') {
    if (/你.*帮.*看|你.*觉得.*呢|你.*比.*我/.test(userMsg) && state.ctx.bizMentioned) {
      state.scores['problem_diagnosis'] = Math.min(100, (state.scores['problem_diagnosis'] || 0) + 10);
    }
  }

  return { response: npcResp, layer, events, state };
}
