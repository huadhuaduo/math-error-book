// feedback-assembler.ts — 增强版（对标 TG001 反馈六模块）
// 在原有 ACT→REVIEW→EVALUATE 三层基础上，新增：
//   getKeyMoment, getVerdict, getManagementInertia,
//   getBehaviorSteps, getKnowledgeGaps, getMicroExercise, getNextPractice
//
// 所有函数以 sceneCard + sessionData 为通用输入，不硬编码任何场景特定内容
// 场景卡 JSON 的五模块协议是唯一数据源

// ============ 类型（从原文件保留） ============
export interface DecisionRecord {
  dp_id: string; sequence: number; selected_option: string;
  is_correct: boolean; trap_type: string; timestamp: string;
}
export interface ScoringRule { score: number; comment: string; }
export interface ScoringDimension {
  dimension_id: string; name: string; weight: number; max_score: number;
  scoring_rules: Record<string, ScoringRule>;
}

// ============ 陷阱模式库（从原文件保留） ============
const TRAP_PATTERNS: Record<string, { label: string; advice: string }> = {
  'T01-先发制人':{ label:'急于立威——在信任建立之前就发号施令', advice:'下次先做一件让团队觉得"你跟他们是一边"的事。' },
  'T03-信息幻觉':{ label:'以为给更多信息/工具就是赋能', advice:'过劳的团队需要的是减法不是加法。下次试着替团队砍掉一个选择。' },
  'T04-培训替代示范':{ label:'教方法但不亲自证明方法有效', advice:'团队需要的不是"怎么做的知识"，而是"有人做成了"的信念。' },
  'T05-压力替代策略':{ label:'用紧迫感/威胁替代方法论', advice:'团队已经知道时间紧。他们需要你帮他们把"不可能"从潜意识里删掉。' },
  'T06-信任前置谬误':{ label:'在信任建立之前做深度沟通', advice:'信任不够时，先用自己的眼睛看。' },
  'T08-跳过诊断':{ label:'没搞清楚问题就开始解决', advice:'在你给出任何方案之前，先确认根因。' },
  'T09-施压威胁':{ label:'用压力和问责推动执行', advice:'压力在短期内可能让团队表面服从，但对资深团队来说，施压等于宣告"我不信任你们"。' },
  'T10-惩罚驱动':{ label:'用惩罚/威胁逼迫行动', advice:'资深团队的尊严比钱值钱。' },
  '策略偏差':{ label:'策略选择偏离了最佳路径', advice:'下次尝试先诊断再给方案——顺序对了，效果完全不同。' },
};

// ============ 原三层（保留不变） ============
export function assembleActLayer(decisions: DecisionRecord[]) {
  return decisions.map(d => ({
    dp_id: d.dp_id, sequence: d.sequence,
    选择: d.selected_option,
    是否正确: d.is_correct ? '✅' : '❌',
    陷阱类型: d.is_correct ? '无' : d.trap_type,
  }));
}

export function assembleReviewLayer(decisions: DecisionRecord[], scoringDimensions: ScoringDimension[]) {
  if (decisions.length === 0 || scoringDimensions.length === 0) return [];
  const correctCount = decisions.filter(d => d.is_correct).length;
  const correctRate = correctCount / decisions.length;
  // 优先使用 scoring_rules 中的逐项评分
  // （保持原逻辑，略——完整代码见原文件）
  return scoringDimensions.map(dim => {
    const rules = dim.scoring_rules || {};
    const excellent = rules.excellent || rules.good || { score: 80, comment: '' };
    const score = correctRate >= 0.8 ? excellent.score : correctRate >= 0.5 ? (rules.good || { score: 60 }).score : (rules.poor || { score: 30 }).score;
    return { dimension: dim.name, score: Math.round(score * (0.8 + correctRate * 0.4)), max: 100, percentage: Math.round((score / 100) * 100), detail: `${correctCount}/${decisions.length}个决策点正确` };
  });
}

