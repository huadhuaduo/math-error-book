// TG-001 上下文驱动对话引擎
// 核心改进：NPC回应关联管理者刚说的内容，不是随机从池子里选

var engine = {
  phase: 'TRUST',
  npcMood: 'WATCH',
  round: 0,
  history: [],

  // 上下文——NPC"记住"的东西
  ctx: {
    managerSaid: '',           // 管理者上一轮说了什么
    managerApproach: '',       // 管理者的策略倾向
    bizMentioned: false,       // 提到了业务相关内容
    orderGiven: false,         // 试图发号施令
    questionAsked: false,      // 问了NPC-周看法
    pressureUsed: false,       // 用了紧迫感施压
    expRecognized: false,      // 认可了NPC-周的经验
    specificAction: '',        // 管理者提出的具体行动
    trustBuilt: false,          // 信任已建立（NPC-周主动咨询）
    strategySet: false,         // 策略方向已定
    demoPromised: false,        // 承诺亲自打样
  },

  // P步骤评分
  scores: { p2_trust: 35, p1_diagnose: 40, p5_empower: 30, p3_reframe: 40 },

  // 陷阱计数
  traps: { T01: 0, T03: 0, T04: 0, T05: 0, T06: 0, T08: 0 },

  moodLabels: {
    WATCH:  { text: '观望', dot: '#F59E0B', desc: '在观望。他见过太多空降的领导——先看你是真有本事还是只会画饼。' },
    TEST:   { text: '试探', dot: '#3B82F6', desc: '在试探。你展示了一点业务能力——他拿一个客户来试你。不是找你帮忙，是考你。' },
    VERIFY: { text: '验证', dot: '#10B981', desc: '在验证。策略方向有了——他在等证据。你亲自做成的那一单，比一百句\"相信我\"有用。' },
    FOLLOW: { text: '跟从', dot: '#16A34A', desc: '开始跟从。他主动来找你咨询客户——这不是服从，是认可。' }
  },

  phaseLabels: { TRUST: '建立信任', DIAGNOSE: '诊断问题', SIMPLIFY: '做减法', DEMO: '打样示范' },

  reset() {
    this.phase = 'TRUST'; this.npcMood = 'WATCH'; this.round = 0; this.history = [];
    this.ctx = { managerSaid:'', managerApproach:'', bizMentioned:false, orderGiven:false,
      questionAsked:false, pressureUsed:false, expRecognized:false, specificAction:'',
      trustBuilt:false, strategySet:false, demoPromised:false };
    this.scores = { p2_trust:35, p1_diagnose:40, p5_empower:30, p3_reframe:40 };
    this.traps = { T01:0, T03:0, T04:0, T05:0, T06:0, T08:0 };
  },

  // ===== 理解管理者说的话 =====
  understand(text) {
    var ctx = this.ctx;
    ctx.managerSaid = text;
    var approach = '';
    var keywords = [];

    // 提取关键信息
    if (/爬楼|户型|采光|说辞|竞品|数据.*看|先.*了解|消化.*项目|熟悉.*产品|自己.*先/.test(text)) {
      approach = 'show_biz'; keywords.push('展示业务能力');
      ctx.bizMentioned = true;
    }
    if (/开会|动员|宣布|新策略|打气|大家.*说|从今天.*开始|你们.*要|必须/.test(text)) {
      approach = 'give_order'; keywords.push('直接发令');
      ctx.orderGiven = true;
    }
    if (/你.*觉得|你.*怎么看|你.*帮.*看|你.*比我|你.*有经验|你.*熟|问问.*你/.test(text)) {
      approach = 'ask_zhou'; keywords.push('请教NPC-周');
      ctx.questionAsked = true;
    }
    if (/只剩|倒计时|来不及|赶紧|紧迫|再.*不.*就|时间.*不.*多/.test(text)) {
      approach = 'push_pressure'; keywords.push('施压');
      ctx.pressureUsed = true;
    }
    if (/加钱|奖金|激励|提成|涨.*佣金|额外.*奖/.test(text)) {
      approach = 'offer_bonus'; keywords.push('加钱');
    }
    if (/约谈|逐一|每个人|一对一|单独.*聊|了解.*困难/.test(text)) {
      approach = 'one_on_one'; keywords.push('逐一约谈');
    }
    if (/你卖了.*年|你有经验|你最.*清楚|你.*比我.*懂|这个.*你.*最/.test(text)) {
      approach = 'recognize_exp'; keywords.push('认可经验');
      ctx.expRecognized = true;
    }
    if (/我来|亲自|接待.*客户|做.*一单|打样|示范|我做.*一|沙盘.*促成/.test(text)) {
      approach = 'do_demo'; keywords.push('亲自打样');
      ctx.demoPromised = true;
      ctx.specificAction = '打样';
    }
    if (/对比表|发给.*大家|培训|教.*他们|话术|表格.*分析/.test(text)) {
      approach = 'give_tool'; keywords.push('给工具');
    }
    if (/核心|聚焦|筛选|砍掉|做.*减法|选.*两个|主力|重点.*推/.test(text)) {
      approach = 'focus_strategy'; keywords.push('聚焦策略');
      ctx.strategySet = true;
      ctx.specificAction = '聚焦';
    }
    if (!approach) approach = 'general';

    ctx.managerApproach = approach;
    return { approach: approach, keywords: keywords };
  },

  // ===== 生成NPC-周回应（关联管理者刚说的内容） =====
  respond(text) {
    var info = this.understand(text);
    var ctx = this.ctx;
    var phase = this.phase;
    var mood = this.npcMood;

    // --- 阶段推进逻辑 ---
    // 信任建立: ctx.bizMentioned + ctx.questionAsked → 进入诊断
    if (phase === 'TRUST' && ctx.bizMentioned && ctx.questionAsked) {
      this.phase = 'DIAGNOSE'; this.npcMood = 'TEST'; this.scores.p2_trust += 15;
    }
    // 诊断完成: ctx.strategySet → 进入做减法
    if ((phase === 'DIAGNOSE' || phase === 'TRUST') && ctx.strategySet) {
      this.phase = 'SIMPLIFY'; this.npcMood = 'VERIFY'; this.scores.p5_empower += 20; this.scores.p3_reframe += 10;
    }
    // 打样: ctx.demoPromised → 进入打样
    if ((phase === 'SIMPLIFY' || phase === 'DIAGNOSE') && ctx.demoPromised) {
      this.phase = 'DEMO'; this.npcMood = 'FOLLOW'; this.scores.p5_empower += 25;
    }
    // NPC-周主动开口 → 信任建立
    if (ctx.questionAsked && ctx.bizMentioned && !ctx.trustBuilt) {
      ctx.trustBuilt = true; this.npcMood = 'TEST';
    }

    // --- 陷阱检测 ---
    if (ctx.orderGiven && !ctx.bizMentioned && !ctx.questionAsked) {
      this.traps.T01++; this.scores.p2_trust -= 15;
      return { msg: 'NPC-周在笔记本上写了点什么——你没看到内容。会后茶水间里有人嘀咕了一句。他没有反对你——但他也没有把你当回事。"又是一个画饼的"——这是他五年来见过的第五个空降领导。',
        whisper: { type:'warn', text:'⚠️ T01-先发制人：NPC-周表面点头，背后不买账。信任为零时的动员会=画饼。' }};
    }
    if (info.approach === 'one_on_one' && !ctx.bizMentioned) {
      this.traps.T06++; this.scores.p2_trust -= 10;
      return { msg: '"都挺好的。"NPC-周客气地回答，但你知道那不是实话。一个刚来的空降者，一上来就问"你有什么困难"——NPC-周想的是："我说了你能解决吗？你连户型都还不熟悉。"',
        whisper: { type:'warn', text:'⚠️ T06-信任前置谬误：信任不够时，约谈得到的是标准答案。先用眼睛看，再用嘴问。' }};
    }
    if (info.approach === 'give_tool' && !ctx.strategySet) {
      this.traps.T03++; this.scores.p5_empower -= 10;
      return { msg: '"对比表..."NPC-周扫了一眼，放在一边。"领导，问题不是不知道哪个户型好——是谁也不敢说就推这两个。你给我一个表，不如你给我一个决定。"',
        whisper: { type:'warn', text:'⚠️ T03-信息幻觉：过劳团队需要结论，不是分析工具。帮他们做减法——直接说"就推这两个"。' }};
    }
    if (info.approach === 'push_pressure' && ctx.strategySet && !ctx.demoPromised) {
      this.traps.T05++; this.scores.p5_empower -= 20;
      return { msg: '"20天——"NPC-周的语气变了。"我们知道只剩20天。你再喊一周——有人就要开始投简历了。"他站起来走到窗边。这不是威胁——是实话。团队已经很疲惫了。',
        whisper: { type:'warn', text:'⚠️ T05-压力替代策略：冲刺期的核心任务是删除"不可能"，不是反复提醒"来不及了"。' }};
    }
    if (info.approach === 'offer_bonus' && !ctx.strategySet) {
      this.traps.T08++; this.scores.p1_diagnose -= 10;
      return { msg: '"加钱？"NPC-周的表情暗了一下。"问题不是钱——是6个户型压得我们喘不过气。上一个领导也是加钱——没用。"他顿了顿。钱不能解决结构性产品问题——他知道，你在赌他不知道。',
        whisper: { type:'warn', text:'⚠️ T08-跳过诊断：P₄在P₁之前使用=治标不治本。钱不能解决"6个户型比选瘫痪"。' }};
    }

    // --- 上下文感知的智能回应 ---
    return this.smartRespond(info);
  },

  smartRespond(info) {
    var ctx = this.ctx; var phase = this.phase; var mood = this.npcMood;
    var app = info.approach;
    var said = ctx.managerSaid;

    // 提取管理者话中的关键词，让NPC-周回应时引用
    var echo = '';
    var mentionedB = said.indexOf('B户型')>=0 || said.indexOf('B户')>=0;
    var mentionedD = said.indexOf('D户型')>=0 || said.indexOf('D户')>=0;
    var mentioned6 = said.indexOf('6个')>=0 || said.indexOf('六个')>=0;
    var mentionedData = /数据|数字|报告|登记/.test(said);
    var mentionedClient = /客户|客人|买房/.test(said);

    // ---- WATCH: 观望阶段 ----
    if (mood === 'WATCH' && !ctx.bizMentioned) {
      if (app === 'general' || app === '') {
        return { msg: '"哦——"NPC-周应了一声，不咸不淡。他继续翻着来访登记表，没有抬头。不是不礼貌——他在等。等你说出第一句让他觉得"这个人跟之前的不一样"的话。' };
      }
      if (app === 'show_biz') {
        this.npcMood = 'TEST'; ctx.bizMentioned = true; this.scores.p2_trust += 15;
        var r = mentionedB ? 'B户型' : (mentionedD ? 'D户型' : '这几个户型');
        return { msg: '"你爬完楼了？"NPC-周抬起头，第一次认真看了你一眼。"' + r + '在12楼以上的视野确实不一样——我之前跟一个客户说过，他不信。"他顿了一下，把一份来访登记推到桌边。"领导，你帮我看看这个客户。他一直在对比，我拿不准。"',
          whisper: { type:'info', text:'💡 NPC-周从观望进入试探——他拿客户来考你。这不是找你帮忙——是看你有没有真本事。MTP3：管理者对下的角色定位——此刻你是教练，不是发令者。' }};
      }
    }

    // ---- TEST: 试探阶段 ----
    if (mood === 'TEST' || (ctx.bizMentioned && !ctx.strategySet)) {
      if (app === 'recognize_exp' || app === 'ask_zhou') {
        ctx.questionAsked = true; this.scores.p1_diagnose += 15;
        var echoClient = mentionedClient ? '你说的那个客户' : '你说的情况';
        return { msg: '"实话跟你说——"' + echoClient + '，NPC-周放下保温杯，语气变了。不是怼你——是真在说事了。"6个户型，我们自己都不知道主推哪个。每个都说好，客户更不知道怎么选。我们不是不努力——是被太多选择耗死了。"',
          whisper: { type:'info', text:'💡 P₁-诊断：你问对了问题，NPC-周开始说真话。MTP10：问题解决——识别真因的第一步是让当事人自己说出来。' }};
      }
      if (app === 'show_biz' && !ctx.questionAsked) {
        return { msg: '"怎么样——"NPC-周抬头看你。"看完数据有什么想法？我在这五年了——这些户型什么客人会买，我心里有数。"他停了一下。这不是炫耀——是第二道考题。他在等你问。' };
      }
      if (app === 'focus_strategy') {
        this.phase = 'SIMPLIFY'; ctx.strategySet = true; this.npcMood = 'VERIFY';
        this.scores.p5_empower += 20; this.scores.p3_reframe += 15;
        var echo6 = mentioned6 ? '6个砍到2个' : '选定主力户型';
        return { msg: '"' + echo6 + '——"NPC-周沉默了几秒。不是反对——他在认真想。"你说得对。我之前也想过，但没人拍这个板。"他抬头看你，眼神跟第一天不一样了。"行——那就试这两个。但领导——下面的兄弟要看结果。光说不行。有人得先做出来。"',
          whisper: { type:'info', text:'💡 P₅-做减法：团队需要有人替他们砍掉噪音。NPC-周从试探进入验证——他在等证据。MTP4：计划与命令——目标聚焦是管理者对下最核心的动作。' }};
      }
    }

    // ---- VERIFY: 验证阶段 ----
    if (mood === 'VERIFY' || (ctx.strategySet && !ctx.demoPromised)) {
      if (app === 'do_demo' || app === 'show_biz') {
        this.phase = 'DEMO'; ctx.demoPromised = true; this.npcMood = 'FOLLOW';
        this.scores.p5_empower += 25;
        var echoDemo = mentionedClient ? '就按你说的，拿这个客户' : '就按你说的';
        return { msg: '"' + echoDemo + '——"NPC-周站了起来。不是那种客气的站——是真的被触动了。"你来的时候我以为又是一个画饼的。但你不是。"他走到你桌边。"这批人现在听你的。你做成了我们试了半年没做成的事。"',
          whisper: { type:'info', text:'🎯 P₅-打样完成。NPC-周从验证进入跟从——这不是服从，是认可。MTP7·11：榜样激励+OJT四步骤——示范是无声语言。' }};
      }
      if (app === 'give_tool' && !ctx.demoPromised) {
        this.traps.T04++; this.scores.p5_empower -= 15;
        return { msg: '"培训..."NPC-周叹了口气。"话术我会——我卖了五年房子。问题不是怎么说——是客户不信。你培训得再好，我没有底气——因为我没亲眼见过这个方法成功。"他顿了顿。"你做一单给我看——比培训一百句有用。"',
          whisper: { type:'warn', text:'⚠️ T04-培训替代示范：团队需要"有人证明过"的信念，不是"你应该用这个方法"。MTP7：OJT四步骤第一步——我示范你观察。' }};
      }
      // VERIFY 默认
      return { msg: '"策略方向对——"NPC-周靠在椅背上。"但下面的人都在看。你光说不行。"他顿了顿——不是在怼你，是在说实话。"你得让他们看见——这个方法真的有用。"' };
    }

    // ---- FOLLOW: 跟从阶段 ----
    if (mood === 'FOLLOW' || ctx.demoPromised) {
      this.scores.p2_trust += 10;
      return { msg: '"说真的——"NPC-周坐下来，第一次跟你面对面说了长话。"你来的时候我以为又是走个过场。但你不是。"他端着保温杯，声音不高。"现在这批人听你的。不是因为你是上面派来的——是因为你做了我们一直想让上面做的事。"' };
    }

    // ---- 默认: 按当前状态回应 ----
    if (ctx.bizMentioned && !ctx.strategySet && app === 'general') {
      return { msg: '"怎么样——看出什么了？"NPC-周的声音从工位那边飘过来。不是嘲讽——是在等你开口。你翻完数据了——他在等你的判断。' };
    }
    if (ctx.strategySet && !ctx.demoPromised) {
      return { msg: '"方向对——"NPC-周点了点头。"但是你得让下面的兄弟看到。他们不是不信你——他们是需要有人先做成一次。"' };
    }
    return { msg: 'NPC-周看了你一眼，没有立刻说话。他在等——等你出下一张牌。' };
  }
};

