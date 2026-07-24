# 三智能体架构 · 集成步骤

> 按项目实际技术栈重写：NestJS + React + Tailwind + Drizzle ORM

---

## 文件清单与操作

### 1. 数据库迁移

文件：`db_migration.sql`
操作：在数据库管理工具中执行。只加字段，不改已有表结构。

### 2. 后端代码

| 文件 | 操作 |
|------|------|
| `server_coaching.service.ts` | 把新增方法追加到 `server/modules/coaching/coaching.service.ts` 的 CoachingService 类中 |
| `server_coaching.controller.ts` | 把新增端点追加到 `server/modules/coaching/coaching.controller.ts` 的 CoachingController 类中 |

注意：Service 文件中的 `import` 语句可能需要调整路径以匹配项目实际的导入规范。已有方法（getAllScenes、createSession 等）保持不变。

### 3. 前端页面

| 文件 | 放到哪里 |
|------|---------|
| `client_ScenarioGenerate.tsx` | `client/src/pages/ScenarioGenerate.tsx` |
| `client_ScenarioChat.tsx` | `client/src/pages/ScenarioChat.tsx` |
| `client_ScenarioFeedback.tsx` | `client/src/pages/ScenarioFeedback.tsx` |

### 4. 路由配置

在已有 React Router 配置中新增：

```tsx
import ScenarioGenerate from './pages/ScenarioGenerate';
import ScenarioChat from './pages/ScenarioChat';
import ScenarioFeedback from './pages/ScenarioFeedback';

// 在 <Routes> 中追加：
<Route path="/scenario/generate" element={<ScenarioGenerate />} />
<Route path="/scenario/:sceneId/chat" element={<ScenarioChat />} />
<Route path="/scenario/:sceneId/feedback" element={<ScenarioFeedback />} />
```

### 5. 类型定义（可选）

已有的 `client/src/types/` 目录下如果没有 scenario-card 类型，可以从 `01_类型定义.ts` 复制核心接口。如果页面中已内联类型定义，可以不单独创建。

---

## 数据流

```
/scenario/generate
  ↓ 选 D 向量 → 调插件 scenario_card_smart_generate_v19_1
  ↓ POST /api/coaching/scenario-cards（存场景卡）
  ↓ navigate(/scenario/:id/chat)
  
/scenario/:id/chat
  ↓ GET /api/coaching/scenario-cards/:id（读场景卡）
  ↓ POST /api/coaching/sessions/with-decision-path（创建会话）
  ↓ 叙事 → 决策点 → 收集选择
  ↓ PATCH /api/coaching/sessions/:id/decision-path（存决策路径）
  ↓ navigate(/scenario/:id/feedback?session=X)
  
/scenario/:id/feedback
  ↓ 并行 GET 场景卡 + 会话决策路径
  ↓ 调插件 ai_coach_analysis_report_1
  ↓ 渲染三层报告
  ↓ [再练一次] 或 [生成新场景]
```

---

## 需要确认

- [ ] `scenario_card_smart_generate_v19_1` 插件是否已部署
- [ ] `coachingScenes` 和 `coachingSessions` 表的 Drizzle schema 文件路径，以便在 Service 中正确 import
- [ ] `DRIZZLE_DATABASE` 的注入方式与项目实际一致（当前用的是 `@Inject(DRIZZLE_DATABASE)`）
- [ ] `@NeedLogin()` 装饰器的路径是否正确
