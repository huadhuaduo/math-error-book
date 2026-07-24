// ============================================================
// 反馈智能体页面
// 路由：/scenario/:sceneId/feedback?session=X
// 输入：从 DB 读取 场景卡 + 决策路径 → 调用分析插件
// 输出：三层反馈（理论透镜·行业校准·专家做法）+ 能力评分
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import type { ScenarioCard, DecisionPath, DecisionRecord, FeedbackOutput } from '../types/scenario-card';

export default function ScenarioFeedback() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenarioCard, setScenarioCard] = useState<ScenarioCard | null>(null);
  const [decisionPath, setDecisionPath] = useState<DecisionPath | null>(null);
  const [feedback, setFeedback] = useState<FeedbackOutput | null>(null);

  useEffect(() => {
    if (!sessionId) { setError('缺少 session 参数'); setLoading(false); return; }
    (async () => {
      try {
        // 并行加载场景卡 + 决策路径
        const [sceneRes, sessionRes] = await Promise.all([
          fetch(`/api/coaching-scenes/${sceneId}`),
          fetch(`/api/coaching-sessions/${sessionId}`),
        ]);
        if (!sceneRes.ok) throw new Error('场景不存在');
        if (!sessionRes.ok) throw new Error('会话不存在');

        const sceneData = await sceneRes.json();
        const sessionData = await sessionRes.json();

        const card: ScenarioCard = typeof sceneData.scenario_card === 'string'
          ? JSON.parse(sceneData.scenario_card)
          : sceneData.scenario_card;
        const path: DecisionPath = typeof sessionData.decision_path === 'string'
          ? JSON.parse(sessionData.decision_path)
          : sessionData.decision_path;

        setScenarioCard(card);
        setDecisionPath(path);

        // 调用反馈分析插件
        const plugin = (window as any).capabilityClient.load('ai_coach_analysis_report_1');
        const result = await plugin.call('textGenerate', {
          scene_info: JSON.stringify(card),
          conversation_list: JSON.stringify(path.decisions),
          analysis_requirements: JSON.stringify({
            layers: ['theory', 'industry', 'expert'],
            dimensions: card.feedback_criteria.scoring_dimensions.map(d => d.name),
            golden_path: card.feedback_criteria.golden_path,
            crack_type_awareness: card.feedback_criteria.crack_type_awareness,
          }),
        });

        const feedbackData: FeedbackOutput = typeof result.content === 'string'
          ? JSON.parse(result.content)
          : result.content;

        setFeedback(feedbackData);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    })();
  }, [sceneId, sessionId]);

  // ---- 加载态 ----
  if (loading) {
    return (
      <Center>
        <p style={{ color: '#6b7280', fontSize: 15 }}>正在生成反馈报告...</p>
      </Center>
    );
  }

  if (error || !scenarioCard || !decisionPath || !feedback) {
    return (
      <Center>
        <p style={{ color: '#c44' }}>{error || '数据加载失败'}</p>
        <button onClick={() => navigate('/scenario/generate')}
          style={btnStyle}>返回场景生成</button>
      </Center>
    );
  }

  // ---- 计算速览数据 ----
  const correctCount = decisionPath.decisions.filter(d => d.is_correct).length;
  const totalCount = decisionPath.decisions.length;
  const matchRate = Math.round(decisionPath.golden_path_match_rate * 100);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 40 }}>
      {/* 标题 */}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a2a3a', marginBottom: 4 }}>
        {scenarioCard.meta.title}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>
        反馈报告 · {new Date(decisionPath.completed_at).toLocaleDateString('zh-CN')}
      </p>

      {/* 速览卡片 */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '24px 28px',
        border: '1px solid #e5e7eb', marginBottom: 20,
        display: 'flex', gap: 32, flexWrap: 'wrap',
      }}>
        <Stat label="决策点" value={`${correctCount}/${totalCount}`} sub="正确/总数" />
        <Stat label="路径匹配率" value={`${matchRate}%`} sub="与最佳路径对比" />
        <Stat label="陷阱触发" value={`${totalCount - correctCount}`} sub="次管理误区" />
      </div>

      {/* 三层输出 */}
      <FeedbackSection title="🔬 理论透镜" color="#1a56db">
        <p style={{ fontWeight: 600, marginBottom: 6 }}>{feedback.layer1_theory.framework}</p>
        <p style={{ lineHeight: 1.8 }}>{feedback.layer1_theory.analysis}</p>
      </FeedbackSection>

      <FeedbackSection title="🏗 行业校准" color="#d97706">
        <p style={{ fontWeight: 600, marginBottom: 6 }}>{feedback.layer2_industry.context}</p>
        <p style={{ lineHeight: 1.8 }}>{feedback.layer2_industry.calibration}</p>
      </FeedbackSection>

      <FeedbackSection title="🎯 专家做法" color="#2d8a56">
        {feedback.layer3_expert.comparison.map((cmp, i) => (
          <div key={i} style={{ marginBottom: 12, padding: '10px 14px', background: '#fafbfc', borderRadius: 6 }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>
              决策点 {i + 1}：{cmp.dp_id}
            </p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              你的选择：<strong>{cmp.learner_choice}</strong> · 专家选择：<strong style={{ color: '#2d8a56' }}>{cmp.expert_choice}</strong>
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{cmp.gap_analysis}</p>
          </div>
        ))}
      </FeedbackSection>

      {/* 能力维度评分 */}
      {feedback.dimension_scores && Object.keys(feedback.dimension_scores).length > 0 && (
        <FeedbackSection title="📊 能力维度评分" color="#7c3aed">
          {Object.entries(feedback.dimension_scores).map(([dim, score]) => (
            <div key={dim} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{dim}</span>
                <span style={{ fontWeight: 600 }}>{score}分</span>
              </div>
              <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3 }}>
                <div style={{
                  height: 6, width: `${score}%`, borderRadius: 3,
                  background: score >= 70 ? '#2d8a56' : score >= 40 ? '#d97706' : '#c44',
                }} />
              </div>
            </div>
          ))}
        </FeedbackSection>
      )}

      {/* 模式觉察 */}
      {feedback.pattern_observation && (
        <FeedbackSection title="💡 你的决策模式" color="#1a2a3a">
          <p style={{ lineHeight: 1.8 }}>{feedback.pattern_observation}</p>
        </FeedbackSection>
      )}

      {/* 裂痕类型感知 */}
      {scenarioCard.feedback_criteria.crack_type_awareness.applicable && (
        <div style={{
          padding: '14px 18px', borderRadius: 8,
          background: '#fefce8', border: '1px solid #d97706',
          fontSize: 13, lineHeight: 1.7, marginBottom: 20,
        }}>
          <strong>⚠️ 裂痕感知：</strong>
          {scenarioCard.feedback_criteria.crack_type_awareness.detection_rule}
        </div>
      )}

      {/* 行动按钮 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button onClick={() => navigate(`/scenario/${sceneId}/chat`)}
          style={{ ...btnStyle, flex: 1 }}>
          再练一次同一场景
        </button>
        <button onClick={() => navigate('/scenario/generate')}
          style={{ ...btnStyle, flex: 1, background: '#fff', color: '#1a2a3a', border: '1.5px solid #1a2a3a' }}>
          生成新场景
        </button>
      </div>
    </div>
  );
}

// ---- 子组件 ----

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
      {children}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1a2a3a' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{sub}</div>
    </div>
  );
}

function FeedbackSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '24px 28px',
      border: '1px solid #e5e7eb', marginBottom: 16,
      borderLeft: `3px solid ${color}`,
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a2a3a', marginBottom: 12 }}>{title}</h3>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: '#2a2a2a' }}>{children}</div>
    </div>
  );
}

const btnStyle = {
  padding: '12px 24px', borderRadius: 8, border: 'none',
  background: '#1a2a3a', color: '#fff', fontSize: 15, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
} as const;
