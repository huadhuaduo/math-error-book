# 低代码平台搭建 Prompt · 从 0 到 1

> 将此 Prompt 粘贴到低代码平台 AI 对话中，让它帮你一步步搭建三智能体架构。
> 每次说"继续下一步"即可推进。

---

我要在低代码平台上从零搭建一个 AI 管理陪练平台的三智能体架构。请严格按以下步骤执行，每步完成后等我确认再继续。

## 项目背景

- 技术栈：React + TypeScript + React Router v6 + PostgreSQL + Drizzle ORM
- AI 调用方式：`capabilityClient.load('插件名').call('textGenerate', { system_prompt, user_message_history })`
- 已有数据库表：`coaching_scenes`（有 scenarioContext 和 aiCharacter JSONB 字段）、`coaching_sessions`（有 messages 和 principlesScores JSONB 字段）
- 已有 AI 插件：`scenario_card_smart_generate_v19_1`（场景生成）、`mdp_coach_ai_conversation_reply_1`（对话）、`ai_coach_analysis_report_1`（反馈分析）
- 新代码放在 `src/` 下，路由追加到已有路由配置
- 旧代码不删不改不迁移

---

## Step 1：创建类型定义文件

创建 `src/types/scenario-card.ts`，内容如下：

```typescript
// 场景卡类型定义 · 基于场景卡数据协议 v1.1

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
  D5_crack_type: CrackType;
}

export interface ScenarioMeta {
  scenario_id: string; title: string; version: string;
  difficulty: Difficulty; estimated_duration_min: number;
  task_domain: string; d_vector: DVector;
  p_sequence: string; progression_chain: string;
}

export interface LearnerRole { identity: string; relationship_to_team: string; tenure_in_role: string; }
export interface Situation { project_status: string; deadline: string; metrics: { key_problem: string }; what_happened_before: string; }
export interface KeyIndividual { name: string; role: string; tenure: number; attitude: string; influence: string; }
export interface TeamState {
  size: number; energy_level: '高' | '中' | '低' | '临界';
  observable_signals: string[]; unspoken_sentiment: string;
  crack_type: CrackType; crack_history: string | null; key_individuals: KeyIndividual[];
}
export interface Constraints { time_pressure: string; resource_limits: string; political_sensitivity: string; }
export interface OpeningScene { time: string; location: string; trigger: string; opening_question: string; }
export interface ScenarioContext {
  learner_role: LearnerRole; situation: Situation; team_state: TeamState;
  constraints: Constraints; opening_scene: OpeningScene;
}

export interface Consequence { immediate: string; short_term: string; npc_state_after: string; }
export interface Option {
  id: 'A' | 'B' | 'C'; text: string; is_best_path: boolean;
  trap_type: TrapType | '无'; trap_mechanism?: string;
  why_correct?: string; why_wrong?: string;
  consequence: Consequence; causal_chain: string;
}
export interface DecisionPointTrigger {
  context_cue: string; trigger_type: 'narrative' | 'npc_cue';
  npc_state_before: string; pause_before_reveal: boolean; pause_text: string;
}
export interface DecisionPoint {
  dp_id: string; sequence: number; p_step: PStep; d_tags: string[];
  capability_tag: string; capability_definition: string; observable_indicator: string;
  trigger: DecisionPointTrigger; options: [Option, Option, Option];
  dp_meta: { zone: number; is_critical: boolean; progression_from_previous: string; };
}

export interface ScoringDimension {
  dimension_id: string; name: string; weight: number;
  max_score: number; scoring_rules: Record<string, { score: number; comment: string }>;
}
export interface CrackTypeAwareness {
  applicable: boolean; crack_type: CrackType;
  detection_rule?: string | null;
  wrong_strategy_signals?: string[]; correct_strategy_signals?: string[];
}
export interface FeedbackCriteria {
  golden_path: string[]; golden_path_narrative: string;
  scoring_dimensions: ScoringDimension[]; crack_type_awareness: CrackTypeAwareness;
}

export interface ScenarioCard {
  meta: ScenarioMeta; context: ScenarioContext;
  decision_points: DecisionPoint[]; feedback_criteria: FeedbackCriteria;
}

export interface DecisionRecord {
  dp_id: string; sequence: number; selected_option: 'A' | 'B' | 'C';
  is_correct: boolean; trap_type: TrapType | '无'; timestamp: string;
}
export interface DecisionPath {
  scenario_id: string; started_at: string; completed_at: string;
  decisions: DecisionRecord[]; golden_path_match_rate: number;
}
```

