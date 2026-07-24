// 团队激励场景卡数据库种子脚本
// 同步日期：2026-07-16 | 来源：妙搭后台 → server/modules/coaching/team-motivation/
// 功能：将 tm-scene-config.ts 中的 TMRawScene 转换为完整的 ScenarioCard JSON 并写入 PostgreSQL

// buildScenarioCard() 是 D-P-f 方法论的工程化桥梁：
//   TMRawScene (4张卡的原始数据) → ScenarioCard (五模块JSON) → coaching_scenes 表
//
// 关键转换：
//   - language_profile + hidden_motivation 从 D1 士气根源自动推导
//   - decision_points.options[].causal_chain 从 causal_explanation 字段映射
//   - golden_path 从所有 is_correct 选项自动聚合
//   - crack_type_awareness 从 D5 信任基础自动检测裂痕场景
//   - scoring_dimensions 三维修正（strategy_fit 0.5 / empathy 0.3 / execution 0.2）
//
// 数据库操作：INSERT ... ON CONFLICT DO UPDATE（幂等种子，可重复执行）
// 表：coaching_scenes（含 scenario_card JSONB 列 + d_vector/p_sequence/progression_chain）

export async function seedTeamMotivationScenes(db: PostgresJsDatabase): Promise<number>;
// 完整代码已在妙搭服务器上，本文件为接口签名 + 逻辑摘要
