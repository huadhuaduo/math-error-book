import type { TG001Scores, TG001Traps } from './tg001-engine-logic';

export interface SessionData {
  s: TG001Scores;
  traps: TG001Traps;
  revealed: { trustAsked: boolean; directionGiven: boolean; demoDone: boolean };
  phase: string;
  npcMood: string;
  npcState: string;
  history: Array<{ role: string; content: string }>;
  round: number;
}

export interface ScoreDimension {
  key: string;
  label: string;
  mtpAnchor: string;
  score: number;
  benchmark: number;
  color: string;
  status: 'done' | 'gap' | 'miss';
  note: string;
}

export interface BehaviorStep {
  step: number;
  status: 'good' | 'bad' | 'skip';
  tag: string;
  tagColor: 'g' | 'r' | 'n';
  label: string;
  npcReaction: string;
  bestPractice: string;
  whyExplanation: string;
  alternative?: string;
}

export interface KnowledgeGap {
  level: 'need' | 'consolidate' | 'mastered';
  label: string;
  desc: string;
}

export interface NextPractice {
  focus: string;
  suggestion: string;
  altTitle: string;
  altDesc: string;
}

const BENCHMARKS: Record<string, number> = {
  p2_trust: 80, p1_diagnose: 75, p5_empower: 80, p3_reframe: 70,
};

const DIM_META: Record<string, { label: string; mtp: string; color: string }> = {
  p2_trust:   { label: '先做事，不说话', mtp: '信任方程式·降低自我导向', color: '#F59E0B' },
  p1_diagnose: { label: '先问"你觉得呢"', mtp: '对下角色定位·教练而非发令者', color: '#16A34A' },
  p5_empower: { label: '替团队做减法', mtp: '目标聚焦·砍噪音比加工具有效', color: '#DC2626' },
  p3_reframe: { label: '亲自做给他们看', mtp: '榜样激励·OJT示教', color: '#9CA3AF' },
};

export function getScoreDimensions(s: TG001Scores): ScoreDimension[] {
  const keys = ['p2_trust', 'p1_diagnose', 'p5_empower', 'p3_reframe'] as const;
  return keys.map(key => {
    const meta = DIM_META[key];
    const score = Math.round(Math.min(100, Math.max(0, s[key])));
    const bench = BENCHMARKS[key];
    let status: 'done' | 'gap' | 'miss' = 'miss';
    let color = '#9CA3AF';
    let note = '未触发 · 跳过了';
    if (score > 0) {
      if (score >= bench) {
        status = 'done';
        color = meta.color;
        note = `绩优${bench}+ · 达标`;
      } else if (score >= bench * 0.5) {
        status = 'gap';
        color = '#DC2626';
        note = `绩优${bench}+ · 差距最大`;
      } else {
        status = 'gap';
        color = '#DC2626';
        note = `绩优${bench}+ · 需加强`;
      }
    }
    return { key, label: meta.label, mtpAnchor: meta.mtp, score, benchmark: bench, color, status, note };
  });
}

export function getKeyMoment(session: SessionData): { quote: string; context: string } {
  const hist = session.history;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].role === 'assistant' && hist[i].content.length > 10) {
      const match = hist[i].content.match(/[""「」]([^""「」]{6,40})[""「」]/);
      if (match) {
        return { quote: match[1], context: `老周在第${Math.ceil((i + 1) / 2)}轮对话时说了这句话——这是整场对话最有价值的信号。` };
      }
    }
  }
  if (session.npcState === 'FOLLOWING') {
    return { quote: '你来的时候我以为又是一个画饼的。但你不是。', context: '老周在对话结束时说了这句话——这是整场对话最有价值的信号。' };
  }
  if (session.revealed.trustAsked) {
    return { quote: '你给我一个表，不如你给我一个决定。', context: '老周在第3步时说了这句话——这是整场对话最有价值的信号。' };
  }
  return { quote: '6个户型，我们自己都不知道主推哪个。', context: '老周在被问到要害时说了这句话——这是整场对话最有价值的信号。' };
}

export function getVerdict(session: SessionData): string {
  if (session.npcState === 'FOLLOWING' && session.phase === 'DEMO') {
    return '面对团队"不信"时，你替他们做了减法，还亲自做了一单。老周从"配合你"变成了"跟从你"。';
  }
  if (session.revealed.directionGiven && !session.revealed.demoDone) {
    return '面对团队"不信"时，你给了更多工具，而不是替他们做减法。';
  }
  if (session.revealed.trustAsked && !session.revealed.directionGiven) {
    return '你问了老周的看法——但还没有给出明确的方向。他在等你替他做决定。';
  }
  return '你太快进入了"解决问题"模式——还没问"你怎么看"，就宣布了新方案。老周不会反对你——但他也不会真的配合你。';
}

