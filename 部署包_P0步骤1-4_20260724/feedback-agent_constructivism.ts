/**
 * Constructivism 反馈模块组（管理陪练）
 *
 * L2 实现：规则判断 + 原话锚定
 * - 判词和觉察使用 L2 模板 + {user_quote} 变量
 * - 行为对照：规则判断 good/bad/skip + history 原话提取
 * - 其余模块：L1 数据驱动
 *
 * P2 升级：判词和觉察接入 AI（ai_coach_analysis_report_1）
 */

import type { ScenarioCard } from './场景卡数据协议_v2.0';
import type { SessionData, FeedbackModule, FeedbackItem } from './feedback-agent_types';
import { evaluateConditions, evaluateConditionGroups } from './场景卡条件引擎_condition-evaluator';

// ============================================================
// 原话提取工具
// ============================================================

/** 从 history 提取用户最长发言 */
function extractUserQuote(history: SessionData['history'], minLength: number = 10): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user' && history[i].content.length >= minLength) {
      return history[i].content;
    }
  }
  return '';
}

/** 从 history 提取 NPC 带引号的发言 */
function extractNPCQuote(history: SessionData['history']): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant') {
      const match = history[i].content.match(/[""「」]([^""「」]{6,60})[""「」]/);
      if (match) return match[1];
    }
  }
  // 兜底：取NPC最后一句话的前60字
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant' && history[i].content.length > 6) {
      return history[i].content.slice(0, 60);
    }
  }
  return '';
}

/** 从 history 提取用户在某轮之后 NPC 的反应 */
function extractNPCReactionAfterUser(history: SessionData['history'], userText: string): string {
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].role === 'user' && history[i].content.includes(userText.slice(0, 10))) {
      if (history[i + 1]?.role === 'assistant') {
        return history[i + 1].content.slice(0, 80);
      }
    }
  }
  return '';
}

// ============================================================
// 变量填充
// ============================================================

function fillTemplate(
  template: string,
  session: SessionData,
  extra: Record<string, string> = {}
): string {
  const userQuote = extractUserQuote(session.history);
  const npcQuote = extractNPCQuote(session.history);

  const vars: Record<string, string> = {
    '{npc_name}': session.npcName,
    '{npc_mood}': session.npcMood,
    '{phase}': session.phase,
    '{score_summary}': Object.entries(session.scores)
      .map(([k, v]) => `${k}: ${Math.round(v)}`)
      .join(', '),
    '{user_quote}': userQuote,
    '{npc_quote}': npcQuote,
    '{round}': String(session.round),
    ...extra,
  };

  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  // 空值保护：移除因变量为空而产生的空洞引号和残缺句子
  result = result
    .replace(/""/g, '')                           // 空洞引号
    .replace(/''/g, '')                           // 空洞单引号
    .replace(/「」/g, '')                         // 空洞日文引号
    .replace(/当你说""时/g, '')                   // 残缺句式：当你说""时
    .replace(/当你说''时/g, '')
    .replace(/\n\n+/g, '\n\n')                    // 多重空行合并
    .trim();

  return result;
}

// ============================================================
// 模块 1：判词（L2 — 模板 + 数据变量 + 原话锚定）
// ============================================================

function buildVerdict(session: SessionData, sceneConfig: ScenarioCard): FeedbackModule {
  const { npcMood, phase, ctx, scores } = session;

  // 判断层级
  let template: string;
  if (npcMood === 'FOLLOW' && phase === 'DEMO') {
    template =
      `老周从"配合你"变成了"跟从你"。在对话中，当你说"{user_quote}"时，老周第一次主动伸出手来。\n\n` +
      `你做到了三件关键的事：先闭嘴做事、替团队砍掉噪音、亲自做给他们看。` +
      `这不是靠职权推动的——是靠行动赢得的。`;
  } else if (ctx.strategySet && !ctx.demoPromised) {
    template =
      `你给了老周方向——\"就推这两个\"——他听进去了。但当他说\"下面的人不信\"时，你没有亲自打样。\n\n` +
      `老周停在了\"验证\"状态：他认可你的策略，但还在等证据。` +
      `你离\"跟从\"只差一步——下一次，蹲在沙盘区亲自做一单。`;
  } else if (ctx.questionAsked && !ctx.strategySet) {
    template =
      `你问了老周的看法——\"{user_quote}\"——这是他今天第一次正眼看你。\n\n` +
      `但你还没有给他方向。他在等你替团队做减法——\"6个户型，就推这两个\"。` +
      `问了之后要拍板——这是资深团队对管理者最核心的期待。`;
  } else {
    template =
      `你太快进入了\"解决问题\"模式。还没有问老周怎么看，就开始给方案。\n\n` +
      `老周不会反对你——但他也不会真的配合你。下次试试先问：\"你觉得这6个户型，哪两个值得主力推？\"`;
  }

  return {
    id: 'verdict',
    title: '核心判词',
    content: fillTemplate(template, session),
  };
}

// ============================================================
// 模块 2：觉察·你的模式（L2 — 模板 + 陷阱数据 + 原话）
// ============================================================

