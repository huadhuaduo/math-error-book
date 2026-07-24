import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MOOD_LABELS, FOCUS_OPTIONS,
  calcHealthScore, getHealthLabel,
  type TG001Scores, type TG001Mood,
} from './tg001-engine-logic';

interface SidePanelProps {
  mood: TG001Mood;
  scores: TG001Scores;
  focusIndex: number;
  moodHint: string | null;
  onPause: () => void;
  onEnd: () => void;
}

const cardCls = {
  background: 'rgba(255,255,255,.5)',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,.03)',
  padding: 10,
};

const labelCls = 'text-[9px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1';

const TG001SidePanel: React.FC<SidePanelProps> = ({ mood, scores, focusIndex, moodHint, onPause, onEnd }) => {
  const moodInfo = MOOD_LABELS[mood];
  const health = calcHealthScore(scores);
  const healthInfo = getHealthLabel(health);
  const focusLabel = FOCUS_OPTIONS[focusIndex]?.label || '—';

  return (
    <div className="w-[195px] hidden md:flex flex-col gap-2.5 rounded-[18px] p-3.5"
      style={{ background: 'rgba(255,255,255,.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,.5)', boxShadow: '0 4px 20px rgba(0,0,0,.03)' }}>

      <div style={cardCls}>
        <div className={labelCls}>本次聚焦</div>
        <div className="text-[10px] font-semibold" style={{ color: '#B8854A' }}>{focusLabel}</div>
      </div>

      <div style={cardCls}>
        <div className={labelCls}>老周现在</div>
        <div className="text-[10px] text-[#44403C] leading-relaxed">{moodInfo.desc}</div>
        <AnimatePresence>
          {moodHint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[10px] text-center py-0.5"
              style={{ color: '#B8854A' }}
            >
              {moodHint}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={cardCls}>
        <div className={labelCls}>对话健康度</div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.05)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${health}%`,
              background: `linear-gradient(90deg,${healthInfo.color},${health >= 70 ? '#22c55e' : health >= 45 ? '#F59E0B' : '#D4A574'})`,
            }}
          />
        </div>
        <div className="text-[9px] mt-1" style={{ color: healthInfo.color }}>{healthInfo.text}</div>
      </div>

      <button
        onClick={onPause}
        className="text-[10px] text-center py-1.5 rounded-lg transition-all"
        style={{ border: '1px solid rgba(0,0,0,.06)', background: 'rgba(0,0,0,.02)', color: '#A8A29E' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,.05)'; e.currentTarget.style.color = '#1C1917'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.02)'; e.currentTarget.style.color = '#A8A29E'; }}
      >暂停，我想想</button>

      <button
        onClick={onEnd}
        className="text-[10px] text-center py-2 rounded-lg font-semibold transition-all mt-auto"
        style={{ background: '#1C1917', color: '#fff', border: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#B8854A'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1C1917'; }}
      >结束对话，查看反馈</button>
    </div>
  );
};

export default TG001SidePanel;
