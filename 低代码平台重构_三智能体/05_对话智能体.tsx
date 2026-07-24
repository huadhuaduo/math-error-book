// ============================================================
// 对话决策智能体页面
// 路由：/scenario/:sceneId/chat
// 输入：从 DB 读取场景卡 → 叙事推进 → 决策点暂停 → 收集选择
// 输出：决策路径 → 存入 coaching_sessions → 跳转反馈页
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ScenarioCard, DecisionPoint, DecisionPath, DecisionRecord } from '../types/scenario-card';

// ---- 页面状态机 ----
type PagePhase = 'loading' | 'narrative' | 'decision' | 'consequence' | 'transition' | 'complete';

export default function ScenarioChat() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();

  const [scenarioCard, setScenarioCard] = useState<ScenarioCard | null>(null);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [currentDpIndex, setCurrentDpIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | null>(null);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // 加载场景卡
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/coaching-scenes/${sceneId}`);
        if (!res.ok) throw new Error('场景不存在');
        const data = await res.json();
        if (!data.scenario_card) throw new Error('场景卡数据为空');

        const card: ScenarioCard = typeof data.scenario_card === 'string'
          ? JSON.parse(data.scenario_card)
          : data.scenario_card;

        setScenarioCard(card);

        // 创建 session
        const sessionRes = await fetch('/api/coaching-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario_id: sceneId,
            decision_path: { scenario_id: sceneId, started_at: new Date().toISOString(), decisions: [], golden_path_match_rate: 0 },
          }),
        });
        const session = await sessionRes.json();
        setSessionId(session.id);
        setPhase('narrative');
      } catch (err: any) {
        setError(err.message);
        setPhase('loading');
      }
    })();
  }, [sceneId]);

  // 当前决策点
  const currentDp: DecisionPoint | null = scenarioCard?.decision_points?.[currentDpIndex] ?? null;

  // 学员选择选项
  const handleSelect = useCallback((optionId: 'A' | 'B' | 'C') => {
    if (!currentDp || phase !== 'decision') return;

    const option = currentDp.options.find(o => o.id === optionId)!;
    setSelectedOption(optionId);

    const record: DecisionRecord = {
      dp_id: currentDp.dp_id,
      sequence: currentDp.sequence,
      selected_option: optionId,
      is_correct: option.is_best_path,
      trap_type: option.trap_type,
      timestamp: new Date().toISOString(),
    };

    setDecisions(prev => [...prev, record]);
    setPhase('consequence');
  }, [currentDp, phase]);

  // 看完后果 → 进入下一决策点或完成
  const handleContinue = useCallback(() => {
    if (!scenarioCard) return;

    const nextIndex = currentDpIndex + 1;
    if (nextIndex >= scenarioCard.decision_points.length) {
      // 全部完成 → 存储决策路径 → 跳转反馈
      setPhase('complete');
      saveDecisionPath();
    } else {
      setCurrentDpIndex(nextIndex);
      setSelectedOption(null);
      setPhase('narrative');
    }
  }, [currentDpIndex, scenarioCard, decisions, sessionId, sceneId, navigate]);

  // 存储决策路径到 DB
  const saveDecisionPath = useCallback(async () => {
    if (!sessionId || !scenarioCard) return;

    const correctCount = decisions.filter(d => d.is_correct).length;
    const path: DecisionPath = {
      scenario_id: sceneId!,
      started_at: decisions[0]?.timestamp || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      decisions,
      golden_path_match_rate: decisions.length > 0 ? correctCount / decisions.length : 0,
    };

    await fetch(`/api/coaching-sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision_path: path }),
    });

    navigate(`/scenario/${sceneId}/feedback?session=${sessionId}`);
  }, [sessionId, sceneId, decisions, navigate]);

  // ---- 加载态 ----
  if (phase === 'loading') {
    return (
      <Center>
        {error ? (
          <div style={{ color: '#c44', textAlign: 'center' }}>
            <p>加载失败：{error}</p>
            <button onClick={() => navigate('/scenario/generate')}
              style={btnStyle}>返回场景生成</button>
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>加载场景...</p>
        )}
      </Center>
    );
  }

  if (!scenarioCard || !currentDp) {
    return <Center><p style={{ color: '#c44' }}>场景数据异常</p></Center>;
  }

  // ---- 渲染 ----
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 32 }}>
      {/* 进度 */}
      <ProgressBar current={currentDpIndex + 1} total={scenarioCard.decision_points.length} />

      {/* 叙事阶段 */}
      {phase === 'narrative' && (
        <NarrativeBlock dp={currentDp} onStart={() => setPhase('decision')} />
      )}

      {/* 决策阶段 */}
      {phase === 'decision' && (
        <DecisionBlock dp={currentDp} onSelect={handleSelect} />
      )}

      {/* 后果揭示阶段 */}
      {phase === 'consequence' && selectedOption && (
        <ConsequenceBlock
          option={currentDp.options.find(o => o.id === selectedOption)!}
          onContinue={handleContinue}
          isLast={currentDpIndex >= scenarioCard.decision_points.length - 1}
        />
      )}

      {/* 完成 */}
      {phase === 'complete' && (
        <Center>
          <p style={{ fontSize: 16, color: '#2d8a56' }}>全部决策点完成</p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>正在生成反馈报告...</p>
        </Center>
      )}
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

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
        决策点 {current} / {total}
      </div>
      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2 }}>
        <div style={{ height: 4, width: `${(current / total) * 100}%`, background: '#1a2a3a', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function NarrativeBlock({ dp, onStart }: { dp: DecisionPoint; onStart: () => void }) {
  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #fafbfc 0%, #f0f3f7 100%)',
        borderRadius: 10, padding: '24px 28px', marginBottom: 20,
        borderLeft: '3px solid #2c3e5a', lineHeight: 1.9, fontSize: 14,
      }}>
        <p style={{ fontWeight: 600, color: '#1a2a3a', marginBottom: 8 }}>
          决策点 #{dp.sequence} · {dp.capability_tag}
        </p>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
          {dp.trigger.pause_text}
        </p>
        <div style={{ fontSize: 11, color: '#2c3e5a', marginTop: 4 }}>
          练的是：{dp.capability_definition}
        </div>
      </div>

      <button onClick={onStart} style={{
        width: '100%', padding: 14, borderRadius: 8, border: 'none',
        background: '#1a2a3a', color: '#fff', fontSize: 16, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        进入决策
      </button>
    </div>
  );
}

function DecisionBlock({ dp, onSelect }: { dp: DecisionPoint; onSelect: (id: 'A' | 'B' | 'C') => void }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a2a3a', marginBottom: 16 }}>
        {dp.trigger.pause_text.split('。').slice(-2).join('。')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dp.options.map(opt => (
          <button key={opt.id} onClick={() => onSelect(opt.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb',
              background: '#fff', cursor: 'pointer', textAlign: 'left',
              fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2c3e5a'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}>
            <span style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
              background: '#e8ecf2', color: '#1a2a3a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
            }}>
              {opt.id}
            </span>
            <span style={{ flex: 1 }}>{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConsequenceBlock({ option, onContinue, isLast }: {
  option: NonNullable<ReturnType<typeof DecisionPoint.prototype.options.find>>;
  onContinue: () => void;
  isLast: boolean;
}) {
  const isCorrect = option.is_best_path;

  return (
    <div>
      <div style={{
        padding: '20px 24px', borderRadius: 10, marginBottom: 16,
        background: isCorrect ? '#edf7f0' : '#fef2f2',
        borderLeft: `3px solid ${isCorrect ? '#2d8a56' : '#c44'}`,
        color: isCorrect ? '#1a5c36' : '#7f1d1d',
        fontSize: 14, lineHeight: 1.8,
      }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>
          {isCorrect ? '✅ 正确选择' : `❌ 管理陷阱：${option.trap_type}`}
        </p>

        <p><strong>后果：</strong>{option.consequence.immediate}</p>
        <p style={{ marginTop: 6 }}>{option.consequence.short_term}</p>

        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, background: 'rgba(0,0,0,.04)', fontSize: 12 }}>
          <strong>{isCorrect ? '✅ 为什么对：' : '❌ 为什么错：'}</strong>
          {isCorrect ? option.why_correct : option.why_wrong}
          <div style={{ marginTop: 4, color: '#6b7280', fontStyle: 'italic' }}>
            ⛓ 因果链：{option.causal_chain}
          </div>
        </div>
      </div>

      <button onClick={onContinue} style={{
        width: '100%', padding: 14, borderRadius: 8, border: 'none',
        background: '#1a2a3a', color: '#fff', fontSize: 16, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {isLast ? '查看反馈报告 →' : '继续下一个决策点 →'}
      </button>
    </div>
  );
}

const btnStyle = {
  padding: '10px 24px', borderRadius: 6, border: 'none',
  background: '#1a2a3a', color: '#fff', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit',
} as const;
