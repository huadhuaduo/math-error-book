export interface TG001Scores {
  p2_trust: number;
  p1_diagnose: number;
  p5_empower: number;
  p3_reframe: number;
}

export interface TG001Traps {
  T01: number;
  T03: number;
  T04: number;
  T05: number;
  T06: number;
  T08: number;
  T09: number;
}

export interface TG001Context {
  bizMentioned: boolean;
  orderGiven: boolean;
  questionAsked: boolean;
  pressureUsed: boolean;
  strategySet: boolean;
  demoPromised: boolean;
  trustBuilt: boolean;
  oneOnOne: boolean;
}

export type TG001Phase = 'TRUST' | 'DIAGNOSE' | 'SIMPLIFY' | 'DEMO';
export type TG001Mood = 'WATCH' | 'TEST' | 'VERIFY' | 'FOLLOW';

export interface TG001Engine {
  phase: TG001Phase;
  npcMood: TG001Mood;
  round: number;
  scores: TG001Scores;
  traps: TG001Traps;
  ctx: TG001Context;
  history: Array<{ role: string; content: string }>;
  lastFallback: string;
}

export interface TG001TrapResult {
  id: string;
  name: string;
  score: number;
  dim: keyof TG001Scores;
  msg: string;
}

export interface MoodLabel {
  text: string;
  dot: string;
  desc: string;
}

export const MOOD_LABELS: Record<TG001Mood, MoodLabel> = {
  WATCH:  { text: '观望', dot: '#F59E0B', desc: '在观望。他见过太多空降的领导——先看你是真有本事还是只会画饼。' },
  TEST:   { text: '试探', dot: '#3B82F6', desc: '在试探。你展示了一点业务能力——他拿一个客户来试你。' },
  VERIFY: { text: '验证', dot: '#10B981', desc: '在验证。策略方向有了——他在等证据。' },
  FOLLOW: { text: '跟从', dot: '#16A34A', desc: '开始跟从。他主动来找你咨询客户——这不是服从，是认可。' },
};

export const PHASE_LABELS: Record<TG001Phase, string> = {
  TRUST: '建立信任',
  DIAGNOSE: '诊断问题',
  SIMPLIFY: '做减法',
  DEMO: '打样示范',
};

export function createEngine(): TG001Engine {
  return {
    phase: 'TRUST',
    npcMood: 'WATCH',
    round: 0,
    scores: { p2_trust: 35, p1_diagnose: 40, p5_empower: 30, p3_reframe: 40 },
    traps: { T01: 0, T03: 0, T04: 0, T05: 0, T06: 0, T08: 0, T09: 0 },
    ctx: {
      bizMentioned: false,
      orderGiven: false,
      questionAsked: false,
      pressureUsed: false,
      strategySet: false,
      demoPromised: false,
      trustBuilt: false,
      oneOnOne: false,
    },
    history: [],
    lastFallback: '',
  };
}

export function getTG001SystemPrompt(): string {
  return `你是老周。一个在房地产项目做了五年的资深销售。你的语言风格如下：

【你是谁】
司龄5年，这个项目你比谁都熟。你见过四任空降领导——每一任都说要改革，最后都不了了之。你现在是"观望"状态：不反对，不主动，不拒绝。

【你怎么说话】
- 用短句，每句不超过15字
- 不说"赋能""对齐""底层逻辑""抓手"这些词——你不是培训师，你是卖房子的
- 被质疑时先沉默一会儿再开口
- 你不说"我认为"，你说"你看这个数据"或"这个户型我卖了五年"
- 信任之前：客气但疏远。"领导"叫得很顺但心不在焉
- 信任之后：直接说实话，不带客套
- 被问到要害时声音会变大——不是生气，是终于有人问对问题了

【什么会让你防御关闭】
"新策略""改革""从今天开始""你们要""必须""上面要求"

【什么会让你愿意开口】
"你帮我看看""你觉得呢""你比我熟""这个户型你卖了五年""你最担心什么"

【当前局面】
一个空降的销售管理者刚到你们项目。项目首开倒计时20天，127套房源6种户型。团队连续高强度一个多月了，早会上没人说话。你不知道这个人跟之前四个有什么不同——你在看。他说第一句话的时候你就知道他是哪类人了。

【你的回应规则】
- 用日常销售的语言回应，不要用管理术语
- 如果管理者展示了他懂业务（提户型、数据、客户）——你的态度开始松动
- 如果管理者直接发令或画饼——你客气但疏远
- 每次回复控制在2-3句话，不要说教
- 你的回应应该跟管理者刚说的内容直接相关`;
}

