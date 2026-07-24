/**
 * 场景卡数据协议 v2.0
 *
 * 设计原则：
 * - 场景卡 JSON 是唯一真相源（Single Source of Truth）
 * - 对话引擎、引导者、反馈引擎的行为全部由本协议字段驱动
 * - 代码只负责"读取配置并执行"，不包含任何场景相关的硬编码
 *
 * 读者角色：
 * - 🗣️ 对话引擎（dialogue-agent/engine.ts）— respond()
 * - 💡 引导者（dialogue-agent/facilitator.ts）— getFacilitatorHints()
 * - 📊 反馈引擎（feedback-agent/generator.ts）— generate()
 * - 🖥️ UI层（DialoguePage.tsx / FeedbackPage.tsx）— 侧边栏、模块组渲染
 *
 * v2.0 新增（相比 v1.0）：
 * - dialogue_mode / learning_theory — 7/18 设计，现在进入协议
 * - prompt_rules — 陷阱、提醒、上下文推进规则，从引擎代码抽出
 * - success_criteria — 成功标准 + 行为对照步骤，驱动反馈引擎
 * - feedback_modules — 反馈模块组声明，UI层按此渲染
 * - knowledge_points（可选）— 训战陪练特有
 * - script_steps（可选）— 业务陪练特有
 */

// ============================================================
// 基础枚举
// ============================================================

/**
 * 对话模式 — 决定引擎的AI调用策略和引导者行为
 * 🗣️ 对话引擎 | 💡 引导者 | 🖥️ UI侧边栏
 */
export type DialogueMode = 'narrative' | 'training' | 'drill';

/**
 * 学习理论 — 决定反馈页的模块组和分析框架
 * 📊 反馈引擎 | 🖥️ 反馈页模块渲染
 */
export type LearningTheory = 'constructivism' | 'knowledge_reinforcement' | 'behaviorism';

// ============================================================
// 回应池
// ============================================================

/** 单条回应变体 */
export interface ResponseVariant {
  /** NPC回应文本 */
  text: string;
  /** 行为锚点标签，关联 success_criteria[].key */
  anchor: string;
}

/**
 * 静态回应池 — AI降级时使用
 * 🗣️ 对话引擎 L3 降级层
 * 结构：回应池[NPC状态][意图分类] = 变体数组
 * 每个 (mood, intent) 组合建议至少 3 变体（管理）/ 5-6 变体（训战）
 */
export interface ResponsePool {
  [npcMood: string]: {
    [intent: string]: ResponseVariant[];
  };
}

// ============================================================
// 提示规则（引导者驱动）
// ============================================================

/**
 * 条件子句 — 结构化表达，替代 JavaScript 表达式字符串
 * 引擎用安全的字段比对替代 eval()
 * 例：[{field:"bizMentioned",expect:true},{field:"strategySet",expect:false}]
 * 等价于: ctx.bizMentioned === true && ctx.strategySet === false
 * 数组内所有子句为 AND 关系
 */
export interface ConditionClause {
  /** 上下文变量名（prompt_rules.context_vars 中定义的 name） */
  field: string;
  /** 期望值：true=变量为真, false=变量为假 */
  expect: boolean;
}

/** 陷阱检测规则 */
export interface TrapRule {
  /** 陷阱ID，如 "T01" */
  id: string;
  /** 陷阱名称，如 "先发制人" */
  name: string;
  /** 正则表达式字符串，匹配用户输入 */
  pattern: string;
  /**
   * 触发条件 — 结构化条件数组
   * 所有子句 AND 关系，空数组 = 无条件触发
   * 🗣️ 对话引擎 detectEvents()
   */
  conditions: ConditionClause[];
  /** 分数影响（负数=扣分） */
  score: number;
  /** 影响的成功标准维度 key */
  dim: string;
  /** 提示文本 */
  msg: string;
}

/** 引导者提示规则 */
export interface WhisperRule {
  id: string;
  /** 正则表达式字符串，匹配用户输入 */
  pattern: string;
  /**
   * 触发条件
   * 💡 引导者 getFacilitatorHints()
   */
  conditions: ConditionClause[];
  /** 提示类型 */
  type: 'info' | 'warn';
  /** 提示文本 */
  msg: string;
  /** 延迟显示（毫秒） */
  delay_ms: number;
}

/** 上下文变量 — 从用户输入中提取 */
export interface ContextVar {
  /** 变量名，如 "bizMentioned" */
  name: string;
  /** 正则表达式字符串，匹配用户输入 */
  pattern: string;
}

/** 自动推进规则 — 防止对话卡死在某个阶段 */
export interface AutoAdvanceRule {
  /** 触发轮次（round >= 此值时检查条件） */
  round: number;
  /**
   * 触发条件 — 同一轮次还需满足的上下文条件
   * 🗣️ 对话引擎
   */
  conditions: ConditionClause[];
  /** 条件满足时自动设置的变量名 */
  set_var: string;
}

/**
 * 提示规则集合
 * 🗣️ 对话引擎 detectEvents() | 💡 引导者 getFacilitatorHints()
 */
export interface PromptRules {
  traps: TrapRule[];
  whispers: WhisperRule[];
  context_vars: ContextVar[];
  auto_advance: AutoAdvanceRule[];
}

// ============================================================
// 成功标准（反馈引擎驱动）
// ============================================================