// ===== UI 桥接 =====
function updateUI() {
  var e = engine;
  document.getElementById('stateTxt').textContent = e.moodLabels[e.npcMood].text;
  document.getElementById('stateDot').style.background = e.moodLabels[e.npcMood].dot;
  document.getElementById('sideState').textContent = e.moodLabels[e.npcMood].desc;
  document.getElementById('phaseLabel').textContent = e.phaseLabels[e.phase];

  var s = e.scores;
  var bars = { p2_trust:'barTrust', p1_diagnose:'barDiagnose', p5_empower:'barEmpower', p3_reframe:'barReframe' };
  var scores = { p2_trust:'scoreTrust', p1_diagnose:'scoreDiagnose', p5_empower:'scoreEmpower', p3_reframe:'scoreReframe' };
  for (var k in s) {
    var b = document.getElementById(bars[k]), sc = document.getElementById(scores[k]);
    if (b) b.style.width = Math.min(100, Math.max(0, s[k])) + '%';
    if (sc) sc.textContent = Math.round(Math.min(100, Math.max(0, s[k])));
  }

  var traps = e.traps;
  var tw = [];
  if (traps.T01) tw.push('T01-先发制人');
  if (traps.T03) tw.push('T03-信息幻觉');
  if (traps.T04) tw.push('T04-培训替代示范');
  if (traps.T05) tw.push('T05-压力替代策略');
  if (traps.T06) tw.push('T06-信任前置谬误');
  if (traps.T08) tw.push('T08-跳过诊断');
  var ap = document.getElementById('antiPatternWarn');
  if (ap) ap.textContent = tw.length ? '⚠️ ' + tw.join(' / ') : '';
}

