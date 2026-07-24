# 低代码平台部署包 · 案例库 v1 + 对话规则 + 反馈引擎

> 一键部署后，三个智能体全部可以运转

---

## 文件清单

```
低代码平台部署包_案例库v1/
├── README.md
│
├── controller_seed.ts             ← 追加到 Controller（种子导入端点）
├── detection-rules.ts             ← 🆕 决策点检测规则（放到 client/src/utils/）
├── feedback-assembler.ts          ← 🆕 反馈组装函数（放到 client/src/utils/）
│
├── pages/
│   ├── ScenarioGenerate.tsx       ← 案例库列表 + AI生成
│   ├── ScenarioChat.tsx           ← 对话页（读取场景卡+检测规则+渲染叙事）
│   └── ScenarioFeedback.tsx       ← 反馈页（调用反馈组装函数+AI润色）
│
└── case-library/
    ├── TG-001_首开倒计时.json      ← 含 language_profile（NPC-周）
    ├── TG-002_大户型攻坚.json      ← 含 language_profile（老刘）
    ├── TG-003_数渠重建.json        ← 含 language_profile（NPC-张+小陈）
    └── TG-TEST-A_竣备倒计时.json   ← 含 language_profile（老王+小李）
```

## 部署步骤：6 步，约 10 分钟

### Step 1：工具函数（1 分钟）

把 `detection-rules.ts` 和 `feedback-assembler.ts` 复制到 `client/src/utils/`

### Step 2：页面更新（1 分钟）

把 `pages/` 下的 3 个文件覆盖到 `client/src/pages/`

### Step 3：种子端点（1 分钟）

打开 `server/modules/coaching/coaching.controller.ts`，把 `controller_seed.ts` 的内容追加到已有端点后面。

### Step 4：导入案例库（2 分钟）

在浏览器控制台执行（需要替换 PLACEHOLDER 为实际 JSON 内容）：

```javascript
// 逐个导入4张场景卡（把文件内容复制进来）
const cards = [
  // 从 case-library/TG-001_首开倒计时.json 复制全部内容
  // 从 case-library/TG-002_大户型攻坚.json 复制全部内容
  // 从 case-library/TG-003_数渠重建.json 复制全部内容
  // 从 case-library/TG-TEST-A_竣备倒计时.json 复制全部内容
];

for (const card of cards) {
  await axiosForBackend.post('/api/coaching/seed-scenarios', { scenarios: [card] });
  console.log('✅', card.meta.title);
}
console.log('全部导入完成');
```

### Step 5：路由（1 分钟）

确认已有路由中包含 3 条：

```tsx
<Route path="/scenario/generate" element={<ScenarioGenerate />} />
<Route path="/scenario/:sceneId/chat" element={<ScenarioChat />} />
<Route path="/scenario/:sceneId/feedback" element={<ScenarioFeedback />} />
```

### Step 6：Schema 已有

确认 Step 1-5（数据库/Service/Controller）已完成。如未完成，参考之前的部署记录。

---

## 三个智能体现在的工作方式

### 场景生成智能体
- 案例库 4 张卡（人工编写·高质量）→ 从列表直接选
- AI 生成新场景（支持探索新 D 向量组合，但质量不如人工卡）→ 用于扩展

### 对话智能体
- 读取场景卡的 `context`（角色/局面/团队状态）→ 渲染叙事
- 读取 NPC 的 `language_profile` → 设定 NPC 说话方式
- 读取决策点的 `detection_rules` → 学员对话中检测选择
- 读取 `consequence` + `causal_chain` → 渲染后果

### 反馈智能体
- 调用 `assembleFeedback()` → ACT行为记录 + REVIEW标准对照 + EVALUATE模式诊断
- 调用 `buildFeedbackPrompt()` → 传给 AI 插件做语言润色
- AI 只做润色，不做分析——分析逻辑由规则驱动