export function getManagementInertia(session: SessionData): { title: string; evidence: string; analysis: string } {
  const traps = session.traps;
  // T09: 施压威胁 — 2026-07-16 修复，核对项1 ✅
  const hasPressure = traps.T09 >= 1;
  if (hasPressure) {
    return {
      title: '面对"不信"时，你的默认策略——用压力和问责推动执行',
      evidence: '全员加班到晚上十点、取消周末休息、做不到拿你是问——当团队缺乏信心时，你的第一反应是施加更大的压力和问责，而不是替他们减轻负担。',
      analysis: '压力在短期内可能让团队表面服从，但对老周这种见过四任领导的资深员工来说，施压等于宣告"我不信任你们的能力"。他表面点头，内心已经关上了门。真正能让资深团队行动起来的，不是更大的压力，而是有人替他们承担"砍错了怎么办"的风险。',
    };
  }
  const hasInfoTrap = traps.T03 >= 1;
  const hasTrainTrap = traps.T04 >= 1;

  if (hasInfoTrap || hasTrainTrap) {
    const steps: string[] = [];
    if (hasInfoTrap) steps.push('给对比表/做资料');
    if (hasTrainTrap) steps.push('培训话术');
    return {
      title: '面对"不信"时，你的默认策略——给更多信息和工具',
      evidence: `${steps.join(' + ')} → 指向同一个惯性：当团队说"我们做不到"，你的第一反应是给他们"更多武器"——而不是替他们"减轻负担"。`,
      analysis: '这个惯性在带新人时可能有效（新人缺知识）。但在带老周这种资深团队时是反效果的——他们不缺知识，缺信心。信心不是靠"教"获得的——是亲眼看到有人做成了。',
    };
  }
  if (!session.revealed.trustAsked) {
    return {
      title: '面对新团队时，你的默认策略——先给方案，后问问题',
      evidence: '你跳过了"问老周怎么看"这一步，直接进入了给方向的模式。',
      analysis: '效率导向的管理者在面对资深团队时容易踩坑：你以为给了方案就是领导力——但对老周来说，没被问到的方案等于没方案。',
    };
  }
  return {
    title: '你在压力下倾向于"做加法"——而不是"做减法"',
    evidence: '面对倒计时的压力，你选择了增加信息和工具，而不是砍掉不必要的选项。',
    analysis: '管理者在压力下本能地想"做得更多"——但资深团队需要的恰恰相反：有人替他们承担"砍错了怎么办"的风险。',
  };
}

