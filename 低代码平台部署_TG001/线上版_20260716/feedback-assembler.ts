// feedback-assembler.ts — 通用版（对标 TG001 反馈六模块）
// 放置位置：client/src/utils/feedback-assembler.ts（替换原文件）
// 场景卡 JSON 五模块协议是唯一数据源，不硬编码任何场景特定内容
// 不暴露 D/P/T 编码到用户可见文本
// @version 2026-07-16 v2

/* ============ 类型 ============ */
export interface DecisionRecord {
  dp_id: string; sequence: number; selected_option: string;
  is_correct: boolean; trap_type: string; timestamp: string;
}
export interface ScoringRule { score: number; comment: string; }
export interface ScoringDimension {
  dimension_id: string; name: string; weight: number; max_score: number;
  scoring_rules: Record<string, ScoringRule>;
}

/* ============ 陷阱模式库 ============ */
const TRAP_PATTERNS: Record<string, { label: string; advice: string }> = {
  'T01-先发制人':{ label:'急于立威——在信任建立之前就发号施令', advice:'下次先做一件让团队觉得"你跟他们是一边"的事。不说话的姿态比任何话都有力。' },
  'T03-信息幻觉':{ label:'以为给更多信息/工具就是赋能', advice:'过劳的团队需要的是减法不是加法。下次试着替团队砍掉一个选择，而不是增加一个工具。' },
  'T04-培训替代示范':{ label:'教方法但不亲自证明方法有效', advice:'团队需要的不是"怎么做的知识"，而是"有人做成了"的信念。下次先自己打样。' },
  'T05-压力替代策略':{ label:'用紧迫感/威胁替代方法论', advice:'团队已经知道时间紧。他们需要你帮他们把"不可能"从潜意识里删掉，不是反复提醒"来不及"。' },
  'T06-信任前置谬误':{ label:'在信任建立之前做深度沟通——得到的都是标准答案', advice:'信任不够时，先用自己的眼睛看。展示你能做什么，再问对方在想什么。' },
  'T08-跳过诊断':{ label:'没搞清楚问题就开始解决——方案看起来很忙但其实打偏了', advice:'在你给出任何方案之前，先问自己：我确认了根因吗？还是我只是"觉得"问题是什么？' },
  'T09-施压威胁':{ label:'用压力和问责推动执行', advice:'压力在短期内可能让团队表面服从，但对资深团队来说，施压等于宣告"我不信任你们的能力"。' },
  'T10-惩罚驱动':{ label:'用惩罚/威胁逼迫行动——对资深团队一定反噬', advice:'资深团队的尊严比钱值钱。惩罚在他们身上不是"多一个约束"，是"少一份信任"。' },
  '策略偏差':{ label:'策略选择偏离了最佳路径', advice:'下次尝试先诊断再给方案——顺序对了，效果完全不同。' },
};

/* ==================================================================
   模块 0：原三层（ACT → REVIEW → EVALUATE）——保留并补全
   ================================================================== */

/** ACT 层：记录行为 */
export function assembleActLayer(decisions: DecisionRecord[]) {
  return decisions.map(d => ({
    dp_id: d.dp_id, sequence: d.sequence,
    选择: d.selected_option,
    是否正确: d.is_correct ? '✅' : '❌',
    陷阱类型: d.is_correct ? '无' : d.trap_type,
  }));
}

