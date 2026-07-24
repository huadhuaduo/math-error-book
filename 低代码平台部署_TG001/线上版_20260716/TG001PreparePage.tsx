import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  getTeamMotivationSceneDetail,
  initTeamMotivationSession,
} from '@client/src/api/team-motivation';
import type { TMScene } from '@shared/coaching-team-motivation';
import { tmAvatarTg001 } from '@client/src/utils/img-resources/avatar-placeholders';

const SCENE_ID = 'tm_tg001';

const SELF_EVAL_DIMS = [
  { label: '先做事，不说话', desc: '建立信任' },
  { label: '先问"你觉得呢"', desc: '诊断问题' },
  { label: '替团队做减法', desc: '不做对比表' },
  { label: '亲自做给他们看', desc: '打样示范' },
];

function renderRichText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(<strong>.*?<\/strong>|<br\s*\/?>)/g;
  let lastIndex = 0;
  let match = regex.exec(text);
  let i = 0;

  while (match) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[0].startsWith('<br')) {
      parts.push(<br key={`br-${i}`} />);
    } else {
      const content = match[0].replace(/<\/?strong>/g, '');
      parts.push(<strong key={`s-${i}`}>{content}</strong>);
    }
    lastIndex = match.index + match[0].length;
    match = regex.exec(text);
    i++;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#A8A29E',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 10,
  display: 'block',
};

const challengeNumStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#D97706',
  flexShrink: 0,
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: 'rgba(245, 158, 11, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  maxWidth: 440,
  width: '100%',
  background: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  borderRadius: 20,
  padding: '36px 32px 28px',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
};

