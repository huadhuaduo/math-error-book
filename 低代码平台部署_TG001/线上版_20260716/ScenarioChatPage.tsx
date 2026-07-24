// ScenarioChatPage.tsx — 完整版（对标 TG001 全流程）
// Phase: loading → selfEval → focusSelect → transition → chat ↔ decision → postSelfEval → feedback
// 过渡页内嵌为 transition 阶段，不通过路由跳转——避免组件重挂载、状态丢失
// 场景卡 JSON 五模块协议是唯一数据源，不硬编码任何场景特定内容
// @version 2026-07-16 final

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getMatchedAvatar } from '@client/src/utils/avatar-matcher';

/* ================================================================== */
type Phase = 'loading' | 'selfEval' | 'focusSelect' | 'transition' | 'chat' | 'decision' | 'postSelfEval';

const BRIDGE_DIMS = ['建立信任', '诊断问题', '示范赋能', '重构目标'];
const MOOD_LABELS: Record<string, string> = { WATCH:'在观望', TEST:'在试探', VERIFY:'在验证', FOLLOW:'开始跟从' };

/* ===== 过渡页视觉主题 ===== */
type LocTheme = 'sales' | 'outdoor' | 'office' | 'default';
const THEMES: Record<LocTheme, { name:string; bg:string; amb1:string; amb2:string; doorLabel:string; doorColor:string; doorDark:string; doorPanel:string; icon:string }> = {
  sales:   { name:'售楼处', bg:'linear-gradient(180deg,#2d2520 0%,#3a3228 30%,#F8F4EE 65%,#EDE4D8 100%)', amb1:'#FDE68A', amb2:'#FEF3C7', doorLabel:'推开售楼处的门', doorColor:'linear-gradient(180deg,#8B7355,#5C4A36)', doorDark:'linear-gradient(180deg,#3A2E20,#2A1F14)', doorPanel:'linear-gradient(180deg,#C4A882,#9E8566 60%,#7A6548)', icon:'🏗️' },
  outdoor: { name:'项目现场', bg:'linear-gradient(180deg,#87CEEB 0%,#B0D4E8 25%,#D4C8B8 60%,#C8BAA8 100%)', amb1:'#BAE6FD', amb2:'#D1FAE5', doorLabel:'推开工地大门', doorColor:'linear-gradient(180deg,#6B7280,#4B5563)', doorDark:'linear-gradient(180deg,#374151,#1F2937)', doorPanel:'linear-gradient(180deg,#9CA3AF,#6B7280 60%,#4B5563)', icon:'🚧' },
  office:  { name:'办公室', bg:'linear-gradient(180deg,#1E293B 0%,#334155 25%,#F1F5F9 60%,#E2E8F0 100%)', amb1:'#DBEAFE', amb2:'#E0E7FF', doorLabel:'推开会议室的门', doorColor:'linear-gradient(180deg,#64748B,#475569)', doorDark:'linear-gradient(180deg,#334155,#1E293B)', doorPanel:'linear-gradient(180deg,#CBD5E1,#94A3B8 60%,#64748B)', icon:'🚪' },
  default: { name:'', bg:'linear-gradient(160deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)', amb1:'#FEE2E2', amb2:'#FEF3C7', doorLabel:'推门进入', doorColor:'linear-gradient(180deg,#8B6F4E,#6B5540)', doorDark:'linear-gradient(180deg,#4A3D2E,#3A3025)', doorPanel:'linear-gradient(180deg,#C4A882,#A68B6B 60%,#8B7355)', icon:'🚪' },
};
function detectTheme(location: string): LocTheme {
  const l = location.toLowerCase();
  if (/售楼|沙盘|案场|样板|销售|接待|展厅|签约|认购/.test(l)) return 'sales';
  if (/工地|项目.*现场|户外|施工|泥浆|塔吊|脚手架|基坑|围挡/.test(l)) return 'outdoor';
  if (/办公|会议|工位|房间|室内|写字楼/.test(l)) return 'office';
  return 'default';
}