完成后告诉我。

---

## Step 2：数据库迁移

在已有数据库上执行以下 SQL（只加字段，不改已有结构）：

```sql
ALTER TABLE coaching_scenes
  ADD COLUMN IF NOT EXISTS scenario_card JSONB,
  ADD COLUMN IF NOT EXISTS d_vector JSONB,
  ADD COLUMN IF NOT EXISTS p_sequence TEXT,
  ADD COLUMN IF NOT EXISTS progression_chain TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS decision_path JSONB,
  ADD COLUMN IF NOT EXISTS scenario_id TEXT,
  ADD COLUMN IF NOT EXISTS golden_path_match_rate REAL;
```

告诉我执行结果。

---

## Step 3：确认 API 路由

请帮我检查项目中是否已有以下 API 路由，如果有，告诉我它们的路径和用法；如果没有，帮我创建：

1. `POST /api/coaching-scenes` — 创建场景（接收 scenario_card JSONB、d_vector JSONB、p_sequence TEXT）
2. `GET /api/coaching-scenes/:id` — 读取场景（返回包含 scenario_card 字段的完整记录）
3. `POST /api/coaching-sessions` — 创建会话（接收 scenario_id TEXT、decision_path JSONB）
4. `PATCH /api/coaching-sessions/:id` — 更新会话的 decision_path 字段
5. `GET /api/coaching-sessions/:id` — 读取会话（返回包含 decision_path 字段的完整记录）

完成后告诉我。

---

## Step 4：创建场景生成页面

创建 `src/pages/ScenarioGenerate.tsx`。

这个页面的功能：
- 路由：`/scenario/generate`
- 表单收集 D 向量参数（5 个下拉 + 裂痕类型条件显示 + P 步骤多选 + 难度等级）
- 点击"生成场景卡"→ 调用 `capabilityClient.load('scenario_card_smart_generate_v19_1').call('textGenerate', {...})`
- 解析返回的 JSON → 存入 coaching_scenes 表 → `navigate(/scenario/${sceneId}/chat)`

D 向量选项：
- D₁ 士气根源：过劳衰竭 / 缺乏意义感 / 缺乏公平感 / 缺乏安全感
- D₂ 压力模式：短期冲刺 / 结构转型 / 流程重建 / 收尾维稳
- D₃ 经验构成：资深为主 / 资浅为主 / 混合两极
- D₄ 激励资源：丰富 / 有限 / 极度受限
- D₅ 信任基础：已有信任 / 需要建立 / 存在裂痕
- D₅裂痕类型（仅 D₅=存在裂痕 时显示）：显性冲突 / 隐性对抗
- P 步骤：多选 2-4 个（P₁诊断 P₂信任 P₃目标 P₄激励 P₅赋能 P₆闭环）
- 难度：basic / medium / advanced

插件调用参数格式：
```typescript
await capabilityClient.load('scenario_card_smart_generate_v19_1').call('textGenerate', {
  system_prompt: '', // 插件内部维护
  user_message_history: JSON.stringify({
    d_vector: dVector,
    p_step_range: pSteps,
    difficulty_level: difficulty,
    industry_param: '地产',
  }),
});
```

UI 要求：
- 简洁干净的移动端友好布局
- 每个 D 维度用单选按钮组
- P 步骤用可选择标签
- 底部一个"生成场景卡"按钮
- 生成中显示 loading 状态
- 错误时显示红色错误信息

完成后告诉我。

---

## Step 5：创建对话决策页面

创建 `src/pages/ScenarioChat.tsx`。

