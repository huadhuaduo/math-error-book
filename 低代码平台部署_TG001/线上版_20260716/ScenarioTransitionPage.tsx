import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getMatchedAvatar } from '@client/src/utils/avatar-matcher';

/* ========== 场景视觉主题 ========== */
type LocationTheme = 'sales' | 'office' | 'outdoor' | 'default';

interface ThemeConfig {
  bg: string;
  amb1: string;
  amb2: string;
  doorFrame: string;
  doorFrameDark: string;
  doorPanel: string;
  label: string;
  icon: string;
}

const THEMES: Record<LocationTheme, ThemeConfig> = {
  sales: {
    bg: 'linear-gradient(160deg, #F8F4EE 0%, #EDE4D8 30%, #F5EDE2 60%, #EAE0D4 100%)',
    amb1: '#FDE68A',
    amb2: '#FEF3C7',
    doorFrame: 'linear-gradient(180deg, #8B7355 0%, #6B5540 100%)',
    doorFrameDark: 'linear-gradient(180deg, #4A3D2E 0%, #3A3025 100%)',
    doorPanel: 'linear-gradient(180deg, #C4A882 0%, #A68B6B 60%, #8B7355 100%)',
    label: '推开沙盘区的门',
    icon: '🏗️',
  },
  office: {
    bg: 'linear-gradient(160deg, #F0F4F8 0%, #E2E8F0 30%, #EDF2F7 60%, #E8ECF0 100%)',
    amb1: '#DBEAFE',
    amb2: '#E0E7FF',
    doorFrame: 'linear-gradient(180deg, #64748B 0%, #475569 100%)',
    doorFrameDark: 'linear-gradient(180deg, #334155 0%, #1E293B 100%)',
    doorPanel: 'linear-gradient(180deg, #CBD5E1 0%, #94A3B8 60%, #64748B 100%)',
    label: '推开会议室的门',
    icon: '🚪',
  },
  outdoor: {
    bg: 'linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 20%, #F0F9FF 60%, #E0F2FE 100%)',
    amb1: '#A7F3D0',
    amb2: '#BAE6FD',
    doorFrame: 'linear-gradient(180deg, #78716C 0%, #57534E 100%)',
    doorFrameDark: 'linear-gradient(180deg, #44403C 0%, #292524 100%)',
    doorPanel: 'linear-gradient(180deg, #A8A29E 0%, #78716C 60%, #57534E 100%)',
    label: '推开工地铁门',
    icon: '🏗️',
  },
  default: {
    bg: 'linear-gradient(160deg, #F8F6F2 0%, #EDE8E0 30%, #F5F2ED 60%, #EAE4DC 100%)',
    amb1: '#FEE2E2',
    amb2: '#FEF3C7',
    doorFrame: 'linear-gradient(180deg, #8B6F4E 0%, #6B5540 100%)',
    doorFrameDark: 'linear-gradient(180deg, #4A3D2E 0%, #3A3025 100%)',
    doorPanel: 'linear-gradient(180deg, #C4A882 0%, #A68B6B 60%, #8B7355 100%)',
    label: '推门进入',
    icon: '🚪',
  },
};

function detectTheme(location: string): LocationTheme {
  const l = location.toLowerCase();
  if (/售楼|沙盘|案场|样板|销售|接待|展厅/.test(l)) return 'sales';
  if (/工地|项目|现场|户外|施工|泥浆|塔吊/.test(l)) return 'outdoor';
  if (/办公|会议|工位|房间|室内/.test(l)) return 'office';
  return 'default';
}

/* ======================================== */

