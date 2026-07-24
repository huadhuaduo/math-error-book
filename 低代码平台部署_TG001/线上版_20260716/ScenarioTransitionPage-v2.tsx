// ScenarioTransitionPage.tsx — V2 多场景视觉版
// 替换线上 client/src/pages/ScenarioTransitionPage/ScenarioTransitionPage.tsx
// 根据场景 location 自动切换视觉主题：售楼处建筑 / 工地现场 / 办公室 / 默认
// 动态展示：NPC头像+名字+态度、隐藏动机、自评桥接消息、位置标签

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getMatchedAvatar } from '@client/src/utils/avatar-matcher';

/* ========== 场景视觉主题 ========== */
type LocationTheme = 'sales' | 'outdoor' | 'office' | 'default';

interface ThemeConfig {
  name: string;
  bg: string;
  amb1: string; amb2: string;
  sceneEl: React.CSSProperties;      // 场景背景元素（建筑/工地/办公室轮廓）
  doorLabel: string;
  doorColor: string;
  doorDarkColor: string;
  doorPanelColor: string;
  icon: string;
}

const THEMES: Record<LocationTheme, ThemeConfig> = {
  // 🌆 售楼处/沙盘区 — 建筑立面 + 暖光 + 玻璃门
  sales: {
    name: '售楼处',
    bg: 'linear-gradient(180deg, #2d2520 0%, #3a3228 30%, #F8F4EE 65%, #EDE4D8 100%)',
    amb1: '#FDE68A', amb2: '#FEF3C7',
    sceneEl: {
      // 建筑轮廓：梯形屋顶 + 方形建筑体 + 灯光窗户
      position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: 280, height: 200,
    },
    doorLabel: '推开售楼处的门',
    doorColor: 'linear-gradient(180deg, #8B7355 0%, #5C4A36 100%)',
    doorDarkColor: 'linear-gradient(180deg, #3A2E20 0%, #2A1F14 100%)',
    doorPanelColor: 'linear-gradient(180deg, #C4A882 0%, #9E8566 60%, #7A6548 100%)',
    icon: '🏗️',
  },
  // 🏗️ 工地/户外 — 天空 + 铁栅栏门 + 硬朗工业风
  outdoor: {
    name: '项目现场',
    bg: 'linear-gradient(180deg, #87CEEB 0%, #B0D4E8 25%, #D4C8B8 60%, #C8BAA8 100%)',
    amb1: '#BAE6FD', amb2: '#D1FAE5',
    sceneEl: {
      position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: 300, height: 180,
    },
    doorLabel: '推开工地大门',
    doorColor: 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)',
    doorDarkColor: 'linear-gradient(180deg, #374151 0%, #1F2937 100%)',
    doorPanelColor: 'linear-gradient(180deg, #9CA3AF 0%, #6B7280 60%, #4B5563 100%)',
    icon: '🚧',
  },
  // 🏢 办公室/会议室 — 冷灰调 + 磨砂玻璃门
  office: {
    name: '办公室',
    bg: 'linear-gradient(180deg, #1E293B 0%, #334155 25%, #F1F5F9 60%, #E2E8F0 100%)',
    amb1: '#DBEAFE', amb2: '#E0E7FF',
    sceneEl: {
      position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: 280, height: 190,
    },
    doorLabel: '推开会议室的门',
    doorColor: 'linear-gradient(180deg, #64748B 0%, #475569 100%)',
    doorDarkColor: 'linear-gradient(180deg, #334155 0%, #1E293B 100%)',
    doorPanelColor: 'linear-gradient(180deg, #CBD5E1 0%, #94A3B8 60%, #64748B 100%)',
    icon: '🚪',
  },
  // 🚪 默认 — 经典暖光 + 通用门
  default: {
    name: '',
    bg: 'linear-gradient(160deg, #F8F6F2 0%, #EDE8E0 30%, #F5F2ED 60%, #EAE4DC 100%)',
    amb1: '#FEE2E2', amb2: '#FEF3C7',
    sceneEl: { position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 260, height: 160 },
    doorLabel: '推门进入',
    doorColor: 'linear-gradient(180deg, #8B6F4E 0%, #6B5540 100%)',
    doorDarkColor: 'linear-gradient(180deg, #4A3D2E 0%, #3A3025 100%)',
    doorPanelColor: 'linear-gradient(180deg, #C4A882 0%, #A68B6B 60%, #8B7355 100%)',
    icon: '🚪',
  },
};

function detectTheme(location: string): LocationTheme {
  const l = location.toLowerCase();
  if (/售楼|沙盘|案场|样板|销售|接待|展厅|签约|认购/.test(l)) return 'sales';
  if (/工地|项目.*现场|户外|施工|泥浆|塔吊|脚手架|基坑|围挡/.test(l)) return 'outdoor';
  if (/办公|会议|工位|房间|室内|写字楼/.test(l)) return 'office';
  return 'default';
}

