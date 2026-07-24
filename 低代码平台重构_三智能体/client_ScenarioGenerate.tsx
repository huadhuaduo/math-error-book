// ============================================================
// src/pages/ScenarioGenerate.tsx
// 场景生成智能体 · 路由 /scenario/generate
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

// ---- D 向量选项 ----
const D1_OPTIONS = [
  { value: '过劳衰竭', label: '过劳衰竭——团队累到极限' },
  { value: '缺乏意义感', label: '缺乏意义感——不知道为什么要做' },
  { value: '缺乏公平感', label: '缺乏公平感——觉得分配不公' },
  { value: '缺乏安全感', label: '缺乏安全感——怕丢工作/被边缘化' },
];
const D2_OPTIONS = [
  { value: '短期冲刺', label: '短期冲刺——20天倒计时那种' },
  { value: '结构转型', label: '结构转型——从一种模式切换到另一种' },
  { value: '流程重建', label: '流程重建——旧流程坏了，建新的' },
  { value: '收尾维稳', label: '收尾维稳——项目收尾，稳住别乱' },
];
const D3_OPTIONS = [
  { value: '资深为主', label: '资深为主——3-5年以上的老人' },
  { value: '资浅为主', label: '资浅为主——1年以下的新人居多' },
  { value: '混合两极', label: '混合两极——老人和新人分化明显' },
];
const D4_OPTIONS = [
  { value: '丰富', label: '丰富——有预算、有名额、有空间' },
  { value: '有限', label: '有限——有点预算但不多' },
  { value: '极度受限', label: '极度受限——一分钱都没有' },
];
const D5_OPTIONS = [
  { value: '已有信任', label: '已有信任——团队信你' },
  { value: '需要建立', label: '需要建立——空降/新接手，零信任' },
  { value: '存在裂痕', label: '存在裂痕——经历过失败/背叛' },
];
const CRACK_OPTIONS = [
  { value: '显性冲突', label: '显性冲突——公开抱怨、拒绝沟通' },
  { value: '隐性对抗', label: '隐性对抗——会上点头、会后不动' },
];
const P_STEPS = [
  { key: 'P1', label: 'P₁ 诊断' },
  { key: 'P2', label: 'P₂ 信任' },
  { key: 'P3', label: 'P₃ 目标' },
  { key: 'P4', label: 'P₄ 激励' },
  { key: 'P5', label: 'P₅ 赋能' },
  { key: 'P6', label: 'P₆ 闭环' },
];
const DIFFICULTY_OPTIONS = [
  { value: 'basic', label: '基础——错误选项较明显' },
  { value: 'medium', label: '中等——三个选项都有道理' },
  { value: 'advanced', label: '高级——三个都是对的，不同价值观' },
];

interface DVector {
  D1: string; D2: string; D3: string; D4: string; D5: string;
  D5_crack_type: string | null;
}

