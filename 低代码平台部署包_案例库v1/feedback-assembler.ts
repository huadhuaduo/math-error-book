// ============================================================
// 反馈组装函数 · ACT→REVIEW→EVALUATE 三层
// 规则驱动分析 + AI 仅做语言润色
// ============================================================

export interface DecisionRecord {
  dp_id: string; sequence: number; selected_option: 'A' | 'B' | 'C';
  is_correct: boolean; trap_type: string; timestamp: string;
}

export interface ScoringRule { score: number; comment: string; }
export interface ScoringDimension {
  dimension_id: string; name: string; weight: number; max_score: number;
  scoring_rules: Record<string, ScoringRule>;
}

// ---- 陷阱模式库 ----
const TRAP_PATTERNS: Record<string, { label: string; advice: string }> = {
  'T01-先发制人':    { label: '急于立威——在信任建立之前就发号施令',          advice: '下次先做一件让团队觉得"你跟他们是一边"的事。不说话的姿态比任何话都有力。' },
  'T02-激励万能论':  { label: '习惯用钱解决非钱问题',                      advice: '在加钱之前，先问自己：这个问题的根因是什么？如果根因不是钱，加钱只是推迟了问题的暴露。' },
  'T03-信息幻觉':    { label: '以为给更多信息/工具就是赋能',                 advice: '过劳的团队需要的是减法不是加法。下次试着替团队砍掉一个选择，而不是增加一个工具。' },
  'T04-培训替代示范':{ label: '教方法但不亲自证明方法有效',                  advice: '团队需要的不是"怎么做的知识"，而是"有人做成了"的信念。下次先自己打样。' },
  'T05-压力替代策略':{ label: '用紧迫感/威胁替代方法论',                    advice: '团队已经知道时间紧。他们需要你帮他们把"不可能"从潜意识里删掉，不是反复提醒"来不及"。' },
  'T06-信任前置谬误':{ label: '在信任建立之前做深度沟通——得到的都是标准答案', advice: '信任不够时，先用自己的眼睛看。展示你能做什么，再问对方在想什么。' },
  'T07-一刀切':      { label: '对不同的人用同一种方式',                     advice: '老人和新人需要完全不同的沟通策略。分层沟通不是"分别聊"——是完全不同的话术和问题。' },
  'T08-跳过诊断':    { label: '没搞清楚问题就开始解决——方案看起来很忙但其实打偏了', advice: '在你给出任何方案之前，先问自己：我确认了根因吗？还是我只是"觉得"问题是什么？' },
  'T09-责任绑架':    { label: '用责任/资历/情感绑架替代真正激励',            advice: '资深员工不缺责任心。用责任感施压只会让他们觉得被绑架。下次问"你想要什么"而非"你应该做什么"。' },
  'T10-惩罚驱动':    { label: '用惩罚/威胁逼迫行动——对资深团队一定反噬',     advice: '资深团队的尊严比钱值钱。惩罚在他们身上不是"多一个约束"，是"少一份信任"。' },
  'T11-画饼充饥':    { label: '用虚无缥缈的愿景回避真实问题',                advice: '不能兑现的承诺比没有承诺更伤人——因为它让信任从"存在"变成"破灭"。只承诺你个人能做到的事。' },
  'T12-单方面推进':  { label: '跨部门问题只在自己部门内解决——把流程问题变成人际冲突', advice: '跨部门的解在"共同规则"，不在"自己多干"。下次设计一个让两个部门都写在考核里的机制。' },
  'T13-升级依赖':    { label: '遇到问题第一反应找上级——用权威替代制度建设',    advice: '上级的协调只能解决一次。你需要的不是"上面的人"，是"即使换人也能运转的制度"。' },
  'T14-数据替代对话':{ label: '以为定量分析可以替代深度对话——数据告诉"发生了什么"，不告诉"为什么发生"', advice: '在你基于数据做决定之前，去跟那个数据背后的人聊一次。不是问他"你的数据为什么这样"——是问他"你是怎么做的"。' },
};

// ---- ACT 层：记录行为 ----
export function assembleActLayer(decisions: DecisionRecord[]) {
  return decisions.map(d => ({
    dp_id: d.dp_id,
    sequence: d.sequence,
    选择: d.selected_option,
    是否正确: d.is_correct ? '✅' : '❌',
    陷阱类型: d.is_correct ? '无' : d.trap_type,
  }));
}

