// ScenarioFeedbackPage.tsx — V2 通用版（对标 TG001 反馈六模块）
// 替换线上 client/src/pages/ScenarioFeedbackPage/ScenarioFeedbackPage.tsx
// 数据源：场景卡 JSON（五模块协议） + 会话数据（决策路径 + 对话消息 + 自评）
// 不硬编码任何场景特定内容，不暴露 D/P/T 编码

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  assembleFeedback, assembleEvaluateLayer, assembleConversationReview, assembleSelfEvalComparison,
  getKeyMoment, getVerdict, getManagementInertia, getBehaviorSteps,
  getKnowledgeGaps, getMicroExercise, getNextPractice,
  type DecisionRecord, type ScoringDimension,
} from '../../utils/feedback-assembler';

// ⚠️ 以上 import 路径中的 getKeyMoment/getVerdict/getManagementInertia/getBehaviorSteps/
//    getKnowledgeGaps/getMicroExercise/getNextPractice 来自增强版 feedback-assembler.ts

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,.5)', borderRadius: 18, padding: 24,
  boxShadow: '0 3px 16px rgba(0,0,0,.03)',
};
const TAG_CLS: Record<string, string> = { g: 'bg-emerald-100 text-emerald-800', r: 'bg-red-100 text-red-600', n: 'bg-gray-100 text-gray-500' };

