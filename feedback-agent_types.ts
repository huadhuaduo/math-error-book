/**
 * 反馈引擎类型定义
 * 反馈引擎读 sceneConfig + sessionData，按 learning_theory 加载模块组
 */

import type { ScenarioCard } from './场景卡数据协议_v2.0';

/** 对话历史条目 */
export interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

/** 会话数据 — 对话引擎结束时保存 */
export interface SessionData {
  sceneId: string;
  sceneName: string;
  npcName: string;
  timestamp: string;
  phase: string;
  npcMood: string;
  /** 分数 — key对应 success_criteria[].key */
  scores: Record<string, number>;
  /** 陷阱触发次数 — key对应 prompt_rules.traps[].id */
  traps: Record<string, number>;
  /** 上下文变量 */
  ctx: Record<string, boolean>;
  /** 对话轮次 */
  round: number;
  /** 完整对话记录 */
  history: HistoryEntry[];
}

/** 反馈模块 — 所有模块统一接口 */
export interface FeedbackModule {
  /** 模块标识，对应 sceneConfig.feedback_modules 中的值 */
  id: string;
  /** 模块标题 */
  title: string;
  /** 模块内容（支持 {变量} 模板，渲染时替换） */
  content: string;
  /** 子条目（行为对照、知识点等列表型模块使用） */
  items?: FeedbackItem[];
}

export interface FeedbackItem {
  label: string;
  status: 'good' | 'bad' | 'skip' | 'info';
  detail: string;
  quote?: string;  // 从history提取的原话
}
