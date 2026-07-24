// src/pages/ScenarioChat.tsx
// 对话智能体 · AI插件驱动NPC对话 · language_profile嵌入 · 匹配v4设计

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

interface Message { role: 'user'|'npc'|'system'; content: string; action?: string; }
interface DecisionRecord { dp_id: string; sequence: number; selected_option: string; is_correct: boolean; trap_type: string; timestamp: string; }

const FOCUS_LABELS = ['先做事不说话','先问你觉得呢','替团队做减法','亲自做给他们看'];
const MOODS: Record<string,{label:string;desc:string}> = {
  WATCH:{label:'在观望',desc:'见过太多空降领导——先看你是真有本事还是只会画饼。'},
  TEST:{label:'在试探',desc:'你展示了一点东西——他拿客户来试你。'},
  VERIFY:{label:'在验证',desc:'方向有了——他在等证据。'},
  FOLLOW:{label:'开始跟从',desc:'他主动来找你——这不是服从，是认可。'}
};

const ScenarioChat: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState<'loading'|'prepare'|'bridge'|'focus'|'chat'|'selfEval'>('loading');
  const [selfScores, setSelfScores] = useState([5,5,5,5]);
  const [turnCount, setTurnCount] = useState(0);
  const [focusIdx, setFocusIdx] = useState(0);
  const [mood, setMood] = useState('WATCH');
  const [health, setHealth] = useState(30);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [sessionId, setSessionId] = useState<string|null>(null);
  const msgEnd = useRef<HTMLDivElement>(null);

  // 构建 NPC System Prompt — 嵌入完整 language_profile
  const buildSystemPrompt = useCallback(() => {
    if (!card) return '';
    var npc = card.context?.team_state?.key_individuals?.[0];
    if (!npc) return '';
    var lp = npc.language_profile || {};
    return `你是${npc.name}。${npc.role}。司龄${npc.tenure}年。

【你怎么说话】
用这些词：${(lp.vocabulary?.use||[]).join('、')}
绝不用这些词：${(lp.vocabulary?.avoid||[]).join('、')}
句式：${lp.sentence_style||'短句为主，自然对话'}

【什么让你防御】${(lp.emotional_triggers?.defensive||[]).join('、')}
【什么让你开口】${(lp.emotional_triggers?.open_up||[]).join('、')}

【你心里在想但不说】${lp.hidden_motivation||''}

【当前局面】${card.context?.learner_role?.identity||''}。${card.context?.situation?.project_status||''}。${card.context?.opening_scene?.trigger||''}

【管理者的目标】取得团队的信任，激励大家去努力找到目标和意义。如果对话结束时你主动拿客户去问他——说明他做到了。

【管理者这次聚焦练的是】${FOCUS_LABELS[focusIdx]}

【管理者对自己的评估】建立信任${selfScores[0]}分 诊断问题${selfScores[1]}分 示范赋能${selfScores[2]}分 重构目标${selfScores[3]}分

【你现在的情绪状态】${MOODS[mood]?.label||'在观望'}——${MOODS[mood]?.desc||''}

【回应规则】每次1-3句短句。回应跟对方刚说的内容直接相关。不要用管理术语——你是${npc.role}。被冒犯时先沉默。觉得对方值得跟时语气从客气变直接。`;
  }, [card, focusIdx, selfScores, mood]);

  // 加载场景卡
  useEffect(() => { (async () => {
    try {
      var resp = await axiosForBackend.get('/api/coaching/scenario-cards/'+sceneId);
      var c = typeof resp.data.scenarioCard==='string'?JSON.parse(resp.data.scenarioCard):resp.data.scenarioCard;
      setCard(c);
      var sResp = await axiosForBackend.post('/api/coaching/sessions/with-decision-path',{sceneId,decisionPath:{scenario_id:sceneId,started_at:new Date().toISOString(),decisions:[],golden_path_match_rate:0}});
      setSessionId(sResp.data.id);
      setPhase('prepare');
    } catch(e:any) { setPhase('loading'); }
  })();}, [sceneId]);

  // 开始对话
  const startChat = () => { setPhase('chat'); setMessages([{role:'system',content:'💡 聚焦：'+FOCUS_LABELS[focusIdx]+'。老周在等你开口。'}]); };

  // 发送消息
  const send = useCallback(async () => {
    var text = input.trim(); if (!text||sending||!card) return;
    setInput(''); setSending(true); setTurnCount(t=>t+1);
    var newMsgs = [...messages, {role:'user' as const, content:text}];
    setMessages(newMsgs);

    try {
      var npcResp = '', npcAction = '';
      var plugin = capabilityClient.load('mdp_coach_ai_conversation_reply_1');
      if (plugin) {
        var result = await plugin.call('textGenerate', {
          system_prompt: buildSystemPrompt(),
          user_message_history: JSON.stringify(newMsgs.filter(m=>m.role!=='system').slice(-8).map(m=>({role:m.role==='npc'?'assistant':'user',content:(m.action||'')+' '+m.content}))),
        });
        var raw = result.content || result.text || '';
        var actionMatch = raw.match(/^（(.*?)）/) || raw.match(/^\((.*?)\)/);
        if (actionMatch) { npcAction = actionMatch[1]; raw = raw.replace(actionMatch[0],'').trim(); }
        npcResp = raw;
      } else {
        npcResp = '（演示模式——部署妙搭后接入AI插件）';
      }

      // 推进阶段
      if (/数据|客户.*情况|怎么.*样|示范区|来访/.test(text)) { setHealth(h=>Math.min(100,h+8)); setMood('TEST'); }
      else if (/你.*觉得|你.*帮.*看|怎么看|你比我/.test(text)) { setHealth(h=>Math.min(100,h+12)); setMood('VERIFY'); }
      else if (/聚焦|砍掉|主力|做.*减法|就推/.test(text)) { setHealth(h=>Math.min(100,h+15)); setMood('FOLLOW'); }
      else if (/我来|亲自|打样|做.*一单/.test(text)) { setHealth(h=>Math.min(100,h+20)); }

      // 聚焦联动陷阱检测
      if (/对比表|培训|教.*方法/.test(text)&&focusIdx===2) {
        setMessages(prev=>[...prev,{role:'npc',content:npcResp,action:npcAction},{role:'system',content:'⚠️ 你聚焦做减法——但刚才给了工具/培训。试试直接说就推这两个。'}]);
      } else {
        setMessages(prev=>[...prev,{role:'npc',content:npcResp,action:npcAction}]);
      }
    } catch(e) { setMessages(prev=>[...prev,{role:'system',content:'对话出错，请重试'}]); }
    setSending(false);
  }, [input,sending,card,messages,focusIdx,buildSystemPrompt]);

  // 结束对话 → 先到 selfEval 阶段
  const goSelfEval = useCallback(() => { setPhase('selfEval'); }, []);

  // 保存数据并跳转反馈页
  const finishWithEval = useCallback(async (postScore: number) => {
    var data = {
      selfAssessment: {
        bridgeScores: selfScores,
        focusArea: FOCUS_LABELS[focusIdx],
        postEval: postScore,
      },
      finalMood: mood,
      healthScore: health,
      roundCount: turnCount,
      timestamp: new Date().toISOString()
    };
    try { localStorage.setItem('tg001_session_data',JSON.stringify(data)); } catch(e) {}
    if (sessionId) {
      await axiosForBackend.patch('/api/coaching/sessions/'+sessionId+'/decision-path',{
        decisionPath: {scenario_id:sceneId,completed_at:new Date().toISOString(),decisions,golden_path_match_rate:decisions.filter((d:DecisionRecord)=>d.is_correct).length/Math.max(1,decisions.length)},
        messages: messages.filter(m=>m.role!=='system'),
        selfAssessment: data.selfAssessment,
        scoreResult: health,
        roundCount: turnCount,
        status: 'completed',
      });
    }
    navigate('/scenario/'+sceneId+'/feedback?session='+sessionId);
  }, [sessionId,decisions,sceneId,focusIdx,mood,health,turnCount,selfScores,messages,navigate]);

  useEffect(() => { msgEnd.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  if (phase==='loading') return <div className="flex items-center justify-center min-h-screen text-gray-500">加载场景...</div>;
  if (!card) return null;

  // 准备页 — 四要素卡片
  if (phase==='prepare') {
    var npc1 = card.context?.team_state?.key_individuals?.[0];
    var challenges = [
      '团队连续干了一个多月，早会上没人说话——不是偷懒，是透支了。你说的第一句话、做的第一个动作，会被拿来跟前四任比。',
      '你是支援者，不是直属上级。加不了钱。你手里就两样东西：你爬楼看户型得到的数据，和你接下来做的事。',
      '方向定了，但他们见过太多次"上面说一套、实际做一套"。你只有20天。光说没用——你得让他们亲眼看到，这条路走得通。'
    ];
    return (
      <div className="max-w-lg mx-auto px-5 py-8" style={{fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-7 shadow-sm border border-white/50">
          {/* 人物 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">{npc1?.name?.[0]||'周'}</div>
            <div><div className="text-lg font-bold text-gray-900">{npc1?.name||'老周'}</div><div className="text-sm text-gray-500">{npc1?.role||''} · 司龄{npc1?.tenure||''}年</div><div className="text-xs text-amber-600 mt-0.5 italic">"{npc1?.attitude||''}"</div></div>
          </div>
          {/* 情境 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm leading-relaxed text-gray-700">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">情境</div>
            {card.context?.situation?.project_status||''}<br/><br/>
            {card.context?.opening_scene?.trigger||''}
          </div>
          {/* 挑战 */}
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">任务挑战</div>
            {challenges.map((c,i)=><div key={i} className="flex gap-2 mb-2 text-sm text-gray-700 leading-relaxed"><span className="text-amber-600 font-bold flex-shrink-0">{i+1}.</span><span>{c}</span></div>)}
          </div>
          {/* 目标 */}
          <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-sm leading-relaxed text-gray-800">
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">目标</div>
            取得团队的信任，并且激励大家一起去努力找到目标和意义。<br/>
            比如对话结束时，老周主动拿客户来问你："这个策略需要你的帮助。"
          </div>
          <button onClick={()=>setPhase('bridge')} className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">开始对话</button>
        </div>
      </div>
    );
  }

  // 桥接自评弹窗
  if (phase==='bridge') {
    var dims=['建立信任','诊断问题','示范赋能','重构目标'];
    var [scores,setScores]=[Array(4).fill(5),null] as any;
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-5">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="text-base font-bold text-gray-900 mb-1">开始之前，快速自评</div>
          <div className="text-xs text-gray-400 mb-5">你觉得自己在这四个维度上分别能得几分？</div>
          {dims.map((d,i)=>(<div key={i} className="mb-3 text-left"><div className="flex justify-between text-xs text-gray-600 mb-1"><span>{d}</span><span className="font-bold">{scores[i]}</span></div><input type="range" min="1" max="10" defaultValue={5} onChange={e=>{var n=[...scores];n[i]=parseInt(e.target.value);setScores(n);}} className="w-full accent-gray-900"/></div>))}
          <button onClick={()=>{setSelfScores(scores);try{localStorage.setItem('scenario_self_eval_'+sceneId,JSON.stringify({dims:dims,scores:scores,timestamp:new Date().toISOString()}));}catch(e){}setPhase('focus');}} className="mt-4 w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold">进入对话</button>
        </div>
      </div>
    );
  }

  // selfEval 阶段 — 页面内自评UI（替代浏览器prompt）
  if (phase==='selfEval') {
    var [postScore, setPostScore] = [5, null] as any;
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-5">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="text-base font-bold text-gray-900 mb-1">对话结束，快速自评</div>
          <div className="text-xs text-gray-400 mb-5">你觉得刚才这场对话做得怎么样？</div>
          <div className="text-4xl font-bold text-amber-600 mb-4" id="postScoreDisplay">5</div>
          <input type="range" min="1" max="10" defaultValue={5} onChange={e=>{setPostScore(parseInt(e.target.value));var el=document.getElementById('postScoreDisplay');if(el)el.textContent=e.target.value;}} className="w-full accent-amber-500 mb-6"/>
          <div className="flex justify-between text-xs text-gray-400 mb-6"><span>1 还需努力</span><span>10 非常满意</span></div>
          <button onClick={()=>finishWithEval(postScore||5)} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">查看反馈报告 →</button>
        </div>
      </div>
    );
  }

  if (phase==='focus') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-5">
      <div className="max-w-sm w-full bg-white rounded-2xl p-8 shadow-sm text-center">
        <h3 className="text-base font-bold text-gray-900 mb-1">这次对话，你最想练什么？</h3>
        <p className="text-xs text-gray-400 mb-5">选一个——老周会在这个维度上特别考验你</p>
        {FOCUS_LABELS.map((l,i)=>(
          <div key={i} onClick={()=>setFocusIdx(i)} className={`p-3 mb-2 rounded-xl border cursor-pointer text-sm text-left transition-all ${focusIdx===i?'border-amber-400 bg-amber-50 font-semibold text-amber-700':'border-gray-100 text-gray-600 hover:border-gray-300'}`}>{l}</div>
        ))}
        <button onClick={startChat} className="mt-4 w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold">开始对话</button>
      </div>
    </div>
  );

  var npc = card.context?.team_state?.key_individuals?.[0];
  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col px-4 py-6" style={{fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">{npc?.name?.[0]||'周'}</div>
        <div><span className="font-semibold text-gray-900 text-sm">{npc?.name||'NPC'}</span><span className="text-xs text-amber-600 ml-2">{MOODS[mood]?.label||''}</span></div>
        <div className="ml-auto text-xs text-gray-400">{FOCUS_LABELS[focusIdx]}</div>
      </div>
      <div className="h-1 bg-gray-100 rounded-full mb-4 flex-shrink-0"><div className="h-1 rounded-full bg-amber-500 transition-all duration-700" style={{width:health+'%'}}/></div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.map((m,i)=>(
          <div key={i} className={m.role==='user'?'flex justify-end':''}>
            {m.role==='system'?(
              <div className={`mx-0 my-1 px-3 py-1.5 rounded-lg text-xs italic border-l-2 ${m.content.startsWith('⚠️')?'bg-orange-50 border-orange-400 text-orange-700':'bg-blue-50 border-blue-400 text-blue-700'}`}>{m.content}</div>
            ):m.role==='user'?(
              <div className="inline-block max-w-[80%] px-4 py-2.5 bg-gray-900 text-white rounded-2xl rounded-br-md text-sm">{m.content}</div>
            ):(
              <div className="inline-block max-w-[80%]">
                {m.action && <div className="text-xs text-amber-600 italic mb-1 ml-1">{m.action}</div>}
                <div className="px-4 py-2.5 bg-white border border-gray-100 rounded-2xl rounded-bl-md text-sm text-gray-800 shadow-sm">{m.content}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={msgEnd}/>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder="输入你的回应..." disabled={sending}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-white" />
        <button onClick={send} disabled={sending||!input.trim()} className="px-5 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-30">发送</button>
      </div>
      <button onClick={goSelfEval} className="w-full mt-3 py-3 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 flex-shrink-0">结束对话，查看反馈 →</button>
    </div>
  );
};

export default ScenarioChat;