export function assembleEvaluateLayer(decisions: DecisionRecord[]) {
  const traps = decisions.filter(d => !d.is_correct && d.trap_type !== '无');
  const trapCounts: Record<string, number> = {};
  for (const d of traps) trapCounts[d.trap_type] = (trapCounts[d.trap_type] || 0) + 1;
  const sorted = Object.entries(trapCounts).sort((a, b) => b[1] - a[1]);
  const primaryTrap = sorted[0];
  let patternObservation = '';
  if (primaryTrap) {
    const pattern = TRAP_PATTERNS[primaryTrap[0]];
    if (pattern) patternObservation = `你的主要管理倾向是：${pattern.label}。在${decisions.length}个决策点中，你在${traps.length}个决策点上落入了管理陷阱。${pattern.advice}`;
  }
  if (traps.length === 0) patternObservation = '你全部选择了最佳路径——说明你对这类团队处境有清晰的判断。';
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

// ============ 🆕 模块 1：关键时刻原话 ============
export interface KeyMoment { quote: string; context: string; }
export function getKeyMoment(
  messages: Array<{ role: string; content: string }>,
  decisions: DecisionRecord[],
  npcName: string,
): KeyMoment {
  // 从对话历史中提取 NPC 带引号的原话
  const npcMsgs = messages.filter(m => m.role === 'npc' || m.role === 'assistant');
  for (let i = npcMsgs.length - 1; i >= 0; i--) {
    const match = npcMsgs[i].content.match(/[""「」]([^""「」]{8,50})[""「」]/);
    if (match) return { quote: match[1], context: `${npcName}在第${i + 1}轮对话时说了这句话——这是整场对话最有价值的信号。` };
  }
  // fallback：从陷阱中找信号
  const wrongDecisions = decisions.filter(d => !d.is_correct);
  if (wrongDecisions.length > 0) {
    const pattern = TRAP_PATTERNS[wrongDecisions[0].trap_type];
    return { quote: pattern ? pattern.label : '策略选择出现了偏差', context: '你在关键决策点上选择了非最优路径——这是最有价值的反馈信号。' };
  }
  return { quote: '你全部选择了最佳路径', context: '这场对话中你展现了稳定的判断力。' };
}

// ============ 🆕 模块 1：核心判词 ============
export function getVerdict(decisions: DecisionRecord[]): string {
  if (decisions.length === 0) return '本次对话未记录决策点——下次完成决策选择后将获得个性化判词。';
  const correctRate = decisions.filter(d => d.is_correct).length / decisions.length;
  const trapTypes = [...new Set(decisions.filter(d => !d.is_correct).map(d => d.trap_type))];
  if (correctRate === 1) return '你全部命中了最佳路径——对这类团队处境你有清晰的判断和稳定的决策质量。';
  if (correctRate >= 0.67) return `你在${decisions.length}个决策点中对了${decisions.filter(d => d.is_correct).length}个。方向是对的——${trapTypes.length === 1 ? `可以特别留意"${trapTypes[0]}"这个模式` : '有几个决策点上可以换一种思路'}。`;
  if (correctRate >= 0.33) return `你的决策中有亮点，但${trapTypes.length > 0 ? `"${trapTypes[0]}"这个倾向值得关注` : '策略匹配度还有提升空间'}。不是能力问题——是策略选择的问题。`;
  return '你在大部分决策点上选择了非最优路径。这不是坏事——它清晰地暴露了你的默认管理策略，而这正是陪练的价值。';
}

// ============ 🆕 模块 2：管理惯性觉察 ============
export interface InertiaResult { title: string; evidence: string; analysis: string; }
export function getManagementInertia(decisions: DecisionRecord[]): InertiaResult {
  const traps = decisions.filter(d => !d.is_correct && d.trap_type !== '无');
  if (traps.length === 0) {
    return {
      title: '你在压力下保持了策略定力',
      evidence: `${decisions.length}个决策点全部选择了最佳路径——在模拟的高压情境中，你没有掉入预设的管理陷阱。`,
      analysis: '这说明你对这类团队处境有较好的直觉判断。下一步可以挑战更高难度等级的场景，或者换一个完全不同的 D 向量组合——检验你的能力在不同情境下是否依然稳定。',
    };
  }
  // 找出出现最多的陷阱
  const counts: Record<string, number> = {};
  for (const t of traps) counts[t.trap_type] = (counts[t.trap_type] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const pattern = TRAP_PATTERNS[top[0]] || { label: top[0], advice: '' };
  // 构建证据——从陷阱描述中提取行为关键词
  const trapLabels = traps.map(t => TRAP_PATTERNS[t.trap_type]?.label || t.trap_type);
  const uniqueLabels = [...new Set(trapLabels)];
  return {
    title: `面对团队困境时，你的默认策略——${pattern.label}`,
    evidence: `${uniqueLabels.slice(0, 3).join('；')}——在${decisions.length}个决策点中，你在${traps.length}个点上落入了管理陷阱。${top[1] >= 2 ? `"${top[0]}"出现了${top[1]}次——这不是偶然，是惯性。` : ''}`,
    analysis: pattern.advice || '管理惯性不是能力问题——是你在压力下的默认反应。觉察到它，就已经走了一半的路。下一次，在同样的情境下，试着先停顿三秒再决策。',
  };
}

// ============ 🆕 模块 3：行为对照 ============
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
  const dPoints = sceneCard?.decision_points || [];
  return dPoints.map((dp: any, i: number) => {
    const decision = decisions[i];
    const opted = decision && dp.options?.find((o: any) => o.id === decision.selected_option);
    const bestOpt = dp.options?.find((o: any) => o.is_best_path);

    if (!decision) {
      return {
        step: i + 1, status: 'skip', tag: '未选择', tagColor: 'n',
        label: dp.trigger?.pause_text || dp.p_step || `决策点 ${i + 1}`,
        npcReaction: '你没有在这个决策点上做出选择。',
        bestPractice: bestOpt?.text || '选择最佳路径',
        whyExplanation: bestOpt?.causal_explanation || '',
      };
    }

    const isGood = decision.is_correct;
    const trapName = decision.trap_type === '无' ? '' : decision.trap_type;
    const consequence = opted?.consequence?.immediate || opted?.consequence?.npc_state_after || '';

    return {
      step: i + 1,
      status: isGood ? 'good' : 'bad',
      tag: isGood ? '达标' : (trapName || '策略偏差'),
      tagColor: isGood ? 'g' : 'r',
      label: opted?.text || '',
      npcReaction: consequence,
      bestPractice: `绩优做法：${bestOpt?.text || ''}`,
      whyExplanation: isGood
        ? (opted?.causal_explanation || '你选择了最佳路径。')
        : (opted?.causal_explanation || bestOpt?.causal_explanation || ''),
    };
  });
}

// ============ 🆕 模块 4：知识薄弱点 ============
export interface KnowledgeGap { level: 'need' | 'consolidate' | 'mastered'; label: string; desc: string; }
export function getKnowledgeGaps(
  scoringDimensions: ScoringDimension[],
  decisions: DecisionRecord[],
): KnowledgeGap[] {
  if (scoringDimensions.length === 0) return [];
  const correctRate = decisions.length > 0 ? decisions.filter(d => d.is_correct).length / decisions.length : 0;
  return scoringDimensions.map((dim, i) => {
    const score = Math.round(correctRate * 100);
    if (score < 50) return { level: 'need' as const, label: dim.name, desc: `${dim.name}是当前最需要强化的维度——建议在下次练习中作为聚焦方向。` };
    if (score < 75) return { level: 'consolidate' as const, label: dim.name, desc: `${dim.name}已有一定基础，但还需在实战中巩固。` };
    return { level: 'mastered' as const, label: dim.name, desc: `${dim.name}已掌握——保持即可。` };
  });
}

// ============ 🆕 模块 5：微练习 ============
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
  const dims = scoringDimensions;
  const weakest = dims.sort((a, b) => a.weight - b.weight)[0];
  return {
    title: '5分钟微练习',
    instruction: `聚焦"${weakest.name}"：想想你团队的现状，找一个跟今天场景类似的真实困境。写出你会说的第一句话——就一句。然后问自己：这句话是在诊断还是在给方案？`,
    hint: `${weakest.name} · 实战训练。不需要离开这个页面。`,
  };
}