const ScenarioTransitionPage: React.FC = () => {
  const navigate = useNavigate();
  const { sceneId } = useParams<{ sceneId: string }>();
  const [doorOpened, setDoorOpened] = useState(false);
  const [npcName, setNpcName] = useState('NPC');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bridgeMsg, setBridgeMsg] = useState('');
  const [bridgeHint, setBridgeHint] = useState('');
  const [hiddenMotivation, setHiddenMotivation] = useState('');
  const [locationText, setLocationText] = useState('');
  const [npcAttitude, setNpcAttitude] = useState('');

  useEffect(() => {
    if (!sceneId) return;
    (async () => {
      try {
        const resp = await axiosForBackend.get('/api/coaching/scenario-cards/' + sceneId);
        const c = typeof resp.data.scenarioCard === 'string'
          ? JSON.parse(resp.data.scenarioCard) : resp.data.scenarioCard;
        const npc = c?.context?.team_state?.key_individuals?.[0];
        if (npc) {
          setNpcName(npc.name || 'NPC');
          setAvatarUrl(getMatchedAvatar({ sceneId, npc }));
          setHiddenMotivation(npc.language_profile?.hidden_motivation || '');
          setNpcAttitude(npc.attitude || '');
        }
        setLocationText(
          c?.context?.opening_scene?.location ||
          c?.context?.opening_scene?.time ||
          ''
        );
      } catch (e) {
        logger.warn('加载过渡页场景数据失败', String(e));
      }
    })();

    try {
      const raw = localStorage.getItem(`scenario_self_eval_${sceneId}`);
      if (raw) {
        const data = JSON.parse(raw);
        const scores: number[] = data.scores || [5, 5, 5, 5];
        const dims: string[] = data.dims || ['建立信任', '诊断问题', '示范赋能', '重构目标'];
        const lowest = scores.indexOf(Math.min(...scores));
        const highest = scores.indexOf(Math.max(...scores));
        setBridgeMsg(`你给"${dims[lowest]}"打了${scores[lowest]}分，这次看看实际表现如何`);
        setBridgeHint(`你在"${dims[highest]}"上更有信心（${scores[highest]}分），试着在这次对话中发挥出来`);
      } else {
        setBridgeMsg('深呼吸，准备好面对一个真实的管理困境');
        setBridgeHint('你的每一个选择都会影响对方的反应');
      }
    } catch {
      setBridgeMsg('准备好面对一个真实的管理困境');
    }
  }, [sceneId]);

  const theme: ThemeConfig = useMemo(
    () => THEMES[detectTheme(locationText)],
    [locationText],
  );

  const navigateToChat = useCallback(() => {
    if (sceneId) navigate(`/scenario/${sceneId}/chat?skipPrepare=1`);
  }, [sceneId, navigate]);

  const handleDoorKnock = useCallback(() => {
    if (doorOpened) return;
    setDoorOpened(true);
    setTimeout(navigateToChat, 800);
  }, [doorOpened, navigateToChat]);

  const handleSkip = useCallback(() => {
    navigateToChat();
  }, [navigateToChat]);

  return (
    <div className="transition-root">
      {/* 动态环境光 */}
      <div className="amb amb-1" />
      <div className="amb amb-2" />

      {/* 地点标识 */}
      {locationText && (
        <motion.div
          className="location-tag"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <span className="location-icon">{theme.icon}</span>
          {locationText}
        </motion.div>
      )}

      {/* NPC 头像 + 名字 */}
      <motion.div
        className="avatar-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {avatarUrl && (
          <img className="avatar-img" src={avatarUrl} alt={npcName} />
        )}
        <div className="avatar-name">{npcName}</div>
        {npcAttitude && (
          <div className="avatar-attitude">&ldquo;{npcAttitude}&rdquo;</div>
        )}
      </motion.div>

      {/* 隐藏动机 */}
      {hiddenMotivation && (
        <motion.div
          className="hidden-motivation"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="hm-label">他在想但不会说出来</div>
          <div className="hm-text">{hiddenMotivation}</div>
        </motion.div>
      )}

      {/* 桥接消息 */}
      <motion.div
        className="msg-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        {bridgeMsg && <p className="msg-text">{bridgeMsg}</p>}
        {bridgeHint && <p className="msg-hint">{bridgeHint}</p>}
      </motion.div>

      {/* 门 */}
      <motion.div
        className="door-section"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <div
          className={`door${doorOpened ? ' door-opened' : ''}`}
          onClick={handleDoorKnock}
          role="button"
          tabIndex={0}
        >
          <div className="door-frame">
            <div className="door-panel">
              <div className="door-handle" />
            </div>
          </div>
          <div className="door-label">
            {doorOpened ? '正在进入...' : theme.label}
          </div>
        </div>

        <p className="skip-link" onClick={handleSkip}>
          跳过，直接开始
        </p>
      </motion.div>

      <style jsx>{`
        .transition-root {
          min-height: 100vh;
          background: ${theme.bg};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 16px 80px;
          position: relative;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif;
          transition: background 0.6s ease;
        }
        .amb {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.16;
          transition: background 0.6s ease;
        }
        .amb-1 {
          width: 340px;
          height: 340px;
          background: ${theme.amb1};
          top: -60px;
          right: -40px;
        }
        .amb-2 {
          width: 260px;
          height: 260px;
          background: ${theme.amb2};
          bottom: -30px;
          left: -20px;
        }
        .location-tag {
          position: relative;
          z-index: 10;
          font-size: 12px;
          color: #78716C;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 14px;
          border-radius: 20px;
          background: rgba(255,255,255,0.4);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .location-icon {
          font-size: 14px;
        }
        .avatar-section {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .avatar-img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 3px solid rgba(255, 255, 255, 0.6);
        }
        .avatar-name {
          font-size: 17px;
          font-weight: 700;
          color: #1C1917;
          text-align: center;
        }
        .avatar-attitude {
          font-size: 11px;
          color: #B8854A;
          font-style: italic;
          text-align: center;
          max-width: 280px;
          line-height: 1.5;
        }
        .hidden-motivation {
          position: relative;
          z-index: 10;
          max-width: 400px;
          width: 88vw;
          text-align: center;
          padding: 10px 16px;
          border-radius: 12px;
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .hm-label {
          font-size: 10px;
          font-weight: 600;
          color: #A8A29E;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .hm-text {
          font-size: 13px;
          color: #57534E;
          font-style: italic;
          line-height: 1.6;
        }
        .msg-section {
          position: relative;
          z-index: 10;
          max-width: 400px;
          width: 88vw;
          text-align: center;
        }
        .msg-text {
          font-size: 14px;
          color: #44403C;
          line-height: 1.7;
          margin-bottom: 4px;
        }
        .msg-hint {
          font-size: 11px;
          color: #78716C;
          line-height: 1.5;
        }
        .door-section {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }
        .door {
          cursor: pointer;
          perspective: 600px;
          transition: transform 0.2s;
        }
        .door:hover .door-frame {
          box-shadow: 0 12px 40px rgba(120, 80, 40, 0.18);
        }
        .door:active {
          transform: scale(0.97);
        }
        .door-frame {
          width: 110px;
          height: 160px;
          border-radius: 55px 55px 10px 10px;
          background: ${theme.doorFrame};
          padding: 6px;
          box-shadow: 0 8px 30px rgba(120, 80, 40, 0.12);
          transition: box-shadow 0.3s, background 0.6s;
          transform-origin: left center;
        }
        .door-panel {
          width: 100%;
          height: 100%;
          border-radius: 50px 50px 6px 6px;
          background: ${theme.doorPanel};
          position: relative;
          transition: transform 0.6s ease;
          transform-origin: left center;
          box-shadow: inset 0 2px 8px rgba(255, 255, 255, 0.15);
        }
        .door-handle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D4B896, #A68B6B);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }
        .door-opened .door-panel {
          transform: rotateY(-35deg);
        }
        .door-opened .door-frame {
          background: ${theme.doorFrameDark};
        }
        .door-opened {
          pointer-events: none;
        }
        .door-label {
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: #78716C;
          margin-top: 10px;
          transition: color 0.3s;
        }
        .door:hover .door-label {
          color: #1C1917;
        }
        .door-opened .door-label {
          color: #78716C;
        }
        .skip-link {
          font-size: 11px;
          color: #A8A29E;
          cursor: pointer;
          transition: color 0.2s;
        }
        .skip-link:hover {
          color: #78716C;
        }
      `}</style>
    </div>
  );
};

export default ScenarioTransitionPage;