function buildAwareness(session: SessionData, _sceneConfig: ScenarioCard): FeedbackModule {
  const { traps } = session;
  const hasPressure = (traps['T05'] || 0) >= 1;
  const hasInfoTrap = (traps['T03'] || 0) >= 1;
  const hasTrainTrap = (traps['T04'] || 0) >= 1;

  let template: string;
  if (hasPressure) {
    template =
      `当团队缺乏信心时，你的第一反应是施加更大的压力。\n\n` +
      `在对话中，你用紧迫感来推动行动——\"{user_quote}\"。` +
      `老周表面点头，内心已经关上了门。` +
      `对老周这种见过四任领导的资深员工来说，施压等于宣告\"我不信任你们的能力\"。\n\n` +
      `真正能让资深团队行动起来的，不是更大的压力——` +
      `是有人替他们承担\"砍错了怎么办\"的风险。`;
  } else if (hasInfoTrap || hasTrainTrap) {
    const steps: string[] = [];
    if (hasInfoTrap) steps.push('给对比表/做资料');
    if (hasTrainTrap) steps.push('培训话术');
    template =
      `面对老周的\"不信\"信号，你选择了${steps.join(' + ')}。\n\n` +
      `\"{user_quote}\"——这个策略在带新人时有效（新人缺知识）。` +
      `但在带老周这种资深团队时是反效果的——他们不缺知识，缺信心。\n\n` +
      `信心不是靠\"教\"获得的——是亲眼看到有人做成了。`;
  } else {
    template =
      `你在压力下倾向于\"做加法\"——给更多信息、更多工具。\n\n` +
      `但老周需要的是相反的东西：有人替他做减法。` +
      `这是一个常见的惯性——面对不确定性时，管理者的本能是\"做得更多\"。` +
      `下次试试\"做得更少、但更狠\"——直接砍到2个。`;
  }

  return {
    id: 'awareness',
    title: '觉察 · 你的模式',
    content: fillTemplate(template, session),
  };
}

// ============================================================
// 模块 3：行为对照（L2 — 规则判断 + 原话提取）
// ============================================================

function buildBehaviorSteps(session: SessionData, sceneConfig: ScenarioCard): FeedbackModule {
  const items: FeedbackItem[] = [];
  const criteria = sceneConfig.success_criteria;

  for (const criterion of criteria) {
    for (const step of criterion.behavior_steps) {
      const ctx = session.ctx;

      // 判断状态
      let status: FeedbackItem['status'] = 'skip';
      let detail: string;

      if (evaluateConditionGroups(step.good_conditions, ctx)) {
        status = 'good';
        detail = fillTemplate(step.why_good, session);
      } else if (evaluateConditionGroups(step.bad_conditions, ctx)) {
        status = 'bad';
        detail = fillTemplate(step.why_bad, session);
      } else {
        status = 'skip';
        detail = `这一步未触发——${step.best_practice}`;
      }

      // 提取关联原话
      const quote = status === 'good'
        ? extractUserQuote(session.history)
        : '';

      items.push({
        label: `步骤${step.step} · ${step.label}`,
        status,
        detail,
        quote: quote || undefined,
      });
    }
  }

  return {
    id: 'behavior_steps',
    title: '行为对照',
    content: '对照绩优做法——不是评判，是让你看到另一种可能。',
    items,
  };
}

// ============================================================
// 模块 4-6：再来一练 / 知识薄弱点 / 下一步计划（L1 — 数据驱动）
// ============================================================

function buildNextPractice(session: SessionData, sceneConfig: ScenarioCard): FeedbackModule {
  // 找最弱维度
  let weakestKey = '';
  let weakestScore = 100;
  for (const [key, score] of Object.entries(session.scores)) {
    if (score < weakestScore) {
      weakestScore = score;
      weakestKey = key;
    }
  }

  const criterion = sceneConfig.success_criteria.find(c => c.key === weakestKey);
  const label = criterion?.label || weakestKey;

  return {
    id: 'next_practice',
    title: '再来一练',
    content: `聚焦「${label}」——这是你得分最低的维度（${Math.round(weakestScore)}分）。\n\n` +
      `下次练习时特别关注这一条。如果再次练习，你的行为变化会直接显示在这里。`,
  };
}

function buildKnowledgeGaps(session: SessionData, sceneConfig: ScenarioCard): FeedbackModule {
  const items: FeedbackItem[] = [];

  for (const criterion of sceneConfig.success_criteria) {
    const score = session.scores[criterion.key] || 0;
    let status: FeedbackItem['status'];
    let detail: string;

    if (score >= criterion.benchmark) {
      status = 'good';
      detail = `绩优（${criterion.benchmark}+）· ${criterion.mtp_anchor}`;
    } else if (score >= criterion.benchmark * 0.5) {
      status = 'bad';
      detail = `需强化 · ${criterion.mtp_anchor}——${criterion.label}`;
    } else {
      status = 'skip';
      detail = `未触发 · ${criterion.label}`;
    }

    items.push({
      label: criterion.label,
      status,
      detail,
    });
  }

  return {
    id: 'knowledge_gaps',
    title: '知识薄弱点',
    content: '基于本次练习的知识点掌握情况——不是"你不行"，是"这里还有空间"。',
    items,
  };
}

function buildActionPlan(session: SessionData, _sceneConfig: ScenarioCard): FeedbackModule {
  return {
    id: 'action_plan',
    title: '下一步计划',
    content:
      `下次，当团队说"不信/不行/太难"的时候——\n` +
      `先做一个动作让他们亲眼看到，而不是给工具或培训。\n\n` +
      `写下你的承诺——下次练习时会提醒你。`,
  };
}

// ============================================================
// 主入口
// ============================================================

export function buildConstructivismModules(
  session: SessionData,
  sceneConfig: ScenarioCard
): FeedbackModule[] {
  const moduleMap: Record<string, (s: SessionData, c: ScenarioCard) => FeedbackModule> = {
    verdict: buildVerdict,
    awareness: buildAwareness,
    behavior_steps: buildBehaviorSteps,
    next_practice: buildNextPractice,
    knowledge_gaps: buildKnowledgeGaps,
    action_plan: buildActionPlan,
  };

  return sceneConfig.feedback_modules
    .map(id => {
      const builder = moduleMap[id];
      return builder ? builder(session, sceneConfig) : null;
    })
    .filter((m): m is FeedbackModule => m !== null);
}
