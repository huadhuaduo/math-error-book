# 三智能体一键部署包

> 6 个文件放到低代码平台项目 · 5 步操作 · 10 分钟跑通

---

## 文件清单与操作

### 放到 `client/src/pages/`（3 个页面）

| 文件 | 操作 |
|------|------|
| `ScenarioGenerate.tsx` | 拖到 `client/src/pages/` |
| `ScenarioChat.tsx` | 拖到 `client/src/pages/` |
| `ScenarioFeedback.tsx` | 拖到 `client/src/pages/` |

### 放到 `client/src/utils/`（2 个工具）

| 文件 | 操作 |
|------|------|
| `detection-rules.ts` | 拖到 `client/src/utils/` |
| `feedback-assembler.ts` | 拖到 `client/src/utils/` |

### 路由配置（追加到已有路由文件）

打开 `client/src/app.tsx` 或路由配置文件，在 `<Routes>` 中加入：

```tsx
import ScenarioGenerate from './pages/ScenarioGenerate';
import ScenarioChat from './pages/ScenarioChat';
import ScenarioFeedback from './pages/ScenarioFeedback';

<Route path="/scenario/generate" element={<ScenarioGenerate />} />
<Route path="/scenario/:sceneId/chat" element={<ScenarioChat />} />
<Route path="/scenario/:sceneId/feedback" element={<ScenarioFeedback />} />
```

### 后端文件（如果之前没加过）

| 文件 | 操作 |
|------|------|
| `server_coaching.service.ts` | 追加到 `server/modules/coaching/coaching.service.ts` |
| `server_coaching.controller.ts` | 追加到 `server/modules/coaching/coaching.controller.ts` |
| `db_migration.sql` | 数据库执行（加字段） |
| `controller_seed.ts` | 追加到 Controller（种子导入端点） |

---

## 部署后验证

1. 访问 `/scenario/generate` → 看到案例库列表
2. 点 TG-001 → AI NPC-周对话
3. 完成对话 → 跳转反馈报告
4. 再练一次 → 回到案例库

---

## 三智能体协作方式

```
/scenario/generate        场景生成/选择
  ↓ navigate → /scenario/:id/chat
/scenario/:id/chat        AI驱动NPC对话·detection-rules检测决策点
  ↓ navigate → /scenario/:id/feedback?session=X
/scenario/:id/feedback     feedback-assembler组装+AI润色
  ↓ 再练一次 → /scenario/generate
```

**数据传递**：URL params (`:sceneId`, `?session=X`) + PostgreSQL JSONB 字段。不依赖 localStorage。
