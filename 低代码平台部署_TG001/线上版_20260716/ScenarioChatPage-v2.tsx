// ScenarioChatPage.tsx — V2 通用版（对标 TG001 对话体验）
// Phase: loading→selfEval→focusSelect→chat↔decision→postSelfEval→feedback
// 决策点由 AI [DECISION_READY] 信号驱动，非回合计数
// System Prompt 从 sceneCard 动态构建，不硬编码场景特定内容

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getMatchedAvatar } from '@client/src/utils/avatar-matcher';

type Phase = 'loading' | 'selfEval' | 'focusSelect' | 'chat' | 'decision' | 'postSelfEval';

const BRIDGE_DIMS = ['建立信任', '诊断问题', '示范赋能', '重构目标'];

const ScenarioChatPage: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();

  // ===== 场景数据 =====
  const [card, setCard] = useState<any>(null);
  const [sceneCtx, setSceneCtx] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');

  // ===== 自评 =====
  const [selfScores, setSelfScores] = useState<number[]>([5, 5, 5, 5]);
  const [postEvalScore, setPostEvalScore] = useState(5);

  // ===== 聚焦 =====
  const [focusIdx, setFocusIdx] = useState(0);
  const focusLabels = useMemo(() => {
    const dps = card?.decision_points || [];
    return dps.length > 0
      ? dps.map((dp: any) => dp.trigger?.pause_text || dp.p_step || '')
      : ['先观察再行动', '深入沟通了解', '替团队做减法', '亲自做给他们看'];
  }, [card]);

  // ===== 对话状态 =====
  const [messages, setMessages] = useState<Array<{ role: string; content: string; action?: string }>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mood, setMood] = useState('WATCH');
  const [health, setHealth] = useState(30);
  const [turnCount, setTurnCount] = useState(0);
  const [decisions, setDecisions] = useState<Array<{ dp_id: string; sequence: number; selected_option: string; is_correct: boolean; trap_type: string; timestamp: string }>>([]);
  const [currentDpIdx, setCurrentDpIdx] = useState(0);
  const [pauseOpen, setPauseOpen] = useState(false);
  const msgEnd = useRef<HTMLDivElement>(null);

  const npc = card?.context?.team_state?.key_individuals?.[0];
  const npcName = npc?.name || 'NPC';
  const decisionPoints: any[] = card?.decision_points || [];
  const prep = sceneCtx?.preparation || sceneCtx?.teamMotivation?.preparation || {};
  const challenges: string[] = prep?.challenges || [card?.context?.situation?.project_status || ''];
  const goalText = (prep?.goal || card?.feedback_criteria?.golden_path_narrative || '完成本次对话练习').replace(/<[^>]*>/g, '');

  // ===== 初始化加载 =====
  useEffect(() => {
    (async () => {
      try {
        const resp = await axiosForBackend.get('/api/coaching/scenario-cards/' + sceneId);
        const c = typeof resp.data.scenarioCard === 'string' ? JSON.parse(resp.data.scenarioCard) : resp.data.scenarioCard;
        const ctx = typeof resp.data.scenarioContext === 'string' ? JSON.parse(resp.data.scenarioContext) : resp.data.scenarioContext;
        setCard(c); setSceneCtx(ctx);
        const sResp = await axiosForBackend.post('/api/coaching/sessions/with-decision-path', {
          sceneId,
          decisionPath: { scenario_id: sceneId, started_at: new Date().toISOString(), decisions: [], golden_path_match_rate: 0 },
        });
        setSessionId(sResp.data.id);
        // 恢复本地自评
        try {
          const raw = localStorage.getItem(`scenario_self_eval_${sceneId}`);
          if (raw) { const d = JSON.parse(raw); if (d.scores) setSelfScores(d.scores); if (typeof d.focusIdx === 'number') setFocusIdx(d.focusIdx); }
        } catch {}
        // 从过渡页来则跳过自评
        const skip = new URLSearchParams(window.location.search).get('skipPrepare') === '1';
        if (skip) { window.history.replaceState({}, '', window.location.pathname); setPhase('chat'); }
        else setPhase('selfEval');
      } catch (e: any) { logger.error('场景加载失败', String(e)); setPhase('loading'); }
    })();
  }, [sceneId]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ===== System Prompt =====
  const buildSystemPrompt = useCallback(() => {
    if (!card || !npc) return '';
    const lp = npc.language_profile || {};
    const location = card.context?.opening_scene?.location || '';
    const time = card.context?.opening_scene?.time || '';
    const situation = card.context?.situation?.project_status || '';
    const learnerRole = card.context?.learner_role?.identity || '管理者';
    const constraints = card.context?.constraints?.political_sensitivity || '';
    const selfEvalText = BRIDGE_DIMS.map((d, i) => `${d}:${selfScores[i]}分`).join('、');
    const challengeText = challenges.map((c: string) => c.replace(/<[^>]*>/g, '')).join('；');
    const currentDp = decisionPoints[currentDpIdx];
    const dpCue = currentDp ? `\n\n【即将到来的决策时刻】\n当对话自然推进到以下情境时，在你的回复末尾加上 [DECISION_READY] 标记：\n情境：${currentDp.trigger?.context_cue || ''}\n需要让管理者面对的问题：${currentDp.trigger?.pause_text || ''}\n只有当你觉得对话已经可以自然地进入这个决策时刻时，才加上这个标记。不要提前，不要生硬。` : '';

    return `你是${npc.name}。${npc.role}。司龄${npc.tenure}年。

【你是谁】${npc.role}。${lp.hidden_motivation ? '你心里在想但不会说出来：' + lp.hidden_motivation : ''}

【当前局面】${learnerRole}。${situation}。地点：${location}。时间：${time}。${constraints}

【任务挑战】${challengeText}
【管理者的目标】${goalText}
【管理者自评基线】管理者入场前自评：${selfEvalText}
【本次聚焦方向】管理者选择了重点练习：${focusLabels[focusIdx] || ''}

【你怎么说话】
- 用这些词：${(lp.vocabulary?.use || []).join('、') || '日常用语'}
- 绝不用这些词：${(lp.vocabulary?.avoid || []).join('、') || '管理术语'}
- 句式：${lp.sentence_style || '短句为主，自然对话'}
- 不要用"赋能""对齐""底层逻辑""抓手"等管理术语——你是${npc.role}，不是培训师。
- 每次回复2-4句，直接回应对方刚说的内容。

【什么让你防御关闭】${(lp.emotional_triggers?.defensive || []).join('、') || '命令式的语气、空洞的承诺'}
【什么让你愿意开口】${(lp.emotional_triggers?.open_up || []).join('、') || '对方展示了业务能力、问了你的看法'}

${dpCue}

【回应规则 — 严格遵守】
1. 你就是${npc.name}本人。忘掉你是一个AI助手——你是${npc.role}。
2. 不要给管理者提建议、不要分析局面、不要说"你可以试试"——你不是教练，你是${npc.role}。
3. 每次1-3句。回应跟对方刚说的内容直接相关。
4. 被冒犯时先沉默一会儿再开口。觉得对方值得跟时语气从客气变直接。`;
  }, [card, npc, selfScores, focusIdx, focusLabels, challenges, goalText, currentDpIdx, decisionPoints]);

  // ===== 自评→聚焦 =====
  const handleSelfEvalDone = () => {
    try { localStorage.setItem(`scenario_self_eval_${sceneId}`, JSON.stringify({ scores: selfScores, dims: BRIDGE_DIMS, focusIdx })); } catch {}
    setPhase('focusSelect');
  };

  // ===== 聚焦→对话 =====
  const handleFocusDone = () => {
    try { localStorage.setItem(`scenario_self_eval_${sceneId}`, JSON.stringify({ scores: selfScores, dims: BRIDGE_DIMS, focusIdx })); } catch {}
    // 先进过渡页（隐藏动机+场景插画），过渡页点"敲门进入"后带 skipPrepare 回到对话页
    navigate(`/scenario/${sceneId}/transition?from=prepare`);
  };

  // ===== 发送消息 =====
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !card) return;
    setInput(''); setSending(true);
    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    const newTurn = turnCount + 1;
    setTurnCount(newTurn);

    try {
      let npcResp = '', npcAction = '';
      const plugin = capabilityClient.load('mdp_coach_ai_conversation_reply_1');
      if (plugin) {
        const result = await plugin.call('textGenerate', {
          system_prompt: buildSystemPrompt(),
          user_message_history: JSON.stringify(
            newMsgs.filter(m => m.role !== 'system').slice(-10)
              .map(m => ({ role: m.role === 'npc' ? 'assistant' : 'user', content: (m.action || '') + ' ' + m.content }))
          ),
        }) as { content?: string; text?: string };
        const raw = result.content || result.text || '';
        const actionMatch = raw.match(/^[（(]([^）)]+)[）)]/);
        if (actionMatch) { npcAction = actionMatch[0]; npcResp = raw.slice(actionMatch[0].length).trim(); }
        else npcResp = raw;

        // AI 信号：决策点触发
        if (npcResp.includes('[DECISION_READY]')) {
          npcResp = npcResp.replace('[DECISION_READY]', '').trim();
          setMessages(prev => [...prev, { role: 'npc', content: npcResp, action: npcAction }]);
          if (currentDpIdx < decisionPoints.length) {
            setTimeout(() => setPhase('decision'), 900);
          }
          setSending(false);
          return;
        }
      } else {
        npcResp = '（演示模式——部署妙搭后接入AI插件）';
      }

      // 简易健康度
      if (/理解|一起|你的.*想|你怎么看|你觉得/.test(text)) setHealth(h => Math.min(100, h + 8));
      else if (/必须|没有选择|按我说/.test(text)) setHealth(h => Math.max(0, h - 10));
      setMessages(prev => [...prev, { role: 'npc', content: npcResp, action: npcAction }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'system', content: '对话出错，请重试' }]);
    }
    setSending(false);
  }, [input, sending, card, messages, turnCount, currentDpIdx, decisionPoints, buildSystemPrompt]);

  // ===== 决策点选择 =====
  const handleDecisionSelect = (optionId: string) => {
    const dp = decisionPoints[currentDpIdx];
    if (!dp) return;
    const opt = dp.options?.find((o: any) => o.id === optionId);
    if (!opt) return;
    const record = {
      dp_id: dp.dp_id, sequence: dp.sequence,
      selected_option: optionId, is_correct: opt.is_best_path,
      trap_type: opt.is_best_path ? '无' : (opt.trap_type || '策略偏差'),
      timestamp: new Date().toISOString(),
    };
    setDecisions(prev => [...prev, record]);
    if (opt.is_best_path) { setHealth(h => Math.min(100, h + 15)); setMood(m => m === 'WATCH' ? 'TEST' : m === 'TEST' ? 'VERIFY' : 'FOLLOW'); }
    const sysMsg = opt.is_best_path
      ? `你选择了最佳路径。${opt.consequence?.immediate || ''}`
      : `注意：${opt.trap_type || '策略偏差'}。${opt.trap_mechanism || opt.consequence?.immediate || ''}`;
    setMessages(prev => [...prev, { role: 'system', content: sysMsg }]);
    setCurrentDpIdx(prev => prev + 1);
    setTurnCount(0); setPhase('chat');
  };

  // ===== 暂停 =====
  const lastNpcMsg = messages.filter(m => m.role === 'npc' && m.content).pop()?.content?.slice(0, 120) || '';
  const pauseQuestions = useMemo(() => {
    if (currentDpIdx < decisionPoints.length) {
      const dp = decisionPoints[currentDpIdx];
      return [dp?.trigger?.context_cue || '', '你现在的回应是在诊断还是给方案？', `你选择的聚焦是"${focusLabels[focusIdx]}"——你做到了吗？`];
    }
    return ['你做了什么让NPC愿意开口？', '如果重来一次，第一句话会怎么说？', '你的默认策略是什么？'];
  }, [currentDpIdx, decisionPoints, focusIdx, focusLabels]);

  // ===== 结束 → 自评 → 反馈 =====
  const handleFinish = () => setPhase('postSelfEval');

  const handlePostEvalSubmit = useCallback(async () => {
    const correctCount = decisions.filter(d => d.is_correct).length;
    const matchRate = decisions.length > 0 ? correctCount / decisions.length : 0;
    try {
      if (sessionId) {
        await axiosForBackend.patch('/api/coaching/sessions/' + sessionId + '/decision-path', {
          decisionPath: { scenario_id: sceneId, completed_at: new Date().toISOString(), decisions, golden_path_match_rate: matchRate },
        });
        await axiosForBackend.patch('/api/coaching/sessions/' + sessionId, {
          messages: messages.filter(m => m.role !== 'system'),
          scoreResult: health, roundCount: turnCount, status: 'completed',
          completedAt: new Date().toISOString(),
          selfAssessment: { bridgeScores: selfScores, bridgeDims: BRIDGE_DIMS, focusArea: focusLabels[focusIdx] || '', postEvalScore, moodHistory: mood },
        });
      }
    } catch (e) { logger.warn('保存失败', String(e)); }
    navigate('/scenario/' + sceneId + '/feedback?session=' + sessionId);
  }, [sessionId, decisions, messages, health, turnCount, selfScores, focusIdx, focusLabels, postEvalScore, mood, sceneId, navigate]);

  // ============================
  // 渲染
  // ============================
  const moodLabelMap: Record<string, string> = { WATCH: '在观望', TEST: '在试探', VERIFY: '在验证', FOLLOW: '开始跟从' };

  if (phase === 'loading') return <div className="flex items-center justify-center min-h-screen text-gray-500" style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif", background:'#F8F6F2' }}>加载场景...</div>;
  if (!card) return null;

  // ---- 自评页（含场景说明 + 滑块） ----
  if (phase === 'selfEval') {
    return (
      <div className="min-h-screen overflow-y-auto flex items-center justify-center p-5" style={{ background:'linear-gradient(160deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)', fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" }}>
        <div className="max-w-[440px] w-full rounded-[20px] p-7" style={{ background:'rgba(255,255,255,.5)', backdropFilter:'blur(22px)', border:'1px solid rgba(255,255,255,.5)', boxShadow:'0 4px 24px rgba(0,0,0,.04)' }}>
          {/* 场景说明 */}
          <div className="flex items-center gap-3 mb-5">
            <img src={getMatchedAvatar({ sceneId, npc })} alt={npcName} className="w-14 h-14 rounded-full object-cover shadow-md flex-shrink-0 border-2 border-white" />
            <div>
              <div className="text-lg font-bold text-[#1C1917]">{npcName}</div>
              <div className="text-[12px] text-[#78716C]">{npc?.role || ''} · 司龄{npc?.tenure || ''}年</div>
              {npc?.attitude && <div className="text-[11px] text-amber-600 italic mt-0.5">&ldquo;{npc.attitude}&rdquo;</div>}
            </div>
          </div>
          <div className="rounded-xl p-3.5 mb-4 text-[12px] leading-relaxed text-[#57534E]" style={{ background:'rgba(255,255,255,.4)', border:'1px solid rgba(0,0,0,.03)' }}>
            <div className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-1.5">情境</div>
            {card.context?.situation?.project_status || ''}
          </div>
          {challenges.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">挑战</div>
              {challenges.map((c: string, i: number) => (
                <div key={i} className="text-[11px] text-[#57534E] leading-relaxed py-1.5 flex gap-2" style={{ borderBottom: i < challenges.length - 1 ? '1px solid rgba(0,0,0,.03)' : 'none' }}>
                  <span className="text-amber-600 font-bold flex-shrink-0 text-[10px] w-4 h-4 rounded-full flex items-center justify-center" style={{ background:'rgba(245,158,11,.1)' }}>{i + 1}</span>
                  <span>{c.replace(/<[^>]*>/g, '')}</span>
                </div>
              ))}
            </div>
          )}
          {goalText && (
            <div className="rounded-xl p-3 mb-5 text-[11px] leading-relaxed text-[#1C1917]" style={{ background:'rgba(16,185,129,.04)', border:'1px solid rgba(16,185,129,.08)' }}>
              <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">目标</div>
              {goalText}
            </div>
          )}
          {/* 分隔 */}
          <div className="border-t border-black/5 my-5" />
          {/* 自评滑块 */}
          <h3 className="text-[14px] font-bold text-[#1C1917] mb-1">对话前自评</h3>
          <p className="text-[11px] text-[#A8A29E] mb-4">你觉得自己在以下四点各能打几分？</p>
          {BRIDGE_DIMS.map((dim, i) => (
            <div key={i} className="py-2.5" style={{ borderBottom: i < 3 ? '1px solid rgba(0,0,0,.03)' : 'none' }}>
              <div className="flex justify-between mb-1.5"><span className="text-[12px] font-medium text-[#1C1917]">{dim}</span><span className="text-[13px] font-bold">{selfScores[i]}</span></div>
              <input type="range" min={1} max={10} value={selfScores[i]} onChange={e => { const n = [...selfScores]; n[i] = +e.target.value; setSelfScores(n); }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background:`linear-gradient(to right,#D4A574 ${((selfScores[i]-1)/9)*100}%,rgba(0,0,0,.08) ${((selfScores[i]-1)/9)*100}%)`, accentColor:'#D4A574' }} />
            </div>
          ))}
          <button onClick={handleSelfEvalDone} className="w-full py-3.5 mt-5 rounded-2xl text-[15px] font-semibold text-white transition-all hover:opacity-90"
            style={{ background:'#1C1917', border:'none', cursor:'pointer', fontFamily:'inherit' }}>继续</button>
        </div>
      </div>
    );
  }

  // ---- 聚焦选择 ----
  if (phase === 'focusSelect') {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={{ background:'linear-gradient(160deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)', fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" }}>
        <div className="max-w-[380px] w-full rounded-2xl p-7 text-center" style={{ background:'rgba(255,255,255,.9)', backdropFilter:'blur(20px)', boxShadow:'0 12px 40px rgba(0,0,0,.1)' }}>
          <h3 className="text-[15px] font-bold text-[#1C1917] mb-1">这次对话，你最想练什么？</h3>
          <p className="text-[11px] text-[#A8A29E] mb-4">选一个——NPC会在这个维度上特别考验你</p>
          {focusLabels.map((label: string, i: number) => (
            <div key={i} onClick={() => setFocusIdx(i)}
              className="cursor-pointer text-[12px] text-left px-3.5 py-2.5 rounded-xl my-1.5 transition-all"
              style={{ border: focusIdx===i?'1px solid #B8854A':'1px solid rgba(0,0,0,.08)', background: focusIdx===i?'rgba(212,165,116,.08)':'#fff', color: focusIdx===i?'#B8854A':'#44403C', fontWeight: focusIdx===i?600:400 }}>
              {label}
            </div>
          ))}
          <button onClick={handleFocusDone} className="w-full py-3 rounded-xl text-[14px] font-semibold text-white mt-3.5 transition-all hover:opacity-90"
            style={{ background:'#1C1917', border:'none', cursor:'pointer', fontFamily:'inherit' }}>开始对话</button>
          {focusLabels.length === 0 && <button onClick={() => setPhase('chat')} className="w-full py-3 rounded-xl text-[14px] font-semibold text-white mt-3.5" style={{ background:'#1C1917' }}>直接开始</button>}
        </div>
      </div>
    );
  }

  // ---- 决策点弹窗 ----
  if (phase === 'decision') {
    const dp = decisionPoints[currentDpIdx];
    if (!dp) { setPhase('chat'); return null; }
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background:'rgba(28,25,23,.5)', fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" }}>
        <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }} className="max-w-lg w-[90vw] bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-xs text-amber-600 font-semibold mb-1">决策点 {currentDpIdx + 1}/{decisionPoints.length} · {dp.p_step}</div>
          <div className="text-sm text-gray-600 mb-2 leading-relaxed">{dp.trigger?.context_cue || ''}</div>
          <h3 className="text-base font-bold text-gray-900 mb-5">{dp.trigger?.pause_text || '你怎么做？'}</h3>
          <div className="flex flex-col gap-3">
            {dp.options?.map((opt: any) => (
              <button key={opt.id} onClick={() => handleDecisionSelect(opt.id)}
                className="p-4 rounded-xl border border-gray-200 text-left text-sm text-gray-700 hover:border-amber-400 hover:bg-amber-50 transition-all" style={{ fontFamily:'inherit', cursor:'pointer', background:'#fff' }}>
                <span className="inline-block w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold text-center leading-6 mr-2">{opt.id}</span>
                {opt.text}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- 对话后自评 ----
  if (phase === 'postSelfEval') {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={{ background:'rgba(28,25,23,.6)', fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" }}>
        <div className="max-w-[380px] w-full rounded-2xl p-7 text-center" style={{ background:'rgba(255,255,255,.95)', backdropFilter:'blur(20px)', boxShadow:'0 12px 40px rgba(0,0,0,.12)' }}>
          <h3 className="text-[15px] font-bold text-[#1C1917] mb-1">在查看反馈之前</h3>
          <p className="text-[11px] text-[#A8A29E] mb-5">你觉得刚才这场对话，做得怎么样？</p>
          <div className="flex gap-1.5 justify-center flex-wrap mb-5">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setPostEvalScore(n)}
                className="w-8 h-8 rounded-full text-[12px] font-bold transition-all"
                style={{ background: postEvalScore === n ? '#1C1917' : postEvalScore > 0 && n <= postEvalScore ? 'rgba(212,165,116,.15)' : 'rgba(0,0,0,.04)', color: postEvalScore === n ? '#fff' : '#78716C', border:'none', cursor:'pointer', fontFamily:'inherit' }}>{n}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handlePostEvalSubmit} className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background:'#1C1917', border:'none', cursor:'pointer', fontFamily:'inherit' }}>查看反馈</button>
            <button onClick={() => setPhase('chat')} className="flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background:'rgba(0,0,0,.03)', color:'#78716C', border:'none', cursor:'pointer', fontFamily:'inherit' }}>再聊会儿</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== 对话主页 =====
  return (
    <div className="h-screen flex flex-col relative" style={{ background:'linear-gradient(175deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)', fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" }}>
      {/* 环境光 */}
      <div style={{ position:'fixed',top:-60,right:-40,width:300,height:300,borderRadius:'50%',background:'#FEE2E2',filter:'blur(110px)',opacity:.12,pointerEvents:'none',zIndex:0}} />
      <div style={{ position:'fixed',bottom:-40,left:-20,width:240,height:240,borderRadius:'50%',background:'#FEF3C7',filter:'blur(110px)',opacity:.12,pointerEvents:'none',zIndex:0}} />

      {/* 顶栏 */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 relative z-10" style={{ background:'rgba(255,255,255,.35)', borderBottom:'1px solid rgba(0,0,0,.04)' }}>
        <img src={getMatchedAvatar({ sceneId, npc })} alt={npcName} className="w-9 h-9 rounded-full object-cover border border-white shadow-sm" />
        <div><span className="font-semibold text-[#1C1917] text-sm">{npcName}</span><span className="text-xs text-amber-600 ml-2">{moodLabelMap[mood] || ''}</span></div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-[#A8A29E] hidden sm:inline">{focusLabels[focusIdx]}</span>
          <button onClick={() => setPauseOpen(true)} className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
            style={{ border:'1px solid rgba(0,0,0,.06)', background:'rgba(0,0,0,.02)', color:'#A8A29E', cursor:'pointer', fontFamily:'inherit' }}>暂停，我想想</button>
        </div>
      </div>

      {/* 健康度条 */}
      <div className="h-1 flex-shrink-0 relative z-10" style={{ background:'rgba(0,0,0,.04)' }}>
        <div className="h-1 rounded-full transition-all duration-700" style={{ width:health+'%', background: health>=70?'#16a34a':health>=45?'#d97706':'#B8854A' }} />
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative z-10">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            {m.role === 'system' ? (
              <div className={`mx-0 my-1 px-3 py-1.5 rounded-lg text-xs italic border-l-2 ${m.content.startsWith('注意') ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-blue-50 border-blue-400 text-blue-700'}`}>{m.content}</div>
            ) : m.role === 'user' ? (
              <div className="inline-block max-w-[82%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm font-medium text-white" style={{ background:'#1C1917' }}>{m.content}</div>
            ) : (
              <div className="inline-block max-w-[82%]">
                {m.action && <div className="text-[10px] text-[#B8854A] italic ml-1 mb-1">{m.action}</div>}
                <div className="px-3.5 py-2.5 rounded-[16px] rounded-bl-[4px] text-[13px] leading-relaxed text-[#1C1917]" style={{ background:'#fff', border:'1px solid rgba(0,0,0,.06)' }}>{m.content}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={msgEnd} />
      </div>

      {/* 输入区 */}
      <div className="px-4 py-3 flex gap-2 items-end flex-shrink-0 relative z-10" style={{ background:'rgba(255,255,255,.35)', borderTop:'1px solid rgba(0,0,0,.04)' }}>
        <textarea rows={2} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="输入你的回应..." disabled={sending}
          className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed resize-none outline-none transition-all"
          style={{ border:'1px solid rgba(0,0,0,.06)', background:'rgba(255,255,255,.5)', fontFamily:'inherit' }}
          onFocus={e => { e.currentTarget.style.borderColor='#D4A574'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(212,165,116,.06)'; }}
          onBlur={e => { e.currentTarget.style.borderColor='rgba(0,0,0,.06)'; e.currentTarget.style.boxShadow='none'; }} />
        <button onClick={send} disabled={sending || !input.trim()}
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-all"
          style={{ background:'#1C1917', border:'none', cursor:'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
        </button>
      </div>

      <button onClick={handleFinish}
        className="w-full py-3 text-[13px] font-semibold flex-shrink-0 relative z-10 transition-all"
        style={{ background:'rgba(212,165,116,.08)', color:'#B8854A', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
        结束对话，查看反馈
      </button>

      {/* 暂停弹窗 */}
      <AnimatePresence>
        {pauseOpen && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 flex items-center justify-center z-50" style={{ background:'rgba(28,25,23,.5)' }}
            onClick={() => setPauseOpen(false)}>
            <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:.95 }}
              className="max-w-[380px] w-[90vw] rounded-2xl p-6" style={{ background:'rgba(255,255,255,.95)', backdropFilter:'blur(20px)', boxShadow:'0 12px 40px rgba(0,0,0,.1)' }}
              onClick={e => e.stopPropagation()}>
              <h3 className="text-[15px] font-bold text-[#1C1917] mb-1.5">暂停一下</h3>
              {lastNpcMsg && <div className="text-[11px] text-[#78716C] italic p-2 rounded-lg mb-4 leading-relaxed" style={{ background:'rgba(0,0,0,.02)' }}>{lastNpcMsg}{lastNpcMsg.length >= 120 ? '...' : ''}</div>}
              {pauseQuestions.map((q, i) => (
                <div key={i} className="text-[12px] text-[#44403C] leading-relaxed mb-1.5 pl-3.5" style={{ borderLeft:'2px solid #D4A574' }}>{q}</div>
              ))}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setPauseOpen(false)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                  style={{ background:'rgba(212,165,116,.12)', color:'#B8854A', border:'none', cursor:'pointer', fontFamily:'inherit' }}>继续对话</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenarioChatPage;