const ScenarioGenerate: React.FC = () => {
  const navigate = useNavigate();

  const [dVector, setDVector] = useState<DVector>({
    D1: '过劳衰竭', D2: '短期冲刺', D3: '混合两极',
    D4: '有限', D5: '需要建立', D5_crack_type: null,
  });
  const [pSteps, setPSteps] = useState<string[]>(['P2', 'P5', 'P3']);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePStep = (key: string) => {
    setPSteps(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    if (pSteps.length < 2) { setError('至少选择2个P步骤'); return; }
    if (pSteps.length > 4) { setError('最多选择4个P步骤'); return; }
    if (dVector.D5 === '存在裂痕' && !dVector.D5_crack_type) {
      setError('D₅=存在裂痕时，必须指定裂痕类型'); return;
    }
    setError(null);
    setLoading(true);

    try {
      // 1. 调用场景生成插件
      const plugin = (window as any).capabilityClient.load('scenario_card_smart_generate_v19_1');
      const result = await plugin.call('textGenerate', {
        system_prompt: '',
        user_message_history: JSON.stringify({
          d_vector: {
            D1_morale_root: dVector.D1,
            D2_pressure_mode: dVector.D2,
            D3_experience_mix: dVector.D3,
            D4_incentive_resource: dVector.D4,
            D5_trust_base: dVector.D5,
            D5_crack_type: dVector.D5_crack_type,
          },
          p_step_range: pSteps,
          difficulty_level: difficulty,
          industry_param: '地产',
        }),
      });

      const scenarioCard = typeof result.content === 'string'
        ? JSON.parse(result.content)
        : result.content;

      // 2. 存入数据库
      const resp = await axiosForBackend.post('/api/coaching/scenario-cards', {
        scenarioCard,
        dVector: {
          D1: dVector.D1, D2: dVector.D2, D3: dVector.D3,
          D4: dVector.D4, D5: dVector.D5, D5_crack_type: dVector.D5_crack_type,
        },
        pSequence: scenarioCard.meta?.p_sequence || pSteps.join('→'),
        progressionChain: scenarioCard.meta?.progression_chain || '',
        title: scenarioCard.meta?.title || '未命名场景',
      });

      // 3. 跳转对话页
      navigate(`/scenario/${resp.data.id}/chat`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '生成失败');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">场景生成</h1>
      <p className="text-sm text-gray-500 mb-8">
        选择 D 向量参数 → AI 自动生成场景卡 → 进入陪练
      </p>

      {/* D1 */}
      <Section title="D₁ 士气根源——团队为什么不振？">
        <RadioGroup options={D1_OPTIONS} value={dVector.D1}
          onChange={v => setDVector(prev => ({ ...prev, D1: v }))} />
      </Section>

      {/* D2 */}
      <Section title="D₂ 压力模式——团队处于什么阶段？">
        <RadioGroup options={D2_OPTIONS} value={dVector.D2}
          onChange={v => setDVector(prev => ({ ...prev, D2: v }))} />
      </Section>

      {/* D3 */}
      <Section title="D₃ 经验构成——团队什么水平？">
        <RadioGroup options={D3_OPTIONS} value={dVector.D3}
          onChange={v => setDVector(prev => ({ ...prev, D3: v }))} />
      </Section>

      {/* D4 */}
      <Section title="D₄ 激励资源——你手里有什么牌？">
        <RadioGroup options={D4_OPTIONS} value={dVector.D4}
          onChange={v => setDVector(prev => ({ ...prev, D4: v }))} />
      </Section>

      {/* D5 */}
      <Section title="D₅ 信任基础——团队信你吗？">
        <RadioGroup options={D5_OPTIONS} value={dVector.D5}
          onChange={v => setDVector(prev => ({
            ...prev, D5: v,
            D5_crack_type: v === '存在裂痕' ? prev.D5_crack_type : null,
          }))} />
      </Section>

      {/* D5 裂痕类型 */}
      {dVector.D5 === '存在裂痕' && (
        <Section title="裂痕类型">
          <RadioGroup options={CRACK_OPTIONS}
            value={dVector.D5_crack_type || ''}
            onChange={v => setDVector(prev => ({ ...prev, D5_crack_type: v || null }))} />
        </Section>
      )}

      {/* P 步骤 */}
      <Section title={`P 步骤范围（选 2-4 个·已选 ${pSteps.length} 个）`}>
        <div className="flex flex-wrap gap-2">
          {P_STEPS.map(s => {
            const active = pSteps.includes(s.key);
            return (
              <button key={s.key} onClick={() => togglePStep(s.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                }`}>
                {s.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 难度 */}
      <Section title="难度等级">
        <RadioGroup options={DIFFICULTY_OPTIONS} value={difficulty}
          onChange={setDifficulty} />
      </Section>

      {/* 错误提示 */}
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 生成按钮 */}
      <button onClick={handleGenerate} disabled={loading}
        className={`w-full py-3.5 rounded-xl text-base font-semibold transition-colors ${
          loading
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}>
        {loading ? '生成中...' : '生成场景卡 → 进入陪练'}
      </button>
    </div>
  );
};

// ---- 小组件 ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function RadioGroup({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map(o => (
        <label key={o.value}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
            value === o.value ? 'bg-blue-50 border border-blue-300' : 'border border-transparent hover:bg-gray-50'
          }`}>
          <input type="radio" name={o.value} checked={value === o.value}
            onChange={() => onChange(o.value)} className="accent-gray-900" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export default ScenarioGenerate;
