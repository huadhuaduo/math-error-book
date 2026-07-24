// ScenarioFeedbackPage.tsx — V3 证据驱动版
// 设计原则：
// 1. 只基于决策点选择（不可反驳）发言——不推断"你没做什么"
// 2. 因果链：你的选择 → NPC反应 → 结果
// 3. 叙事结局：如果你选了最佳路径 → NPC会怎样
// 4. 第一句就是结论，后面是证据

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  assembleFeedback, getKeyMoment, getBehaviorSteps,
  getNextPractice, getMicroExercise,
  type DecisionRecord, type ScoringDimension,
} from '../../utils/feedback-assembler';

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,.5)', borderRadius: 18, padding: 22,
  boxShadow: '0 3px 16px rgba(0,0,0,.03)',
};

// 每步状态配色
const STEP_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  good:  { bg: 'rgba(220,252,231,.3)', text: '#065F46', icon: '✓' },
  bad:   { bg: 'rgba(254,226,226,.3)', text: '#991B1B', icon: '!' },
  skip:  { bg: 'rgba(243,244,246,.3)', text: '#6B7280', icon: '—' },
};

const ScenarioFeedbackPage: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [scenarioCard, setScenarioCard] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!sessionId) { setError('缺少会话参数'); setLoading(false); return; }
    (async () => {
      try {
        const [sceneResp, sessionResp] = await Promise.all([
          axiosForBackend.get('/api/coaching/scenario-cards/' + sceneId),
          axiosForBackend.get('/api/coaching/sessions/' + sessionId),
        ]);
        const card = typeof sceneResp.data.scenarioCard === 'string'
          ? JSON.parse(sceneResp.data.scenarioCard) : sceneResp.data.scenarioCard;
        setScenarioCard(card);
        setSessionData(sessionResp.data);
        setLoading(false);
      } catch (err: any) { setError(err?.message || '加载失败'); setLoading(false); }
    })();
  }, [sceneId, sessionId]);

  // 纯计算
  const { moment, steps, nextPractice, micro, passedCount, totalDecisions, trapCount, npcName, title } = useMemo(() => {
    if (!sessionData || !scenarioCard) return {} as any;
    const messages = sessionData.messages || [];
    const decisionPath = typeof sessionData.decisionPath === 'string'
      ? JSON.parse(sessionData.decisionPath) : (sessionData.decisionPath || {});
    const decisions: DecisionRecord[] = decisionPath.decisions || [];
    const npc = scenarioCard.context?.team_state?.key_individuals?.[0];
    return {
      moment: getKeyMoment(messages, decisions, npc?.name || 'NPC'),
      steps: getBehaviorSteps(decisions, scenarioCard),
      nextPractice: getNextPractice(decisions, scenarioCard),
      micro: getMicroExercise(
        scenarioCard.feedback_criteria?.scoring_dimensions || [],
        decisions,
      ),
      passedCount: decisions.filter((d: any) => d.is_correct).length,
      totalDecisions: decisions.length,
      trapCount: decisions.filter((d: any) => !d.is_correct && d.trap_type !== '无').length,
      npcName: npc?.name || 'NPC',
      title: scenarioCard.meta?.title || scenarioCard.title || '场景练习',
    };
  }, [sessionData, scenarioCard]);

  const toggleExpand = (step: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step); else next.add(step);
      return next;
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-400" style={{background:'#F8F6F2',fontFamily:'-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif'}}>生成反馈报告...</div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{background:'#F8F6F2'}}><p className="text-red-600 text-sm">{error}</p><button onClick={() => navigate('/coaching')} className="px-5 py-2 rounded-xl bg-stone-200 text-stone-600 text-sm">返回</button></div>;
  if (!sessionData || !scenarioCard) return null;

  const badSteps = (steps || []).filter((s: any) => s.status === 'bad');

  return (
    <div style={{ background: 'linear-gradient(165deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)', minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ position:'fixed',top:-60,right:-40,width:300,height:300,borderRadius:'50%',background:'#FEE2E2',filter:'blur(110px)',opacity:.08,pointerEvents:'none',zIndex:0}} />
      <div style={{ position:'fixed',bottom:-40,left:-20,width:240,height:240,borderRadius:'50%',background:'#FEF3C7',filter:'blur(110px)',opacity:.08,pointerEvents:'none',zIndex:0}} />
      <div className="flex flex-col gap-4 max-w-[680px] mx-auto px-4 py-7 relative" style={{ zIndex:10 }}>

        {/* ================================================================
            模块 1 — 决策回顾
            ================================================================ */}
        <div style={CARD}>
          <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">{title}</h2>
          <div className="text-[11px] text-[#A8A29E] mb-5">
            {new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' })}
            &nbsp;·&nbsp;{passedCount}/{totalDecisions} 最佳路径
            {trapCount > 0 && <>&nbsp;·&nbsp;<span className="text-red-500">{trapCount} 个陷阱</span></>}
          </div>

          {/* NPC 关键信号 */}
          {moment && (
            <div className="rounded-xl p-3.5 mb-4 text-center" style={{ background:'rgba(255,255,255,.5)', border:'1px solid rgba(0,0,0,.03)' }}>
              <div className="text-[13px] text-[#44403C] leading-relaxed font-medium">
                &ldquo;{moment.quote}&rdquo;
              </div>
              <div className="text-[10px] text-[#A8A29E] mt-1.5">{moment.context}</div>
            </div>
          )}

          {/* 每一步 */}
          {(steps || []).map((s: any) => {
            const style = STEP_STYLE[s.status] || STEP_STYLE.skip;
            const isOpen = expanded.has(s.step);
            return (
              <div key={s.step} className="mb-2 rounded-xl overflow-hidden" style={{ border:'1px solid rgba(0,0,0,.04)' }}>
                {/* 标题行 — 总是可见 */}
                <div
                  onClick={() => toggleExpand(s.step)}
                  className="flex items-center gap-2.5 px-3.5 py-3 text-[12px] cursor-pointer select-none"
                  style={{ background: style.bg }}
                >
                  <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: s.status === 'good' ? 'rgba(16,185,129,.15)' : s.status === 'bad' ? 'rgba(220,38,38,.1)' : 'rgba(0,0,0,.05)', color: style.text }}>
                    {s.step}
                  </span>
                  <span className="flex-1 font-medium" style={{ color: '#1C1917' }}>
                    {s.label.length > 55 ? s.label.slice(0, 55) + '...' : s.label}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0"
                    style={{ background: s.status === 'good' ? 'rgba(16,185,129,.1)' : s.status === 'bad' ? 'rgba(220,38,38,.08)' : 'rgba(0,0,0,.04)', color: style.text }}>
                    {s.tag}
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#A8A29E' }}>{isOpen ? '收起 ▲' : '展开 ▼'}</span>
                </div>

                {/* 详情 — 点击展开 */}
                {isOpen && (
                  <div className="px-3.5 py-3 text-[12px] leading-relaxed space-y-2.5" style={{ background:'rgba(255,255,255,.35)', borderTop:'1px solid rgba(0,0,0,.03)' }}>
                    {/* NPC 反应 */}
                    <div className="text-[#44403C]">
                      <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">老周的反应&nbsp;</span>
                      {s.npcReaction}
                    </div>
                    {/* 绩优做法 */}
                    <div className="text-[#065F46]">{s.bestPractice}</div>
                    {/* 为什么 */}
                    <div className="text-[#57534E]">{s.whyExplanation}</div>
                    {/* 替代选择 */}
                    {s.alternative && (
                      <div className="rounded-lg p-2.5 text-[#065F46]" style={{ background:'rgba(16,185,129,.04)', border:'1px solid rgba(16,185,129,.08)' }}>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">如果当时&nbsp;</span>
                        {s.alternative}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ================================================================
            模块 2 — 如果换一条路（仅在选了非最佳路径时显示）
            ================================================================ */}
        {badSteps.length > 0 && badSteps[0]?.alternative && (
          <div style={CARD}>
            <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">如果换一条路</h2>
            <div className="text-[11px] text-[#A8A29E] mb-3">在第 {badSteps[0].step} 步，如果你选了绩优路径——</div>
            <div className="text-[13px] text-[#1C1917] leading-relaxed">
              {badSteps[0].alternative}
            </div>
          </div>
        )}

        {/* 全部最佳路径时 */}
        {badSteps.length === 0 && (steps || []).length > 0 && (
          <div style={CARD}>
            <h2 className="text-[16px] font-bold text-[#16a34a] mb-0.5">全部命中最佳路径</h2>
            <div className="text-[13px] text-[#44403C] leading-relaxed">
              你在 {totalDecisions} 个决策点全部选择了绩优做法。
              这意味着你对这类团队处境有准确的判断。
              建议尝试更高难度的场景，检验你的能力在不同情境下是否同样稳定。
            </div>
          </div>
        )}

        {/* ================================================================
            模块 3 — 下一次
            ================================================================ */}
        <div style={{ ...CARD, textAlign: 'center' }}>
          {nextPractice && (
            <div className="mb-4">
              <div className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-1">这次最需要强化</div>
              <div className="text-[14px] font-bold text-[#1C1917] mb-1.5">{nextPractice.focus}</div>
              <div className="text-[12px] text-[#57534E] leading-relaxed">{nextPractice.suggestion}</div>
            </div>
          )}
          {micro && (
            <div className="rounded-xl p-3 mb-4 text-left" style={{ background:'rgba(16,185,129,.03)', border:'1px solid rgba(16,185,129,.08)' }}>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{micro.title}</div>
              <div className="text-[12px] leading-relaxed text-[#44403C]"><strong>现在就做：</strong>{micro.instruction}</div>
              <div className="text-[10px] text-[#A8A29E] mt-0.5">{micro.hint}</div>
            </div>
          )}
          <button
            onClick={() => navigate(`/scenario/${sceneId}/chat?skipPrepare=1`)}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98] mb-2"
            style={{ background:'#1C1917', border:'none', cursor:'pointer', fontFamily:'inherit' }}
          >
            再练一次
          </button>
          <button
            onClick={() => navigate('/coaching')}
            className="w-full py-2.5 rounded-2xl text-[13px] font-medium text-stone-400 transition-all hover:text-stone-600"
            style={{ background:'transparent', border:'1px solid rgba(0,0,0,.08)', cursor:'pointer', fontFamily:'inherit' }}
          >
            返回场景列表
          </button>
          {nextPractice?.altTitle && (
            <div className="mt-3 rounded-xl p-3 text-left" style={{ background:'rgba(59,130,246,.02)', border:'1px solid rgba(59,130,246,.06)' }}>
              <div className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider mb-1">{nextPractice.altTitle}</div>
              <div className="text-[11px] leading-relaxed text-[#57534E]">{nextPractice.altDesc}</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ScenarioFeedbackPage;