const ScenarioFeedbackPage: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [scenarioCard, setScenarioCard] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) { setError('缺少session参数'); setLoading(false); return; }
    (async () => {
      try {
        const [sceneResp, sessionResp] = await Promise.all([
          axiosForBackend.get('/api/coaching/scenario-cards/' + sceneId),
          axiosForBackend.get('/api/coaching/sessions/' + sessionId),
        ]);
        const card = typeof sceneResp.data.scenarioCard === 'string'
          ? JSON.parse(sceneResp.data.scenarioCard) : sceneResp.data.scenarioCard;
        const sData = sessionResp.data;
        setScenarioCard(card);
        setSessionData(sData);
        setLoading(false);
      } catch (err: any) { setError(err?.message || '加载失败'); setLoading(false); }
    })();
  }, [sceneId, sessionId]);

  // ===== 所有数据处理（纯计算，不调 API） =====
  const {
    moment, verdict, inertia, steps, gaps, micro, nextPractice,
    review, evaluate, convReview, selfEval,
    trapCount, passedCount, totalDecisions,
    npcName, title,
  } = useMemo(() => {
    if (!sessionData || !scenarioCard) return {} as any;
    const messages = sessionData.messages || [];
    const decisionPath = typeof sessionData.decisionPath === 'string'
      ? JSON.parse(sessionData.decisionPath) : (sessionData.decisionPath || {});
    const decisions: DecisionRecord[] = decisionPath.decisions || [];
    const scoringDimensions: ScoringDimension[] = scenarioCard.feedback_criteria?.scoring_dimensions || [];
    const npc = scenarioCard.context?.team_state?.key_individuals?.[0];
    const name = npc?.name || 'NPC';
    const fb = assembleFeedback(scenarioCard, decisionPath);
    return {
      moment: getKeyMoment(messages, decisions, name),
      verdict: getVerdict(decisions),
      inertia: getManagementInertia(decisions),
      steps: getBehaviorSteps(decisions, scenarioCard),
      gaps: getKnowledgeGaps(scoringDimensions, decisions),
      micro: getMicroExercise(scoringDimensions, decisions),
      nextPractice: getNextPractice(decisions, scenarioCard),
      review: fb.review || [],
      evaluate: assembleEvaluateLayer(decisions),
      convReview: assembleConversationReview(messages.filter((m: any) => m.role === 'user' || m.role === 'npc')),
      selfEval: assembleSelfEvalComparison(sessionData.selfAssessment || null, decisionPath.golden_path_match_rate || 0),
      trapCount: decisions.filter((d: DecisionRecord) => !d.is_correct && d.trap_type !== '无').length,
      passedCount: decisions.filter((d: DecisionRecord) => d.is_correct).length,
      totalDecisions: decisions.length,
      npcName: name,
      title: scenarioCard.meta?.title || scenarioCard.title || '场景练习',
    };
  }, [sessionData, scenarioCard]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">生成反馈报告...</div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><p className="text-red-600">{error}</p><button onClick={() => navigate('/scenario/generate')} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm">返回</button></div>;
  if (!sessionData || !scenarioCard) return null;

  return (
    <div style={{ background: 'linear-gradient(165deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)', minHeight: '100vh', fontFamily: "-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" }}>
      <div style={{ position:'fixed',top:-60,right:-40,width:300,height:300,borderRadius:'50%',background:'#FEE2E2',filter:'blur(110px)',opacity:.1,pointerEvents:'none',zIndex:0}} />
      <div style={{ position:'fixed',bottom:-40,left:-20,width:240,height:240,borderRadius:'50%',background:'#FEF3C7',filter:'blur(110px)',opacity:.1,pointerEvents:'none',zIndex:0}} />
      <div className="flex flex-col gap-4 max-w-[720px] mx-auto px-4 py-7 relative" style={{ zIndex:10 }}>

        {/* ═══════ 模块 1：总览 ═══════ */}
        <div style={cardStyle}>
          <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">{title}</h2>
          <div className="text-[11px] text-[#A8A29E] mb-4">
            {new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})} · 对下管理 · 激励
          </div>
          {moment && (
            <div className="rounded-xl p-3.5 mb-4 text-center" style={{ background:'rgba(255,255,255,.5)',border:'1px solid rgba(0,0,0,.03)' }}>
              <div className="text-[13px] text-[#44403C] leading-relaxed italic">&ldquo;{moment.quote}&rdquo;</div>
              <div className="text-[10px] text-[#A8A29E] mt-1">{moment.context}</div>
            </div>
          )}
          <div className="rounded-xl p-3 mb-4 text-center" style={{ background:'rgba(28,25,23,.03)',border:'1px solid rgba(0,0,0,.04)' }}>
            <div className="text-[10px] text-[#A8A29E] mb-0.5">核心判词</div>
            <div className="text-[14px] font-semibold text-[#1C1917] leading-relaxed">{verdict}</div>
          </div>
          {review.map((d: any, i: number) => (
            <div key={i} className="flex items-start gap-2.5 mb-3.5 p-2.5 rounded-xl"
              style={{ background: d.percentage >= 70 ? 'rgba(220,252,231,.15)' : d.percentage >= 40 ? 'rgba(254,226,226,.1)' : 'rgba(243,244,246,.2)' }}>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-[#1C1917] mb-0.5">{d.dimension}</div>
                <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,.06)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width:`${d.percentage}%`, background: d.percentage >= 70 ? '#16a34a' : d.percentage >= 40 ? '#d97706' : '#dc2626' }} />
                  {selfEval?.dimComparison?.[i] && (
                    <div className="absolute top-[-2px] bottom-[-2px] w-[2px] rounded-full" style={{ left:`${((selfEval.dimComparison[i].selfScore-1)/9)*100}%`, background:'#7C3AED' }} />
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0" style={{ minWidth:60 }}>
                <div className="text-[16px] font-bold" style={{ color: d.percentage >= 70 ? '#16a34a' : d.percentage >= 40 ? '#d97706' : '#dc2626' }}>{d.score}</div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">{d.percentage >= 70 ? '达标' : '需加强'}</div>
              </div>
            </div>
          ))}
          {selfEval?.dimComparison && (
            <div className="text-[10px] text-[#A8A29E] mt-1">紫色竖线 = 你的入场自评</div>
          )}
          <div className="flex gap-4 flex-wrap pt-3" style={{ borderTop:'1px solid rgba(0,0,0,.04)' }}>
            <div className="flex-1 min-w-[70px] text-center"><div className="text-[24px] font-bold text-[#1C1917]">{passedCount}/{totalDecisions}</div><div className="text-[9px] text-[#A8A29E] uppercase tracking-wide mt-0.5">行为达标</div></div>
            <div className="flex-1 min-w-[70px] text-center"><div className="text-[24px] font-bold text-red-600">{trapCount}</div><div className="text-[9px] text-[#A8A29E] uppercase tracking-wide mt-0.5">陷阱触发</div></div>
            {selfEval && <div className="flex-1 min-w-[70px] text-center"><div className="text-[24px] font-bold" style={{color: selfEval.actualPercent >= 60 ? '#16a34a' : '#d97706'}}>{selfEval.actualPercent}%</div><div className="text-[9px] text-[#A8A29E] uppercase tracking-wide mt-0.5">匹配率</div></div>}
          </div>
        </div>

        {/* ═══════ 模块 2：觉察 · 你的模式 ═══════ */}
        {inertia && (
          <div style={cardStyle}>
            <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">觉察 · 你的模式</h2>
            <div className="text-[11px] text-[#A8A29E] mb-4">不是"你错了"——是让你看到你在压力下的默认反应。这是惯性，不是能力问题。</div>
            <div className="rounded-xl p-3.5" style={{ background:'rgba(124,58,237,.02)',border:'1px solid rgba(124,58,237,.06)' }}>
              <div className="text-[9px] font-bold text-[#7C3AED] uppercase tracking-wider mb-1">识别到的管理惯性</div>
              <div className="text-[13px] font-semibold text-[#7C3AED] mb-1.5">{inertia.title}</div>
              <div className="text-[11px] text-[#6B7280] leading-relaxed">{inertia.evidence}<br /><br />{inertia.analysis}</div>
            </div>
          </div>
        )}

        {/* ═══════ 模块 3：行为对照 ═══════ */}
        {steps?.length > 0 && (
          <div style={cardStyle}>
            <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">行为 · 你做了什么 vs 绩优做法</h2>
            <div className="text-[11px] text-[#A8A29E] mb-4">每一步的对照——不是评判，是让你看到另一种可能</div>
            {steps.map((s: any) => (
              <div key={s.step} className="mb-2.5 rounded-xl overflow-hidden" style={{ border:'1px solid rgba(0,0,0,.04)' }}>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12px]"
                  style={{ background: s.status === 'good' ? 'rgba(220,252,231,.3)' : s.status === 'bad' ? 'rgba(254,226,226,.3)' : 'rgba(243,244,246,.3)' }}>
                  <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    s.status === 'good' ? 'bg-emerald-100 text-emerald-800' : s.status === 'bad' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>{s.step}</span>
                  <span>{s.label.length > 50 ? s.label.slice(0,50)+'...' : s.label}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ml-auto flex-shrink-0 ${TAG_CLS[s.tagColor]}`}>{s.tag}</span>
                </div>
                <div className="px-3.5 py-2.5 text-[11px] leading-relaxed" style={{ background:'rgba(255,255,255,.3)' }}>
                  <div className="text-[#44403C] mb-1">{s.npcReaction}</div>
                  <strong>{s.bestPractice}</strong><br />
                  <strong>{s.status === 'good' ? '为什么这一步做对了：' : s.status === 'bad' ? '为什么你的做法效果不好：' : '为什么这一步不可跳过：'}</strong>{s.whyExplanation}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════ 模块 4：再来一练 + 知识薄弱点 ═══════ */}
        <div style={cardStyle}>
          <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">再来一练</h2>
          <div className="text-[11px] text-[#A8A29E] mb-4">基于你最需要强化的维度——{nextPractice?.focus || '策略匹配'}</div>
          <div className="rounded-xl p-3.5 mb-1.5" style={{ background:'rgba(59,130,246,.02)',border:'1px solid rgba(59,130,246,.06)' }}>
            <div className="text-[9px] font-bold text-[#3B82F6] uppercase tracking-wider mb-1.5">重练 · 聚焦{nextPractice?.focus || '策略匹配'}</div>
            <div className="text-[12px] leading-relaxed text-[#44403C]">{nextPractice?.suggestion || ''}</div>
          </div>
          {nextPractice?.altTitle && (
            <div className="rounded-xl p-3.5 mb-3" style={{ background:'rgba(59,130,246,.02)',border:'1px solid rgba(59,130,246,.06)' }}>
              <div className="text-[9px] font-bold text-[#3B82F6] uppercase tracking-wider mb-1.5">{nextPractice.altTitle}</div>
              <div className="text-[12px] leading-relaxed text-[#44403C]">{nextPractice.altDesc}</div>
            </div>
          )}
          <button onClick={() => navigate(`/scenario/${sceneId}/chat?skipPrepare=1`)} className="w-full py-3 rounded-2xl text-[14px] font-semibold text-white transition-all hover:opacity-90" style={{ background:'#1C1917',border:'none',fontFamily:'inherit',cursor:'pointer' }}>再练一次</button>
          <button onClick={() => navigate('/scenario/generate')} className="w-full py-3 rounded-2xl text-[14px] font-semibold text-[#1C1917] mt-2 transition-all" style={{ background:'transparent',border:'1.5px solid rgba(0,0,0,.1)',cursor:'pointer' }}>返回场景列表</button>
        </div>

        {/* ═══════ 模块 5：知识薄弱点 ═══════ */}
        {gaps?.length > 0 && (
          <div style={cardStyle}>
            <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">知识薄弱点与微练习</h2>
            <div className="text-[11px] text-[#A8A29E] mb-4">不是在说"你不行"——是告诉你下次把注意力放哪</div>
            {gaps.filter((g: any) => g.level === 'need').length > 0 && (
              <div className="rounded-xl p-3.5 mb-2" style={{ background:'rgba(245,158,11,.03)',border:'1px solid rgba(245,158,11,.08)' }}>
                <div className="text-[9px] font-bold text-red-600 uppercase tracking-wider mb-1.5">需要强化</div>
                {gaps.filter((g: any) => g.level === 'need').map((g: any, i: number) => (
                  <div key={i} className="text-[11px] leading-relaxed text-[#44403C] mb-1"><strong>{g.label}</strong>——{g.desc}</div>
                ))}
              </div>
            )}
            {gaps.filter((g: any) => g.level === 'consolidate').length > 0 && (
              <div className="rounded-xl p-3.5 mb-2" style={{ background:'rgba(245,158,11,.03)',border:'1px solid rgba(245,158,11,.08)' }}>
                <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">已掌握·需巩固</div>
                {gaps.filter((g: any) => g.level === 'consolidate').map((g: any, i: number) => (
                  <div key={i} className="text-[11px] leading-relaxed text-[#44403C] mb-1">{g.label} <span className="text-[#6B7280]">——{g.desc}</span></div>
                ))}
              </div>
            )}
            {micro && (
              <div className="rounded-xl p-3.5 mt-1" style={{ background:'rgba(245,158,11,.03)',border:'1px solid rgba(245,158,11,.08)' }}>
                <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">{micro.title}</div>
                <div className="text-[12px] leading-relaxed text-[#44403C]"><strong>现在就做：</strong>{micro.instruction}</div>
                <div className="text-[10px] text-[#A8A29E] mt-1">{micro.hint}</div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ 模块 6：自评对照 ═══════ */}
        {selfEval && (
          <div style={cardStyle}>
            <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">自评对照</h2>
            <div className="text-[11px] text-[#A8A29E] mb-4">{selfEval.comparisonText}</div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background:'rgba(0,0,0,.02)' }}>
              <div className="flex-1 text-center"><div className="text-[10px] text-gray-500">入场自评</div><div className="text-xl font-bold">{selfEval.avgBridge}</div></div>
              <div className="text-gray-300 text-xl">&rarr;</div>
              <div className="flex-1 text-center"><div className="text-[10px] text-gray-500">实际匹配率</div><div className="text-xl font-bold" style={{color:selfEval.actualPercent>=60?'#16a34a':'#d97706'}}>{selfEval.actualPercent}%</div></div>
              <div className="text-gray-300 text-xl">&rarr;</div>
              <div className="flex-1 text-center"><div className="text-[10px] text-gray-500">结束自评</div><div className="text-xl font-bold">{selfEval.postEvalScore || '—'}/10</div></div>
            </div>
          </div>
        )}

        {/* ═══════ 对话回放 ═══════ */}
        {convReview && convReview.totalRounds > 0 && (
          <div style={cardStyle}>
            <h2 className="text-[16px] font-bold text-[#1C1917] mb-0.5">对话回放</h2>
            <div className="text-[11px] text-[#A8A29E] mb-4">{convReview.behaviorObservation}</div>
            <div className="flex gap-3 mb-4 text-xs">
              <div className="flex-1 bg-emerald-50 rounded-lg p-3 text-center"><div className="text-emerald-700 font-bold text-lg">{convReview.empathyCount}</div><div className="text-emerald-600">共情表达</div></div>
              <div className="flex-1 bg-amber-50 rounded-lg p-3 text-center"><div className="text-amber-700 font-bold text-lg">{convReview.commandCount}</div><div className="text-amber-600">命令式表达</div></div>
              <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center"><div className="text-blue-700 font-bold text-lg">{convReview.totalRounds}</div><div className="text-blue-600">对话轮次</div></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ScenarioFeedbackPage;
