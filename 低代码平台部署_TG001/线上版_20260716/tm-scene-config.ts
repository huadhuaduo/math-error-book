// 团队激励任务域 — 场景卡配置（D-P-f 架构）
// 同步日期：2026-07-16 | 来源：妙搭后台 → server/modules/coaching/team-motivation/
// 共 4 张场景卡：TG-001, TG-002, TG-003, TG-004

export interface TMRawScene {
  scenario_id: string;
  title: string;
  based_on_case: string;
  difficulty: string;
  estimated_duration_min: number;
  d_vector: Record<string, string>;
  target_p_nodes: string[];
  preparation: Record<string, string | string[]>;
  conversation_flow: { openingCharacter: string; openingLine: string; totalDecisionPoints: number };
  decision_points: Array<{
    id: string;
    p_node: string;
    trigger_context: string;
    question: string;
    options: Array<{
      id: string;
      text: string;
      is_correct: boolean;
      matched_decision_card?: string;
      missed_p_node?: string;
      consequence: string;
      causal_explanation: string;
    }>;
  }>;
}

// TG-001: 首开倒计时——空降者的20天
//   D向量: 过劳衰竭/短期冲刺/混合/有限/需要建立
//   P节点: P1, P2, P3
//   3个决策点，每点3个选项（含causal_explanation因果链解释）

// TG-002: 大户型攻坚——能力在，意愿呢？
//   D向量: 缺乏意义感/结构转型/资深为主/有限/已有但存在隐性对抗
//   P节点: P3, P4, P1
//   3个决策点，每点3个选项

// TG-003: 线索断了——数渠团队的重建
//   D向量: 缺乏公平感/流程重建/混合两极/有限/存在裂痕
//   P节点: P1, P4, P6
//   3个决策点，每点3个选项

// TG-004: 尾盘清仓——谁在害怕被抛弃？
//   D向量: 缺乏安全感/收尾维稳/资深为主/极度受限/已有但存在裂痕
//   P节点: P2, P3, P5
//   3个决策点，每点3个选项

// 完整 4 张场景卡代码已在妙搭服务器上，本文件为类型定义 + 索引记录
// 每个决策点的 causal_explanation 字段是 D-P-f 方法论的工程化落地
// 每个选项的 consequence 是 NPC 反应的行为锚定输出

export type {}; // placeholder — 完整代码以线上妙搭数据库为准
