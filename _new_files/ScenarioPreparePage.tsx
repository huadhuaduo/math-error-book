// ScenarioPreparePage.tsx — 通用版准备页
// 从场景卡 JSON 读取 NPC/情境/挑战，渲染叙事 + 自评 + 开始对话
// 专家团要求: 一屏完成，不翻页；不包含聚焦选择（第二次练习时基于数据推荐）

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getMatchedAvatar } from '@client/src/utils/avatar-matcher';

const SELF_EVAL_DIMS = [
  { label: '先做事，不说话', desc: '不是先画饼——先展示你懂业务' },
  { label: '先问"你觉得呢"', desc: '把判断权交给他，而不是任务丢给他' },
  { label: '替团队做减法', desc: '砍掉噪音——直接说"就推这两个"' },
  { label: '亲自做给他们看', desc: '信心不是传染的——是示范的' },
];

const ScenarioPreparePage: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/coaching';

  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selfScores, setSelfScores] = useState<number[]>([5, 5, 5, 5]);

  useEffect(() => {
    if (!sceneId) return;
    (async () => {
      try {
        const resp = await axiosForBackend.get('/api/coaching/scenario-cards/' + sceneId);
        const c = typeof resp.data.scenarioCard === 'string'
          ? JSON.parse(resp.data.scenarioCard)
          : resp.data.scenarioCard;
        setCard(c);
        // 恢复上次自评
        try {
          const raw = localStorage.getItem(`scenario_self_eval_${sceneId}`);
          if (raw) {
            const d = JSON.parse(raw);
            if (d.scores) setSelfScores(d.scores);
          }
        } catch {}
        setLoading(false);
      } catch (e: any) {
        logger.error('场景加载失败', String(e));
        setError('场景加载失败');
        setLoading(false);
      }
    })();
  }, [sceneId]);

  const npc = card?.context?.team_state?.key_individuals?.[0];
  const npcName = npc?.name || '';
  const opening = card?.context?.opening_scene;
  const situation = card?.context?.situation;
  const challenges = card?.meta?.d_vector
    ? Object.entries(card.meta.d_vector)
        .filter(([_, v]) => v)
        .slice(0, 3)
        .map(([k, v]) => `${k.replace('D', '').replace(/_/g, ' ')}: ${v}`)
    : [];
  const goalText = (card?.meta?.progression_chain || card?.feedback_criteria?.golden_path_narrative || '完成本次练习')
    .replace(/<[^>]*>/g, '');

  const handleStart = () => {
    try {
      localStorage.setItem(
        `scenario_self_eval_${sceneId}`,
        JSON.stringify({ scores: selfScores, dims: SELF_EVAL_DIMS.map(d => d.label) }),
      );
    } catch {}
    navigate(`/scenario/${sceneId}/chat?skipPrepare=1`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)', fontFamily: "-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif" }}>
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#F8F6F2' }}>
        <p className="text-stone-500 text-sm">{error || '场景未找到'}</p>
        <button onClick={() => navigate(returnTo)} className="px-5 py-2 rounded-xl bg-stone-200 text-stone-600 text-sm">返回</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto flex items-start justify-center py-8 px-5" style={{ background: 'linear-gradient(160deg,#F8F6F2,#EDE8E0,#F5F2ED,#EAE4DC)', fontFamily: "-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      {/* 环境光 */}
      <div style={{ position:'fixed',top:-60,right:-40,width:300,height:300,borderRadius:'50%',background:'#FEE2E2',filter:'blur(110px)',opacity:.1,pointerEvents:'none',zIndex:0}} />
      <div style={{ position:'fixed',bottom:-40,left:-20,width:240,height:240,borderRadius:'50%',background:'#FEF3C7',filter:'blur(110px)',opacity:.1,pointerEvents:'none',zIndex:0}} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[480px] rounded-2xl p-7"
        style={{ background:'rgba(255,255,255,.5)', backdropFilter:'blur(22px)', WebkitBackdropFilter:'blur(22px)', border:'1px solid rgba(255,255,255,.5)', boxShadow:'0 4px 24px rgba(0,0,0,.04)' }}
      >
        {/* ── 位置标签 ── */}
        {opening && (
          <div className="text-center mb-4">
            <span className="inline-block text-[11px] text-stone-500 font-medium px-3 py-1 rounded-full" style={{ background:'rgba(0,0,0,.03)' }}>
              {[opening.time, opening.location].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}

        {/* ── NPC 卡片 ── */}
        {npc && (
          <div className="flex items-center gap-3.5 mb-5 justify-center">
            <img
              src={getMatchedAvatar({ sceneId, npc })}
              alt={npcName}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md flex-shrink-0"
            />
            <div>
              <div className="text-[15px] font-bold text-stone-800">{npcName}</div>
              <div className="text-[12px] text-stone-500">{npc.role} · 司龄{npc.tenure}年</div>
              {npc.attitude && (
                <div className="text-[11px] text-amber-600 italic mt-0.5 leading-snug">&ldquo;{npc.attitude}&rdquo;</div>
              )}
            </div>
          </div>
        )}

        {/* ── 他在想但不说 ── */}
        {npc?.language_profile?.hidden_motivation && (
          <div className="rounded-xl p-3 mb-4 text-[11px] leading-relaxed text-stone-600" style={{ background:'rgba(0,0,0,.02)', border:'1px solid rgba(0,0,0,.03)' }}>
            <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">他在想但不会说出来</div>
            {npc.language_profile.hidden_motivation}
          </div>
        )}

        {/* ── 情境 ── */}
        {situation?.project_status && (
          <div className="text-[13px] leading-relaxed text-stone-600 mb-3">
            {situation.project_status}
          </div>
        )}

        {/* ── 关键挑战 ── */}
        {challenges.length > 0 && (
          <div className="mb-5">
            <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-2">关键挑战</div>
            {challenges.slice(0, 3).map((c: string, i: number) => (
              <div key={i} className="text-[12px] text-stone-600 leading-relaxed py-1 flex gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0 text-[10px] w-5 h-5 rounded-full flex items-center justify-center" style={{ background:'rgba(245,158,11,.1)' }}>{i + 1}</span>
                <span>{c.replace(/<[^>]*>/g, '')}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── 分隔 ── */}
        <div className="border-t border-black/5 my-4" />

        {/* ── 自评滑块 ── */}
        <h3 className="text-[14px] font-bold text-stone-800 mb-1">练习前自评</h3>
        <p className="text-[11px] text-stone-400 mb-4">你觉得自己在以下四点各能打几分？（1=完全不会，10=信手拈来）</p>
        {SELF_EVAL_DIMS.map((dim, i) => (
          <div key={i} className="py-2" style={{ borderBottom: i < 3 ? '1px solid rgba(0,0,0,.03)' : 'none' }}>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] font-medium text-stone-700">{dim.label}</span>
              <span className="text-[12px] text-stone-400">{dim.desc}</span>
              <span className="text-[13px] font-bold text-stone-800 ml-2">{selfScores[i]}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={selfScores[i]}
              onChange={e => { const n = [...selfScores]; n[i] = +e.target.value; setSelfScores(n); }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background:`linear-gradient(to right,#D4A574 ${((selfScores[i]-1)/9)*100}%,rgba(0,0,0,.08) ${((selfScores[i]-1)/9)*100}%)`, accentColor:'#D4A574' }}
            />
          </div>
        ))}

        {/* ── 开始按钮 ── */}
        <button
          onClick={handleStart}
          className="w-full py-3.5 mt-4 rounded-2xl text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
          style={{ background:'#1C1917', border:'none', cursor:'pointer', fontFamily:'inherit' }}
        >
          开始对话
        </button>

        {/* ── 返回 ── */}
        <button
          onClick={() => navigate(returnTo)}
          className="w-full py-2.5 mt-2 rounded-2xl text-[13px] font-medium text-stone-400 transition-all hover:text-stone-600"
          style={{ background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}
        >
          ← 返回场景列表
        </button>
      </motion.div>
    </div>
  );
};

export default ScenarioPreparePage;
