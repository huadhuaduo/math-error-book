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
    <div className="max-w-4xl mx-auto px-5 py-10" style={{fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"}}>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">场景陪练</h1>
        <p className="text-sm text-gray-500">每个场景都是一个真实的管理困境。选一个，开始练习。</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">{[1,2,3,4].map(i=><div key={i} className="rounded-2xl bg-white/40 h-48 animate-pulse"/>)}</div>
      ) : scenes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-sm">暂无场景。使用 AI 生成新场景开始。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {scenes.map((s: SceneItem) => {
            var dv = s.dVector || {};
            var card = (s as any).scenarioCard;
            var ctx = card?.context;
            var npc = ctx?.team_state?.key_individuals?.[0];
            var sit = ctx?.situation;
            var summary = sit?.project_status||'';
            if (summary.length>80) summary=summary.slice(0,80)+'…';
            var deadline = sit?.deadline||'';
            var difficulty = (card?.meta?.difficulty)||'medium';
            var diffLabel = {basic:'入门',medium:'进阶',advanced:'挑战'}[difficulty]||'进阶';
            var diffColor = {basic:'bg-emerald-100 text-emerald-700',medium:'bg-amber-100 text-amber-700',advanced:'bg-red-100 text-red-700'}[difficulty]||'bg-amber-100 text-amber-700';
            // 场景视觉主题
            var d1=(dv.D1_morale_root||dv.D1||'');
            var themes: Record<string,{bg:string;border:string;avatar:string;tag:string;img:string}> = {
              '过劳衰竭':{bg:'from-amber-50 to-orange-50',border:'border-amber-200/60',avatar:'from-amber-500 to-orange-600',tag:'bg-amber-100 text-amber-700',img:'🌅'},
              '缺乏意义感':{bg:'from-blue-50 to-indigo-50',border:'border-blue-200/60',avatar:'from-blue-500 to-indigo-600',tag:'bg-blue-100 text-blue-700',img:'🏗'},
              '缺乏公平感':{bg:'from-rose-50 to-red-50',border:'border-rose-200/60',avatar:'from-rose-500 to-red-600',tag:'bg-rose-100 text-rose-700',img:'⚖'},
              '缺乏安全感':{bg:'from-emerald-50 to-teal-50',border:'border-emerald-200/60',avatar:'from-emerald-500 to-teal-600',tag:'bg-emerald-100 text-emerald-700',img:'🔑'},
            };
            var theme=themes[d1]||themes['过劳衰竭'];
            return (
              <button key={s.id} onClick={()=>navigate(`/scenario/${s.id}/chat`)}
                className={`bg-gradient-to-br ${theme.bg} border ${theme.border} rounded-2xl overflow-hidden text-left hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}
                style={{boxShadow:'0 2px 12px rgba(0,0,0,.04)'}}>
                {/* 封面图区域 */}
                <div className="h-28 flex items-center justify-center relative overflow-hidden" style={{background:'linear-gradient(135deg,'+(d1.indexOf('过劳')>=0?'rgba(245,158,11,.15),rgba(217,119,6,.08)':d1.indexOf('意义')>=0?'rgba(59,130,246,.12),rgba(99,102,241,.06)':d1.indexOf('公平')>=0?'rgba(244,63,94,.12),rgba(225,29,72,.06)':'rgba(16,185,129,.12),rgba(20,184,166,.06)')+')'}}>
                  <div className="text-5xl opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500">{theme.img}</div>
                  <div className="absolute top-3 right-3"><span className={`text-xs px-2 py-0.5 rounded-full ${diffColor}`}>{diffLabel}</span></div>
                  {deadline && <div className="absolute bottom-3 left-3 text-xs text-gray-400 bg-white/60 px-2 py-0.5 rounded-full">{deadline}</div>}
                </div>
                {/* 内容区 */}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${theme.avatar} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>{npc?.name?.[0]||'?'}</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm leading-tight">{s.title||'未命名'}</div>
                      <div className="text-xs text-gray-400">{npc?.name||''} · {npc?.role||''} · {npc?.tenure||''}年</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{summary}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${theme.tag}`}>{d1}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">{dv.D2_pressure_mode||dv.D2||''}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">{dv.D5_trust_base||dv.D5||''}</span>
                  </div>
                </div>
              </button>
            );
          })}
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
