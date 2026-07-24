// ============================================================
// 路由配置 · 三智能体架构
// 在已有 React Router v6 配置中新增以下路由
// ============================================================

import { Routes, Route } from 'react-router-dom';
import ScenarioGenerate from './pages/ScenarioGenerate';
import ScenarioChat from './pages/ScenarioChat';
import ScenarioFeedback from './pages/ScenarioFeedback';
import ScenarioPreview from './pages/ScenarioPreview';

// ====== 新增路由（追加到已有 <Routes> 中） ======
export const ScenarioRoutes = () => (
  <Routes>
    {/* 场景生成智能体：D向量表单 → 调用AI插件生成场景卡 */}
    <Route path="/scenario/generate" element={<ScenarioGenerate />} />

    {/* 场景预览：只读展示场景卡·验收用 */}
    <Route path="/scenario/:sceneId/preview" element={<ScenarioPreview />} />

    {/* 对话决策智能体：叙事推进 → 决策点 → 收集路径 */}
    <Route path="/scenario/:sceneId/chat" element={<ScenarioChat />} />

    {/* 反馈智能体：读场景卡+决策路径 → 三层输出 */}
    <Route path="/scenario/:sceneId/feedback" element={<ScenarioFeedback />} />
  </Routes>
);

// ====== 数据流串联方式 ======
//
// 场景生成页 → 对话页：
//   navigate(`/scenario/${sceneId}/chat`)
//
// 对话页 → 反馈页：
//   navigate(`/scenario/${sceneId}/feedback?session=${sessionId}`)
//
// 反馈页 → 再练一次：
//   navigate(`/scenario/generate`) 或 navigate(`/scenario/${sceneId}/chat`)
//
// ====== 关键约束 ======
//
// 1. /scenario/:sceneId/chat 必须检查场景卡是否存在（从DB或URL state读取）
//    如果场景卡不存在 → 重定向到 /scenario/generate
//
// 2. /scenario/:sceneId/feedback 必须检查 sessionId 参数和决策路径
//    如果 session 不存在或未完成 → 重定向到 /scenario/:sceneId/chat
//
// 3. 所有页面间数据传递通过：
//    - URL params (:sceneId, ?session=X)
//    - 数据库查询（coaching_scenes, coaching_sessions）
//    - React Router state（轻量数据，如刚生成的场景卡引用）