export function getBehaviorSteps(session: SessionData): BehaviorStep[] {
  const { revealed, traps, phase } = session;
  const steps: BehaviorStep[] = [];

  steps.push({
    step: 1,
    status: revealed.trustAsked || phase !== 'TRUST' ? 'good' : 'skip',
    tag: revealed.trustAsked || phase !== 'TRUST' ? '达标' : '缺失',
    tagColor: revealed.trustAsked || phase !== 'TRUST' ? 'g' : 'n',
    label: '你翻完数据，爬楼看了户型采光',
    npcReaction: '老周的反应：抬起头看了你一眼——这是你今天第一次看到他正眼看你。',
    bestPractice: '绩优做法一致——没开会、没画饼，先做事。',
    whyExplanation: '空降管理者最大的本能是"先证明自己"——开会、宣布策略、展示方案。但你压住了这个本能。你做了反直觉的事：先闭嘴，先做事。老周在这里干了五年，见过四任空降领导——每一任第一天都说了很多话。你是第一个第一天没说话的。他注意到了。',
  });

  steps.push({
    step: 2,
    status: revealed.trustAsked ? 'good' : 'skip',
    tag: revealed.trustAsked ? '达标' : '缺失',
    tagColor: revealed.trustAsked ? 'g' : 'n',
    label: revealed.trustAsked ? '你问老周"你觉得哪两个值得主推"' : '你没有问老周的看法',
    npcReaction: revealed.trustAsked
      ? '老周的反应：放下保温杯，语气变了——"6个户型，我们自己都不知道主推哪个。我们不是不努力——是被太多选择耗死了。"这是他今天说的第一句实话。'
      : '老周在等你问——但你没问。他继续翻来访登记，不咸不淡地应着。',
    bestPractice: revealed.trustAsked ? '绩优做法一致——先问后说。' : '绩优做法：问他"你觉得这6个户型，哪两个值得主力推？"',
    whyExplanation: revealed.trustAsked
      ? '你问他"你觉得哪两个值得主推"——这句话同时做了三件事。第一，你承认他比你懂。第二，你把"判断权"交给了他而不是"任务"丢给他。第三，你让他自己说出了痛点。当一个人对你说了实话，他就已经在你这边了。'
      : '你没有问他"怎么看"——这跳过了建立信任最关键的一步。老周这类资深员工，如果你不问"你觉得呢"，他不会真的配合——他只是表面点头。',
  });

  const step3Bad = traps.T03 >= 1;
  const step3Good = revealed.directionGiven && !step3Bad;
  steps.push({
    step: 3,
    status: step3Good ? 'good' : step3Bad ? 'bad' : 'skip',
    tag: step3Good ? '达标' : step3Bad ? 'T03 信息幻觉' : '缺失',
    tagColor: step3Good ? 'g' : step3Bad ? 'r' : 'n',
    label: step3Good ? '你直接砍到2个——"就推B和D"' : step3Bad ? '你做了户型对比表，让大家灵活推荐' : '你没有给出明确方向',
    npcReaction: step3Good
      ? '老周的反应："5年了——终于有人敢砍户型了。"他不是在夸你——是在说一个事实。'
      : step3Bad ? '老周的反应："你给我一个表，不如我给你一个决定。"' : '老周在等你的方向——但你没有给。',
    bestPractice: step3Good ? '绩优做法一致——直接砍到2个。' : '绩优做法：直接砍到2个——"就推B和D，其他的先放一放"。',
    whyExplanation: step3Good
      ? '"敢替团队拍板"是资深团队对管理者最核心的考验。你做到了——替他们承担了"砍错了怎么办"的风险。'
      : step3Bad ? '你做了一件管理者直觉上"正确"的事——提供信息、给工具。但这一步的隐藏前提是"团队缺的是信息"。他们不缺。他们缺的是有人替他们承担"砍错了怎么办"的风险。你给了对比表——风险还是他们的。' : '你没有给明确方向——老周需要听到你说"我帮你做减法"——而不是"我们再试试"。',
    alternative: step3Bad ? '如果你当时说的是"就推B和D，其他的先放"——老周的反应会是："终于有人敢砍了。"' : undefined,
  });

  steps.push({
    step: 4,
    status: revealed.demoDone ? 'good' : 'skip',
    tag: revealed.demoDone ? '达标' : '缺失',
    tagColor: revealed.demoDone ? 'g' : 'n',
    label: revealed.demoDone ? '你亲自打样——蹲在沙盘区接待客户' : '你没有亲自打样',
    npcReaction: revealed.demoDone
      ? '老周的反应：主动来找你咨询客户——不是服从，是认可。"你上次说的那个逼定方法，我真想再看一遍。"'
      : '老周还在"验证"状态——他没有进入"跟从"。',
    bestPractice: revealed.demoDone ? '绩优做法一致——亲自示范。' : '绩优做法：蹲在沙盘区，亲自接待一组客户，当天促成认筹。',
    whyExplanation: revealed.demoDone
      ? '信心不是传染的——是示范的。你亲自做成一单，团队从"他说的方法行吗"变成"他用的是什么方法"。'
      : '策略定了，方向有了。但老周还在"验证"状态。你缺的不是方案，是证据。绩优管理者知道：信心不是传染的——是示范的。你亲自做成一单，团队从"他说的方法行吗"变成"他用的是什么方法"。这一步是你这次练习最大的缺失——也是最值得在下一次尝试的突破点。',
  });

  return steps;
}

