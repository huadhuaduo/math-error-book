# TG001 线上版代码 · 包清单

> 同步日期：2026-07-16
> 来源：低代码平台编辑器 → 复制回本地
> 线上根路径：client/src/pages/TG001/

| # | 文件名 | 行数 | 说明 |
|---|--------|------|------|
| 1 | TG001PreparePage.tsx | ~225 | 准备页（含四维度自评滑块） |
| 2 | TG001EnginePage.tsx | 491 | 对话引擎页（流式AI调用 + 完整UI） |
| 3 | TG001FeedbackPage.tsx | ~230 | 反馈页（六模块Kolb循环） |
| 4 | tg001-feedback-logic.ts | 335 | 反馈计算逻辑（**含T09修复**） |
| 5 | tg001-engine-logic.ts | 319 | 引擎核心（陷阱检测/正面行为/NPC-周System Prompt/fallback） |
| 6 | TG001SidePanel.tsx | ~75 | 对话页侧边栏（聚焦/NPC-周状态/健康度） |
| 7 | app.tsx | ~95 | 全局路由配置（含 /tg001/* 三条路由） |
| 8 | TeamMotivationSection.tsx | ~130 | 陪练列表"团队激励专区"卡片组件 |
| 9 | mdp_coach_ai_conversation_reply_1.json | — | 对话AI插件配置（模板层，角色Prompt在 #5 中） |
| 10 | ai_coach_analysis_report_1.json | — | 反馈复盘分析插件配置（方式A反馈智能体） |
| 11 | scenario_card_smart_generate_v19_1.json | — | **V19.1场景卡生成插件配置——D-P-f全部规则编码于此** |

| 12 | seed_coaching_scenes.ts | — | 通用场景种子数据索引（18个场景） |
| 13 | tm-scene-config.ts | — | TG-001/002/003/004 完整场景卡定义（D-P-f） |
| 14 | seed-tm-scenes.ts | — | 团队激励种子脚本（buildScenarioCard DB写入） |
| 15 | package.json | — | 项目配置（Fullstack NestJS 2.2.4 + AI插件版本） |
| 16 | tsconfig.json | — | TypeScript配置 |

> ⚠️ `ai_coach_analysis_report_1` 的 Prompt 在复制时被截断（`commitment_analysis` 字段后半部分缺失），下次打开低代码平台插件编辑页时补全。
