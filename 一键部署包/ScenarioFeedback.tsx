// src/pages/ScenarioFeedback.tsx
// 反馈智能体 · 接入 feedback-assembler · AI润色

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { assembleFeedback, buildFeedbackPrompt } from '../utils/feedback-assembler';

const ScenarioFeedback: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [polished, setPolished] = useState<string>('');

  useEffect(() => {
    if (!sessionId) { setError('缺少session参数'); setLoading(false); return; }
    (async () => {
      try {
        var [sceneResp, sessionResp] = await Promise.all([
          axiosForBackend.get('/api/coaching/scenario-cards/' + sceneId),
          axiosForBackend.get('/api/coaching/sessions/' + sessionId + '/decision-path'),
        ]);
        var scenarioCard = typeof sceneResp.data.scenarioCard === 'string'
          ? JSON.parse(sceneResp.data.scenarioCard) : sceneResp.data.scenarioCard;
        var decisionPath = typeof sessionResp.data.decisionPath === 'string'
          ? JSON.parse(sessionResp.data.decisionPath) : sessionResp.data.decisionPath;

        // 组装结构化反馈
        var fb = assembleFeedback(scenarioCard, decisionPath);
        setFeedback(fb);

        // AI润色
        var plugin = capabilityClient.load('ai_coach_analysis_report_1');
        if (plugin) {
          var prompt = buildFeedbackPrompt(fb);
          var result = await plugin.call('textGenerate', {
            scene_info: JSON.stringify(scenarioCard),
            conversation_list: JSON.stringify(decisionPath.decisions),
            analysis_requirements: prompt,
          });
          setPolished(result.content || result.text || '');
        } else {
          setPolished(JSON.stringify(fb.evaluate?.pattern_observation || ''));
        }
        setLoading(false);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || '加载失败');
        setLoading(false);
      }
    })();
  }, [sceneId, sessionId]);

  if (loading) return <div className="flex items-center justify-center min-h-[300px] text-gray-500">生成反馈报告...</div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-[300px] gap-4"><p className="text-red-600">{error}</p><button onClick={() => navigate('/scenario/generate')} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm">返回</button></div>;
  if (!feedback) return null;

  var s = feedback.summary;
  var ev = feedback.evaluate;

  return (
    <div className="max-w-2xl mx-auto px-5 py-10" style={{fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">反馈报告</h1>

      {/* 速览卡片 */}
      <div className="flex gap-6 my-6" style={{fontSize:13}}>
        <div><span className="text-gray-400 text-xs">决策点</span><br/><strong className="text-xl">{s.correct}/{s.total}</strong></div>
        <div><span className="text-gray-400 text-xs">匹配率</span><br/><strong className="text-xl">{s.match_rate}%</strong></div>
        <div><span className="text-gray-400 text-xs">陷阱</span><br/><strong className="text-xl" style={{color:s.total-s.correct>0?'#c44':'#2d8a56'}}>{s.total-s.correct}次</strong></div>
      </div>

      {/* AI润色段落 */}
      {polished && (
        <div className="rounded-xl p-6 mb-5 text-sm leading-relaxed"
          style={{background:'rgba(255,255,255,.6)',backdropFilter:'blur(12px)',border:'1px solid rgba(0,0,0,.04)',boxShadow:'0 2px 12px rgba(0,0,0,.03)'}}>
          <h3 className="text-base font-semibold text-gray-900 mb-3">📋 综合评估</h3>
          <p>{polished}</p>
        </div>
      )}

      {/* 模式诊断 */}
      {ev && (
        <div className="rounded-xl p-6 mb-5 text-sm leading-relaxed"
          style={{background:'rgba(255,255,255,.6)',border:'1px solid rgba(0,0,0,.04)',borderLeft:'3px solid #7c3aed',boxShadow:'0 2px 12px rgba(0,0,0,.03)'}}>
          <h3 className="text-base font-semibold text-gray-900 mb-3">💡 你的管理倾向</h3>
          <p>{ev.pattern_observation}</p>
          {ev.trap_details?.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {ev.trap_details.map((t: any, i: number) => (
                <div key={i} className="p-3 rounded-lg text-xs" style={{background:'rgba(254,242,242,.5)',border:'1px solid rgba(220,38,38,.1)'}}>
                  <strong>{t.陷阱}</strong>：{t.解读}<br/>
                  <span className="text-gray-600">改进：{t.改进建议}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 维度评分 */}
      {feedback.review?.length > 0 && (
        <div className="rounded-xl p-6 mb-5"
          style={{background:'rgba(255,255,255,.6)',border:'1px solid rgba(0,0,0,.04)',boxShadow:'0 2px 12px rgba(0,0,0,.03)'}}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">📊 能力维度</h3>
          {feedback.review.map((d: any, i: number) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between text-xs mb-1"><span className="font-medium">{d.dimension}</span><span className="font-semibold">{d.score}分</span></div>
              <div className="h-2 rounded-full" style={{background:'rgba(0,0,0,.05)'}}>
                <div className="h-2 rounded-full transition-all duration-700" style={{width:d.percentage+'%',background:d.percentage>=70?'linear-gradient(90deg,#2d8a56,#16a34a)':d.percentage>=40?'linear-gradient(90deg,#d97706,#f59e0b)':'linear-gradient(90deg,#c44,#dc2626)'}} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{d.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* 按钮 */}
      <div className="flex gap-3 mt-7">
        <button onClick={() => navigate('/scenario/' + sceneId + '/chat')}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{background:'linear-gradient(135deg,#1a2a3a,#2c3e5a)'}}>再练一次</button>
        <button onClick={() => navigate('/scenario/generate')}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-900 transition-all hover:bg-gray-50"
          style={{border:'1.5px solid rgba(0,0,0,.1)',background:'rgba(255,255,255,.5)'}}>案例库</button>
      </div>
    </div>
  );
};

export default ScenarioFeedback;