/** REVIEW 层：对照评分标准 */
export function assembleReviewLayer(
  decisions: DecisionRecord[],
  scoringDimensions: ScoringDimension[],
) {
  if (decisions.length === 0 || scoringDimensions.length === 0) return [];

  const correctCount = decisions.filter(d => d.is_correct).length;
  const correctRate = correctCount / Math.max(1, decisions.length);

  // 优先使用 scoring_rules 中的逐项评分（每个 DP 独立打分）
  const hasDpKeys = scoringDimensions.some(dim =>
    Object.keys(dim.scoring_rules || {}).some(k => k.includes('_'))
  );

  if (hasDpKeys) {
    const results: Array<{ dimension: string; score: number; max: number; percentage: number; detail: string }> = [];
    for (const dim of scoringDimensions) {
      let totalScore = 0; let count = 0;
      const details: string[] = [];
      for (const [key, rule] of Object.entries(dim.scoring_rules || {})) {
        const decision = decisions.find(d => d.dp_id === key || d.sequence === parseInt(key.replace(/\D/g, '')));
        if (decision) {
          const matchingRule = dim.scoring_rules[`${key}_${decision.selected_option}`]
            || dim.scoring_rules[`${decision.dp_id}_${decision.selected_option}`]
            || rule;
          totalScore += typeof matchingRule === 'object' ? (matchingRule as ScoringRule).score : (rule as ScoringRule).score;
          count++;
          const r = typeof matchingRule === 'object' ? matchingRule as ScoringRule : rule as ScoringRule;
          details.push(`${key}: ${r.score}分 — ${r.comment}`);
        }
      }
      if (count > 0) {
        const avg = Math.round(totalScore / count);
        results.push({
          dimension: dim.name, score: avg, max: dim.max_score || 100,
          percentage: Math.round((avg / (dim.max_score || 100)) * 100),
          detail: details.join('；'),
        });
      }
    }
    if (results.length > 0) return results;
  }

  // fallback：基于整体正确率的简化评分
  return scoringDimensions.map(dim => {
    const rules = dim.scoring_rules || {};
    const excellent = (rules.excellent || rules.good || { score: 80 }) as ScoringRule;
    const good = (rules.good || { score: 60 }) as ScoringRule;
    const poor = (rules.poor || { score: 30 }) as ScoringRule;
    let score: number;
    if (correctRate >= 0.8) score = excellent.score;
    else if (correctRate >= 0.5) score = good.score;
    else score = poor.score;
    const adjustedScore = Math.round(score * (0.8 + correctRate * 0.4));
    return {
      dimension: dim.name, score: adjustedScore, max: 100,
      percentage: adjustedScore,
      detail: `${correctCount}/${decisions.length}个决策点正确`,
    };
  });
}

/** EVALUATE 层：诊断管理模式 */
export function assembleEvaluateLayer(decisions: DecisionRecord[]) {
  const traps = decisions.filter(d => !d.is_correct && d.trap_type !== '无');
  const trapCounts: Record<string, number> = {};
  for (const d of traps) trapCounts[d.trap_type] = (trapCounts[d.trap_type] || 0) + 1;
  const sorted = Object.entries(trapCounts).sort((a, b) => b[1] - a[1]);
  const primaryTrap = sorted[0];
  let patternObservation = '';
  if (primaryTrap) {
    const pattern = TRAP_PATTERNS[primaryTrap[0]];
    if (pattern) patternObservation = `你的主要管理倾向是：${pattern.label}。在${decisions.length}个决策点中，你在${traps.length}个上落入了管理陷阱，其中"${primaryTrap[0]}"出现了${primaryTrap[1]}次。${pattern.advice}`;
  }
  if (traps.length === 0) patternObservation = '你全部选择了最佳路径——说明你对这类团队处境有清晰的判断。建议下一步尝试更高难度等级的场景。';
  return {
    pattern_observation: patternObservation,
    correct_count: decisions.length - traps.length,
    total_count: decisions.length,
    trap_summary: trapCounts,
    trap_details: traps.map(d => {
      const p = TRAP_PATTERNS[d.trap_type];
      return { dp_id: d.dp_id, 陷阱: d.trap_type, 解读: p ? p.label : d.trap_type, 改进建议: p ? p.advice : '' };
    }),
  };
}

/* ==================================================================
   模块 1：关键时刻原话 + 核心判词
   ================================================================== */

export interface KeyMoment { quote: string; context: string; }
export function getKeyMoment(
  messages: Array<{ role: string; content: string }>,
  decisions: DecisionRecord[],
  npcName: string,
): KeyMoment {
  const npcMsgs = messages.filter(m => m.role === 'npc' || m.role === 'assistant');
  for (let i = npcMsgs.length - 1; i >= 0; i--) {
    const m = npcMsgs[i].content.match(/[""「」]([^""「」]{8,50})[""「」]/);
    if (m) return { quote: m[1], context: `${npcName}在第${i + 1}轮对话时说了这句话。` };
  }
  const wrongDecisions = decisions.filter(d => !d.is_correct);
  if (wrongDecisions.length > 0) {
    const p = TRAP_PATTERNS[wrongDecisions[0].trap_type];
    return { quote: p ? p.label : '策略出现了偏差', context: '关键决策点上的选择——这是最有价值的反馈信号。' };
  }
  return { quote: '你全部选择了最佳路径', context: '这场对话展现了稳定的判断力。' };
}

