// ============================================================
// src/pages/ScenarioFeedback.tsx
// 反馈智能体 · 路由 /scenario/:sceneId/feedback?session=X
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

interface FeedbackOutput {
  layer1_theory: { framework: string; analysis: string };
  layer2_industry: { context: string; calibration: string };
  layer3_expert: {
    comparison: Array<{
      dp_id: string; learner_choice: string; expert_choice: string; gap_analysis: string;
    }>;
  };
  dimension_scores: Record<string, number>;
  pattern_observation: string;
}

const ScenarioFeedback: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackOutput | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [matchRate, setMatchRate] = useState(0);
  const [trapCount, setTrapCount] = useState(0);
  const [sceneTitle, setSceneTitle] = useState('');
  const [completedAt, setCompletedAt] = useState('');

  useEffect(() => {
    if (!sessionId) { setError('缺少 session 参数'); setLoading(false); return; }
    (async () => {
      try {
        // 并行加载场景卡 + 决策路径
        const [sceneResp, sessionResp] = await Promise.all([
          axiosForBackend.get(`/api/coaching/scenario-cards/${sceneId}`),
          axiosForBackend.get(`/api/coaching/sessions/${sessionId}/decision-path`),
        ]);

        const scenarioCard = sceneResp.data.scenarioCard;
        const decisionPath = sessionResp.data.decisionPath;

        if (!scenarioCard || !decisionPath) throw new Error('数据不完整');

        setSceneTitle(scenarioCard.meta?.title || '');
        setCompletedAt(decisionPath.completed_at || '');
        const correct = decisionPath.decisions?.filter((d: any) => d.is_correct).length || 0;
        const total = decisionPath.decisions?.length || 0;
        setCorrectCount(correct);
        setTotalCount(total);
        setMatchRate(Math.round((decisionPath.golden_path_match_rate || 0) * 100));
        setTrapCount(total - correct);

        // 调用反馈分析插件
        const plugin = (window as any).capabilityClient.load('ai_coach_analysis_report_1');
        const result = await plugin.call('textGenerate', {
          scene_info: JSON.stringify(scenarioCard),
          conversation_list: JSON.stringify(decisionPath.decisions),
          analysis_requirements: JSON.stringify({
            layers: ['theory', 'industry', 'expert'],
            dimensions: scenarioCard.feedback_criteria?.scoring_dimensions?.map((d: any) => d.name) || [],
            golden_path: scenarioCard.feedback_criteria?.golden_path || [],
            crack_type_awareness: scenarioCard.feedback_criteria?.crack_type_awareness || {},
          }),
        });

        const fb = typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
        setFeedback(fb);
        setLoading(false);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || '加载失败');
        setLoading(false);
      }
    })();
  }, [sceneId, sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-500 text-sm">
        正在生成反馈报告...
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <p className="text-red-600">{error || '数据加载失败'}</p>
        <button onClick={() => navigate('/scenario/generate')}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm">
          返回场景生成
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      {/* 标题 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{sceneTitle}</h1>
      <p className="text-sm text-gray-500 mb-7">
        反馈报告 · {new Date(completedAt).toLocaleDateString('zh-CN')}
      </p>

      {/* 速览卡片 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-5 flex gap-8 flex-wrap">
        <Stat label="决策点" value={`${correctCount}/${totalCount}`} sub="正确/总数" />
        <Stat label="路径匹配率" value={`${matchRate}%`} sub="与最佳路径对比" />
        <Stat label="陷阱触发" value={`${trapCount}`} sub="次管理误区" />
      </div>

      {/* 理论透镜 */}
      <FeedbackBlock title="🔬 理论透镜" color="border-blue-600" bg="bg-blue-50">
        <p className="font-semibold mb-1.5">{feedback.layer1_theory.framework}</p>
        <p className="leading-relaxed">{feedback.layer1_theory.analysis}</p>
      </FeedbackBlock>

      {/* 行业校准 */}
      <FeedbackBlock title="🏗 行业校准" color="border-orange-500" bg="bg-orange-50">
        <p className="font-semibold mb-1.5">{feedback.layer2_industry.context}</p>
        <p className="leading-relaxed">{feedback.layer2_industry.calibration}</p>
      </FeedbackBlock>

      {/* 专家做法 */}
      <FeedbackBlock title="🎯 专家做法" color="border-green-600" bg="bg-green-50">
        {feedback.layer3_expert.comparison.map((cmp, i) => (
          <div key={i} className="mb-3 p-3 bg-gray-50 rounded-lg last:mb-0">
            <p className="font-semibold text-xs">决策点 {i + 1}：{cmp.dp_id}</p>
            <p className="text-xs mt-1">
              你的选择：<strong>{cmp.learner_choice}</strong>
              <span className="mx-1.5">·</span>
              专家选择：<strong className="text-green-700">{cmp.expert_choice}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">{cmp.gap_analysis}</p>
          </div>
        ))}
      </FeedbackBlock>

      {/* 能力维度评分 */}
      {feedback.dimension_scores && Object.keys(feedback.dimension_scores).length > 0 && (
        <FeedbackBlock title="📊 能力维度评分" color="border-purple-600" bg="bg-purple-50">
          {Object.entries(feedback.dimension_scores).map(([dim, score]) => (
            <div key={dim} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs mb-1">
                <span>{dim}</span>
                <span className="font-semibold">{score}分</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full">
                <div className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${score}%`,
                    background: score >= 70 ? '#2d8a56' : score >= 40 ? '#d97706' : '#c44',
                  }} />
              </div>
            </div>
          ))}
        </FeedbackBlock>
      )}

      {/* 模式觉察 */}
      {feedback.pattern_observation && (
        <FeedbackBlock title="💡 你的决策模式" color="border-gray-700" bg="bg-gray-50">
          <p className="leading-relaxed">{feedback.pattern_observation}</p>
        </FeedbackBlock>
      )}

      {/* 行动按钮 */}
      <div className="flex gap-3 mt-7">
        <button onClick={() => navigate(`/scenario/${sceneId}/chat`)}
          className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
          再练一次同一场景
        </button>
        <button onClick={() => navigate('/scenario/generate')}
          className="flex-1 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
          生成新场景
        </button>
      </div>
    </div>
  );
};

// ---- 子组件 ----

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function FeedbackBlock({ title, color, bg, children }: {
  title: string; color: string; bg: string; children: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 mb-4 border-l-4 ${color}`}>
      <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="text-sm leading-relaxed text-gray-800">{children}</div>
    </div>
  );
}

export default ScenarioFeedback;
