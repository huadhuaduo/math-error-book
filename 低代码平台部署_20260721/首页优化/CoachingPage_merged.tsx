import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Play, Wand2 } from 'lucide-react';
import { ICoachingScene } from '@/api/coaching';
import { logger } from '@lark-apaas/client-toolkit/logger';

// ====== Types ======
interface SceneWithStatus extends ICoachingScene {
  status: 'ready' | 'soon' | 'archived';
}

type DifficultyFilter = 'all' | '入门' | '进阶' | '挑战';
type ProfFilter = 'all' | '营销' | '工程' | '综合';
type ModuleFilter = 'all' | '对下管理' | '跨部门协作' | '拿结果' | '向上管理';

// ====== Cover fallback gradients ======
const COVER_GRADIENTS = [
  'linear-gradient(135deg, #0f3460, #1a1a2e)',
  'linear-gradient(135deg, #1e3a5f, #1b2838)',
  'linear-gradient(135deg, #2d2d2d, #3d3d3d)',
  'linear-gradient(135deg, #3d2a5e, #1a1a2e)',
];

const DIFF_LABELS: Record<string, string> = { '入门': 'easy', '进阶': 'medium', '挑战': 'hard' };

// ====== SceneCard ======
const SceneCard: React.FC<{
  scene: SceneWithStatus;
  featured?: boolean;
  onClick: () => void;
}> = ({ scene, featured = false, onClick }) => {
  const bgIdx = scene.id.charCodeAt(0) % 4;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 border-stone-200 ${featured ? 'ring-1 ring-emerald-200' : ''}`}
        onClick={onClick}
      >
        <div className={`relative bg-stone-100 ${featured ? 'h-36' : 'h-24'}`}>
          {scene.coverUrl ? (
            <img src={scene.coverUrl} alt={scene.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold"
              style={{ background: COVER_GRADIENTS[bgIdx], fontSize: featured ? 32 : 22 }}>
              {scene.name.charAt(0)}
            </div>
          )}
          {scene.status === 'ready' && (
            <Badge className="absolute top-2 left-2 bg-emerald-500 text-white border-0 text-xs">可练</Badge>
          )}
          {scene.status === 'soon' && (
            <Badge className="absolute top-2 left-2 bg-orange-400 text-white border-0 text-xs">待建</Badge>
          )}
          {scene.status === 'archived' && (
            <Badge className="absolute top-2 left-2 bg-stone-400 text-white border-0 text-xs">已归档</Badge>
          )}
          <Badge className={`absolute top-2 right-2 border-0 text-xs ${DIFF_LABELS[scene.difficulty] === 'easy' ? 'bg-stone-100 text-stone-500' : DIFF_LABELS[scene.difficulty] === 'medium' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
            {scene.difficulty}
          </Badge>
        </div>
        <CardContent className="p-3 space-y-2">
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-50 text-stone-400">{scene.module || scene.dimension}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-50 text-stone-400">{scene.profession || '综合'}</span>
          </div>
          <h4 className="font-medium text-stone-700 text-sm leading-tight">{scene.name}</h4>
          <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{scene.description}</p>
          <div className="text-xs font-medium text-emerald-600">
            {scene.status === 'ready' ? '开始练习 →' : scene.status === 'archived' ? '已归档' : '即将上线'}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ====== Assessment Modal ======
const AssessmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [freeText, setFreeText] = useState('');

  const result = useMemo(() => {
    if (!q1 && !q2 && !q3 && freeText.trim().length < 3) return null;
    if (q3 === 'face') return { title: 'C级员工·绩效面谈', why: '绩效面谈是管理者最高频的挑战。小林场景帮你练习——怎么把等级说出口，同时让下属愿意改进。', focus: '🎯 这次练习重点关注：如何在不破坏关系的前提下，让下属接受评估结果并愿意改进' };
    if (q3 === 'motivate') return { title: '首开倒计时·空降者的20天', why: '团队激励是管理者的核心能力。老周场景——用行动建立信任，不是开会。', focus: '🎯 这次练习重点关注：不要一上来就发号施令——先用行动证明自己，再说话' };
    if (q3 === 'target') return { title: '季度目标对齐·拆解沟通', why: '目标管理不是下命令——是让团队真的认同。', focus: '🎯 这次练习重点关注：不要把目标强加给对方——先理解他的顾虑，再一起找方案' };
    if (q2 === 'cross') return { title: '跨部门协作·冲突调解', why: '跨部门协调是管理中最容易踩坑的。', focus: '🎯 这次练习重点关注：找到双方利益的交集点，而不是站在某一方' };
    if (q2 === 'up') return { title: '向上汇报·项目延期问责', why: '既承认责任又争取支持。', focus: '🎯 这次练习重点关注：不要只道歉——把解决方案和数据一起带上去' };
    return { title: 'C级员工·绩效面谈', why: '绩效面谈是每个管理者都要面对的。', focus: '🎯 这次练习重点关注：先让下属自己说，你再补充——不要一上来就给结论' };
  }, [q1, q2, q3, freeText]);

  return (
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center p-5" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl p-7 max-w-[460px] w-full shadow-xl max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-1">快速自评</h2>
        <p className="text-xs text-stone-500 mb-5">回答3个问题，帮你匹配最适合的场景。</p>

        <div className="mb-4">
          <div className="text-xs font-semibold mb-2">1. 你目前的管理经验？</div>
          <div className="flex gap-2 flex-wrap">
            {['new', 'mid', 'senior'].map((v) => (
              <button key={v} onClick={() => setQ1(q1 === v ? '' : v)}
                className={`px-3.5 py-1.5 rounded-full border text-xs transition-all ${q1 === v ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold' : 'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>
                {v === 'new' ? '新经理（<1年）' : v === 'mid' ? '有经验（1-5年）' : '资深（>5年）'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold mb-2">2. 最近遇到的主要挑战？</div>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: 'team', label: '带团队·激励下属' },
              { v: 'cross', label: '跨部门协作' },
              { v: 'up', label: '向上管理' },
            ].map(({ v, label }) => (
              <button key={v} onClick={() => setQ2(q2 === v ? '' : v)}
                className={`px-3.5 py-1.5 rounded-full border text-xs transition-all ${q2 === v ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold' : 'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold mb-2">3. 你更想练什么？</div>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: 'face', label: '绩效面谈' },
              { v: 'motivate', label: '团队激励' },
              { v: 'target', label: '目标管理' },
            ].map(({ v, label }) => (
              <button key={v} onClick={() => setQ3(q3 === v ? '' : v)}
                className={`px-3.5 py-1.5 rounded-full border text-xs transition-all ${q3 === v ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold' : 'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold mb-2">补充描述（可选）</div>
          <textarea className="w-full h-12 border border-stone-200 rounded-lg p-2 text-xs resize-none outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
            placeholder="比如：项目尾盘人心惶惶；刚升经理第一次谈绩效…" value={freeText} onChange={(e) => setFreeText(e.target.value)} />
        </div>

        {result && (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center mt-3">
            <div className="text-sm font-bold mb-1">{result.title}</div>
            <div className="text-xs text-stone-500 leading-relaxed mb-1">{result.why}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mb-3 bg-emerald-100/50 px-3 py-1.5 rounded-lg inline-block">{result.focus}</div>
            <br />
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onClose}>开始练习 →</Button>
          </div>
        )}

        <button onClick={onClose} className="w-full py-2.5 border-none rounded-lg bg-stone-50 text-stone-500 text-xs mt-3">关闭</button>
      </div>
    </div>
  );
};

// ====== CoachingPage ======
const CoachingPage: React.FC = () => {
  const navigate = useNavigate();
  const [allScenes, setAllScenes] = useState<SceneWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [showAssessment, setShowAssessment] = useState(false);

  // Filters
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>('all');
  const [profFilter, setProfFilter] = useState<ProfFilter>('all');
  const [modFilter, setModFilter] = useState<ModuleFilter>('all');
  const [readyOnly, setReadyOnly] = useState(false);

  // Load scenes
  useEffect(() => {
    (async () => {
      try {
        // In production: const scenes = await getAllScenes();
        // For now: load from existing CoachingPage data pattern
        setLoading(false);
      } catch (err) {
        logger.error('Failed to load scenes', err);
        setLoading(false);
      }
    })();
    // Check assessment data
    try {
      const raw = localStorage.getItem('mdp_assessment');
      if (raw) { setAssessmentData(JSON.parse(raw)); setHasAssessment(true); }
    } catch { }
  }, []);

  // Derived data — 训战陪练 (TG series, MTP)
  const trainingScenes = useMemo(() => allScenes.filter((s) =>
    s.id.startsWith('TG-') || s.id === 'scene_motivation_001'
  ), [allScenes]);

  // 管理陪练 (the rest)
  const mgmtScenes = useMemo(() => allScenes.filter((s) =>
    !s.id.startsWith('TG-') && s.id !== 'scene_motivation_001'
  ), [allScenes]);

  const filteredMgmt = useMemo(() => mgmtScenes.filter((s) => {
    if (diffFilter !== 'all' && s.difficulty !== diffFilter) return false;
    if (profFilter !== 'all' && (s as any).profession !== profFilter) return false;
    if (modFilter !== 'all' && (s as any).module !== modFilter) return false;
    if (readyOnly && (s as any).status !== 'ready') return false;
    return true;
  }).sort((a, b) => {
    const order = { ready: 0, soon: 1, archived: 2 };
    return order[(a as any).status || 'soon'] - order[(b as any).status || 'soon'];
  }), [mgmtScenes, diffFilter, profFilter, modFilter, readyOnly]);

  const mgmtReady = mgmtScenes.filter((s) => (s as any).status === 'ready').length;
  const mgmtSoon = mgmtScenes.filter((s) => (s as any).status === 'soon').length;
  const mgmtArchived = mgmtScenes.filter((s) => (s as any).status === 'archived').length;

  const handleStart = (sceneId: string) => {
    if (sceneId === 'scene_pr_002') { navigate('/coaching/pr2-prepare'); return; }
    if (sceneId.startsWith('TG-')) { navigate('/tg001/prepare'); return; }
    navigate(`/coaching/${sceneId}`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center text-stone-400">加载中…</div>
    );
  }

  return (
    <div className="w-full bg-stone-50 min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-2xl font-bold text-stone-700 mb-2 tracking-tight">AI陪练场景</h1>
            <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
              通过模拟真实工作场景，提升作战能力
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-20">
        {/* ====== ✨ 推荐给你 ====== */}
        <section className="mt-8 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge className={hasAssessment ? 'bg-emerald-50 text-emerald-600 border-0' : 'bg-orange-50 text-orange-600 border-0'}>
              {hasAssessment ? '📊 根据你的薄弱维度推荐' : '🔥 热门场景'}
            </Badge>
            <span className="text-xs text-stone-400">
              {hasAssessment ? `上次练习 P₂信任 ${assessmentData?.scores?.p2_trust || '?'}分 → 建议优先练习绩效面谈` : '完成测评后可获得个性化推荐'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* PR-002 */}
            <div onClick={() => handleStart('scene_pr_002')}
              className="bg-white border border-emerald-100 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #1b2838)' }}>林</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">绩效面谈·C级员工</div>
                <div className="text-xs text-stone-500">最热门的管理场景，15分钟体验完整面谈流程</div>
              </div>
              <span className="text-emerald-600 text-sm shrink-0">→</span>
            </div>
            {/* TG-001 */}
            <div onClick={() => handleStart('TG-001')}
              className="bg-white border border-emerald-100 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: 'linear-gradient(135deg, #0f3460, #1a1a2e)' }}>周</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">首开倒计时·空降者的20天</div>
                <div className="text-xs text-stone-500">热门的训战场景——空降新项目，用行动建立信任</div>
              </div>
              <span className="text-emerald-600 text-sm shrink-0">→</span>
            </div>
            {/* Assessment */}
            <div onClick={() => setShowAssessment(true)}
              className="bg-white border border-emerald-100 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0 bg-emerald-50">🎯</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">不知道练哪个？</div>
                <div className="text-xs text-stone-500">快速自评——帮你找到最适合开始的那个场景</div>
              </div>
              <span className="text-emerald-600 text-sm shrink-0">→</span>
            </div>
          </div>
        </section>

        {/* ====== ⚡ 训战陪练 ====== */}
        <section className="mt-10">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-base">⚡</span>
            <h2 className="text-lg font-bold text-stone-700">训战陪练</h2>
            <Badge className="bg-stone-100 text-stone-400 border-0 text-xs">老师布置 · 课后练习</Badge>
          </div>
          <p className="text-sm text-stone-500 mb-2 ml-10">上完课不等于学会了。在这里多练几遍——你会知道自己哪里还卡着，快速强化，直到真正掌握。</p>
          <p className="text-xs text-stone-400 mb-3 ml-10">
            <strong className="text-emerald-600">{trainingScenes.length}</strong> 个场景 · <strong className="text-emerald-600">{trainingScenes.filter((s) => (s as any).status === 'ready').length}</strong> 个可练 · {trainingScenes.filter((s) => (s as any).status !== 'ready').length} 个规划中
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {trainingScenes.map((scene, idx) => (
              <SceneCard key={scene.id} scene={scene as SceneWithStatus} featured={idx === 0} onClick={() => handleStart(scene.id)} />
            ))}
            <div onClick={() => toast.info('MTP知识点练习即将上线')}
              className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col items-center gap-2">
              <span className="text-2xl opacity-40">📝</span>
              <span className="text-sm text-stone-500">MTP知识点练习</span>
              <span className="text-xs text-stone-400">课后检验知识点掌握程度</span>
            </div>
          </div>
        </section>

        {/* ====== 🎯 管理陪练 ====== */}
        <section className="mt-10">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base">🎯</span>
            <h2 className="text-lg font-bold text-stone-700">管理陪练</h2>
            <Badge className="bg-stone-100 text-stone-400 border-0 text-xs">自主练习 · 管理发展 · {mgmtScenes.length}个场景</Badge>
          </div>
          <p className="text-sm text-stone-500 mb-2 ml-10">绩效面谈、跨部门协调、向上汇报……管理虽然没有标准答案，但这里给你一个安全的练习场。对话是自由的——练完之后，你会看到自己没注意到的习惯和盲区。</p>
          <p className="text-xs text-stone-400 mb-3 ml-10">
            <strong className="text-emerald-600">{mgmtScenes.length}</strong> 个场景 · <strong className="text-emerald-600">{mgmtReady}</strong> 个可练 · {mgmtSoon} 个待建 · {mgmtArchived} 个已归档
          </p>

          {/* Filters */}
          <div className="flex items-center gap-1.5 mb-4 flex-wrap text-xs">
            <span className="text-stone-400 font-semibold">难度</span>
            {(['all', '入门', '进阶', '挑战'] as DifficultyFilter[]).map((v) => (
              <button key={v} onClick={() => setDiffFilter(v)}
                className={`px-3 py-1 rounded-full border transition-all ${diffFilter === v ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold' : 'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>
                {v === 'all' ? '全部' : v}
              </button>
            ))}
            <span className="w-px h-4 bg-stone-200 mx-1" />
            <span className="text-stone-400 font-semibold">条线</span>
            {(['all', '营销', '工程', '综合'] as ProfFilter[]).map((v) => (
              <button key={v} onClick={() => setProfFilter(v)}
                className={`px-3 py-1 rounded-full border transition-all ${profFilter === v ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold' : 'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>
                {v === 'all' ? '全部' : v}
              </button>
            ))}
            <span className="w-px h-4 bg-stone-200 mx-1" />
            <span className="text-stone-400 font-semibold">模块</span>
            {(['all', '对下管理', '跨部门协作', '拿结果', '向上管理'] as ModuleFilter[]).map((v) => (
              <button key={v} onClick={() => setModFilter(v)}
                className={`px-3 py-1 rounded-full border transition-all ${modFilter === v ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold' : 'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>
                {v === 'all' ? '全部' : v}
              </button>
            ))}
            <span className="w-px h-4 bg-stone-200 mx-1" />
            <button onClick={() => setReadyOnly(!readyOnly)}
              className={`px-3 py-1 rounded-full border transition-all ${readyOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold' : 'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>
              {readyOnly ? '仅可练 ✓' : '仅可练'}
            </button>
            <span onClick={() => setShowAssessment(true)} className="text-emerald-600 font-medium cursor-pointer ml-auto">先测再练 →</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredMgmt.map((scene) => (
              <SceneCard key={scene.id} scene={scene as SceneWithStatus} onClick={() => handleStart(scene.id)} />
            ))}
            {filteredMgmt.length === 0 && (
              <div className="col-span-full text-center py-10 text-stone-400 text-sm">没有匹配的场景，试试调整筛选条件</div>
            )}
          </div>
        </section>

        {/* ====== 💼 业务陪练 ====== */}
        <section className="mt-10">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-base">💼</span>
            <h2 className="text-lg font-bold text-stone-700">业务陪练</h2>
            <Badge className="bg-stone-100 text-stone-400 border-0 text-xs">上传话术 · 自动生成</Badge>
          </div>
          <p className="text-sm text-stone-500 mb-2 ml-10">把你的产品手册或话术模板上传，AI 自动生成练习场景。销售练接客、客服练投诉处理——练的是你自己的真实任务、真实场景，练完就能用。</p>
          <p className="text-xs text-stone-400 mb-3 ml-10">3 个场景 · 全部待建</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['📞 销售场景 · 话术训练', '🎧 客服场景 · 投诉处理', '📋 自定义场景'].map((label, i) => (
              <div key={i} onClick={() => toast.info('业务陪练模块建设中')}
                className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col items-center gap-2">
                <span className="text-2xl opacity-40">{label.charAt(0)}</span>
                <span className="text-sm text-stone-500">{label.slice(2)}</span>
                <span className="text-xs text-stone-400">{i < 2 ? '上传模板 → AI生成' : '自建模板上传'}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 🤖 AI智能生成 ====== */}
        <section className="mt-10">
          <div onClick={() => navigate('/scenario/generate')}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Wand2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-stone-800">AI 智能生成场景</h3>
              <p className="text-sm text-stone-500 mt-0.5">根据你的维度评估，AI 为你定制专属陪练场景</p>
            </div>
            <span className="text-sm text-emerald-600 font-medium shrink-0">去看看 →</span>
          </div>
        </section>
      </div>

      {showAssessment && <AssessmentModal onClose={() => setShowAssessment(false)} />}
    </div>
  );
};

export default CoachingPage;
