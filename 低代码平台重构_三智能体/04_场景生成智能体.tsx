// ============================================================
// 场景生成智能体页面
// 路由：/scenario/generate
// 输入：D向量表单 → 调用插件 scenario_card_smart_generate_v19_1
// 输出：场景卡 JSON → 存入 coaching_scenes → 跳转对话页
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  DVector, MoraleRoot, PressureMode, ExperienceMix,
  IncentiveResource, TrustBase, CrackType, Difficulty, PStep,
  ScenarioCard,
} from '../types/scenario-card';

// ---- D 向量选项 ----
const D1_OPTIONS: { value: MoraleRoot; label: string }[] = [
  { value: '过劳衰竭', label: '过劳衰竭——团队累到极限' },
  { value: '缺乏意义感', label: '缺乏意义感——不知道为什么要做' },
  { value: '缺乏公平感', label: '缺乏公平感——觉得分配不公' },
  { value: '缺乏安全感', label: '缺乏安全感——怕丢工作/被边缘化' },
];

const D2_OPTIONS: { value: PressureMode; label: string }[] = [
  { value: '短期冲刺', label: '短期冲刺——20天倒计时那种' },
  { value: '结构转型', label: '结构转型——从一种模式切换到另一种' },
  { value: '流程重建', label: '流程重建——旧流程坏了，建新的' },
  { value: '收尾维稳', label: '收尾维稳——项目收尾，稳住别乱' },
];

const D3_OPTIONS: { value: ExperienceMix; label: string }[] = [
  { value: '资深为主', label: '资深为主——3-5年以上的老人' },
  { value: '资浅为主', label: '资浅为主——1年以下的新人居多' },
  { value: '混合两极', label: '混合两极——老人和新人分化明显' },
];

const D4_OPTIONS: { value: IncentiveResource; label: string }[] = [
  { value: '丰富', label: '丰富——有预算、有名额、有空间' },
  { value: '有限', label: '有限——有点预算但不多' },
  { value: '极度受限', label: '极度受限——一分钱都没有' },
];

const D5_OPTIONS: { value: TrustBase; label: string }[] = [
  { value: '已有信任', label: '已有信任——团队信你' },
  { value: '需要建立', label: '需要建立——空降/新接手，零信任' },
  { value: '存在裂痕', label: '存在裂痕——经历过失败/背叛' },
];

const CRACK_OPTIONS: { value: CrackType; label: string }[] = [
  { value: '显性冲突', label: '显性冲突——公开抱怨、拒绝沟通' },
  { value: '隐性对抗', label: '隐性对抗——会上点头、会后不动' },
];

const P_STEPS: { value: PStep; label: string }[] = [
  { value: 'P₁_沉入一线诊断', label: 'P₁ 诊断' },
  { value: 'P₂_建立信任', label: 'P₂ 信任' },
  { value: 'P₃_重构目标', label: 'P₃ 目标' },
  { value: 'P₄_设计激励', label: 'P₄ 激励' },
  { value: 'P₅_示范赋能', label: 'P₅ 赋能' },
  { value: 'P₆_反馈闭环', label: 'P₆ 闭环' },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'basic', label: '基础——错误选项较明显' },
  { value: 'medium', label: '中等——三个选项都有道理' },
  { value: 'advanced', label: '高级——三个都是"对"的，不同价值观' },
];