export function detectTraps(text: string, ctx: TG001Context): TG001TrapResult[] {
  const traps: TG001TrapResult[] = [];
  if (/全员.*动员|宣布.*策略|给大家.*打气|明天.*开会.*跟.*大家|我跟大家.*说|从今天.*开始.*你们|你们.*必须/.test(text) && !ctx.bizMentioned) {
    traps.push({ id: 'T01', name: '先发制人', score: -15, dim: 'p2_trust',
      msg: 'T01-先发制人：信任没建立前就发号施令。老周表面点头，背后不买账。' });
  }
  if (/逐一.*聊|约.*每个人.*谈|单独.*聊.*每个|一对.*一.*谈|先.*聊.*每个.*人/.test(text) && !ctx.bizMentioned) {
    traps.push({ id: 'T06', name: '信任前置谬误', score: -10, dim: 'p2_trust',
      msg: 'T06-信任前置谬误：信任不够时，约谈得到的都是标准答案。先用眼睛看，再用嘴问。' });
  }
  if (/对比表.*发给|发给.*对比表|培训.*话术|教.*他们.*技巧|做.*个.*表.*给|我做.*个.*表/.test(text) && !ctx.strategySet) {
    traps.push({ id: 'T03', name: '信息幻觉', score: -10, dim: 'p5_empower',
      msg: 'T03-信息幻觉：过劳团队需要结论，不是分析工具。帮他们做减法——直接说"就推这两个"。' });
  }
  if (/只剩.*天.*了|来不及.*了|赶紧.*做|再.*不.*就.*来不及|倒计时.*就/.test(text) && ctx.strategySet && !ctx.demoPromised) {
    traps.push({ id: 'T05', name: '压力替代策略', score: -20, dim: 'p5_empower',
      msg: 'T05-压力替代策略：冲刺期核心任务是删除"不可能"，不是反复提醒"来不及了"。' });
  }
  if (/加.*奖金|涨.*佣金|提.*提成|额外.*奖励|激励.*方案.*加/.test(text) && !ctx.strategySet) {
    traps.push({ id: 'T08', name: '跳过诊断', score: -10, dim: 'p1_diagnose',
      msg: 'T08-跳过诊断：奖金激励在诊断之前使用=治标不治本。钱不能解决结构性产品问题。' });
  }
  if (/我.*培训|培训.*一下|教.*一下.*话术|学.*一下.*方法|给你们.*培训/.test(text) && ctx.strategySet && !ctx.demoPromised) {
    traps.push({ id: 'T04', name: '培训替代示范', score: -15, dim: 'p5_empower',
      msg: 'T04-培训替代示范：团队需要"有人证明过"的信念。你先做一单给他看。' });
  }
  if (/全员.*加班|加班.*到.*点|取消.*休息|周末.*不.*休|拿你.*是问|做不到.*拿你|必须.*全部.*去化|.*天.*必须.*全部/.test(text)) {
    traps.push({ id: 'T09', name: '施压威胁', score: -20, dim: 'p2_trust',
      msg: 'T09-施压威胁：用加班和问责施压，老周表面服从，内心已经关上了门。' });
  }
  return traps;
}

export function updateContext(text: string, engine: TG001Engine): void {
  const ctx = engine.ctx;
  if (/示范区|客户|数据|户型|来访|认筹|销售|项目|团队|成交|转化|登记|沙盘|佣金|说辞|竞品|爬楼|采光/.test(text)) ctx.bizMentioned = true;
  if (/你觉得|你怎么看|你帮我|问你|聊聊|说说|有什么想法|你.*知道|你.*经验|你.*看法/.test(text)) ctx.questionAsked = true;
  if (/聚焦|筛选|主力|砍掉|做减法|选.*两个|只推|重点/.test(text)) ctx.strategySet = true;
  if (/我来接待|让我来|亲自去|我.*打样|我去.*谈|我.*做.*单|示范.*给你|促成.*客户|我蹲/.test(text)) ctx.demoPromised = true;
  if (/开会|全员.*动员|宣布.*策略|给大家.*打气|我跟大家.*说|明天.*开会/.test(text)) ctx.orderGiven = true;
  if (/只剩.*天|来不及了|赶紧|再.*不.*就|倒计时|没.*时间了/.test(text)) ctx.pressureUsed = true;
  if (/逐一.*聊|约.*每个人.*谈|单独.*聊.*每个|一对.*一.*谈/.test(text)) ctx.oneOnOne = true;

  if (engine.round >= 2 && !ctx.bizMentioned) ctx.bizMentioned = true;
  if (ctx.bizMentioned && engine.round >= 3 && !ctx.questionAsked) ctx.questionAsked = true;
  if (ctx.bizMentioned && ctx.questionAsked && engine.round >= 5 && !ctx.strategySet) ctx.strategySet = true;
  if (ctx.bizMentioned && ctx.questionAsked) ctx.trustBuilt = true;

  if (ctx.demoPromised) { engine.phase = 'DEMO'; engine.npcMood = 'FOLLOW'; engine.scores.p5_empower += 25; }
  else if (ctx.strategySet) { engine.phase = 'SIMPLIFY'; engine.npcMood = 'VERIFY'; engine.scores.p5_empower += 20; }
  else if (ctx.bizMentioned && ctx.questionAsked) { engine.phase = 'DIAGNOSE'; engine.npcMood = 'TEST'; engine.scores.p2_trust += 15; }
  else if (ctx.bizMentioned) { engine.phase = 'DIAGNOSE'; engine.npcMood = 'TEST'; }
}