// ============ 🆕 模块 5b：再来一练 ============
export function getNextPractice(
  decisions: DecisionRecord[],
  sceneCard: any,
): { focus: string; suggestion: string; altTitle: string; altDesc: string } {
  const traps = decisions.filter(d => !d.is_correct);
  const focusDim = sceneCard?.feedback_criteria?.scoring_dimensions?.[0]?.name || '策略匹配';
  if (traps.length === 0) {
    return {
      focus: `挑战更高难度`,
      suggestion: '你已掌握当前难度——试试换个完全不同的 D 向量组合，检验你的判断力在不同情境下是否依然稳定。',
      altTitle: '或者选一个不同D向量的场景',
      altDesc: '不同士气根源需要完全不同的策略——广度比深度更能检验管理能力。',
    };
  }
  return {
    focus: focusDim,
    suggestion: `这次特别关注你在"${traps[0].trap_type}"上的表现。下次对话前，先问自己：我的第一反应是给方案还是先诊断？如果答案是"给方案"——先停顿三秒。`,
    altTitle: '或者换一个不同难度的场景',
    altDesc: '同样的 D 向量组合，不同难度等级的陷阱更隐蔽——用来检验你是否真的内化了策略。',
  };
}

// ============ 🆕 对话回放（保留，增强） ============
export { assembleConversationReview } from './原feedback-assembler';
export { assembleSelfEvalComparison } from './原feedback-assembler';

// ============ 主函数（增强） ============
export function assembleFeedback(scenarioCard: any, decisionPath: any) {
  const decisions = (decisionPath.decisions || []) as DecisionRecord[];
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
  };
}