export function getVerdict(decisions: DecisionRecord[]): string {
  if (decisions.length === 0) return '本次对话未记录决策点——完成决策选择后将获得个性化判词。';
  const correctRate = decisions.filter(d => d.is_correct).length / decisions.length;
  const trapTypes = [...new Set(decisions.filter(d => !d.is_correct).map(d => d.trap_type))];
  if (correctRate === 1) return '你全部命中了最佳路径——对这类团队处境你有清晰的判断和稳定的决策质量。';
  if (correctRate >= 0.67) return `你在${decisions.length}个决策点中对了${decisions.filter(d => d.is_correct).length}个。方向是对的——${trapTypes.length === 1 ? `可以特别留意"${trapTypes[0]}"这个模式` : '有几个决策点上可以换一种思路'}。`;
  if (correctRate >= 0.33) return `你的决策中有亮点，但${trapTypes.length > 0 ? `"${trapTypes[0]}"这个倾向值得关注` : '策略匹配度还有提升空间'}。不是能力问题——是策略选择的问题。`;
  return '你在大部分决策点上选择了非最优路径。这不是坏事——它清晰地暴露了你的默认管理策略，而这正是陪练的价值。';
}

/* ==================================================================
   模块 2：管理惯性觉察
   ================================================================== */

export interface InertiaResult { title: string; evidence: string; analysis: string; }
export function getManagementInertia(decisions: DecisionRecord[]): InertiaResult {
  const traps = decisions.filter(d => !d.is_correct && d.trap_type !== '无');
  if (traps.length === 0) {
    return {
      title: '你在压力下保持了策略定力',
      evidence: `${decisions.length}个决策点全部选择了最佳路径——在模拟的高压情境中，你没有掉入预设的管理陷阱。`,
      analysis: '这说明你对这类团队处境有较好的直觉判断。下一步可以挑战更高难度等级，或者换一个完全不同的 D 向量组合——检验你的能力在不同情境下是否依然稳定。',
    };
  }
  const counts: Record<string, number> = {};
  for (const t of traps) counts[t.trap_type] = (counts[t.trap_type] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const pattern = TRAP_PATTERNS[top[0]] || { label: top[0], advice: '' };
  const trapLabels = traps.map(t => TRAP_PATTERNS[t.trap_type]?.label || t.trap_type);
  const uniqueLabels = [...new Set(trapLabels)];
  return {
    title: `面对团队困境时，你的默认策略——${pattern.label}`,
    evidence: `${uniqueLabels.slice(0, 3).join('；')}——在${decisions.length}个决策点中，你在${traps.length}个点上落入了管理陷阱。${top[1] >= 2 ? `"${top[0]}"出现了${top[1]}次——这不是偶然，是惯性。` : ''}`,
    analysis: pattern.advice || '管理惯性不是能力问题——是你在压力下的默认反应。觉察到它，就已经走了一半的路。',
  };
}

/* ==================================================================
   模块 3：行为对照（按决策点顺序逐项对比）
   ================================================================== */

export interface BehaviorStep {
  step: number; status: 'good' | 'bad' | 'skip';
  tag: string; tagColor: 'g' | 'r' | 'n';
  label: string; npcReaction: string;
  bestPractice: string; whyExplanation: string;
}
export function getBehaviorSteps(
  decisions: DecisionRecord[],
  sceneCard: any,
): BehaviorStep[] {
  const dPoints: any[] = sceneCard?.decision_points || [];
  return dPoints.map((dp: any, i: number) => {
    // 按 dp_id 匹配决策记录
    const decision = decisions.find((d: DecisionRecord) => d.dp_id === dp.dp_id) || decisions[i];
    const opts: any[] = dp.options || [];
    const bestOpt = opts.find((o: any) => o.is_best_path);
    const opted = decision ? opts.find((o: any) => o.id === decision.selected_option) : null;

    if (!decision) {
      return {
        step: i + 1, status: 'skip' as const, tag: '未选择', tagColor: 'n' as const,
        label: dp.trigger?.pause_text || dp.p_step || `决策点 ${i + 1}`,
        npcReaction: '你没有在这个决策点上做出选择。',
        bestPractice: bestOpt?.text || '',
        whyExplanation: bestOpt?.causal_explanation || '',
      };
    }

    return {
      step: i + 1,
      status: decision.is_correct ? 'good' as const : 'bad' as const,
      tag: decision.is_correct ? '达标' : (decision.trap_type === '无' ? '策略偏差' : decision.trap_type),
      tagColor: decision.is_correct ? 'g' as const : 'r' as const,
      label: opted?.text || decision.selected_option,
      npcReaction: opted?.consequence?.immediate || opted?.consequence?.npc_state_after || '',
      bestPractice: bestOpt?.text || '',
      whyExplanation: decision.is_correct
        ? (opted?.causal_explanation || '你选择了最佳路径。')
        : (opted?.causal_explanation || bestOpt?.causal_explanation || ''),
    };
  });
}

/* ==================================================================
   模块 4：知识薄弱点
   ================================================================== */

export interface KnowledgeGap { level: 'need' | 'consolidate' | 'mastered'; label: string; desc: string; }
export function getKnowledgeGaps(
  scoringDimensions: ScoringDimension[],
  decisions: DecisionRecord[],
): KnowledgeGap[] {
  if (scoringDimensions.length === 0) return [];
  const correctRate = decisions.length > 0 ? decisions.filter(d => d.is_correct).length / decisions.length : 0;
  const score = Math.round(correctRate * 100);
  return scoringDimensions.map(dim => {
    if (score < 50) return { level: 'need' as const, label: dim.name, desc: `${dim.name}是当前最需要强化的维度——建议在下次练习中作为聚焦方向。` };
    if (score < 75) return { level: 'consolidate' as const, label: dim.name, desc: `${dim.name}已有一定基础，但还需在实战中巩固。` };
    return { level: 'mastered' as const, label: dim.name, desc: `${dim.name}已掌握——保持即可。` };
  });
}

/* ==================================================================
   模块 5：微练习 + 再来一练
   ================================================================== */

export function getMicroExercise(
  scoringDimensions: ScoringDimension[],
  decisions: DecisionRecord[],
): { title: string; instruction: string; hint: string } {
  const correctRate = decisions.length > 0 ? decisions.filter(d => d.is_correct).length / decisions.length : 0;
  if (scoringDimensions.length === 0 || correctRate >= 0.75) {
    return {
      title: '5分钟反思',
      instruction: '找一张纸，写下今天这场对话中你印象最深的一个时刻——不是"我做对了什么"，是"如果重来一次我会换一种说法"的那个时刻。',
      hint: '反思是最被低估的练习方式。不需要离开这个页面。',
    };
  }
  const sorted = [...scoringDimensions].sort((a, b) => a.weight - b.weight);
  const weakest = sorted[0];
  return {
    title: '5分钟微练习',
    instruction: `聚焦"${weakest.name}"：想想你团队的现状，找一个跟今天场景类似的真实困境。写出你会说的第一句话——就一句。然后问自己：这句话是在诊断还是在给方案？`,
    hint: `${weakest.name} · 实战训练。不需要离开这个页面。`,
  };
}

export function getNextPractice(
  decisions: DecisionRecord[],
  sceneCard: any,
): { focus: string; suggestion: string; altTitle: string; altDesc: string } {
  const traps = decisions.filter(d => !d.is_correct);
  const dims = sceneCard?.feedback_criteria?.scoring_dimensions || [];
  const focusDim = dims[0]?.name || '策略匹配';
  if (traps.length === 0) {
    return {
      focus: '挑战更高难度',
      suggestion: '你已掌握当前难度——试试换个完全不同类型的场景，检验你的判断力在不同情境下是否依然稳定。',
      altTitle: '或者选一个不同D向量的场景',
      altDesc: '不同士气根源需要完全不同的策略——广度比深度更能检验管理能力。',
    };
  }
  return {
    focus: focusDim,
    suggestion: `这次特别关注你在"${traps[0].trap_type}"上的表现。下次对话前先问自己：我的第一反应是给方案还是先诊断？`,
    altTitle: '或者换一个不同难度的场景',
    altDesc: '同样的情境，不同难度等级的陷阱更隐蔽——用来检验你是否真的内化了策略。',
  };
}

/* ==================================================================
   模块 6：对话回放 + 自评对照
   ================================================================== */

interface ChatMessage { role: string; content: string; action?: string; }

export function assembleConversationReview(messages: ChatMessage[]) {
  if (!messages || messages.length === 0) return null;
  const userMsgs = messages.filter(m => m.role === 'user');
  const empathyPattern = /理解|感受|一起|你的.*想|你觉得|你怎么看/;
  const commandPattern = /必须|没有选择|按我说|你应该|给我/;
  let empathyCount = 0, commandCount = 0;
  for (const m of userMsgs) {
    if (empathyPattern.test(m.content)) empathyCount++;
    if (commandPattern.test(m.content)) commandCount++;
  }
  const highlights = messages.slice(-5).map(m => ({
    role: m.role === 'user' ? '你' : 'NPC',
    content: m.content.length > 80 ? m.content.slice(0, 80) + '...' : m.content,
  }));
  let behaviorObservation = '';
  if (empathyCount >= 2) behaviorObservation = `你在对话中展现了${empathyCount}次共情表达（如"理解""你怎么看"），这是建立信任的关键行为。`;
  else if (commandCount >= 2) behaviorObservation = `对话中出现了${commandCount}次命令式表达（如"必须""按我说"），这可能让团队成员感到被施压而非被赋能。`;
  else if (empathyCount === 0 && commandCount === 0) behaviorObservation = '你的表达比较中性——下次可以尝试更多共情式开场来建立连接。';
  else behaviorObservation = `对话中你有${empathyCount}次共情表达和${commandCount}次命令式表达。尝试在命令前加一句共情，效果会完全不同。`;
  return { totalRounds: userMsgs.length, empathyCount, commandCount, highlights, behaviorObservation };
}

export interface SelfAssessmentData {
  bridgeScores: number[]; bridgeDims: string[];
  postEvalScore: number; focusArea: string;
}

export function assembleSelfEvalComparison(
  assessment: SelfAssessmentData | null,
  actualMatchRate: number,
) {
  if (!assessment) return null;
  const scores = assessment.bridgeScores || [5,5,5,5];
  const dims = assessment.bridgeDims || ['建立信任','诊断问题','示范赋能','重构目标'];
  const avgBridge = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length));
  const actualPercent = Math.round(actualMatchRate * 100);
  const dimComparison = dims.map((dim, i) => ({
    dimension: dim,
    selfScore: scores[i] || 5,
    selfLabel: (scores[i] || 5) >= 7 ? '自信' : (scores[i] || 5) >= 4 ? '一般' : '担忧',
  }));
  let comparisonText = '';
  if (avgBridge >= 7 && actualPercent < 50) comparisonText = `你入场时对自己评价较高（平均${avgBridge}分），但实际决策匹配率只有${actualPercent}%——这说明你对这类团队处境的判断可能需要更多实战来校准。`;
  else if (avgBridge <= 4 && actualPercent >= 60) comparisonText = `你入场时有些担忧（平均${avgBridge}分），但实际表现不错（${actualPercent}%匹配率）——你的能力比你以为的要强。`;
  else comparisonText = `你的自评（平均${avgBridge}分）和实际表现（${actualPercent}%匹配率）比较一致——你对自己的能力有清晰的认知。`;
  return { dimComparison, avgBridge, actualPercent, postEvalScore: assessment.postEvalScore, comparisonText, focusArea: assessment.focusArea };
}