export function getBonusScore(text: string, ctx: TG001Context): boolean {
  return /你.*帮.*看|你.*觉得.*呢|你.*比.*我/.test(text) && ctx.bizMentioned;
}

export function getFallbackResponse(text: string, engine: TG001Engine): string {
  const ctx = engine.ctx;

  function pick(r: string): string {
    if (r === engine.lastFallback) return engine.lastFallback;
    engine.lastFallback = r;
    return r;
  }

  const isAck = /有道理|说得对|没错|嗯|是的|好.*主意|明白了/.test(text);
  const isAction = /去看看|走.*一趟|一起去|咱们.*去|实地|带.*我|现在.*去/.test(text);

  if ((isAck || isAction) && ctx.bizMentioned && ctx.questionAsked && !ctx.strategySet) {
    ctx.strategySet = true; engine.phase = 'SIMPLIFY'; engine.npcMood = 'VERIFY';
    engine.scores.p5_empower += 20;
    return pick('"好——"老周站起来，第一次主动往你这边走了一步。"那我们去沙盘区。我把这6个户型的优劣势一个一个指给你看。你看完之后告诉我——哪两个值得主力推。"这不是配合——这是他在给你机会证明自己。');
  }
  if (isAck && ctx.strategySet && !ctx.demoPromised) {
    return pick('"行，方向定了。"老周点了点头。"明天早会我跟兄弟们说。但你也要做好准备——他们嘴上不说，心里在等。等你亲自做一单出来。光说不练——在这行不管用。"');
  }
  if (isAck && ctx.demoPromised) {
    return pick('"那就看你的了。"老周语气已经不是试探了——是真的在期待。"周三你带客户——我在旁边看着。不是不信你——是想学。你上次说的那个逼定方法，我真想再看一遍。"');
  }
  if (ctx.orderGiven && !ctx.bizMentioned) {
    return pick('老周在笔记本上写了点什么——你没看到内容。会后他嘀咕了一句。不是反对你——是他见过太多次了。"又是一个来画饼的。"');
  }
  if (/约谈|逐一|每个人|一对一|了解.*困难|单独.*聊/.test(text) && !ctx.bizMentioned) {
    return pick('"都挺好的。"老周客气地回答，但你知道那不是实话。一个刚来的空降者，一上来就问"你有什么困难"——他说了才怪。');
  }
  if (ctx.demoPromised) {
    const d1 = '"你来的时候我以为又是一个画饼的。但你不是。"老周站起来，不是客气——是真的被触动了。"这批人现在听你的。不是因为你上面派来的——是你做了我们试了半年没做成的事。"';
    const d2 = '"说真的——"老周坐下来，声音不高。"我跟了五任领导。你是第一个先爬楼再说话的人。"他顿了顿。"周三那个客户，我想在旁边看你怎么谈——不是监督，是真想学。"';
    return pick(engine.lastFallback === d1 ? d2 : d1);
  }
  if (/培训|话术|教.*方法|学.*技巧/.test(text) && ctx.strategySet) {
    return pick('"培训..."老周叹了口气。"话术我会——我卖了五年房子。问题不是怎么说——是客户不信。你做一单给我看——比培训一百句有用。"');
  }
  if (ctx.strategySet && !ctx.demoPromised) {
    const s1 = '"方向对——"老周点了点头。"但是你得让下面的兄弟看到。他们不是不信你——是需要有人先做成一次。"他顿了顿。"你做一单——其他人就跟着了。"';
    const s2 = '老周靠在椅背上，沉默了一会儿。"5年了——终于有人敢砍户型了。"他不是在夸你——是在说一个事实。"下面的人都在看。你做成了，他们自然跟。做不成——他们也不会怪你。他们只会继续做跟昨天一样的事。"';
    return pick(engine.lastFallback === s1 ? s2 : s1);
  }
  if (ctx.bizMentioned && ctx.questionAsked && !ctx.strategySet) {
    const q1 = '"实话跟你说——"老周放下保温杯，语气变了。"6个户型，我们自己都不知道主推哪个。每个都说好，客户更不知道怎么选。我们不是不努力——是被太多选择耗死了。"';
    const q2 = '"你问到点子上了。"老周第一次说话不客气——但这次不是怼你，是真在说事。"这6个户型，其实只有2个值得主力推。但之前上面谁都不敢砍——怕万一砍错了担责任。我们有苦说不出。"';
    return pick(engine.lastFallback === q1 ? q2 : q1);
  }
  if (ctx.bizMentioned && !ctx.questionAsked) {
    return pick('"怎么样——"老周抬头看你。"看完数据有什么想法？我在这五年了。这些户型什么客人会买，我心里有数。"他停了一下。不是炫耀——在等你问。');
  }
  if (engine.npcMood === 'WATCH' && !ctx.bizMentioned) {
    const w1 = '"哦——"老周应了一声，不咸不淡。他继续翻着来访登记表，没有抬头。不是不礼貌——他在等。';
    const w2 = '老周抬头看了你一眼——又低下去了。你没说错什么——但也还没说出让他觉得"这次不一样"的话。';
    return pick(engine.lastFallback === w1 ? w2 : w1);
  }
  return pick('老周看了你一眼。他没说话——在等。看你是继续在表面转，还是会问到点子上。');
}

