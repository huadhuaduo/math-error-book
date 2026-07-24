// ============================================================
// src/pages/ScenarioChat.tsx
// 对话决策智能体 · 路由 /scenario/:sceneId/chat
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

type PagePhase = 'loading' | 'narrative' | 'decision' | 'consequence' | 'complete';

interface Consequence {
  immediate: string;
  short_term: string;
  npc_state_after: string;
}

interface Option {
  id: 'A' | 'B' | 'C';
  text: string;
  is_best_path: boolean;
  trap_type: string;
  trap_mechanism?: string;
  why_correct?: string;
  why_wrong?: string;
  consequence: Consequence;
  causal_chain: string;
}

interface DecisionPoint {
  dp_id: string;
  sequence: number;
  capability_tag: string;
  capability_definition: string;
  trigger: { pause_text: string };
  options: [Option, Option, Option];
}

interface DecisionRecord {
  dp_id: string;
  sequence: number;
  selected_option: string;
  is_correct: boolean;
  trap_type: string;
  timestamp: string;
}

interface ScenarioCard {
  meta: { title: string; p_sequence: string; progression_chain: string };
  context: any;
  decision_points: DecisionPoint[];
  feedback_criteria: any;
}

const ScenarioChat: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();

  const [scenarioCard, setScenarioCard] = useState<ScenarioCard | null>(null);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [currentDpIndex, setCurrentDpIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | null>(null);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // 加载场景卡 + 创建会话
  useEffect(() => {
    (async () => {
      try {
        const resp = await axiosForBackend.get(`/api/coaching/scenario-cards/${sceneId}`);
        if (!resp.data?.scenarioCard) throw new Error('场景卡数据为空');
        setScenarioCard(resp.data.scenarioCard);

        const sessionResp = await axiosForBackend.post('/api/coaching/sessions/with-decision-path', {
          sceneId,
          decisionPath: {
            scenario_id: sceneId,
            started_at: new Date().toISOString(),
            decisions: [],
            golden_path_match_rate: 0,
          },
        });
        setSessionId(sessionResp.data.id);
        setPhase('narrative');
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || '加载失败');
      }
    })();
  }, [sceneId]);

  const currentDp = scenarioCard?.decision_points?.[currentDpIndex] ?? null;

  // 选择选项
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

  // 继续下一决策点 或 完成
  const handleContinue = useCallback(async () => {
    if (!scenarioCard) return;
    const nextIndex = currentDpIndex + 1;

    if (nextIndex >= scenarioCard.decision_points.length) {
      // 全部完成 → 存储 → 跳转反馈
      setPhase('complete');
      const correctCount = decisions.filter(d => d.is_correct).length;
      const decisionPath = {
        scenario_id: sceneId,
        started_at: decisions[0]?.timestamp || new Date().toISOString(),
        completed_at: new Date().toISOString(),
        decisions: [...decisions],
        golden_path_match_rate: decisions.length > 0 ? correctCount / decisions.length : 0,
      };
      await axiosForBackend.patch(`/api/coaching/sessions/${sessionId}/decision-path`, {
        decisionPath,
      });
      navigate(`/scenario/${sceneId}/feedback?session=${sessionId}`);
    } else {
      setCurrentDpIndex(nextIndex);
      setSelectedOption(null);
      setPhase('narrative');
    }
  }, [currentDpIndex, scenarioCard, decisions, sessionId, sceneId, navigate]);

  // ---- 加载态 / 错误态 ----
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        {error ? (
          <>
            <p className="text-red-600">{error}</p>
            <button onClick={() => navigate('/scenario/generate')}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm">
              返回场景生成
            </button>
          </>
        ) : (
          <p className="text-gray-500">加载场景...</p>
        )}
      </div>
    );
  }

  if (!scenarioCard || !currentDp) {
    return <div className="flex items-center justify-center min-h-[300px] text-red-600">场景数据异常</div>;
  }

  const totalDps = scenarioCard.decision_points.length;

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      {/* 进度条 */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-1.5">决策点 {currentDpIndex + 1} / {totalDps}</div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className="h-1 bg-gray-900 rounded-full transition-all duration-300"
            style={{ width: `${((currentDpIndex + 1) / totalDps) * 100}%` }} />
        </div>
      </div>

      {/* 叙事阶段 */}
      {phase === 'narrative' && (
        <div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-5 border-l-4 border-gray-600 leading-relaxed text-sm">
            <p className="font-semibold text-gray-900 mb-2">
              决策点 #{currentDp.sequence} · {currentDp.capability_tag}
            </p>
            <p className="text-gray-500 text-xs mb-3">{currentDp.trigger.pause_text}</p>
            <div className="text-xs text-gray-600">
              练的是：{currentDp.capability_definition}
            </div>
          </div>
          <button onClick={() => setPhase('decision')}
            className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-base font-semibold hover:bg-gray-800 transition-colors">
            进入决策
          </button>
        </div>
      )}

      {/* 决策阶段 */}
      {phase === 'decision' && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {currentDp.trigger.pause_text}
          </h2>
          <div className="flex flex-col gap-2.5">
            {currentDp.options.map(opt => (
              <button key={opt.id} onClick={() => handleSelect(opt.id)}
                className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 bg-white text-left
                  hover:border-gray-500 hover:shadow-sm transition-all text-sm leading-relaxed">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-900
                  flex items-center justify-center text-xs font-bold">
                  {opt.id}
                </span>
                <span className="flex-1">{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 后果阶段 */}
      {phase === 'consequence' && selectedOption && (() => {
        const opt = currentDp.options.find(o => o.id === selectedOption)!;
        const isCorrect = opt.is_best_path;
        return (
          <div>
            <div className={`rounded-xl p-6 mb-4 border-l-4 leading-relaxed text-sm ${
              isCorrect
                ? 'bg-green-50 border-green-600 text-green-900'
                : 'bg-red-50 border-red-500 text-red-900'
            }`}>
              <p className="font-bold mb-2">
                {isCorrect ? '✅ 正确选择' : `❌ 管理陷阱：${opt.trap_type}`}
              </p>
              <p><strong>后果：</strong>{opt.consequence.immediate}</p>
              <p className="mt-1.5">{opt.consequence.short_term}</p>

              <div className="mt-3 p-3 bg-black/5 rounded-lg text-xs">
                <strong>{isCorrect ? '✅ 为什么对：' : '❌ 为什么错：'}</strong>
                {isCorrect ? opt.why_correct : opt.why_wrong}
                <div className="mt-1 text-gray-500 italic">
                  ⛓ 因果链：{opt.causal_chain}
                </div>
              </div>
            </div>

            <button onClick={handleContinue}
              className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-base font-semibold hover:bg-gray-800 transition-colors">
              {currentDpIndex >= totalDps - 1 ? '查看反馈报告 →' : '继续下一个决策点 →'}
            </button>
          </div>
        );
      })()}

      {/* 完成 */}
      {phase === 'complete' && (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
          <p className="text-base text-green-700 font-semibold">全部决策点完成</p>
          <p className="text-sm text-gray-500">正在生成反馈报告...</p>
        </div>
      )}
    </div>
  );
};

export default ScenarioChat;