// ---- 页面组件 ----
export default function ScenarioGenerate() {
  const navigate = useNavigate();
  const [dVector, setDVector] = useState<DVector>({
    D1_morale_root: '过劳衰竭',
    D2_pressure_mode: '短期冲刺',
    D3_experience_mix: '混合两极',
    D4_incentive_resource: '有限',
    D5_trust_base: '需要建立',
    D5_crack_type: null,
  });
  const [pSteps, setPSteps] = useState<PStep[]>(['P₂_建立信任', 'P₅_示范赋能', 'P₃_重构目标']);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePStep = (step: PStep) => {
    setPSteps(prev =>
      prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
    );
  };

  const handleGenerate = async () => {
    // 基础校验
    if (pSteps.length < 2) { setError('至少选择2个P步骤'); return; }
    if (pSteps.length > 4) { setError('最多选择4个P步骤'); return; }
    if (dVector.D5_trust_base === '存在裂痕' && !dVector.D5_crack_type) {
      setError('D₅=存在裂痕时，必须指定裂痕类型');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // 调用场景生成插件
      const plugin = (window as any).capabilityClient.load('scenario_card_smart_generate_v19_1');
      const result = await plugin.call('textGenerate', {
        system_prompt: '', // 插件内部维护 Prompt，前端不传
        user_message_history: JSON.stringify({
          d_vector: dVector,
          p_step_range: pSteps,
          difficulty_level: difficulty,
          industry_param: '地产',
        }),
      });

      // 解析场景卡 JSON
      const scenarioCard: ScenarioCard = typeof result.content === 'string'
        ? JSON.parse(result.content)
        : result.content;

      // 存入数据库
      const sceneData = {
        scenarioContext: scenarioCard.context,
        aiCharacter: scenarioCard.context, // 兼容已有字段
        scenario_card: scenarioCard,
        d_vector: dVector,
        p_sequence: scenarioCard.meta.p_sequence,
        progression_chain: scenarioCard.meta.progression_chain,
        status: 'draft',
      };

      // TODO: 替换为实际的 DB 插入调用
      const response = await fetch('/api/coaching-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sceneData),
      });
      const saved = await response.json();

      // 跳转到对话页
      navigate(`/scenario/${saved.id}/chat`);
    } catch (err: any) {
      setError(err.message || '生成失败');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 40 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a2a3a', marginBottom: 8 }}>
        场景生成
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 32 }}>
        选择 D 向量参数 → AI 自动生成场景卡 → 进入陪练
      </p>

      {/* D 向量表单 */}
      <Section title="D₁ 士气根源">
        <SelectRow options={D1_OPTIONS} value={dVector.D1_morale_root}
          onChange={v => setDVector(prev => ({ ...prev, D1_morale_root: v as MoraleRoot }))} />
      </Section>

      <Section title="D₂ 压力模式">
        <SelectRow options={D2_OPTIONS} value={dVector.D2_pressure_mode}
          onChange={v => setDVector(prev => ({ ...prev, D2_pressure_mode: v as PressureMode }))} />
      </Section>

      <Section title="D₃ 经验构成">
        <SelectRow options={D3_OPTIONS} value={dVector.D3_experience_mix}
          onChange={v => setDVector(prev => ({ ...prev, D3_experience_mix: v as ExperienceMix }))} />
      </Section>

      <Section title="D₄ 激励资源">
        <SelectRow options={D4_OPTIONS} value={dVector.D4_incentive_resource}
          onChange={v => setDVector(prev => ({ ...prev, D4_incentive_resource: v as IncentiveResource }))} />
      </Section>

      <Section title="D₅ 信任基础">
        <SelectRow options={D5_OPTIONS} value={dVector.D5_trust_base}
          onChange={v => setDVector(prev => ({
            ...prev,
            D5_trust_base: v as TrustBase,
            D5_crack_type: v === '存在裂痕' ? prev.D5_crack_type : null,
          }))} />
      </Section>

      {dVector.D5_trust_base === '存在裂痕' && (
        <Section title="裂痕类型">
          <SelectRow options={CRACK_OPTIONS}
            value={dVector.D5_crack_type || undefined}
            onChange={v => setDVector(prev => ({ ...prev, D5_crack_type: v as CrackType }))} />
        </Section>
      )}

      <Section title="P 步骤范围（选 2-4 个）">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {P_STEPS.map(s => (
            <button key={s.value} onClick={() => togglePStep(s.value)}
              style={{
                padding: '8px 14px', borderRadius: 6, border: '1.5px solid',
                borderColor: pSteps.includes(s.value) ? '#1a2a3a' : '#e5e7eb',
                background: pSteps.includes(s.value) ? '#1a2a3a' : '#fff',
                color: pSteps.includes(s.value) ? '#fff' : '#2a2a2a',
                cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              }}>
              {s.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          已选：{pSteps.join(' → ')}（{pSteps.length} 个）
        </p>
      </Section>

      <Section title="难度等级">
        <SelectRow options={DIFFICULTY_OPTIONS} value={difficulty}
          onChange={v => setDifficulty(v as Difficulty)} />
      </Section>

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #c44', borderRadius: 6, color: '#7f1d1d', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button onClick={handleGenerate} disabled={loading}
        style={{
          width: '100%', padding: 14, borderRadius: 8, border: 'none',
          background: loading ? '#8b9ab0' : '#1a2a3a', color: '#fff',
          fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}>
        {loading ? '生成中...' : '生成场景卡 → 进入陪练'}
      </button>
    </div>
  );
}

// ---- 小组件 ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#2c3e5a', marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}

function SelectRow<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {options.map(o => (
        <label key={o.value}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 6, cursor: 'pointer', fontSize: 13,
            background: value === o.value ? '#f0f4fa' : 'transparent',
            border: value === o.value ? '1.5px solid #2c3e5a' : '1px solid transparent',
          }}>
          <input type="radio" name={o.value} checked={value === o.value}
            onChange={() => onChange(o.value)} style={{ accentColor: '#1a2a3a' }} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