这个页面的功能：
- 路由：`/scenario/:sceneId/chat`
- 从 DB 加载场景卡（通过 sceneId）
- 状态机：loading → narrative → decision → consequence → transition → complete
- 叙事阶段：显示当前决策点的 pause_text 和 capability_definition
- 决策阶段：显示 3 个选项按钮（A/B/C），学员选择
- 后果阶段：显示选择的后果（immediate + short_term + 因果链），绿色=正确，红色=错误+陷阱类型
- 全部决策点完成 → 存储 decision_path 到 coaching_sessions → navigate(`/scenario/${sceneId}/feedback?session=${sessionId}`)

数据结构：
```typescript
const decisionPath = {
  scenario_id: sceneId,
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  decisions: [
    { dp_id, sequence, selected_option, is_correct, trap_type, timestamp }
  ],
  golden_path_match_rate: correctCount / totalCount,
};
```

UI 要求：
- 顶部进度条（决策点 1/3）
- 叙事阶段：灰色背景卡片 + "进入决策"按钮
- 决策阶段：3 个白色选项卡片，hover 时边框变深色
- 后果阶段：绿色/红色左边框卡片 + 因果链引用 + "继续"按钮
- 全部完成后自动跳转

完成后告诉我。

---

## Step 6：创建反馈页面

创建 `src/pages/ScenarioFeedback.tsx`。

这个页面的功能：
- 路由：`/scenario/:sceneId/feedback?session=X`
- 并行加载场景卡 + 决策路径（Promise.all）
- 调用 `capabilityClient.load('ai_coach_analysis_report_1').call('textGenerate', {...})`
- 渲染三层输出：
  - 理论透镜：用管理理论解释学员的决策逻辑
  - 行业校准：在地产行业的约束下评估决策
  - 专家做法：逐决策点对比学员 vs 专家路径
- 渲染能力维度评分（进度条）
- 渲染决策模式觉察（如果插件返回了 pattern_observation）
- 底部按钮：再练一次同一场景 / 生成新场景

反馈插件调用参数：
```typescript
await capabilityClient.load('ai_coach_analysis_report_1').call('textGenerate', {
  scene_info: JSON.stringify(scenarioCard),
  conversation_list: JSON.stringify(decisionPath.decisions),
  analysis_requirements: JSON.stringify({
    layers: ['theory', 'industry', 'expert'],
    dimensions: scoringDimensions.map(d => d.name),
    golden_path: feedbackCriteria.golden_path,
  }),
});
```

UI 要求：
- 顶部：场景标题 + 日期
- 速览卡片：正确数/总数 + 路径匹配率 + 陷阱触发次数
- 三层输出各一个白色卡片，左边框不同颜色（蓝/橙/绿）
- 能力维度评分：每个维度一条进度条（>=70绿，>=40橙，<40红）
- 底部两个按钮并排

完成后告诉我。

---

## Step 7：添加路由

在已有 React Router v6 配置中新增以下 4 条路由：

```tsx
<Route path="/scenario/generate" element={<ScenarioGenerate />} />
<Route path="/scenario/:sceneId/chat" element={<ScenarioChat />} />
<Route path="/scenario/:sceneId/feedback" element={<ScenarioFeedback />} />
<Route path="/scenario/:sceneId/preview" element={<ScenarioPreview />} />
```

ScenarioPreview 是一个简单的只读页面——从 DB 读取场景卡并用卡片展示（不需要 AI 调用）。先做一个简化版：
- 显示 meta（标题/D向量/P序列/递进链）
- 显示 context（角色/局面/团队状态/约束）
- 显示所有决策点（选项+陷阱+因果链）
- 显示反馈标准

完成后告诉我。

---

## Step 8：验证完整链路

帮我确认以下流程可以跑通：

1. 访问 `/scenario/generate` → 选择 D 向量参数 → 点击"生成场景卡"
2. 自动跳转到 `/scenario/:id/chat` → 看到叙事文本 → 点击"进入决策"
3. 看到 3 个选项 → 选择一个 → 看到后果揭示
4. 继续下一个决策点 → 全部完成后自动跳转反馈页
5. 反馈页显示三层输出 + 能力评分

如果任何一步有问题，帮我修复。全部通过后告诉我。

---

以上 8 步完成后，三智能体架构就在低代码平台上跑起来了。旧代码不动，新的从 `/scenario/generate` 开始。