/* ==================================================================
   主函数：组装完整反馈
   ================================================================== */

export function assembleFeedback(
  scenarioCard: any,
  decisionPath: { decisions: DecisionRecord[]; golden_path_match_rate: number },
) {
  const decisions = decisionPath.decisions || [];
  const scoringDimensions = (scenarioCard.feedback_criteria?.scoring_dimensions || []) as ScoringDimension[];
  return {
    act: assembleActLayer(decisions),
    review: assembleReviewLayer(decisions, scoringDimensions),
    evaluate: assembleEvaluateLayer(decisions),
    summary: {
      total: decisions.length,
      correct: decisions.filter(d => d.is_correct).length,
      match_rate: decisionPath.golden_path_match_rate != null
        ? Math.round(decisionPath.golden_path_match_rate * 100)
        : (decisions.length > 0 ? Math.round(decisions.filter(d => d.is_correct).length / decisions.length * 100) : 0),
      golden_path_narrative: scenarioCard.feedback_criteria?.golden_path_narrative || '',
    },
    crack_awareness: scenarioCard.feedback_criteria?.crack_type_awareness?.applicable
      ? scenarioCard.feedback_criteria.crack_type_awareness : null,
  };
}

/** AI 润色 Prompt */
export function buildFeedbackPrompt(feedback: ReturnType<typeof assembleFeedback>): string {
  return `你是一个管理教练。以下是对一位管理者在团队激励陪练中的结构化分析数据。请将这些数据转化为一段自然、有人情味的反馈——像一个资深管理教练在跟他面对面复盘。不要用数据味道的语言，不要用编号列表。用人话把"他做了什么、对照标准差在哪、他的管理倾向是什么、下次可以怎么改进"串成一段有温度的对话。300-500字。不要用任何序号编号或列表格式。

【行为记录】${JSON.stringify(feedback.act, null, 2)}
【标准对照】${JSON.stringify(feedback.review, null, 2)}
【模式诊断】${JSON.stringify(feedback.evaluate, null, 2)}
【速览数据】正确率：${feedback.summary.correct}/${feedback.summary.total}，路径匹配率：${feedback.summary.match_rate}%`;
}