const TG001PreparePage: React.FC = () => {
  const navigate = useNavigate();
  const [scene, setScene] = useState<TMScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfScores, setSelfScores] = useState<number[]>([5, 5, 5, 5]);

  useEffect(() => {
    let cancelled = false;
    getTeamMotivationSceneDetail(SCENE_ID)
      .then((data: TMScene) => {
        if (!cancelled) setScene(data);
      })
      .catch((err: unknown) => {
        logger.error('加载TG001场景失败', String(err));
        if (!cancelled) setError('加载失败，请返回重试');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleStart = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await initTeamMotivationSession({ sceneId: SCENE_ID });
      sessionStorage.setItem(
        `tm_session_${res.sessionId}`,
        JSON.stringify({
          openingCharacter: res.openingCharacter,
          openingLine: res.openingLine,
          currentDecisionPoint: res.currentDecisionPoint,
        }),
      );
      sessionStorage.setItem('tg001_prep_self_eval', JSON.stringify(selfScores));
      navigate(`/tg001/engine/${res.sessionId}`);
    } catch (err: unknown) {
      logger.error('初始化会话失败', String(err));
      setStarting(false);
    }
  }, [starting, navigate, selfScores]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#F8F6F2] via-[#EDE8E0] to-[#F5F2ED]">
        <Loader2 className="size-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error || !scene) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#F8F6F2] via-[#EDE8E0] to-[#F5F2ED]">
        <div className="text-center">
          <p className="text-stone-500 mb-4">{error ?? '场景数据加载失败'}</p>
          <button
            onClick={() => navigate('/coaching')}
            className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-white/60"
          >
            返回陪练列表
          </button>
        </div>
      </div>
    );
  }

  const prep = scene.preparation;
  const npcName = scene.conversationFlow.openingCharacter.replace(/销售|（.*）/g, '');
  const challenges = prep.challenges ?? [];
  const goal = prep.goal ?? '';

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center relative px-6 py-6">
      <div
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(160deg, #F8F6F2 0%, #EDE8E0 30%, #F5F2ED 60%, #EAE4DC 100%)',
        }}
      />
      <div
        className="fixed rounded-full pointer-events-none z-0 opacity-[0.14]"
        style={{
          width: 340, height: 340,
          background: '#FEE2E2',
          top: -80, right: -60,
          filter: 'blur(110px)',
        }}
      />
      <div
        className="fixed rounded-full pointer-events-none z-0 opacity-[0.14]"
        style={{
          width: 260, height: 260,
          background: '#FEF3C7',
          bottom: -50, left: -30,
          filter: 'blur(110px)',
        }}
      />

      <button
        className="fixed top-6 left-6 z-20 p-2 rounded-full bg-white/60 backdrop-blur-sm border border-stone-200/50 text-stone-500 hover:text-stone-700 hover:bg-white/80 transition-all"
        onClick={() => navigate('/coaching')}
      >
        <ArrowLeft className="size-4" />
      </button>

      <motion.div
        style={cardStyle}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-4 mb-7">
          <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 shadow-lg border-2 border-white/80">
            <img src={tmAvatarTg001} alt={npcName} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-stone-900 tracking-tight">
              {npcName}
            </div>
            <div className="text-[13px] text-stone-500 leading-relaxed">
              最资深销售 · 司龄5年 · 团队都看他的态度
            </div>
            <div className="text-xs text-amber-600 mt-1 italic">
              &ldquo;见过四任空降领导。他在看——你是第五个。&rdquo;
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white/60 border border-black/[0.04] p-[18px_20px] mb-[22px]">
          <span style={sectionLabelStyle}>情境</span>
          <div className="text-sm text-stone-600 leading-[1.85]">
            {renderRichText(prep.situation)}
          </div>
        </div>

        {challenges.length > 0 && (
          <div className="mb-[22px]">
            <div style={sectionLabelStyle} className="mb-3">任务挑战</div>
            {challenges.map((challenge: string, i: number) => (
              <div
                key={i}
                className={`text-[13px] text-stone-600 leading-[1.7] py-3 flex gap-2.5 ${
                  i < challenges.length - 1 ? 'border-b border-black/[0.04]' : ''
                }`}
              >
                <span style={challengeNumStyle} className="mt-0.5">{i + 1}</span>
                <span>{renderRichText(challenge)}</span>
              </div>
            ))}
          </div>
        )}

        {goal && (
          <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 p-4 mb-5">
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.08em] mb-1.5">
              目标
            </div>
            <div className="text-[13px] text-stone-800 leading-[1.7]">
              {renderRichText(goal)}
            </div>
          </div>
        )}

        <div className="mb-5 rounded-xl bg-white/40 border border-black/[0.04] p-4">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.08em] mb-3">
            对话前自评 · 你觉得自己在以下四点各能打几分？
          </div>
          {SELF_EVAL_DIMS.map((dim, i) => (
            <div key={i} className={`py-2.5 ${i < SELF_EVAL_DIMS.length - 1 ? 'border-b border-black/[0.03]' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-stone-700">{dim.label}</span>
                <span className="text-[13px] font-bold text-stone-900 min-w-[28px] text-right">{selfScores[i]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={selfScores[i]}
                onChange={e => {
                  const next = [...selfScores];
                  next[i] = Number(e.target.value);
                  setSelfScores(next);
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #D4A574 ${((selfScores[i] - 1) / 9) * 100}%, rgba(0,0,0,0.08) ${((selfScores[i] - 1) / 9) * 100}%)`,
                  accentColor: '#D4A574',
                }}
              />
              <div className="flex justify-between text-[9px] text-stone-400 mt-0.5">
                <span>1</span>
                <span>{dim.desc}</span>
                <span>10</span>
              </div>
            </div>
          ))}
        </div>

        <button
          className="block w-full py-3.5 border-none rounded-2xl bg-[#1C1917] text-white text-[15px] font-semibold cursor-pointer tracking-tight shadow-[0_4px_16px_rgba(0_0_0_0.08)] transition-all duration-200 hover:bg-black hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0_0_0_0.12)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none"
          onClick={handleStart}
          disabled={starting}
        >
          {starting ? '正在准备...' : '开始对话'}
        </button>

        <div className="text-center text-[11px] text-stone-400 mt-3.5 tracking-wide">
          {scene.decisionPoints.length} 个关键决策 · 约 {scene.estimatedDurationMin} 分钟 · 对下管理 · 激励
        </div>
      </motion.div>
    </div>
  );
};

export default TG001PreparePage;
