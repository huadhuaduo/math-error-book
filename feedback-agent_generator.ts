/**
 * 反馈引擎 — 统一入口
 *
 * 读 sceneConfig.learning_theory → 加载对应模块组
 * - constructivism → 管理陪练（判词/觉察/行为对照/再来一练/薄弱点/行动计划）
 * - knowledge_reinforcement → 训战陪练（知识点Checklist/薄弱点/老师信号）— P1实现
 * - behaviorism → 业务陪练（话术步骤/遗漏标注/情绪管理）— P2实现
 */

import type { ScenarioCard } from './场景卡数据协议_v2.0';
import type { SessionData, FeedbackModule } from './feedback-agent_types';
import { buildConstructivismModules } from './feedback-agent_constructivism';

export async function generateFeedback(
  sceneConfig: ScenarioCard,
  sessionData: SessionData
): Promise<FeedbackModule[]> {
  switch (sceneConfig.learning_theory) {
    case 'constructivism':
      return buildConstructivismModules(sessionData, sceneConfig);

    case 'knowledge_reinforcement':
      // P1实现：知识点Checklist + 薄弱点明细 + 老师信号
      return [{
        id: 'knowledge_checklist',
        title: '知识点掌握情况',
        content: '训战陪练反馈模块将在P1阶段实现。',
      }];

    case 'behaviorism':
      // P2实现：话术步骤完成率 + 遗漏元素标注
      return [{
        id: 'script_compliance',
        title: '话术合规检查',
        content: '业务陪练反馈模块将在P2阶段实现。',
      }];

    default:
      return [{
        id: 'error',
        title: '未知反馈类型',
        content: `learning_theory "${sceneConfig.learning_theory}" 未注册对应的反馈模块组。`,
      }];
  }
}