/** 行为对照步骤 */
export interface BehaviorStep {
  /** 步骤序号 1-4 */
  step: number;
  /** 步骤名称 */
  label: string;
  /**
   * 判定为 good 的条件组合
   * 📊 反馈引擎 getBehaviorSteps()
   * 空数组 = 不可能为 good（仅当其他步骤的条件间接判定）
   */
  good_conditions: ConditionClause[][];
  /**
   * 判定为 bad 的条件组合
   * 每个子数组内部 AND，子数组之间 OR
   */
  bad_conditions: ConditionClause[][];
  /** NPC在good时的反应文本 */
  npc_reaction_good: string;
  /** NPC在bad时的反应文本 */
  npc_reaction_bad: string;
  /** 绩优做法 */
  best_practice: string;
  /** 为什么做对了（good时的解释） */
  why_good: string;
  /** 为什么效果不好（bad时的解释） */
  why_bad: string;
}

/**
 * 成功标准维度
 * 📊 反馈引擎 getScoreDimensions() / getBehaviorSteps()
 */
export interface SuccessCriterion {
  /** 维度 key，如 "trust_building" */
  key: string;
  /** 维度标签，如 "先做事，不说话" — 来自场景卡原始定义，不是代码变量名 */
  label: string;
  /** 绩优基准分 */
  benchmark: number;
  /** 显示颜色 */
  color: string;
  /** MTP或同道人能力锚点标签 */
  mtp_anchor: string;
  /** 行为对照步骤 — 最少1步，典型4步 */
  behavior_steps: BehaviorStep[];
}

// ============================================================
// 模式特有字段（可选）
// ============================================================

/**
 * MTP知识点 — 训战陪练(training)模式使用
 * 💡 引导者 getFacilitatorHints() | 📊 反馈引擎 knowledge-reinforcement 模块
 */
export interface KnowledgePoint {
  /** 知识点ID */
  id: string;
  /** 知识点标签 */
  label: string;
  /** MTP模块 */
  mtp_module: string;
  /** MTP锚点编号，如 "MTP3·8" */
  mtp_anchor: string;
  /** 正则 — 检测学员是否在对话中应用了该知识点 */
  trigger_pattern: string;
}

/**
 * 话术步骤 — 业务陪练(drill)模式使用
 * 💡 引导者 | 📊 反馈引擎 behaviorism 模块
 */
export interface ScriptStep {
  /** 步骤序号 */
  step: number;
  /** 步骤名称 */
  name: string;
  /** 该步骤必须包含的话术元素 */
  required_elements: string[];
  /** 标准话术文本 */
  standard_script: string;
}

// ============================================================
// 场景卡主接口
// ============================================================

export interface ScenarioCard {
  // === 基础信息（必填）===
  /** 场景ID，如 "TG-001" */
  scene_id: string;
  /** 场景名称 */
  scene_name: string;
  /** NPC名称 */
  npc_name: string;
  /** NPC角色描述 */
  npc_role: string;
  /** 场景描述（面向学员） */
  description: string;

  // === 模式定义（必填）===
  /**
   * 对话模式
   * 🗣️ 对话引擎 — 决定AI调用策略
   * 💡 引导者 — 决定介入方式
   * 🖥️ UI — 决定侧边栏组件
   */
  dialogue_mode: DialogueMode;
  /**
   * 学习理论
   * 📊 反馈引擎 — 决定反馈框架和模块组
   */
  learning_theory: LearningTheory;

  // === 引擎驱动配置（必填）===
  /**
   * AI NPC角色定义（System Prompt）
   * 🗣️ 对话引擎 L2 层 — 传入AI插件
   */
  system_prompt: string;
  /**
   * 静态回应池
   * 🗣️ 对话引擎 L3 降级层
   * narrative模式：3-4变体/意图
   * training模式：5-6变体/意图
   */
  response_pool: ResponsePool;
  /**
   * 提示规则
   * 🗣️ 对话引擎 detectEvents() | 💡 引导者 getFacilitatorHints()
   */
  prompt_rules: PromptRules;

  // === 成功标准（必填）===
  /**
   * 成功标准维度（1-N个）
   * 标签必须来自场景卡原始定义，不是代码变量名
   * 📊 反馈引擎 — getScoreDimensions() / getBehaviorSteps() / getVerdict()
   */
  success_criteria: SuccessCriterion[];

  // === 反馈模块组（必填）===
  /**
   * 反馈模块列表 — 声明顺序即渲染顺序
   * 📊 反馈引擎 generate() | 🖥️ 反馈页模块渲染
   *
   * 管理陪练(constructivism):
   *   ["verdict", "awareness", "behavior_steps", "next_practice", "knowledge_gaps", "action_plan"]
   * 训战陪练(knowledge_reinforcement):
   *   ["knowledge_checklist", "weak_points", "teacher_signal", "next_practice"]
   * 业务陪练(behaviorism):
   *   ["script_compliance", "step_accuracy", "objection_handling", "next_drill"]
   */
  feedback_modules: string[];

  // === 模式特有字段（可选）===
  /**
   * MTP知识点列表 — training模式使用
   * 💡 引导者知识提示 | 📊 knowledge-reinforcement 反馈模块
   * 默认值：undefined（narrative/drill模式忽略）
   */
  knowledge_points?: KnowledgePoint[];
  /**
   * 话术步骤 — drill模式使用
   * 💡 引导者话术对比 | 📊 behaviorism 反馈模块
   * 默认值：undefined（narrative/training模式忽略）
   */
  script_steps?: ScriptStep[];

  // === 元数据 ===
  /** 场景标签（难度、模块、条线等） */
  tags?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    module?: string;
    prof_line?: string;
  };
}