// ---- REVIEW 层：对照标准 ----
export function assembleReviewLayer(
  decisions: DecisionRecord[],
  scoringDimensions: ScoringDimension[],
) {
  const results: Array<{
    dimension: string;
    score: number;
    max: number;
    percentage: number;
    detail: string;
  }> = [];

  for (const dim of scoringDimensions) {
    let totalScore = 0;
    let count = 0;
    const details: string[] = [];

    for (const [key, rule] of Object.entries(dim.scoring_rules)) {
      // key = "DP1_A", match to decision
      const dpId = key.split('_')[0]; // "DP1"
      const optId = key.split('_')[1]; // "A"
      const decision = decisions.find(d =>
        d.dp_id.includes(dpId) || d.sequence === parseInt(dpId.replace('DP', ''))
      );
      if (decision && decision.selected_option === optId) {
        totalScore += rule.score;
        count++;
        details.push(`${key}: ${rule.score}分 — ${rule.comment}`);
      }
    }

    if (count > 0) {
      const avg = Math.round(totalScore / count);
      results.push({
        dimension: dim.name,
        score: avg,
        max: dim.max_score,
        percentage: Math.round((avg / dim.max_score) * 100),
        detail: details.join('；'),
      });
    }
  }

  return results;
}

// ---- EVALUATE 层：诊断模式 ----
export function assembleEvaluateLayer(decisions: DecisionRecord[]) {
  const traps = decisions.filter(d => !d.is_correct && d.trap_type !== '无');

  // 统计陷阱频率
  const trapCounts: Record<string, number> = {};
  for (const d of traps) {
    trapCounts[d.trap_type] = (trapCounts[d.trap_type] || 0) + 1;
  }

  // 找出最频繁的陷阱
  const sorted = Object.entries(trapCounts).sort((a, b) => b[1] - a[1]);
  const primaryTrap = sorted[0];

  // 生成模式诊断
  let patternObservation = '';
  if (primaryTrap) {
    const pattern = TRAP_PATTERNS[primaryTrap[0]];
    if (pattern) {
      patternObservation = `你的主要管理倾向是：${pattern.label}。在${decisions.length}个决策点中，你在${traps.length}个决策点上落入了管理陷阱，其中"${primaryTrap[0]}"出现了${primaryTrap[1]}次。${pattern.advice}`;
    }
  }

  if (traps.length === 0) {
    patternObservation = '你全部选择了最佳路径——说明你对这类团队处境有清晰的判断。建议下一步尝试更高难度等级的场景，或者换一个完全不同的D向量组合，检验你的能力在不同情境下是否依然稳定。';
  }

  // 所有触发的陷阱详情
  const trapDetails = traps.map(d => {
    const pattern = TRAP_PATTERNS[d.trap_type];
    return {
      dp_id: d.dp_id,
      陷阱: d.trap_type,
      解读: pattern ? pattern.label : d.trap_type,
      改进建议: pattern ? pattern.advice : '',
    };
  });

  return {
    pattern_observation: patternObservation,
    correct_count: decisions.length - traps.length,
    total_count: decisions.length,
    trap_summary: trapCounts,
    trap_details: trapDetails,
  };
}

// ---- 主函数：组装完整反馈 ----
export function assembleFeedback(
  scenarioCard: any,
  decisionPath: { decisions: DecisionRecord[]; golden_path_match_rate: number },
) {
  const decisions = decisionPath.decisions || [];
  const scoringDimensions = scenarioCard.feedback_criteria?.scoring_dimensions || [];

  return {
    // ACT: 行为记录
    act: assembleActLayer(decisions),

    // REVIEW: 标准对照
    review: assembleReviewLayer(decisions, scoringDimensions),

    // EVALUATE: 模式诊断
    evaluate: assembleEvaluateLayer(decisions),

    // 速览
    summary: {
      total: decisions.length,
      correct: decisions.filter(d => d.is_correct).length,
      match_rate: Math.round(decisionPath.golden_path_match_rate * 100),
      golden_path: scenarioCard.feedback_criteria?.golden_path || [],
      golden_path_narrative: scenarioCard.feedback_criteria?.golden_path_narrative || '',
    },

    // 裂痕感知（如果适用）
    crack_awareness: scenarioCard.feedback_criteria?.crack_type_awareness?.applicable
      ? scenarioCard.feedback_criteria.crack_type_awareness
      : null,
  };
}

// ---- AI 润色 Prompt 生成 ----
// 将结构化反馈传给 AI 插件做语言润色，AI 不做分析
export function buildFeedbackPrompt(feedback: ReturnType<typeof assembleFeedback>): string {
  return `你是一个管理教练。以下是对一位管理者在团队激励陪练中的结构化分析数据。请将这些数据转化为一段自然、有人情味的反馈——像一个资深管理教练在跟他面对面复盘。不要用数据味道的语言，不要用编号列表。用人话把"他做了什么、对照标准差在哪、他的管理倾向是什么、下次可以怎么改进"串成一段有温度的对话。

【行为记录】
${JSON.stringify(feedback.act, null, 2)}

【标准对照】
${JSON.stringify(feedback.review, null, 2)}

【模式诊断】
${JSON.stringify(feedback.evaluate, null, 2)}

【速览数据】
正确率：${feedback.summary.correct}/${feedback.summary.total}，路径匹配率：${feedback.summary.match_rate}%

请用自然段落输出，300-500字。不要用任何序号编号或列表格式。`;
}
