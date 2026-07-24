// src/pages/ScenarioGenerate.tsx
// 场景选择（案例库）+ AI 生成

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

interface SceneItem {
  id: string;
  title: string;
  status: string;
  dVector: any;
  pSequence: string;
  createdAt: string;
}

const ScenarioGenerate: React.FC = () => {
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // D 向量参数
  const [d1, setD1] = useState('过劳衰竭');
  const [d2, setD2] = useState('短期冲刺');
  const [d3, setD3] = useState('混合两极');
  const [d4, setD4] = useState('有限');
  const [d5, setD5] = useState('需要建立');
  const [crackType, setCrackType] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState('medium');

  // 加载已有场景
  useEffect(() => {
    (async () => {
      try {
        const resp = await axiosForBackend.get('/api/coaching/scenario-cards');
        setScenes(resp.data || []);
      } catch (err) {
        console.warn('加载场景列表失败', err);
      }
      setLoading(false);
    })();
  }, []);

  // AI 生成新场景
  const handleGenerate = async () => {
    setError(null);
    setGenerateLoading(true);
    try {
      const dVector = {
        D1_morale_root: d1, D2_pressure_mode: d2, D3_experience_mix: d3,
        D4_incentive_resource: d4, D5_trust_base: d5, D5_crack_type: d5 === '存在裂痕' ? crackType : null,
      };
      const plugin = (window as any).capabilityClient.load('scenario_card_smart_generate_v19_1');
      const result = await plugin.call('textGenerate', {
        system_prompt: '',
        user_message_history: JSON.stringify({
          d_vector: dVector,
          p_step_range: ['P2', 'P3', 'P5', 'P6'].slice(0, 3),
          difficulty_level: difficulty,
          industry_param: '地产',
        }),
      });
      const card = typeof result.content === 'string' ? JSON.parse(result.content) : result.content;

      const resp = await axiosForBackend.post('/api/coaching/scenario-cards', {
        scenarioCard: card,
        dVector,
        pSequence: card.meta?.p_sequence || '',
        progressionChain: card.meta?.progression_chain || '',
        title: card.meta?.title || 'AI生成场景',
      });
      navigate(`/scenario/${resp.data.id}/chat`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '生成失败');
      setGenerateLoading(false);
    }
  };

  // 难度标签颜色
  const diffColor = (d: string) => d === 'basic' ? 'bg-green-100 text-green-700' : d === 'advanced' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">团队激励 · 场景陪练</h1>
      <p className="text-sm text-gray-500 mb-8">选择一个场景开始练习，或生成新的训练场景</p>

      {/* 案例库 */}
      <h2 className="text-base font-semibold text-gray-700 mb-4">📚 案例库（{scenes.length} 个场景）</h2>

      {loading ? (
        <p className="text-sm text-gray-400">加载中...</p>
      ) : scenes.length === 0 ? (
        <p className="text-sm text-gray-400 mb-6">暂无场景。点击下方"AI 生成新场景"创建第一个。</p>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {scenes.map((s: SceneItem) => (
            <button key={s.id}
              onClick={() => navigate(`/scenario/${s.id}/chat`)}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl text-left hover:border-gray-400 hover:shadow-sm transition-all">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{s.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {s.pSequence || ''}
                  {s.dVector && <span className="ml-2">D₁:{s.dVector.D1||s.dVector.D1_morale_root||''} D₅:{s.dVector.D5||s.dVector.D5_trust_base||''}</span>}
                </div>
              </div>
              <span className="text-xs text-gray-400 ml-3 flex-shrink-0">
                {new Date(s.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* AI 生成入口 */}
      <div className="border-t border-gray-200 pt-6">
        {!showGenerate ? (
          <button onClick={() => setShowGenerate(true)}
            className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
            + AI 生成新场景
          </button>
        ) : (
          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">AI 生成新场景</h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Select label="D₁ 士气根源" value={d1} onChange={setD1}
                options={['过劳衰竭','缺乏意义感','缺乏公平感','缺乏安全感']} />
              <Select label="D₂ 压力模式" value={d2} onChange={setD2}
                options={['短期冲刺','结构转型','流程重建','收尾维稳']} />
              <Select label="D₃ 经验构成" value={d3} onChange={setD3}
                options={['资深为主','资浅为主','混合两极']} />
              <Select label="D₄ 激励资源" value={d4} onChange={setD4}
                options={['丰富','有限','极度受限']} />
              <Select label="D₅ 信任基础" value={d5} onChange={(v) => { setD5(v); if (v !== '存在裂痕') setCrackType(null); }}
                options={['已有信任','需要建立','存在裂痕']} />
              {d5 === '存在裂痕' && (
                <Select label="裂痕类型" value={crackType || ''} onChange={(v) => setCrackType(v || null)}
                  options={['显性冲突','隐性对抗']} />
              )}
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{error}</div>}

            <div className="flex gap-3">
              <button onClick={handleGenerate} disabled={generateLoading}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:bg-gray-400 transition-colors">
                {generateLoading ? '生成中...' : '生成场景卡 → 进入陪练'}
              </button>
              <button onClick={() => setShowGenerate(false)}
                className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export default ScenarioGenerate;
