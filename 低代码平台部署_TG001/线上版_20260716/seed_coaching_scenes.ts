// 妙搭数据库种子脚本 — coaching_scenes 表全量数据
// 同步日期：2026-07-16 | 来源：妙搭后台 → DB migration/seed
// 共 18 个通用陪练场景 + 4 个 TG 场景（见 tm-scene-config.ts）

// 本文件记录通用场景的 RawScene 类型定义和 RAW_SCENES 数组
// 场景 ID 清单：scene_gt_P4, scene_gt_F4, scene_conflict_001, scene_gt_P3,
//   scene_R2, scene_F1, scene_P1, scene_F2, scene_R1, scene_P2,
//   scene_collab_001, scene_motivation_001, scene_conflict_002,
//   scene_goal_001, scene_gt_breakthrough_02, scene_adv_upward_01,
//   scene_adv_gen_01, scene_adv_res_01, scene_parking_001,
//   scene_pr_001, scene_pr_002

// 完整代码已在妙搭服务器上，本文件为索引记录
// 各场景含：NPC 完整人设（charBackground/charPersonality/charSpeakingStyle）、
//   情境约束（ctxSituation/ctxConflict/ctxGoal/ctxSuccessCriteria）、
//   触发词（positiveTriggerWords/negativeTriggerWords）

// 场景 scene_P1（骨干员工状态下滑反馈）含 4 个 NPC 画像 +
//   L1/L2 双难度 immersiveBrief
// 场景 scene_pr_001（绩效面谈-高绩效者职业迷茫）含 prBrief + feedbackTemplate
// 场景 scene_pr_002（绩效面谈-自评落差大）含 prBrief + immersiveBrief +
//   feedbackTemplate + performanceData + trapWarnings

export type {}; // placeholder — 完整代码以线上妙搭数据库为准