/* ======================================== */

const ScenarioTransitionPage: React.FC = () => {
  const navigate = useNavigate();
  const { sceneId } = useParams<{ sceneId: string }>();
  const [doorOpened, setDoorOpened] = useState(false);
  const [npcName, setNpcName] = useState('');
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
        const c = typeof resp.data.scenarioCard === 'string' ? JSON.parse(resp.data.scenarioCard) : resp.data.scenarioCard;
        const npc = c?.context?.team_state?.key_individuals?.[0];
        if (npc) {
          setNpcName(npc.name || '');
          setAvatarUrl(getMatchedAvatar({ sceneId, npc }));
          setHiddenMotivation(npc.language_profile?.hidden_motivation || '');
          setNpcAttitude(npc.attitude || '');
        }
        const loc = c?.context?.opening_scene?.location || '';
        const time = c?.context?.opening_scene?.time || '';
        setLocationText([loc, time].filter(Boolean).join(' · '));
      } catch (e) { logger.warn('过渡页加载失败', String(e)); }
    })();

    try {
      const raw = localStorage.getItem(`scenario_self_eval_${sceneId}`);
      if (raw) {
        const data = JSON.parse(raw);
        const scores: number[] = data.scores || [5,5,5,5];
        const dims: string[] = data.dims || ['建立信任','诊断问题','示范赋能','重构目标'];
        const lowest = scores.indexOf(Math.min(...scores));
        const highest = scores.indexOf(Math.max(...scores));
        setBridgeMsg(`你给"${dims[lowest]}"打了${scores[lowest]}分，这次看看实际表现如何`);
        setBridgeHint(`你在"${dims[highest]}"上更有信心（${scores[highest]}分），试着在这次对话中发挥出来`);
      } else {
        setBridgeMsg('深呼吸，准备好面对一个真实的管理困境');
        setBridgeHint('你的每一个选择都会影响对方的反应');
      }
    } catch { setBridgeMsg('准备好面对一个真实的管理困境'); }
  }, [sceneId]);

  const themeKey = useMemo(() => detectTheme(locationText), [locationText]);
  const theme = THEMES[themeKey];

  const navigateToChat = useCallback(() => {
    if (sceneId) navigate(`/scenario/${sceneId}/chat?skipPrepare=1`);
  }, [sceneId, navigate]);

  const handleDoorKnock = useCallback(() => {
    if (doorOpened) return;
    setDoorOpened(true);
    setTimeout(navigateToChat, 800);
  }, [doorOpened, navigateToChat]);

  return (
    <div className="trans-root">
      <style>{`
        .trans-root {
          min-height: 100vh;
          background: ${theme.bg};
          display: flex; flex-direction: column; align-items: center;
          justify-content: flex-end;
          padding: 50px 16px 50px;
          position: relative; overflow: hidden;
          font-family: -apple-system,BlinkMacSystemFont,'SF Pro Display','PingFang SC','Helvetica Neue',sans-serif;
          -webkit-font-smoothing: antialiased;
          transition: background 0.8s ease;
        }
        /* 环境光 */
        .amb-1, .amb-2 {
          position: fixed; border-radius: 50%; filter: blur(130px);
          pointer-events: none; z-index: 0; opacity: 0.16;
          transition: background 0.8s ease;
        }
        .amb-1 { width: 360px; height: 360px; background: ${theme.amb1}; top: -80px; right: -60px; }
        .amb-2 { width: 280px; height: 280px; background: ${theme.amb2}; bottom: -40px; left: -30px; }

        /* ──── 场景插画层 ──── */
        .scene-illustration {
          position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 100%; max-width: 420px; height: 55%;
          pointer-events: none; z-index: 1;
          opacity: 0.85;
        }
        ${themeKey === 'sales' ? `
        /* 售楼处建筑：屋顶 + 墙体 + 玻璃幕墙 + 暖光窗户 + 入口挑檐 */
        .scene-building { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:260px; height:200px; }
        .scene-roof { position:absolute; top:0; left:-20px; right:-20px; height:40px; background:linear-gradient(180deg,rgba(90,60,40,.7),rgba(70,45,30,.5)); clip-path:polygon(10% 100%, 50% 0%, 90% 100%); }
        .scene-wall { position:absolute; top:30px; bottom:0; left:0; right:0; background:linear-gradient(180deg,rgba(200,180,155,.5),rgba(170,150,130,.4)); border-radius:4px 4px 0 0; }
        .scene-window { position:absolute; width:40px; height:50px; background:rgba(253,224,138,.4); border-radius:3px; border:2px solid rgba(255,255,255,.2); top:50px; }
        .scene-win-1 { left:25px; } .scene-win-2 { left:85px; } .scene-win-3 { right:25px; } .scene-win-4 { right:85px; }
        .scene-entrance { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:80px; height:100px; background:rgba(40,28,15,.3); border-radius:8px 8px 0 0; }
        .scene-awning { position:absolute; bottom:100px; left:50%; transform:translateX(-50%); width:120px; height:8px; background:rgba(60,40,25,.4); border-radius:2px; }
        ` : themeKey === 'outdoor' ? `
        /* 工地场景：天空 + 塔吊剪影 + 围挡 + 铁门 */
        .scene-sky { position:absolute; top:0; left:0; right:0; height:65%; background:linear-gradient(180deg,rgba(135,195,235,.3),rgba(200,210,180,.2)); }
        .scene-crane { position:absolute; top:10px; right:30px; width:6px; height:140px; background:rgba(80,70,60,.4); }
        .scene-crane:after { content:''; position:absolute; top:0; left:-30px; width:70px; height:5px; background:rgba(80,70,60,.4); }
        .scene-crane:before { content:''; position:absolute; top:45px; left:-50px; width:110px; height:3px; background:rgba(80,70,60,.3); }
        .scene-fence { position:absolute; bottom:0; left:0; right:0; height:80px; background:rgba(180,170,160,.4); border-top:4px solid rgba(140,120,100,.4); }
        .scene-fence-posts { position:absolute; bottom:0; left:0; right:0; height:80px; background:repeating-linear-gradient(90deg, transparent 0px, transparent 38px, rgba(140,120,100,.3) 38px, rgba(140,120,100,.3) 42px); }
        .scene-gate { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:90px; height:90px; background:rgba(100,90,80,.5); border-radius:4px 4px 0 0; border:3px solid rgba(140,120,100,.4); border-bottom:none; }
        .scene-hardhat { position:absolute; bottom:95px; left:50%; transform:translateX(-50%); width:28px; height:14px; background:rgba(220,170,50,.5); border-radius:14px 14px 3px 3px; }
        ` : themeKey === 'office' ? `
        /* 办公室场景：走廊透视 + 磨砂玻璃门 + 顶灯 */
        .scene-hall { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:300px; height:200px; }
        .scene-hall-wall { position:absolute; inset:0; background:linear-gradient(180deg,rgba(220,225,235,.5),rgba(200,205,218,.4)); }
        .scene-hall-floor { position:absolute; bottom:0; left:0; right:0; height:60px; background:linear-gradient(0deg,rgba(180,185,195,.4),rgba(200,205,215,.2)); }
        .scene-hall-light { position:absolute; top:25px; left:50%; transform:translateX(-50%); width:60px; height:6px; background:rgba(255,255,240,.5); border-radius:3px; box-shadow:0 0 20px rgba(255,255,240,.2); }
        .scene-hall-door-frame { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:100px; height:120px; border:4px solid rgba(140,150,165,.4); border-bottom:none; border-radius:6px 6px 0 0; background:rgba(220,225,235,.3); }
        ` : `
        /* 默认：简单暖光 + 地面线 */
        .scene-floor { position:absolute; bottom:0; left:0; right:0; height:50px; background:linear-gradient(0deg,rgba(0,0,0,.04),transparent); }
        `}

        /* ──── 信息卡片 ──── */
        .info-card {
          position: relative; z-index: 10;
          background: rgba(255,255,255,.55); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,.4); border-radius: 18px;
          padding: 24px 28px 18px; max-width: 380px; width: 90vw;
          margin-bottom: 20px; text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,.05);
        }
        .location-tag {
          font-size: 11px; color: #78716C; font-weight: 500;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 12px; border-radius: 14px;
          background: rgba(0,0,0,.03); margin-bottom: 14px;
        }
        .avatar-img {
          width: 64px; height: 64px; border-radius: 50%; object-fit: cover;
          box-shadow: 0 6px 24px rgba(0,0,0,.1); border: 2px solid rgba(255,255,255,.6);
          margin-bottom: 6px;
        }
        .avatar-name { font-size: 16px; font-weight: 700; color: #1C1917; }
        .avatar-attitude { font-size: 11px; color: #B8854A; font-style: italic; margin-top: 2px; line-height: 1.5; }
        .hm-box {
          margin-top: 12px; padding: 8px 14px; border-radius: 10px;
          background: rgba(0,0,0,.03); border: 1px solid rgba(0,0,0,.04);
        }
        .hm-label { font-size: 9px; font-weight: 600; color: #A8A29E; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 3px; }
        .hm-text { font-size: 12px; color: #57534E; font-style: italic; line-height: 1.5; }
        .msg-text { font-size: 13px; color: #44403C; line-height: 1.6; margin-top: 10px; }
        .msg-hint { font-size: 11px; color: #78716C; line-height: 1.4; margin-top: 3px; }

        /* ──── 门 ──── */
        .door-wrap {
          position: relative; z-index: 10;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .door {
          cursor: pointer; perspective: 600px; transition: transform .2s;
        }
        .door:active { transform: scale(.97); }
        .door-frame {
          width: 100px; height: 145px;
          border-radius: 50px 50px 8px 8px;
          background: ${theme.doorColor};
          padding: 5px;
          box-shadow: 0 8px 30px rgba(0,0,0,.15);
          transition: box-shadow .3s, background .6s;
        }
        .door:hover .door-frame { box-shadow: 0 14px 44px rgba(0,0,0,.22); }
        .door-panel {
          width: 100%; height: 100%;
          border-radius: 46px 46px 5px 5px;
          background: ${theme.doorPanelColor};
          position: relative;
          transition: transform .6s ease; transform-origin: left center;
          box-shadow: inset 0 2px 8px rgba(255,255,255,.12);
        }
        .door-handle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          width: 9px; height: 9px; border-radius: 50%;
          background: linear-gradient(135deg,#D4B896,#A68B6B);
          box-shadow: 0 1px 3px rgba(0,0,0,.3), inset 0 1px 1px rgba(255,255,255,.3);
        }
        .door-opened .door-panel { transform: rotateY(-35deg); }
        .door-opened .door-frame { background: ${theme.doorDarkColor}; }
        .door-opened { pointer-events: none; }
        .door-label {
          text-align: center; font-size: 12px; font-weight: 600;
          color: #78716C; margin-top: 8px; transition: color .3s;
        }
        .door:hover .door-label { color: #1C1917; }
        .door-opened .door-label { color: #78716C; }
        .skip-link {
          font-size: 11px; color: #A8A29E; cursor: pointer; transition: color .2s;
        }
        .skip-link:hover { color: #78716C; }
      `}</style>

      {/* 环境光 */}
      <div className="amb-1" /><div className="amb-2" />

      {/* ─── 场景插画（建筑/工地/办公室）─── */}
      <div className="scene-illustration">
        {themeKey === 'sales' && (
          <div className="scene-building">
            <div className="scene-roof" />
            <div className="scene-wall" />
            <div className="scene-window scene-win-1" /><div className="scene-window scene-win-2" />
            <div className="scene-window scene-win-3" /><div className="scene-window scene-win-4" />
            <div className="scene-awning" />
            <div className="scene-entrance" />
          </div>
        )}
        {themeKey === 'outdoor' && (
          <>
            <div className="scene-sky" />
            <div className="scene-crane" />
            <div className="scene-fence" /><div className="scene-fence-posts" />
            <div className="scene-hardhat" />
          </>
        )}
        {themeKey === 'office' && (
          <div className="scene-hall">
            <div className="scene-hall-wall" />
            <div className="scene-hall-floor" />
            <div className="scene-hall-light" />
            <div className="scene-hall-door-frame" />
          </div>
        )}
        {themeKey === 'default' && <div className="scene-floor" />}
      </div>

      {/* ─── 信息卡片 ─── */}
      <motion.div className="info-card" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2, duration:.5 }}>
        {locationText && <div className="location-tag"><span>{theme.icon}</span>{locationText}</div>}
        {avatarUrl && <img className="avatar-img" src={avatarUrl} alt={npcName} />}
        <div className="avatar-name">{npcName}</div>
        {npcAttitude && <div className="avatar-attitude">&ldquo;{npcAttitude}&rdquo;</div>}
        {hiddenMotivation && (
          <div className="hm-box">
            <div className="hm-label">他在想但不会说出来</div>
            <div className="hm-text">{hiddenMotivation}</div>
          </div>
        )}
        {bridgeMsg && <div className="msg-text">{bridgeMsg}</div>}
        {bridgeHint && <div className="msg-hint">{bridgeHint}</div>}
      </motion.div>

      {/* ─── 门 ─── */}
      <motion.div className="door-wrap" initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:.6, duration:.5 }}>
        <div className={`door${doorOpened ? ' door-opened' : ''}`} onClick={handleDoorKnock} role="button" tabIndex={0}>
          <div className="door-frame">
            <div className="door-panel"><div className="door-handle" /></div>
          </div>
          <div className="door-label">{doorOpened ? '正在进入...' : theme.doorLabel}</div>
        </div>
        <p className="skip-link" onClick={navigateToChat}>跳过，直接开始</p>
      </motion.div>
    </div>
  );
};

export default ScenarioTransitionPage;