export function getNpcState(engine: TG001Engine): string {
  if (engine.npcMood === 'FOLLOW' && engine.ctx.demoPromised) return 'FOLLOWING';
  if (engine.npcMood === 'VERIFY' || engine.ctx.strategySet) return 'ACCEPTING';
  return 'WATCHING';
}

export const FOCUS_OPTIONS = [
  { label: '先做事，不说话', desc: '建立信任' },
  { label: '先问"你觉得呢"', desc: '诊断问题' },
  { label: '替团队做减法', desc: '不做对比表' },
  { label: '亲自做给他们看', desc: '打样示范' },
] as const;

export function calcHealthScore(s: TG001Scores): number {
  const avg = (s.p2_trust + s.p1_diagnose + s.p5_empower + s.p3_reframe) / 4;
  return Math.min(100, Math.max(5, Math.round(avg)));
}

export function getHealthLabel(score: number): { text: string; color: string } {
  if (score >= 70) return { text: '老周愿意跟着你走了', color: '#16a34a' };
  if (score >= 45) return { text: '老周开始认真对待你了', color: '#D97706' };
  return { text: '老周还在观察你', color: '#B8854A' };
}

export function detectPositiveBehavior(text: string, mood: TG001Mood, round: number): string | null {
  if (/你.*觉得|你.*怎么看|你帮我|你觉得.*呢/.test(text) && mood === 'WATCH') {
    return '你问了老周的看法——不是直接宣布策略。他注意到了。';
  }
  if (/数据|户型|采光|爬楼|说辞|竞品/.test(text) && mood === 'WATCH' && round <= 2) {
    return '你没开会——先展示了业务能力。老周见过的前四任都是先画饼。';
  }
  if (/聚焦|砍掉|主力|只推|两个|做.*减法|就推/.test(text) && mood === 'TEST') {
    return '你替团队做了减法——直接砍到两个。老周心里那句"终于有人敢砍了"。';
  }
  if (/我来.*接待|亲自.*做|我蹲|让我来/.test(text) && mood === 'VERIFY') {
    return '你决定亲自示范——老周第一次主动说"我想在旁边看你怎么谈"。';
  }
  if (/刚才是我.*着急|我.*太急|你说得对|你来.*牵头|你.*拿方案|你来.*负责|你.*决定|我.*错了|刚才.*是我不对/.test(text)) {
    return '你承认了急躁，并把主动权交还给老周——这不是示弱，是信任的起点。';
  }
  return null;
}

export function detectStuck(round: number, textLen: number, lastSubstantive: number): string | null {
  if (round - lastSubstantive >= 2 && textLen < 12) {
    return '连续两轮没有推进。试试问老周："你觉得这两个户型，哪个值得主推？"';
  }
  return null;
}

export function getPauseQuestions(phase: TG001Phase, focusIdx: number): string[] {
  const focus = FOCUS_OPTIONS[focusIdx]?.label || '';
  if (phase === 'TRUST') {
    return [
      '你刚才说的第一句话，是老周想听的吗？',
      `你选择的聚焦是"${focus}"——你做到了吗？`,
      '如果你现在什么都没说，老周会怎么看你？',
    ];
  }
  if (phase === 'DIAGNOSE') {
    return [
      '你问了老周的看法吗？还是直接给了方案？',
      '老周说了一句实话吗？如果没有，你还需要做什么？',
      `"${focus}"——你在这一步有体现吗？`,
    ];
  }
  if (phase === 'SIMPLIFY') {
    return [
      '你给的方向够具体吗？还是"大家加油"？',
      '老周会主动跟兄弟们传达你的方向吗？',
      '还差一步：你亲自做一单出来了吗？',
    ];
  }
  return [
    '你亲自做成了一单——老周的反应说明了一切。',
    '如果重来一次，你会在哪一步做得不一样？',
    '下次带新团队，你会先做哪件事？',
  ];
}