/* ================================================================== */
const ScenarioChatPage: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();

  // 数据
  const [card, setCard] = useState<any>(null);
  const [sceneCtx, setSceneCtx] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [doorOpened, setDoorOpened] = useState(false);

  // 自评
  const [selfScores, setSelfScores] = useState<number[]>([5,5,5,5]);
  const [postEvalScore, setPostEvalScore] = useState(5);

  // 聚焦
  const [focusIdx, setFocusIdx] = useState(0);

  // 对话
  const [messages, setMessages] = useState<Array<{ role:string; content:string; action?:string }>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mood, setMood] = useState('WATCH');
  const [health, setHealth] = useState(30);
  const [turnCount, setTurnCount] = useState(0);
  const [decisions, setDecisions] = useState<Array<{ dp_id:string; sequence:number; selected_option:string; is_correct:boolean; trap_type:string; timestamp:string }>>([]);
  const [currentDpIdx, setCurrentDpIdx] = useState(0);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [transitionDone, setTransitionDone] = useState(false);
  const msgEnd = useRef<HTMLDivElement>(null);

  // 派生
  const npc = card?.context?.team_state?.key_individuals?.[0];
  const npcName = npc?.name || 'NPC';
  const decisionPoints: any[] = card?.decision_points || [];
  const prep = sceneCtx?.preparation || sceneCtx?.teamMotivation?.preparation || {};
  const challenges: string[] = prep?.challenges || [card?.context?.situation?.project_status || ''];
  const goalText = (prep?.goal || card?.feedback_criteria?.golden_path_narrative || '完成本次对话练习').replace(/<[^>]*>/g, '');
  const locationText = card?.context?.opening_scene?.location || '';
  const locTheme = useMemo(() => detectTheme(locationText), [locationText]);
  const theme = THEMES[locTheme];
  const hiddenMotivation = npc?.language_profile?.hidden_motivation || '';

  const focusLabels = useMemo(() =>
    decisionPoints.length > 0
      ? decisionPoints.map((dp:any) => dp.trigger?.pause_text || dp.p_step || '')
      : ['先观察再行动','深入沟通了解','替团队做减法','亲自做给他们看'],
  [decisionPoints]);

  // 桥接消息
  const bridgeMsg = useMemo(() => {
    try {
      const raw = localStorage.getItem(`scenario_self_eval_${sceneId}`);
      if (raw) {
        const d = JSON.parse(raw); const scores:number[] = d.scores||[5,5,5,5]; const dims:string[] = d.dims||BRIDGE_DIMS;
        const lo = scores.indexOf(Math.min(...scores));
        return `你给"${dims[lo]}"打了${scores[lo]}分，这次看看实际表现如何`;
      }
    } catch {}
    return '深呼吸，准备好面对一个真实的管理困境';
  }, [sceneId]);

  /* ===== 初始化 ===== */
  useEffect(() => {
    (async () => {
      try {
        const resp = await axiosForBackend.get('/api/coaching/scenario-cards/' + sceneId);
        const c = typeof resp.data.scenarioCard === 'string' ? JSON.parse(resp.data.scenarioCard) : resp.data.scenarioCard;
        const ctx = typeof resp.data.scenarioContext === 'string' ? JSON.parse(resp.data.scenarioContext) : resp.data.scenarioContext;
        setCard(c); setSceneCtx(ctx);
        const sResp = await axiosForBackend.post('/api/coaching/sessions/with-decision-path', {
          sceneId, decisionPath:{scenario_id:sceneId,started_at:new Date().toISOString(),decisions:[],golden_path_match_rate:0},
        });
        setSessionId(sResp.data.id);
        try {
          const raw = localStorage.getItem(`scenario_self_eval_${sceneId}`);
          if (raw) { const d = JSON.parse(raw); if (d.scores) setSelfScores(d.scores); if (typeof d.focusIdx==='number') setFocusIdx(d.focusIdx); }
        } catch {}
        const skip = new URLSearchParams(window.location.search).get('skipPrepare') === '1';
        if (skip) { window.history.replaceState({}, '', window.location.pathname); setPhase('chat'); }
        else setPhase('selfEval');
      } catch (e:any) { logger.error('场景加载失败',String(e)); }
    })();
  }, [sceneId]);

  useEffect(() => { msgEnd.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  /* ===== System Prompt ===== */
  const buildSystemPrompt = useCallback(() => {
    if (!card || !npc) return '';
    const lp = npc.language_profile || {};
    const loc = card.context?.opening_scene?.location||'';
    const time = card.context?.opening_scene?.time||'';
    const situation = card.context?.situation?.project_status||'';
    const learnerRole = card.context?.learner_role?.identity||'管理者';
    const constraints = card.context?.constraints?.political_sensitivity||'';
    const seText = BRIDGE_DIMS.map((d,i)=>`${d}:${selfScores[i]}分`).join('、');
    const chText = challenges.map((c:string)=>c.replace(/<[^>]*>/g,'')).join('；');
    const cdp = decisionPoints[currentDpIdx];
    const dpCue = cdp ? `\n\n【即将到来的决策时刻】\n当对话自然推进到以下情境时，在你的回复末尾加上[DECISION_READY]标记。不要提前，不要生硬。\n情境：${cdp.trigger?.context_cue||''}\n需要让管理者面对的问题：${cdp.trigger?.pause_text||''}` : '';

    return `你是${npc.name}。${npc.role}。司龄${npc.tenure}年。${lp.hidden_motivation?'你心里在想但不会说出来：'+lp.hidden_motivation:''}

【当前局面】${learnerRole}。${situation}。${loc}。${time}。${constraints}
【任务挑战】${chText}
【管理者目标】${goalText}
【管理者自评】${seText}
【本次聚焦】${focusLabels[focusIdx]||''}

【你怎么说话】
用这些词：${(lp.vocabulary?.use||[]).join('、')||'日常用语'}
绝不用：${(lp.vocabulary?.avoid||[]).join('、')||'管理术语'}
句式：${lp.sentence_style||'短句为主'}
不要用管理术语——你是${npc.role}，不是培训师。每次2-4句。

【什么让你防御】${(lp.emotional_triggers?.defensive||[]).join('、')||'命令式语气、空洞承诺'}
【什么让你开口】${(lp.emotional_triggers?.open_up||[]).join('、')||'对方展示了业务能力、问了你的看法'}
${dpCue}

【严格遵守】你就是${npc.name}本人。你不是AI助手，不是管理教练——你是${npc.role}。不要给建议、不要分析局面。`;
  }, [card, npc, selfScores, focusIdx, focusLabels, challenges, goalText, currentDpIdx, decisionPoints]);

  /* ===== 自评→聚焦 ===== */
  const saveEval = () => { try { localStorage.setItem(`scenario_self_eval_${sceneId}`,JSON.stringify({scores:selfScores,dims:BRIDGE_DIMS,focusIdx})); } catch {} };

  /* ===== 决策点 ===== */
  const handleDecisionSelect = (optId:string) => {
    const dp = decisionPoints[currentDpIdx]; if (!dp) return;
    const opt = dp.options?.find((o:any)=>o.id===optId); if (!opt) return;
    setDecisions(p=>[...p,{dp_id:dp.dp_id,sequence:dp.sequence,selected_option:optId,is_correct:opt.is_best_path,trap_type:opt.is_best_path?'无':(opt.trap_type||'策略偏差'),timestamp:new Date().toISOString()}]);
    if (opt.is_best_path) { setHealth(h=>Math.min(100,h+15)); setMood(m=>m==='WATCH'?'TEST':m==='TEST'?'VERIFY':'FOLLOW'); }
    setMessages(p=>[...p,{role:'system',content:opt.is_best_path?`✅ ${opt.consequence?.immediate||''}`:`⚠️ ${opt.trap_type||'策略偏差'}。${opt.trap_mechanism||opt.consequence?.immediate||''}`}]);
    setCurrentDpIdx(p=>p+1); setTurnCount(0); setPhase('chat');
  };

  /* ===== 发送 ===== */
  const send = useCallback(async () => {
    const text = input.trim(); if (!text||sending||!card) return;
    setInput(''); setSending(true);
    const nms = [...messages,{role:'user',content:text}]; setMessages(nms);
    const nt = turnCount+1; setTurnCount(nt);
    try {
      let r='', a='';
      const pl = capabilityClient.load('mdp_coach_ai_conversation_reply_1');
      if (pl) {
        const res = await pl.call('textGenerate',{system_prompt:buildSystemPrompt(),user_message_history:JSON.stringify(nms.filter(m=>m.role!=='system').slice(-10).map(m=>({role:m.role==='npc'?'assistant':'user',content:(m.action||'')+' '+m.content})))});
        const raw = (res as any).content||(res as any).text||'';
        const am = raw.match(/^[（(]([^）)]+)[）)]/);
        if (am) { a=am[0]; r=raw.slice(am[0].length).trim(); } else r=raw;
        if (r.includes('[DECISION_READY]')) { r=r.replace('[DECISION_READY]','').trim(); setMessages(p=>[...p,{role:'npc',content:r,action:a}]); if (currentDpIdx<decisionPoints.length) setTimeout(()=>setPhase('decision'),900); setSending(false); return; }
      } else r='（演示模式）';
      if (/理解|一起|你的.*想|你觉得|你怎么看/.test(text)) setHealth(h=>Math.min(100,h+8));
      else if (/必须|没有选择|按我说/.test(text)) setHealth(h=>Math.max(0,h-10));
      setMessages(p=>[...p,{role:'npc',content:r,action:a}]);
    } catch(e) { setMessages(p=>[...p,{role:'system',content:'对话出错，请重试'}]); }
    setSending(false);
  },[input,sending,card,messages,turnCount,currentDpIdx,decisionPoints,buildSystemPrompt]);

  /* ===== 结束 ===== */
  const handlePostEvalSubmit = useCallback(async () => {
    const cc = decisions.filter(d=>d.is_correct).length;
    const mr = decisions.length>0?cc/decisions.length:0;
    try { if (sessionId) { await axiosForBackend.patch('/api/coaching/sessions/'+sessionId+'/decision-path',{decisionPath:{scenario_id:sceneId,completed_at:new Date().toISOString(),decisions,golden_path_match_rate:mr}}); await axiosForBackend.patch('/api/coaching/sessions/'+sessionId,{messages:messages.filter(m=>m.role!=='system'),scoreResult:health,roundCount:turnCount,status:'completed',completedAt:new Date().toISOString(),selfAssessment:{bridgeScores:selfScores,bridgeDims:BRIDGE_DIMS,focusArea:focusLabels[focusIdx]||'',postEvalScore,moodHistory:mood}}); } } catch(e) { logger.warn('保存失败',String(e)); }
    navigate('/scenario/'+sceneId+'/feedback?session='+sessionId);
  },[sessionId,decisions,messages,health,turnCount,selfScores,focusIdx,focusLabels,postEvalScore,mood,sceneId,navigate]);

  /* ===== 暂停 ===== */
  const lastNpcMsg = messages.filter(m=>m.role==='npc'&&m.content).pop()?.content?.slice(0,120)||'';
  const pauseQs = useMemo(() => [decisionPoints[currentDpIdx]?.trigger?.context_cue||'', `聚焦"${focusLabels[focusIdx]||''}"——你做到了吗？`, '你的回应是在诊断还是在给方案？'],[currentDpIdx,decisionPoints,focusIdx,focusLabels]);

  /* ============================ 渲染 ============================ */
  const cardCls: React.CSSProperties = { background:'rgba(255,255,255,.5)',backdropFilter:'blur(22px)',WebkitBackdropFilter:'blur(22px)',border:'1px solid rgba(255,255,255,.5)',borderRadius:20,padding:'36px 28px 24px',boxShadow:'0 4px 24px rgba(0,0,0,.04)' };

  if (phase==='loading') return <div className="flex items-center justify-center min-h-screen text-gray-500" style={{fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif",background:'#F8F6F2'}}>加载场景...</div>;
  if (!card) return null;

  /* ---- 自评页 ---- */
  if (phase==='selfEval') return (
    <div className="min-h-screen overflow-y-auto flex items-center justify-center p-5" style={{background:'linear-gradient(160deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)',fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
      <div className="max-w-[440px] w-full" style={cardCls}>
        <div className="flex items-center gap-3 mb-5"><img src={getMatchedAvatar({sceneId,npc})} alt={npcName} className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white"/><div><div className="text-lg font-bold text-[#1C1917]">{npcName}</div><div className="text-[12px] text-[#78716C]">{npc?.role||''} · 司龄{npc?.tenure||''}年</div>{npc?.attitude&&<div className="text-[11px] text-amber-600 italic mt-0.5">&ldquo;{npc.attitude}&rdquo;</div>}</div></div>
        <div className="rounded-xl p-3.5 mb-4 text-[12px] leading-relaxed text-[#57534E]" style={{background:'rgba(255,255,255,.4)',border:'1px solid rgba(0,0,0,.03)'}}><div className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-1.5">情境</div>{card.context?.situation?.project_status||''}</div>
        {challenges.length>0&&<div className="mb-4"><div className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">挑战</div>{challenges.map((c:string,i:number)=><div key={i} className="text-[11px] text-[#57534E] leading-relaxed py-1.5 flex gap-2" style={{borderBottom:i<challenges.length-1?'1px solid rgba(0,0,0,.03)':'none'}}><span className="text-amber-600 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'rgba(245,158,11,.1)'}}>{i+1}</span><span>{c.replace(/<[^>]*>/g,'')}</span></div>)}</div>}
        {goalText&&<div className="rounded-xl p-3 mb-5 text-[11px] leading-relaxed text-[#1C1917]" style={{background:'rgba(16,185,129,.04)',border:'1px solid rgba(16,185,129,.08)'}}><div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">目标</div>{goalText}</div>}
        <div className="border-t border-black/5 my-5"/>
        <h3 className="text-[14px] font-bold text-[#1C1917] mb-1">对话前自评</h3>
        <p className="text-[11px] text-[#A8A29E] mb-4">你觉得自己在以下四点各能打几分？</p>
        {BRIDGE_DIMS.map((dim,i)=><div key={i} className="py-2.5" style={{borderBottom:i<3?'1px solid rgba(0,0,0,.03)':'none'}}><div className="flex justify-between mb-1.5"><span className="text-[12px] font-medium text-[#1C1917]">{dim}</span><span className="text-[13px] font-bold">{selfScores[i]}</span></div><input type="range" min={1} max={10} value={selfScores[i]} onChange={e=>{const n=[...selfScores];n[i]=+e.target.value;setSelfScores(n);}} className="w-full h-1.5 rounded-full cursor-pointer" style={{background:`linear-gradient(to right,#D4A574 ${((selfScores[i]-1)/9)*100}%,rgba(0,0,0,.08) ${((selfScores[i]-1)/9)*100}%)`,accentColor:'#D4A574'}}/></div>)}
        <button onClick={()=>{saveEval();setPhase('focusSelect');}} className="w-full py-3.5 mt-5 rounded-2xl text-[15px] font-semibold text-white transition-all hover:opacity-90" style={{background:'#1C1917',border:'none',cursor:'pointer',fontFamily:'inherit'}}>继续</button>
      </div>
    </div>
  );

  /* ---- 聚焦选择 ---- */
  if (phase==='focusSelect') return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{background:'linear-gradient(160deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)',fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
      <div className="max-w-[380px] w-full rounded-2xl p-7 text-center" style={{background:'rgba(255,255,255,.9)',backdropFilter:'blur(20px)',boxShadow:'0 12px 40px rgba(0,0,0,.1)'}}>
        <h3 className="text-[15px] font-bold text-[#1C1917] mb-1">这次对话，你最想练什么？</h3>
        <p className="text-[11px] text-[#A8A29E] mb-4">选一个——NPC会在这个维度上特别考验你</p>
        {focusLabels.map((l:string,i:number)=><div key={i} onClick={()=>setFocusIdx(i)} className="cursor-pointer text-[12px] text-left px-3.5 py-2.5 rounded-xl my-1.5 transition-all" style={{border:focusIdx===i?'1px solid #B8854A':'1px solid rgba(0,0,0,.08)',background:focusIdx===i?'rgba(212,165,116,.08)':'#fff',color:focusIdx===i?'#B8854A':'#44403C',fontWeight:focusIdx===i?600:400}}>{l}</div>)}
        <button onClick={()=>{saveEval();setPhase('transition');}} className="w-full py-3 rounded-xl text-[14px] font-semibold text-white mt-3.5 transition-all hover:opacity-90" style={{background:'#1C1917',border:'none',cursor:'pointer',fontFamily:'inherit'}}>开始对话</button>
      </div>
    </div>
  );

  /* ---- 过渡页（内嵌，不跳路由） ---- */
  if (phase==='transition') return (
    <div style={{minHeight:'100vh',background:theme.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',padding:'50px 16px 50px',position:'relative',overflow:'hidden',fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','PingFang SC','Helvetica Neue',sans-serif",transition:'background .8s'}}>
      <style>{`
        .tr-amb{position:fixed;border-radius:50%;filter:blur(130px);pointer-events:none;z-index:0;opacity:.16;transition:background .8s}
        .tr-amb1{width:360px;height:360px;background:${theme.amb1};top:-80px;right:-60px}
        .tr-amb2{width:280px;height:280px;background:${theme.amb2};bottom:-40px;left:-30px}
        .tr-scene{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:420px;height:50%;pointer-events:none;z-index:1;opacity:.85}
        .tr-card{position:relative;z-index:10;background:rgba(255,255,255,.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.4);border-radius:18px;padding:24px 24px 16px;max-width:360px;width:90vw;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.05);margin-bottom:18px}
        .tr-loc{font-size:11px;color:#78716C;font-weight:500;display:inline-flex;align-items:center;gap:5px;padding:3px 12px;border-radius:14px;background:rgba(0,0,0,.03);margin-bottom:12px}
        .tr-av{width:56px;height:56px;border-radius:50%;object-fit:cover;box-shadow:0 6px 24px rgba(0,0,0,.1);border:2px solid rgba(255,255,255,.6);margin-bottom:4px}
        .tr-name{font-size:15px;font-weight:700;color:#1C1917}.tr-att{font-size:10px;color:#B8854A;font-style:italic;margin-top:2px;line-height:1.4}
        .tr-hm{margin-top:10px;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.04)}.tr-hml{font-size:9px;font-weight:600;color:#A8A29E;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}.tr-hmt{font-size:11px;color:#57534E;font-style:italic;line-height:1.5}
        .tr-msg{font-size:12px;color:#44403C;line-height:1.6;margin-top:8px}
        .tr-wrap{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:8px}
        .tr-door{cursor:pointer;perspective:600px;transition:transform .2s}.tr-door:active{transform:scale(.97)}
        .tr-frame{width:96px;height:140px;border-radius:48px 48px 8px 8px;background:${theme.doorColor};padding:5px;box-shadow:0 8px 30px rgba(0,0,0,.15);transition:box-shadow .3s,background .6s}
        .tr-door:hover .tr-frame{box-shadow:0 14px 44px rgba(0,0,0,.22)}
        .tr-panel{width:100%;height:100%;border-radius:44px 44px 5px 5px;background:${theme.doorPanel};position:relative;transition:transform .6s ease;transform-origin:left center;box-shadow:inset 0 2px 8px rgba(255,255,255,.12)}
        .tr-handle{position:absolute;right:11px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#D4B896,#A68B6B);box-shadow:0 1px 3px rgba(0,0,0,.3),inset 0 1px 1px rgba(255,255,255,.3)}
        .tr-open .tr-panel{transform:rotateY(-35deg)}.tr-open .tr-frame{background:${theme.doorDark}}.tr-open{pointer-events:none}
        .tr-dl{text-align:center;font-size:12px;font-weight:600;color:#78716C;margin-top:8px;transition:color .3s}.tr-door:hover .tr-dl{color:#1C1917}.tr-open .tr-dl{color:#78716C}
        .tr-skip{font-size:11px;color:#A8A29E;cursor:pointer;transition:color .2s}.tr-skip:hover{color:#78716C}
        /* 场景插画 */
        ${locTheme==='sales'?`.tr-bld{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:240px;height:180px}.tr-roof{position:absolute;top:0;left:-18px;right:-18px;height:36px;background:linear-gradient(180deg,rgba(90,60,40,.7),rgba(70,45,30,.5));clip-path:polygon(10% 100%,50% 0%,90% 100%)}.tr-wall{position:absolute;top:26px;bottom:0;left:0;right:0;background:linear-gradient(180deg,rgba(200,180,155,.5),rgba(170,150,130,.4));border-radius:4px 4px 0 0}.tr-win{position:absolute;width:36px;height:44px;background:rgba(253,224,138,.35);border-radius:3px;border:2px solid rgba(255,255,255,.18);top:44px}.tr-w1{left:22px}.tr-w2{left:78px}.tr-w3{right:22px}.tr-w4{right:78px}`:locTheme==='outdoor'?`.tr-sky{position:absolute;top:0;left:0;right:0;height:60%;background:linear-gradient(180deg,rgba(135,195,235,.3),rgba(200,210,180,.2))}.tr-crane{position:absolute;top:10px;right:35px;width:5px;height:130px;background:rgba(80,70,60,.4)}.tr-crane:after{content:'';position:absolute;top:0;left:-28px;width:64px;height:4px;background:rgba(80,70,60,.4)}.tr-fence{position:absolute;bottom:0;left:0;right:0;height:70px;background:rgba(180,170,160,.4);border-top:4px solid rgba(140,120,100,.35)}.tr-hat{position:absolute;bottom:85px;left:50%;transform:translateX(-50%);width:26px;height:12px;background:rgba(220,170,50,.5);border-radius:13px 13px 3px 3px}`:locTheme==='office'?`.tr-hall{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:290px;height:190px}.tr-hw{position:absolute;inset:0;background:linear-gradient(180deg,rgba(220,225,235,.5),rgba(200,205,218,.4))}.tr-hf{position:absolute;bottom:0;left:0;right:0;height:50px;background:linear-gradient(0deg,rgba(180,185,195,.4),rgba(200,205,215,.2))}.tr-hl{position:absolute;top:22px;left:50%;transform:translateX(-50%);width:55px;height:5px;background:rgba(255,255,240,.5);border-radius:3px;box-shadow:0 0 18px rgba(255,255,240,.2)}`:''}
      `}</style>
      <div className="tr-amb tr-amb1"/><div className="tr-amb tr-amb2"/>
      {/* 场景插画 */}
      <div className="tr-scene">
        {locTheme==='sales'&&<div className="tr-bld"><div className="tr-roof"/><div className="tr-wall"/><div className="tr-win tr-w1"/><div className="tr-win tr-w2"/><div className="tr-win tr-w3"/><div className="tr-win tr-w4"/></div>}
        {locTheme==='outdoor'&&<><div className="tr-sky"/><div className="tr-crane"/><div className="tr-fence"/><div className="tr-hat"/></>}
        {locTheme==='office'&&<div className="tr-hall"><div className="tr-hw"/><div className="tr-hf"/><div className="tr-hl"/></div>}
      </div>
      {/* 信息卡片 */}
      <motion.div className="tr-card" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:.15,duration:.45}}>
        {locationText&&<div className="tr-loc"><span>{theme.icon}</span>{locationText}</div>}
        <img className="tr-av" src={getMatchedAvatar({sceneId,npc})} alt={npcName}/>
        <div className="tr-name">{npcName}</div>
        {npc?.attitude&&<div className="tr-att">&ldquo;{npc.attitude}&rdquo;</div>}
        {hiddenMotivation&&<div className="tr-hm"><div className="tr-hml">他在想但不会说出来</div><div className="tr-hmt">{hiddenMotivation}</div></div>}
        <div className="tr-msg">{bridgeMsg}</div>
      </motion.div>
      {/* 门 */}
      <motion.div className="tr-wrap" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:.5,duration:.45}}>
        <div className={`tr-door${doorOpened?' tr-open':''}`} onClick={()=>{if(doorOpened)return;setDoorOpened(true);setTimeout(()=>{setTransitionDone(true);const dp=decisionPoints[0];setMessages([{role:'system',content:dp?`对话开始。${npcName}看着你，等待你的回应。`:`对话开始。${npcName}在等你开口。`}]);setPhase('chat');},800);}} role="button" tabIndex={0}>
          <div className="tr-frame"><div className="tr-panel"><div className="tr-handle"/></div></div>
          <div className="tr-dl">{doorOpened?'正在进入...':theme.doorLabel}</div>
        </div>
        <p className="tr-skip" onClick={()=>{const dp=decisionPoints[0];setMessages([{role:'system',content:dp?`对话开始。${npcName}看着你，等待你的回应。`:`对话开始。${npcName}在等你开口。`}]);setPhase('chat');}}>跳过，直接开始</p>
      </motion.div>
    </div>
  );

  /* ---- 决策点弹窗 ---- */
  if (phase==='decision') {
    const dp = decisionPoints[currentDpIdx];
    if (!dp) { setPhase('chat'); return null; }
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:'rgba(28,25,23,.5)',fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
        <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} className="max-w-lg w-[90vw] bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-xs text-amber-600 font-semibold mb-1">决策点 {currentDpIdx+1}/{decisionPoints.length} · {dp.p_step}</div>
          <div className="text-sm text-gray-600 mb-2 leading-relaxed">{dp.trigger?.context_cue||''}</div>
          <h3 className="text-base font-bold text-gray-900 mb-5">{dp.trigger?.pause_text||'你怎么做？'}</h3>
          <div className="flex flex-col gap-3">
            {dp.options?.map((opt:any)=><button key={opt.id} onClick={()=>handleDecisionSelect(opt.id)} className="p-4 rounded-xl border border-gray-200 text-left text-sm text-gray-700 hover:border-amber-400 hover:bg-amber-50 transition-all" style={{fontFamily:'inherit',cursor:'pointer',background:'#fff'}}><span className="inline-block w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold text-center leading-6 mr-2">{opt.id}</span>{opt.text}</button>)}
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---- 对话后自评 ---- */
  if (phase==='postSelfEval') return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{background:'rgba(28,25,23,.6)',fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
      <div className="max-w-[380px] w-full rounded-2xl p-7 text-center" style={{background:'rgba(255,255,255,.95)',backdropFilter:'blur(20px)',boxShadow:'0 12px 40px rgba(0,0,0,.12)'}}>
        <h3 className="text-[15px] font-bold text-[#1C1917] mb-1">在查看反馈之前</h3>
        <p className="text-[11px] text-[#A8A29E] mb-5">你觉得刚才这场对话，做得怎么样？</p>
        <div className="flex gap-1.5 justify-center flex-wrap mb-5">{[1,2,3,4,5,6,7,8,9,10].map(n=><button key={n} onClick={()=>setPostEvalScore(n)} className="w-8 h-8 rounded-full text-[12px] font-bold transition-all" style={{background:postEvalScore===n?'#1C1917':postEvalScore>0&&n<=postEvalScore?'rgba(212,165,116,.15)':'rgba(0,0,0,.04)',color:postEvalScore===n?'#fff':'#78716C',border:'none',cursor:'pointer',fontFamily:'inherit'}}>{n}</button>)}</div>
        <div className="flex gap-2">
          <button onClick={handlePostEvalSubmit} className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90" style={{background:'#1C1917',border:'none',cursor:'pointer',fontFamily:'inherit'}}>查看反馈</button>
          <button onClick={()=>setPhase('chat')} className="flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all" style={{background:'rgba(0,0,0,.03)',color:'#78716C',border:'none',cursor:'pointer',fontFamily:'inherit'}}>再聊会儿</button>
        </div>
      </div>
    </div>
  );

  /* ===== 对话主页 ===== */
  return (
    <div className="h-screen flex flex-col relative" style={{background:'linear-gradient(175deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)',fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
      <div style={{position:'fixed',top:-60,right:-40,width:300,height:300,borderRadius:'50%',background:'#FEE2E2',filter:'blur(110px)',opacity:.12,pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'fixed',bottom:-40,left:-20,width:240,height:240,borderRadius:'50%',background:'#FEF3C7',filter:'blur(110px)',opacity:.12,pointerEvents:'none',zIndex:0}}/>
      {/* 顶栏 */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 relative z-10" style={{background:'rgba(255,255,255,.35)',borderBottom:'1px solid rgba(0,0,0,.04)'}}>
        <img src={getMatchedAvatar({sceneId,npc})} alt={npcName} className="w-9 h-9 rounded-full object-cover border border-white shadow-sm"/>
        <div><span className="font-semibold text-[#1C1917] text-sm">{npcName}</span><span className="text-xs text-amber-600 ml-2">{MOOD_LABELS[mood]||''}</span></div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-[#A8A29E] hidden sm:inline">{focusLabels[focusIdx]}</span>
          <button onClick={()=>setPauseOpen(true)} className="text-[10px] px-2.5 py-1 rounded-lg transition-all" style={{border:'1px solid rgba(0,0,0,.06)',background:'rgba(0,0,0,.02)',color:'#A8A29E',cursor:'pointer',fontFamily:'inherit'}}>暂停，我想想</button>
        </div>
      </div>
      <div className="h-1 flex-shrink-0 relative z-10" style={{background:'rgba(0,0,0,.04)'}}><div className="h-1 rounded-full transition-all duration-700" style={{width:health+'%',background:health>=70?'#16a34a':health>=45?'#d97706':'#B8854A'}}/></div>
      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative z-10">
        {messages.map((m,i)=><div key={i} className={m.role==='user'?'flex justify-end':''}>
          {m.role==='system'?<div className={`mx-0 my-1 px-3 py-1.5 rounded-lg text-xs italic border-l-2 ${m.content.startsWith('⚠️')?'bg-orange-50 border-orange-400 text-orange-700':'bg-blue-50 border-blue-400 text-blue-700'}`}>{m.content}</div>
          :m.role==='user'?<div className="inline-block max-w-[82%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm font-medium text-white" style={{background:'#1C1917'}}>{m.content}</div>
          :<div className="inline-block max-w-[82%]">{m.action&&<div className="text-[10px] text-[#B8854A] italic ml-1 mb-1">{m.action}</div>}<div className="px-3.5 py-2.5 rounded-[16px] rounded-bl-[4px] text-[13px] leading-relaxed text-[#1C1917]" style={{background:'#fff',border:'1px solid rgba(0,0,0,.06)'}}>{m.content}</div></div>}
        </div>)}
        <div ref={msgEnd}/>
      </div>
      {/* 输入区 */}
      <div className="px-4 py-3 flex gap-2 items-end flex-shrink-0 relative z-10" style={{background:'rgba(255,255,255,.35)',borderTop:'1px solid rgba(0,0,0,.04)'}}>
        <textarea rows={2} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="输入你的回应..." disabled={sending} className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed resize-none outline-none transition-all" style={{border:'1px solid rgba(0,0,0,.06)',background:'rgba(255,255,255,.5)',fontFamily:'inherit'}} onFocus={e=>{e.currentTarget.style.borderColor='#D4A574';e.currentTarget.style.boxShadow='0 0 0 3px rgba(212,165,116,.06)'}} onBlur={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,.06)';e.currentTarget.style.boxShadow='none'}}/>
        <button onClick={send} disabled={sending||!input.trim()} className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-all" style={{background:'#1C1917',border:'none',cursor:'pointer'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg></button>
      </div>
      <button onClick={()=>setPhase('postSelfEval')} className="w-full py-3 text-[13px] font-semibold flex-shrink-0 relative z-10 transition-all" style={{background:'rgba(212,165,116,.08)',color:'#B8854A',border:'none',cursor:'pointer',fontFamily:'inherit'}}>结束对话，查看反馈</button>
      {/* 暂停弹窗 */}
      <AnimatePresence>{pauseOpen&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 flex items-center justify-center z-50" style={{background:'rgba(28,25,23,.5)'}} onClick={()=>setPauseOpen(false)}><motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.95}} className="max-w-[380px] w-[90vw] rounded-2xl p-6" style={{background:'rgba(255,255,255,.95)',backdropFilter:'blur(20px)',boxShadow:'0 12px 40px rgba(0,0,0,.1)'}} onClick={e=>e.stopPropagation()}><h3 className="text-[15px] font-bold text-[#1C1917] mb-1.5">暂停一下</h3>{lastNpcMsg&&<div className="text-[11px] text-[#78716C] italic p-2 rounded-lg mb-4 leading-relaxed" style={{background:'rgba(0,0,0,.02)'}}>{lastNpcMsg}{lastNpcMsg.length>=120?'...':''}</div>}{pauseQs.map((q,i)=><div key={i} className="text-[12px] text-[#44403C] leading-relaxed mb-1.5 pl-3.5" style={{borderLeft:'2px solid #D4A574'}}>{q}</div>)}<div className="flex gap-2 mt-3"><button onClick={()=>setPauseOpen(false)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all" style={{background:'rgba(212,165,116,.12)',color:'#B8854A',border:'none',cursor:'pointer',fontFamily:'inherit'}}>继续对话</button></div></motion.div></motion.div>}</AnimatePresence>
    </div>
  );
};

export default ScenarioChatPage;
