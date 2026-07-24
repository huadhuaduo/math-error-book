// ============================================================
// 场景卡类型定义 · 基于场景卡数据协议 v1.1 (V19.1)
// 用途：三智能体之间传递数据的类型契约
// ============================================================

// ---- Module A: 场景元信息 ----

export type MoraleRoot = '过劳衰竭' | '缺乏意义感' | '缺乏公平感' | '缺乏安全感';
export type PressureMode = '短期冲刺' | '结构转型' | '流程重建' | '收尾维稳';
export type ExperienceMix = '资深为主' | '资浅为主' | '混合两极';
export type IncentiveResource = '丰富' | '有限' | '极度受限';
export type TrustBase = '已有信任' | '需要建立' | '存在裂痕';
export type CrackType = '显性冲突' | '隐性对抗' | null;
export type Difficulty = 'basic' | 'medium' | 'advanced';
export type PStep = 'P₁_沉入一线诊断' | 'P₂_建立信任' | 'P₃_重构目标' | 'P₄_设计激励' | 'P₅_示范赋能' | 'P₆_反馈闭环';
export type TrapType =
  | 'T01-先发制人' | 'T02-激励万能论' | 'T03-信息幻觉' | 'T04-培训替代示范'
  | 'T05-压力替代策略' | 'T06-信任前置谬误' | 'T07-一刀切' | 'T08-跳过诊断'
  | 'T09-责任绑架' | 'T10-惩罚驱动' | 'T11-画饼充饥' | 'T12-单方面推进'
  | 'T13-升级依赖' | 'T14-数据替代对话';

export interface DVector {
  D1_morale_root: MoraleRoot;
  D2_pressure_mode: PressureMode;
  D3_experience_mix: ExperienceMix;
  D4_incentive_resource: IncentiveResource;
  D5_trust_base: TrustBase;
  D5_crack_type: CrackType; // D₅=存在裂痕 时必填，否则 null
}

export interface ScenarioMeta {
  scenario_id: string;
  title: string;
  version: string;
  difficulty: Difficulty;
  estimated_duration_min: number;
  task_domain: string;
  d_vector: DVector;
  p_sequence: string;          // "P₂→P₅(减法)→P₅(打样)+P₂"
  progression_chain: string;   // "信任建立→方向减法→信心打样"
}

// ---- Module B: 情境叙事 ----

export interface LearnerRole {
  identity: string;
  relationship_to_team: string;
  tenure_in_role: string;
}

export interface Situation {
  project_status: string;
  deadline: string;
  metrics: { key_problem: string };
  what_happened_before: string;
}

export interface KeyIndividual {
  name: string;
  role: string;
  tenure: number;
  attitude: string;
  influence: string;
}

export interface TeamState {
  size: number;
  composition?: string;
  tenure_range?: string;
  energy_level: '高' | '中' | '低' | '临界';
  observable_signals: string[];
  unspoken_sentiment: string;
  crack_type: CrackType;
  crack_history: string | null;
  key_individuals: KeyIndividual[];
}

export interface Constraints {
  time_pressure: string;
  resource_limits: string;
  political_sensitivity: string;
}

export interface OpeningScene {
  time: string;
  location: string;
  trigger: string;
  opening_question: string;
}

export interface ScenarioContext {
  learner_role: LearnerRole;
  situation: Situation;
  team_state: TeamState;
  constraints: Constraints;
  opening_scene: OpeningScene;
}

// ---- Module C: 决策点 ----

export interface Consequence {
  immediate: string;
  short_term: string;
  npc_state_after: string;
  next_dp_difficulty_modifier?: string;
}

export interface Option {
  id: 'A' | 'B' | 'C';
  text: string;
  is_best_path: boolean;
  trap_type: TrapType | '无';
  trap_mechanism?: string;
  why_correct?: string;
  why_wrong?: string;
  consequence: Consequence;
  causal_chain: string;
}

export interface DecisionPointTrigger {
  context_cue: string;
  trigger_type: 'narrative' | 'npc_cue' | 'learner_action';
  npc_state_before: string;
  pause_before_reveal: boolean;
  pause_text: string;
}

export interface DecisionPointMeta {
  zone: 0 | 1 | 2 | 3;
  is_critical: boolean;
  progression_from_previous: string;
  prerequisite_dp?: string;
  prerequisite_min_result?: string;
}

export interface DecisionPoint {
  dp_id: string;
  sequence: number;
  p_step: PStep;
  d_tags: string[];
  capability_tag: string;
  capability_definition: string;
  observable_indicator: string;
  trigger: DecisionPointTrigger;
  options: [Option, Option, Option]; // 强制3个
  dp_meta: DecisionPointMeta;
}

// ---- Module D: 反馈标准 ----

export interface ScoringRule {
  score: number;
  comment: string;
}

export interface ScoringDimension {
  dimension_id: string;
  name: string;
  weight: number;
  max_score: number;
  scoring_rules: Record<string, ScoringRule>; // key = "DP1_A", "DP1_B", etc.
}

export interface CrackTypeAwareness {
  applicable: boolean;
  crack_type: CrackType;
  detection_rule?: string | null;
  wrong_strategy_signals?: string[];
  correct_strategy_signals?: string[];
}

export interface FeedbackCriteria {
  golden_path: string[];
  golden_path_narrative: string;
  scoring_dimensions: ScoringDimension[];
  crack_type_awareness: CrackTypeAwareness;
}

// ---- 完整场景卡 ----

export interface ScenarioCard {
  meta: ScenarioMeta;
  context: ScenarioContext;
  decision_points: DecisionPoint[];
  feedback_criteria: FeedbackCriteria;
}

// ---- 运行时数据结构 ----

/** 场景生成智能体的输入参数（传给插件） */
export interface ScenarioGenerateParams {
  d_vector: DVector;
  p_step_range: PStep[];       // 2-4个
  difficulty_level: Difficulty;
  industry_param: string;       // 默认 "地产"
}

/** 单次决策记录 */
export interface DecisionRecord {
  dp_id: string;
  sequence: number;
  selected_option: 'A' | 'B' | 'C';
  is_correct: boolean;
  trap_type: TrapType | '无';
  timestamp: string;            // ISO 8601
}

/** 完整决策路径（存入 coaching_sessions.decision_path） */
export interface DecisionPath {
  scenario_id: string;
  started_at: string;
  completed_at: string;
  decisions: DecisionRecord[];
  golden_path_match_rate: number; // 0-1, 选中最优路径的比例
}

/** 反馈智能体的输入 */
export interface FeedbackInput {
  scenario_card: ScenarioCard;
  decision_path: DecisionPath;
}

/** 反馈三层输出 */
export interface FeedbackOutput {
  layer1_theory: {
    framework: string;
    analysis: string;
  };
  layer2_industry: {
    context: string;
    calibration: string;
  };
  layer3_expert: {
    comparison: Array<{
      dp_id: string;
      learner_choice: string;
      expert_choice: string;
      gap_analysis: string;
    }>;
  };
  dimension_scores: Record<string, number>;
  pattern_observation: string;
}