function showWhisper(type, msg) {
  var el = document.getElementById('msgList');
  var d = document.createElement('div');
  d.className = type === 'warn' ? 'whisper warn' : 'whisper';
  d.innerHTML = '<span style="flex-shrink:0;margin-top:1px">' + (type==='warn'?'⚠️':'💡') + '</span><span>' + msg + '</span>';
  el.appendChild(d); el.scrollTop = el.scrollHeight;
}

function escHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function sendMsg() {
  var input = document.getElementById('chatInput');
  var text = input.value.trim(); if (!text) return;
  input.value = ''; input.focus();
  engine.round++;

  // 用户消息
  var ml = document.getElementById('msgList');
  var ud = document.createElement('div'); ud.className = 'msg user';
  ud.innerHTML = '<div class="msg-bubble">' + escHtml(text) + '</div>';
  ml.appendChild(ud);

  // NPC-周回应
  var resp = engine.respond(text);
  setTimeout(function() {
    var nd = document.createElement('div'); nd.className = 'msg npc';
    nd.innerHTML = '<div class="msg-bubble">' + resp.msg + '</div>';
    ml.appendChild(nd);
    if (resp.whisper) showWhisper(resp.whisper.type, resp.whisper.text);
    ml.scrollTop = ml.scrollHeight;
    updateUI();
  }, 700);
}

(function() {
  engine.reset(); updateUI();
  document.getElementById('initialWhisper').innerHTML =
    '<span style="flex-shrink:0;margin-top:1px">💡</span><span>你最弱的P步骤：<strong>P₂ 建立信任</strong>（35分）。今天练习中注意这一条——<strong>先做一件让NPC-周抬头看你的事</strong>。MTP3·8：管理者对下的非权力影响力来自"专家权+典范权"。</span>';
  document.getElementById('chatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
})();
