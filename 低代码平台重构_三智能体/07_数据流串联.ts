// ============================================================
// 数据流串联工具
// 三个智能体之间的数据传递 —— 通过 DB + URL params
// 不依赖 localStorage
// ============================================================

import type { ScenarioCard, DecisionPath, DVector, PStep, Difficulty } from '../types/scenario-card';

// ---- API 封装 ----

const API = {
  /** 创建场景卡 */
  async createScene(data: {
    scenario_card: ScenarioCard;
    d_vector: DVector;
    p_sequence: string;
    progression_chain: string;
  }) {
    const res = await fetch('/api/coaching-scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /** 读取场景卡 */
  async getScene(sceneId: string): Promise<{ scenario_card: ScenarioCard; d_vector: DVector }> {
    const res = await fetch(`/api/coaching-scenes/${sceneId}`);
    if (!res.ok) throw new Error('场景不存在');
    const data = await res.json();
    return {
      scenario_card: typeof data.scenario_card === 'string' ? JSON.parse(data.scenario_card) : data.scenario_card,
      d_vector: data.d_vector,
    };
  },

  /** 创建会话 */
  async createSession(sceneId: string, initialPath: Partial<DecisionPath>) {
    const res = await fetch('/api/coaching-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: sceneId, decision_path: initialPath }),
    });
    return res.json();
  },

  /** 更新会话的决策路径 */
  async updateSession(sessionId: string, decisionPath: DecisionPath) {
    const res = await fetch(`/api/coaching-sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision_path: decisionPath }),
    });
    return res.json();
  },

  /** 读取会话 + 决策路径 */
  async getSession(sessionId: string): Promise<{ decision_path: DecisionPath }> {
    const res = await fetch(`/api/coaching-sessions/${sessionId}`);
    if (!res.ok) throw new Error('会话不存在');
    const data = await res.json();
    return {
      decision_path: typeof data.decision_path === 'string' ? JSON.parse(data.decision_path) : data.decision_path,
    };
  },
};

export { API };

// ---- 插件调用封装 ----

interface PluginResult {
  content: string | object;
}

/** 场景生成插件 */
export async function callScenarioGenerate(params: {
  d_vector: DVector;
  p_step_range: PStep[];
  difficulty_level: Difficulty;
  industry_param: string;
}): Promise<ScenarioCard> {
  const plugin = (window as any).capabilityClient.load('scenario_card_smart_generate_v19_1');
  const result: PluginResult = await plugin.call('textGenerate', {
    system_prompt: '', // 插件内部维护
    user_message_history: JSON.stringify(params),
  });
  return typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
}

/** 对话 AI 插件 */
export async function callDialogueAI(params: {
  scenario_card: ScenarioCard;
  current_dp_index: number;
  conversation_history: string;
}): Promise<string> {
  const plugin = (window as any).capabilityClient.load('mdp_coach_ai_conversation_reply_1');
  const result: PluginResult = await plugin.call('textGenerate', {
    system_prompt: '', // 插件内部维护
    user_message_history: JSON.stringify(params),
  });
  return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
}

/** 反馈分析插件 */
export async function callFeedbackAI(params: {
  scenario_card: ScenarioCard;
  decision_path: DecisionPath;
}): Promise<any> {
  const plugin = (window as any).capabilityClient.load('ai_coach_analysis_report_1');
  const result: PluginResult = await plugin.call('textGenerate', {
    scene_info: JSON.stringify(params.scenario_card),
    conversation_list: JSON.stringify(params.decision_path.decisions),
    analysis_requirements: JSON.stringify({
      layers: ['theory', 'industry', 'expert'],
      dimensions: params.scenario_card.feedback_criteria.scoring_dimensions.map(d => d.name),
      golden_path: params.scenario_card.feedback_criteria.golden_path,
      crack_type_awareness: params.scenario_card.feedback_criteria.crack_type_awareness,
    }),
  });
  return typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
}

// ---- 完整数据流 ----

/**
 * 完整的三智能体数据流：
 *
 * 1. [场景生成] 用户选 D 向量 → callScenarioGenerate() → scenarioCard
 * 2. [存储] API.createScene(scenarioCard) → sceneId
 * 3. [跳转] navigate(`/scenario/${sceneId}/chat`)
 * 4. [对话] API.getScene(sceneId) → 渲染场景 → 收集决策
 * 5. [存储] API.createSession + API.updateSession(decisionPath) → sessionId
 * 6. [跳转] navigate(`/scenario/${sceneId}/feedback?session=${sessionId}`)
 * 7. [反馈] Promise.all([API.getScene, API.getSession]) → callFeedbackAI()
 * 8. [再练] navigate(`/scenario/${sceneId}/chat`) 或 navigate('/scenario/generate')
 */
