// TG-001 Hybrid Engine
// 低代码平台部署: AI插件驱动NPC对话 + 正则陷阱检测
// 本地测试: 正则引擎fallback

var engine = {
  phase: 'TRUST', npcMood: 'WATCH', round: 0, history: [],
  scores: { p2_trust: 35, p1_diagnose: 40, p5_empower: 30, p3_reframe: 40 },
  traps: { T01: 0, T03: 0, T04: 0, T05: 0, T06: 0, T08: 0 },
  ctx: { bizMentioned: false, orderGiven: false, questionAsked: false,
    pressureUsed: false, expRecognized: false, strategySet: false, demoPromised: false, trustBuilt: false },

  moodLabels: {
    WATCH:  { text:'观望', dot:'#F59E0B', desc:'在观望。他见过太多空降的领导——先看你是真有本事还是只会画饼。' },
    TEST:   { text:'试探', dot:'#3B82F6', desc:'在试探。你展示了一点业务能力——他拿一个客户来试你。' },
    VERIFY: { text:'验证', dot:'#10B981', desc:'在验证。策略方向有了——他在等证据。' },
    FOLLOW: { text:'跟从', dot:'#16A34A', desc:'开始跟从。他主动来找你咨询客户——这不是服从，是认可。' }
  },
  phaseLabels: { TRUST:'建立信任', DIAGNOSE:'诊断问题', SIMPLIFY:'做减法', DEMO:'打样示范' },

  reset() {
    this.phase='TRUST'; this.npcMood='WATCH'; this.round=0; this.history=[];
    this.scores={p2_trust:35,p1_diagnose:40,p5_empower:30,p3_reframe:40};
    this.traps={T01:0,T03:0,T04:0,T05:0,T06:0,T08:0};
    this.ctx={bizMentioned:false,orderGiven:false,questionAsked:false,
      pressureUsed:false,expRecognized:false,strategySet:false,demoPromised:false,trustBuilt:false};
  },

  // ===== AI 系统提示词（NPC-周角色） =====
  getSystemPrompt() {
    return `你是NPC-周。一个在房地产项目做了五年的资深销售。你的语言风格如下：

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
  },

  // ===== 陷阱检测（正则） =====
  detectTraps(text) {
    var ctx = this.ctx; var traps = [];
    if (/开会|动员|宣布|新策略|打气|大家.*说|从今天.*开始|你们.*要|必须/.test(text) && !ctx.bizMentioned) {
      traps.push({ id:'T01', name:'先发制人', score:-15, dim:'p2_trust',
        msg:'⚠️ T01-先发制人：信任没建立前就发号施令。NPC-周表面点头，背后不买账。' });}
    if (/约谈|逐一|每个人|一对一|了解.*困难|单独.*聊/.test(text) && !ctx.bizMentioned) {
      traps.push({ id:'T06', name:'信任前置谬误', score:-10, dim:'p2_trust',
        msg:'⚠️ T06-信任前置谬误：信任不够时，约谈得到的都是标准答案。先用眼睛看，再用嘴问。' });}
    if (/对比表|发给.*大家|培训|教.*他们|话术.*学|表格.*分析/.test(text) && !ctx.strategySet) {
      traps.push({ id:'T03', name:'信息幻觉', score:-10, dim:'p5_empower',
        msg:'⚠️ T03-信息幻觉：过劳团队需要结论，不是分析工具。帮他们做减法——直接说"就推这两个"。' });}
    if (/只剩|倒计时|来不及|赶紧|再.*不.*就/.test(text) && ctx.strategySet && !ctx.demoPromised) {
      traps.push({ id:'T05', name:'压力替代策略', score:-20, dim:'p5_empower',
        msg:'⚠️ T05-压力替代策略：冲刺期核心任务是删除"不可能"，不是反复提醒"来不及了"。' });}
    if (/加钱|奖金|激励.*加|提成.*涨/.test(text) && !ctx.strategySet) {
      traps.push({ id:'T08', name:'跳过诊断', score:-10, dim:'p1_diagnose',
        msg:'⚠️ T08-跳过诊断：P₄在P₁之前使用=治标不治本。钱不能解决结构性产品问题。' });}
    if (/培训|话术|教.*方法|学.*技巧/.test(text) && ctx.strategySet && !ctx.demoPromised) {
      traps.push({ id:'T04', name:'培训替代示范', score:-15, dim:'p5_empower',
        msg:'⚠️ T04-培训替代示范：团队需要"有人证明过"的信念。你先做一单给他看。' });}
    return traps;
  },

  // ===== 更新上下文 =====
  updateContext(text) {
    var ctx = this.ctx;
    if (/爬楼|户型|采光|说辞|竞品|数据.*看|先.*了解|消化.*项目|熟悉.*产品|自己.*先/.test(text)) ctx.bizMentioned = true;
    if (/开会|动员|宣布|新策略/.test(text)) ctx.orderGiven = true;
    if (/你.*觉得|你.*怎么看|你.*帮.*看|你.*比我|你.*有经验|你.*熟/.test(text)) ctx.questionAsked = true;
    if (/只剩|倒计时|来不及|赶紧/.test(text)) ctx.pressureUsed = true;
    if (/你卖了.*年|你有经验|你最.*清楚/.test(text)) ctx.expRecognized = true;
    if (/核心|聚焦|筛选|砍掉|做.*减法|主力|重点.*推/.test(text)) ctx.strategySet = true;
    if (/我来|亲自|接待.*客户|做.*一单|打样|示范|我做.*一|沙盘.*促成/.test(text)) ctx.demoPromised = true;
    if (ctx.bizMentioned && ctx.questionAsked) ctx.trustBuilt = true;

    // Phase transitions
    if (ctx.bizMentioned && !ctx.strategySet) { this.phase = 'DIAGNOSE'; this.npcMood = 'TEST'; }
    if (ctx.strategySet && !ctx.demoPromised) { this.phase = 'SIMPLIFY'; this.npcMood = 'VERIFY'; this.scores.p5_empower += 20; }
    if (ctx.demoPromised) { this.phase = 'DEMO'; this.npcMood = 'FOLLOW'; this.scores.p5_empower += 25; }
    if (ctx.bizMentioned && ctx.questionAsked && !ctx.trustBuilt) { ctx.trustBuilt = true; this.npcMood = 'TEST'; this.scores.p2_trust += 15; }
  }
};

// ===== 对话历史（AI模式使用） =====
var conversationHistory = [];

function buildAIPrompt(userMsg) {
  var ctx = engine.ctx; var phase = engine.phase; var mood = engine.npcMood;
  var contextNote = '';
  if (!ctx.bizMentioned) contextNote = '管理者还没展示任何业务能力。NPC-周在观望。';
  else if (!ctx.strategySet) contextNote = '管理者展示了一些业务能力。NPC-周开始试探。';
  else if (!ctx.demoPromised) contextNote = '策略方向已定。NPC-周在验证——等证据。';
  else contextNote = '管理者亲自打了样。NPC-周开始跟从。';
  return contextNote + '\n管理者说：' + userMsg;
}

// ===== 发送消息 =====
async function sendMsg() {
  var input = document.getElementById('chatInput');
  var text = input.value.trim(); if (!text) return;
  input.value = ''; input.focus();
  engine.round++;

  // 用户消息
  var ml = document.getElementById('msgList');
  var ud = document.createElement('div'); ud.className = 'msg user';
  ud.innerHTML = '<div class="msg-bubble">' + escHtml(text) + '</div>';
  ml.appendChild(ud);

  // 陷阱检测
  engine.updateContext(text);
  var traps = engine.detectTraps(text);
  for (var i = 0; i < traps.length; i++) {
    var t = traps[i];
    engine.traps[t.id] = (engine.traps[t.id] || 0) + 1;
    engine.scores[t.dim] = Math.max(0, (engine.scores[t.dim] || 0) + t.score);
    setTimeout(function(trap) {
      showWhisper('warn', trap.msg);
    }, 300 + i * 200, t);
  }

  // 加分检测
  if (/你.*帮.*看|你.*觉得.*呢|你.*比.*我/.test(text) && engine.ctx.bizMentioned) {
    engine.scores.p1_diagnose = Math.min(100, engine.scores.p1_diagnose + 10);
  }

  // AI 或 Regex 模式
  var npcResp = '';
  var useAI = typeof window !== 'undefined' && window.capabilityClient;

  if (useAI) {
    try {
      var plugin = window.capabilityClient.load('mdp_coach_ai_conversation_reply_1');
      conversationHistory.push({ role: 'user', content: text });
      var result = await plugin.call('textGenerate', {
        system_prompt: engine.getSystemPrompt(),
        user_message_history: JSON.stringify(conversationHistory.slice(-10)),
      });
      npcResp = result.content || result.text || '(NPC-周沉默了一下)';
      conversationHistory.push({ role: 'assistant', content: npcResp });
    } catch(e) {
      npcResp = fallbackRespond(text);
    }
  } else {
    npcResp = fallbackRespond(text);
  }

  // NPC-周回应
  setTimeout(function() {
    var nd = document.createElement('div'); nd.className = 'msg npc';
    nd.innerHTML = '<div class="msg-bubble">' + npcResp + '</div>';
    ml.appendChild(nd); ml.scrollTop = ml.scrollHeight;
    updateUI();
  }, useAI ? 1000 : 600);
}

// ===== Regex fallback (本地测试/无AI插件时) =====
function fallbackRespond(text) {
  var ctx = engine.ctx; var mood = engine.npcMood; var phase = engine.phase;

  // 根据上下文选择最相关的回应
  if (ctx.orderGiven && !ctx.bizMentioned) {
    return 'NPC-周在笔记本上写了点什么——你没看到内容。会后他嘀咕了一句。不是反对你——是他见过太多次了。"又是一个来画饼的。"';
  }
  if (/约谈|逐一|每个人|一对一|了解.*困难/.test(text) && !ctx.bizMentioned) {
    return '"都挺好的。"NPC-周客气地回答，但你知道那不是实话。一个刚来的空降者，一上来就问"你有什么困难"——他说了才怪。';
  }
  if (ctx.demoPromised) {
    return '"你来的时候我以为又是一个画饼的。但你不是。"NPC-周站起来，不是客气——是真的被触动了。"这批人现在听你的。不是因为你上面派来的——是你做了我们试了半年没做成的事。"';
  }
  if (ctx.strategySet && !ctx.demoPromised && /培训|话术|教.*方法/.test(text)) {
    return '"培训..."NPC-周叹了口气。"话术我会——我卖了五年房子。问题不是怎么说——是客户不信。你做一单给我看——比培训一百句有用。"';
  }
  if (ctx.strategySet && !ctx.demoPromised) {
    return '"方向对——"NPC-周点了点头。"但是你得让下面的兄弟看到。他们不是不信你——是需要有人先做成一次。"他顿了顿。"你做一单——其他人就跟着了。"';
  }
  if (ctx.bizMentioned && ctx.questionAsked && !ctx.strategySet) {
    return '"实话跟你说——"NPC-周放下保温杯，语气变了。"6个户型，我们自己都不知道主推哪个。每个都说好，客户更不知道怎么选。我们不是不努力——是被太多选择耗死了。"';
  }
  if (ctx.bizMentioned && !ctx.questionAsked) {
    return '"怎么样——"NPC-周抬头看你。"看完数据有什么想法？我在这五年了。这些户型什么客人会买，我心里有数。"他停了一下。不是炫耀——在等你问。';
  }
  if (ctx.bizMentioned && /你.*帮.*看|你.*觉得.*呢|你.*问.*我/.test(text)) {
    engine.scores.p1_diagnose = Math.min(100, engine.scores.p1_diagnose + 15);
    engine.ctx.questionAsked = true;
    return '"实话跟你说——"NPC-周的语气变了。"' + (text.indexOf('户型')>=0 ? '你刚才提的那个户型' : '你说的情况') + '——我之前就想过，但没人拍这个板。我们不是不努力——是被太多选择耗死了。"';
  }
  if (ctx.bizMentioned && /核心|聚焦|筛选|砍掉|做.*减法|主力/.test(text)) {
    engine.ctx.strategySet = true; engine.phase = 'SIMPLIFY'; engine.npcMood = 'VERIFY';
    engine.scores.p5_empower += 20;
    return '"砍到2个？"NPC-周沉默了几秒。"你说得对。我之前也想过，但没人拍这个板。"他抬头看你，眼神跟第一天不一样了。"行——那就试这两个。但领导——下面的兄弟要看结果。光说不行。"';
  }
  if (mood === 'WATCH' && !ctx.bizMentioned) {
    return '"哦——"NPC-周应了一声，不咸不淡。他继续翻着来访登记表，没有抬头。不是不礼貌——他在等。等你说出第一句让他觉得"这个人跟之前的不一样"的话。';
  }
  return 'NPC-周看了你一眼。他没说话——在等。看你是继续在表面转，还是会问到点子上。';
}

// ===== UI =====
function updateUI() {
  var e = engine;
  document.getElementById('stateTxt').textContent = e.moodLabels[e.npcMood].text;
  document.getElementById('stateDot').style.background = e.moodLabels[e.npcMood].dot;
  document.getElementById('sideState').textContent = e.moodLabels[e.npcMood].desc;
  document.getElementById('phaseLabel').textContent = e.phaseLabels[e.phase];

  var s = e.scores;
  var bars = { p2_trust:'barTrust', p1_diagnose:'barDiagnose', p5_empower:'barEmpower', p3_reframe:'barReframe' };
  var scoreEls = { p2_trust:'scoreTrust', p1_diagnose:'scoreDiagnose', p5_empower:'scoreEmpower', p3_reframe:'scoreReframe' };
  for (var k in s) {
    var b = document.getElementById(bars[k]), sc = document.getElementById(scoreEls[k]);
    if (b) b.style.width = Math.min(100, Math.max(0, s[k])) + '%';
    if (sc) sc.textContent = Math.round(Math.min(100, Math.max(0, s[k])));
  }

  var traps = e.traps; var tw = [];
  if (traps.T01) tw.push('T01');
  if (traps.T03) tw.push('T03');
  if (traps.T04) tw.push('T04');
  if (traps.T05) tw.push('T05');
  if (traps.T06) tw.push('T06');
  if (traps.T08) tw.push('T08');
  var ap = document.getElementById('antiPatternWarn');
  if (ap) ap.textContent = tw.length ? '⚠️ ' + tw.join(' / ') : '';

  if (engine.ctx.demoPromised && engine.npcMood === 'FOLLOW') {
    setTimeout(function() {
      showWhisper('info', '🎯 NPC-周开始跟从你了。可以结束练习查看反馈——了解你的P步骤评分和管理倾向。MTP7·11：榜样激励+OJT四步骤。');
    }, 1500);
  }
}

function showWhisper(type, msg) {
  var el = document.getElementById('msgList');
  var d = document.createElement('div');
  d.className = type === 'warn' ? 'whisper warn' : 'whisper';
  d.innerHTML = '<span style="flex-shrink:0;margin-top:1px">' + (type==='warn'?'⚠️':'💡') + '</span><span>' + msg + '</span>';
  el.appendChild(d); el.scrollTop = el.scrollHeight;
}

function escHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

(function() {
  engine.reset(); updateUI();
  var w = document.getElementById('initialWhisper');
  if (w) w.innerHTML = '<span style="flex-shrink:0;margin-top:1px">💡</span><span>你最弱的P步骤：<strong>P₂ 建立信任</strong>（35分）。今天注意这一条——<strong>先做一件让NPC-周抬头看你的事</strong>。MTP3·8：非权力影响力来自"专家权+典范权"。</span>';
  document.getElementById('chatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  if (typeof window !== 'undefined' && window.capabilityClient) {
    console.log('🤖 AI模式：对话由 mdp_coach_ai_conversation_reply_1 驱动');
  } else {
    console.log('📋 本地模式：对话由上下文引擎驱动（部署到低代码平台后自动切换AI模式）');
  }
})();