export function getKnowledgeGaps(session: SessionData): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];
  const s = session.s;
  const entries: Array<{ key: string; label: string; score: number }> = [
    { key: 'p2_trust', label: '信任方程式·降低自我导向', score: s.p2_trust },
    { key: 'p1_diagnose', label: '教练而非发令者', score: s.p1_diagnose },
    { key: 'p5_empower', label: '目标聚焦', score: s.p5_empower },
    { key: 'p3_reframe', label: '榜样激励', score: s.p3_reframe },
  ];

  for (const e of entries) {
    if (e.score < 50) {
      gaps.push({ level: 'need', label: e.label, desc: e.label === '目标聚焦' ? '砍掉噪音比增加工具更有效。' : e.label === '榜样激励' ? '示范是无声语言。' : '需要加强实战练习。' });
    } else if (e.score < 70) {
      gaps.push({ level: 'consolidate', label: e.label, desc: e.label === '信任方程式·降低自我导向' ? '你做到了"先做再说"' : e.label === '教练而非发令者' ? '你问了"你觉得呢"' : '已有一定基础，需巩固。' });
    } else {
      gaps.push({ level: 'mastered', label: e.label, desc: '已掌握，保持。' });
    }
  }
  return gaps;
}

export function getMicroExercise(session: SessionData): { title: string; instruction: string; hint: string } {
  const weakest = getWeakestDim(session.s);
  if (weakest === 'p5_empower') {
    return {
      title: '5分钟微练习',
      instruction: '现在就做：打开你团队的任务清单，找出3件可以砍掉的事。发一条消息给你的团队："这三件事从今天起不做了。腾出精力，我们聚焦。"',
      hint: '目标聚焦 · 实战训练。不需要离开这个页面。',
    };
  }
  if (weakest === 'p3_reframe') {
    return {
      title: '5分钟微练习',
      instruction: '现在就做：选一个你团队正在推进的客户，自己亲自接待/沟通一次。做完后跟团队分享过程——不是教他们怎么做，是让他们看到。',
      hint: '榜样激励 · 实战训练。不需要离开这个页面。',
    };
  }
  if (weakest === 'p2_trust') {
    return {
      title: '5分钟微练习',
      instruction: '现在就做：找一个你还没深入聊过的团队成员，问他"你觉得我们团队目前最大的卡点是什么？"——只听，不回应方案。',
      hint: '信任建立 · 实战训练。不需要离开这个页面。',
    };
  }
  return {
    title: '5分钟微练习',
    instruction: '现在就做：找你的一个直属下属，问他"你觉得我们的方向哪里最需要调整？"——先问后说，把判断权交给他。',
    hint: '教练式管理 · 实战训练。不需要离开这个页面。',
  };
}

function getWeakestDim(s: TG001Scores): string {
  const entries = [
    { key: 'p2_trust', score: s.p2_trust },
    { key: 'p1_diagnose', score: s.p1_diagnose },
    { key: 'p5_empower', score: s.p5_empower },
    { key: 'p3_reframe', score: s.p3_reframe },
  ];
  entries.sort((a, b) => a.score - b.score);
  return entries[0].key;
}

export function getNextPractice(session: SessionData): NextPractice {
  const weakest = getWeakestDim(session.s);
  const focusMap: Record<string, string> = {
    p5_empower: '"替团队做减法"',
    p3_reframe: '"亲自做给他们看"',
    p2_trust: '"先做事，不说话"',
    p1_diagnose: '"先问后说"',
  };
  return {
    focus: focusMap[weakest] || '"做减法+打样"',
    suggestion: `这次特别关注第3步——当老周说"方向对，但下面的人不信"。不要说"我培训你们"。试试说："明天下午我蹲沙盘，带一组客户给你看。"`,
    altTitle: '或者换 TG-002 大户型攻坚',
    altDesc: '老刘跟老周一样——6年资深销售，隐性对抗。同样需要"做减法+打样"破局。不同场景，同一种管理肌肉。',
  };
}

export function getTrapCount(traps: TG001Traps): number {
  let count = 0;
  if (traps.T01 >= 1) count++;
  if (traps.T03 >= 1) count++;
  if (traps.T04 >= 1) count++;
  if (traps.T05 >= 1) count++;
  if (traps.T08 >= 1) count++;
  if (traps.T09 >= 1) count++;
  return count;
}

export function getPassedCount(dims: ScoreDimension[]): number {
  return dims.filter(d => d.status === 'done').length;
}

export function getPracticeCount(): number {
  try {
    const raw = sessionStorage.getItem('tg001_practice_count');
    const count = raw ? parseInt(raw, 10) : 0;
    sessionStorage.setItem('tg001_practice_count', String(count + 1));
    return count + 1;
  } catch {
    return 1;
  }
}

export function getPrevCommitment(): { behavior: string; timestamp: number } | null {
  try {
    const raw = sessionStorage.getItem('tg001_commitment');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
