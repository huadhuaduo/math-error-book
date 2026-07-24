import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Wand2 } from 'lucide-react';

/* ====== 硬编码数据（API 兜底） ====== */

interface SceneItem { id: string; title: string; mod: string; prof: string; diff: string; desc: string; status: 'ready'|'soon'|'archived'; tag?: string }
interface CourseItem { id: string; name: string; tag: string; mod: string; prof: string; desc: string; scenes: { name: string; diff: string; status: string }[]; status: 'ready'|'soon' }
interface RecItem { id: string; title: string; mod: string; prof: string; diff: string; desc: string; status: string; isAssess?: boolean }

const COURSE_DATA: CourseItem[] = [
  { id:'mtp_mgmt', name:'MTP对下管理', tag:'MTP训后', mod:'对下管理', prof:'营销',
    desc:'空降管理、老员工激活、跨部门协作——MTP课堂学完马上练。',
    scenes:[{name:'首开倒计时——空降者的20天',diff:'进阶',status:'ready'},{name:'大户型攻坚——能力在，意愿呢？',diff:'进阶',status:'soon'},{name:'线索断了——数渠团队的重建',diff:'挑战',status:'soon'},{name:'MTP知识点练习',diff:'入门',status:'soon'}],
    status:'ready' },
  { id:'new_mgr', name:'新经理培训', tag:'新经理项目', mod:'对下管理', prof:'综合',
    desc:'新晋管理者的必修课——绩效面谈、冲突调解、代际管理。',
    scenes:[{name:'C级员工·绩效面谈',diff:'进阶',status:'ready'},{name:'团队内部冲突调解',diff:'进阶',status:'soon'},{name:'跨代际员工管理',diff:'进阶',status:'soon'}],
    status:'soon' },
];

const MGMT_DATA: SceneItem[] = [
  {id:'scene_pr_002',title:'C级员工·自评与绩效落差大',mod:'对下管理',prof:'综合',diff:'进阶',desc:'她不知道今天是C。笑着推开会议室的门。',status:'ready'},
  {id:'TG-004',title:'尾盘清仓——谁在害怕被抛弃？',mod:'对下管理',prof:'营销',diff:'进阶',desc:'32套尾盘，人心散了。',status:'soon'},
  {id:'scene_gt_P4',title:'三线城市新媒体营销团队激活',mod:'对下管理',prof:'营销',diff:'进阶',desc:'帮老销售跨过面子关和能力关。',status:'soon'},
  {id:'scene_gt_F4',title:'跨部门资源争夺·平衡品质与成本',mod:'跨部门协作',prof:'工程',diff:'挑战',desc:'设计坚持效果，成本要求节约。',status:'soon'},
  {id:'scene_P2',title:'跨部门协作冲突协调',mod:'跨部门协作',prof:'工程',diff:'挑战',desc:'营销催交付，工程强调质量。',status:'soon'},
  {id:'scene_R1',title:'季度目标对齐·拆解沟通',mod:'拿结果',prof:'营销',diff:'挑战',desc:'上级要6500万，他认为过高。',status:'soon'},
  {id:'scene_R2',title:'销售人员目标拆解指导',mod:'拿结果',prof:'营销',diff:'入门',desc:'新人小林200万目标无从下手。',status:'soon'},
  {id:'scene_adv_upward_01',title:'向上汇报·项目延期问责',mod:'向上管理',prof:'工程',diff:'挑战',desc:'项目延期一周，赵总当众质问。',status:'soon'},
  {id:'scene_conflict_001',title:'团队内部冲突调解',mod:'对下管理',prof:'综合',diff:'进阶',desc:'两名核心成员冷战一周。',status:'soon'},
  {id:'scene_adv_gen_01',title:'跨代际员工管理',mod:'对下管理',prof:'综合',diff:'进阶',desc:'95后尊重逻辑不尊重权威。',status:'soon'},
  {id:'PR-PF-A',title:'A级员工·职业发展不明确',mod:'对下管理',prof:'综合',diff:'进阶',desc:'业绩A级但职业迷茫。',status:'soon',tag:'绩效面谈'},
  {id:'PR-PF-B',title:'B级员工·转型诉求受阻',mod:'对下管理',prof:'综合',diff:'进阶',desc:'能力B+，消极让他变成B。',status:'soon',tag:'绩效面谈'},
  {id:'PR-PF-C2',title:'C级×2·选择性工作+法律风险',mod:'对下管理',prof:'综合',diff:'挑战',desc:'涉及法律风险。',status:'soon',tag:'绩效面谈'},
  {id:'PR1',title:'PR1 · 跨部门协作',mod:'跨部门协作',prof:'综合',diff:'进阶',desc:'已有HTML可恢复。',status:'archived'},
  {id:'PR3',title:'PR3 · 绩效面谈场景',mod:'对下管理',prof:'综合',diff:'进阶',desc:'已有HTML可恢复。',status:'archived',tag:'绩效面谈'},
  {id:'PR4',title:'PR4 · 绩效面谈场景',mod:'对下管理',prof:'综合',diff:'进阶',desc:'已有HTML可恢复。',status:'archived',tag:'绩效面谈'},
  {id:'PR5',title:'PR5 · 绩效面谈场景',mod:'对下管理',prof:'综合',diff:'进阶',desc:'已有HTML(v4-v15)。',status:'archived',tag:'绩效面谈'},
];

const REC_DATA: RecItem[] = [
  {id:'scene_pr_002',title:'C级员工·绩效面谈',mod:'对下管理',prof:'综合',diff:'进阶',desc:'她不知道今天是C。笑着推开会议室的门。',status:'ready'},
  {id:'TG-001',title:'首开倒计时——空降者的20天',mod:'对下管理',prof:'营销',diff:'进阶',desc:'被紧急派往新项目支援。团队过劳，老周在看你。',status:'ready'},
  {id:'scene_R1',title:'季度目标对齐·拆解沟通',mod:'拿结果',prof:'营销',diff:'挑战',desc:'上级要6500万，他认为过高。',status:'soon'},
  {id:'_self_assess',title:'不知道练哪个？快速自评',mod:'推荐',prof:'全部',diff:'入门',desc:'3道题帮你找到最适合开始的场景。',status:'ready',isAssess:true},
];

const GRADS = ['linear-gradient(135deg,#0f3460,#1a1a2e)','linear-gradient(135deg,#1e3a5f,#1b2838)','linear-gradient(135deg,#2d2d2d,#3d3d3d)','linear-gradient(135deg,#3d2a5e,#1a1a2e)'];
const DIFF_CN: Record<string,string> = { easy:'入门', medium:'进阶', hard:'挑战', '入门':'入门', '进阶':'进阶', '挑战':'挑战' };
const DIFF_STYLE: Record<string,string> = { '入门':'bg-stone-100 text-stone-500', '进阶':'bg-blue-50 text-blue-600', '挑战':'bg-orange-50 text-orange-600', easy:'bg-stone-100 text-stone-500', medium:'bg-blue-50 text-blue-600', hard:'bg-orange-50 text-orange-600' };
const STATUS_ORDER: Record<string,number> = { ready:0, soon:1, archived:2 };

/* ====== SceneCard ====== */
const SceneCard: React.FC<{scene:SceneItem|RecItem; onClick?:()=>void}> = ({scene,onClick}) => {
  const g=scene.id.charCodeAt(0)%GRADS.length; const s=scene as any;
  return (<motion.div initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.2}}>
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-all border-stone-200 rounded-xl" onClick={onClick}>
      <div className="h-24 relative flex items-center justify-center">
        <div style={{background:GRADS[g],width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:22}}>{s.title.charAt(0)}</div>
        <Badge className={`absolute top-2 left-2 border-0 text-xs ${s.isAssess?'bg-emerald-500 text-white':s.status==='ready'?'bg-emerald-500 text-white':s.status==='archived'?'bg-stone-400 text-white':'bg-orange-400 text-white'}`}>{s.isAssess?'推荐':s.status==='ready'?'可练':s.status==='archived'?'已归档':'待建'}</Badge>
        <Badge className={`absolute top-2 right-2 border-0 text-xs ${DIFF_STYLE[s.diff]||'bg-stone-100 text-stone-500'}`}>{DIFF_CN[s.diff]||s.diff}</Badge>
      </div>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex gap-1 flex-wrap">{[s.mod,s.prof].filter(Boolean).map((t:string,i:number)=>(<span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-50 text-stone-400">{t}</span>))}</div>
        <h4 className="font-medium text-stone-700 text-sm leading-tight">{s.title}</h4>
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{s.desc}</p>
        <div className="text-xs font-medium text-emerald-600">{s.isAssess?'开始自评':s.status==='ready'?'开始练习':s.status==='archived'?'已归档':'即将上线'}</div>
      </CardContent>
    </Card>
  </motion.div>);
};

/* ====== CourseCard ====== */
const CourseCard: React.FC<{course:CourseItem; onClick:()=>void}> = ({course,onClick}) => {
  const g=course.id.charCodeAt(0)%GRADS.length;
  const ready=course.scenes.filter(s=>s.status==='ready').length;
  return (<motion.div initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.2}}>
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-all border-stone-200 rounded-xl" onClick={onClick}>
      <div className="h-28 relative flex items-center justify-center">
        <div style={{background:GRADS[g],width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,color:'#fff'}}><span style={{fontSize:28}}>📚</span><span style={{fontSize:14,fontWeight:600}}>{course.name}</span></div>
        <Badge className={`absolute top-2 left-2 border-0 text-xs ${course.status==='ready'?'bg-emerald-500 text-white':'bg-orange-400 text-white'}`}>{course.status==='ready'?`${ready}个可练`:'待上线'}</Badge>
        <Badge className="absolute top-2 right-2 bg-blue-50 text-blue-600 border-0 text-xs">{course.scenes.length}个场景</Badge>
      </div>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex gap-1 flex-wrap"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{course.mod}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-50 text-stone-400">{course.prof}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-50 text-stone-400">{course.tag}</span></div>
        <h4 className="font-medium text-stone-700 text-sm leading-tight">{course.name} · 课程陪练</h4>
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{course.desc}</p>
        <div className="text-xs font-medium text-emerald-600">{course.status==='ready'?'查看场景 →':'即将上线'}</div>
        <div className="text-[10px] text-stone-400 flex gap-2 mt-1">{ready>0&&<span className="text-emerald-600">✅ {ready}个可练</span>}<span>共{course.scenes.length}个场景</span></div>
      </CardContent>
    </Card>
  </motion.div>);
};

/* ====== AssessmentModal（内联，不依赖外部文件） ====== */
const AssessmentModal: React.FC<{onClose:()=>void}> = ({onClose}) => {
  const [q1,setQ1]=useState('');const [q2,setQ2]=useState('');const [q3,setQ3]=useState('');const [ft,setFt]=useState('');
  const r=useMemo(()=>{if(!q1&&!q2&&!q3&&ft.trim().length<3)return null;if(q3==='face')return{t:'C级员工·绩效面谈',w:'绩效面谈是管理者最高频的挑战。',f:'🎯 重点：如何在不破坏关系的前提下，让下属接受评估结果并愿意改进'};if(q3==='motivate')return{t:'首开倒计时·空降者的20天',w:'团队激励是核心能力。',f:'🎯 重点：不要一上来就发号施令——先用行动证明自己'};if(q3==='target')return{t:'季度目标对齐·拆解沟通',w:'目标管理不是下命令。',f:'🎯 重点：先理解他的顾虑，再一起找方案'};if(q2==='cross')return{t:'跨部门协作·冲突调解',w:'跨部门协调容易踩坑。',f:'🎯 重点：找到双方利益的交集点'};if(q2==='up')return{t:'向上汇报·项目延期问责',w:'既承认责任又争取支持。',f:'🎯 重点：把解决方案和数据一起带上去'};return{t:'C级员工·绩效面谈',w:'从这里开始不会错。',f:'🎯 重点：先让下属自己说，你再补充'}},[q1,q2,q3,ft]);
  return (<div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center p-5" onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className="bg-white rounded-2xl p-7 max-w-[460px] w-full shadow-xl max-h-[85vh] overflow-y-auto"><h2 className="text-lg font-bold mb-1">快速自评</h2><p className="text-xs text-stone-500 mb-5">回答3个问题，帮你匹配最适合的场景。</p>{[{q:'1',l:'你目前的管理经验？',o:[{v:'new',lb:'新经理（<1年）'},{v:'mid',lb:'有经验（1-5年）'},{v:'senior',lb:'资深（>5年）'}],val:q1,set:setQ1},{q:'2',l:'最近遇到的主要挑战？',o:[{v:'team',lb:'带团队·激励下属'},{v:'cross',lb:'跨部门协作'},{v:'up',lb:'向上管理'}],val:q2,set:setQ2},{q:'3',l:'你更想练什么？',o:[{v:'face',lb:'绩效面谈'},{v:'motivate',lb:'团队激励'},{v:'target',lb:'目标管理'}],val:q3,set:setQ3}].map(({q,l,o,val,set})=>(<div key={q} className="mb-4"><div className="text-xs font-semibold mb-2">{l}</div><div className="flex gap-2 flex-wrap">{o.map(({v,lb})=>(<button key={v} onClick={()=>set(val===v?'':v)} className={`px-3.5 py-1.5 rounded-full border text-xs transition-all ${val===v?'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold':'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>{lb}</button>))}</div></div>))}<div className="mb-4"><div className="text-xs font-semibold mb-2">补充描述（可选）</div><textarea className="w-full h-12 border border-stone-200 rounded-lg p-2 text-xs resize-none outline-none focus:border-emerald-500" placeholder="比如：项目尾盘人心惶惶；刚升经理第一次谈绩效…" value={ft} onChange={e=>setFt(e.target.value)}/></div>{r&&(<div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center mt-3"><div className="text-sm font-bold mb-1">{r.t}</div><div className="text-xs text-stone-500 mb-1">{r.w}</div><div className="text-[11px] text-emerald-600 font-semibold mb-3 bg-emerald-100/50 px-3 py-1.5 rounded-lg inline-block">{r.f}</div><br/><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onClose}>开始练习 →</Button></div>)}<button onClick={onClose} className="w-full py-2.5 border-none rounded-lg bg-stone-50 text-stone-500 text-xs mt-3">关闭</button></div></div>);
};

/* ====== CoachingPage ====== */
const CoachingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAssessment, setShowAssessment] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [currentClass, setCurrentClass] = useState<{name:string;id:string}|null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  const handleJoinClass = async () => {
    if (!inviteCode.trim()) return;
    setJoinLoading(true);
    try {
      const res = await fetch(`/api/coaching/classes/join?invite=${encodeURIComponent(inviteCode.trim())}`, { method: 'POST' });
      if (!res.ok) throw new Error('邀请码无效');
      const data = await res.json();
      setCurrentClass({ name: data.className, id: data.classId });
      toast.success(`已加入：${data.className}`);
      setInviteCode('');
    } catch {
      toast.error('邀请码无效，请检查后重试');
    } finally {
      setJoinLoading(false);
    }
  };
  const [hasAssessment] = useState(()=>{try{return!!localStorage.getItem('mdp_assessment')}catch{return false}});
  /* 筛选——标签维度 */
  const [activeTab,setActiveTab]=useState('all');
  /* 筛选——难度（中文值） */
  const [diffFilter,setDiffFilter]=useState('all');
  /* 筛选——条线 */
  const [profFilter,setProfFilter]=useState('all');
  /* 仅可练 */
  const [readyOnly,setReadyOnly]=useState(false);

  /* 管理陪练 · 筛选逻辑（同时支持中文和英文diff值） */
  const filtered=useMemo(()=>MGMT_DATA.filter(s=>{
    if(activeTab!=='all'&&s.mod!==activeTab&&s.tag!==activeTab)return false;
    if(diffFilter!=='all'&&s.diff!==diffFilter&&DIFF_CN[s.diff]!==diffFilter)return false;
    if(profFilter!=='all'&&s.prof!==profFilter)return false;
    if(readyOnly&&s.status!=='ready')return false;
    return true;
  }).sort((a,b)=>STATUS_ORDER[a.status]-STATUS_ORDER[b.status]),[activeTab,diffFilter,profFilter,readyOnly]);

  const go=(id:string)=>{if(id==='scene_pr_002')navigate('/coaching/pr2-prepare');else if(id==='TG-001')navigate('/tg001/prepare');else navigate(`/coaching/${id}`)};
  const r=MGMT_DATA.filter(s=>s.status==='ready').length;
  const so=MGMT_DATA.filter(s=>s.status==='soon').length;
  const ar=MGMT_DATA.filter(s=>s.status==='archived').length;
  const tc=COURSE_DATA.reduce((a,c)=>a+c.scenes.length,0);
  const tr=COURSE_DATA.reduce((a,c)=>a+c.scenes.filter(s=>s.status==='ready').length,0);

  return (<div className="w-full bg-stone-50 min-h-screen">
    {/* Hero */}
    <section className="bg-white border-b border-stone-100"><div className="max-w-6xl mx-auto px-6 py-5 text-center"><motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5}}><h1 className="text-2xl font-bold text-stone-700 tracking-tight">AI陪练场景</h1><p className="text-stone-500 text-sm">通过模拟真实工作场景，提升作战能力</p></motion.div></div></section>
    <div className="max-w-6xl mx-auto px-6 pb-12">
      {/* 加入班级 */}
      {currentClass ? (
        <div className="mt-3 mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm"><span className="text-emerald-600 font-semibold">✅ 已加入：{currentClass.name}</span><button onClick={()=>{setCurrentClass(null);toast.info('已退出班级视图')}} className="ml-auto text-xs text-stone-400 hover:text-stone-600">退出</button></div>
      ) : (
        <div className="mt-3 mb-4 flex items-center gap-2 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl">
          <input className="flex-1 bg-transparent border-none outline-none text-sm text-stone-700 placeholder:text-stone-400" placeholder="输入邀请码加入班级…" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleJoinClass()}}/>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleJoinClass} disabled={joinLoading}>{joinLoading?'加入中…':'加入班级'}</Button>
        </div>
      )}
      {/* 推荐 */}
      <section className="mt-5 mb-6"><div className="flex items-center gap-2 mb-3"><Badge className={hasAssessment?'bg-emerald-50 text-emerald-600 border-0':'bg-orange-50 text-orange-600 border-0'}>{hasAssessment?'📊 根据你的薄弱维度推荐':'🔥 热门场景'}</Badge><span className="text-xs text-stone-400">{hasAssessment?'上次练习 P₂信任 35分 → 建议优先练习绩效面谈':'完成测评后可获得个性化推荐'}</span></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{REC_DATA.map(s=>s.isAssess?<SceneCard key={s.id} scene={s} onClick={()=>setShowAssessment(true)}/>:<SceneCard key={s.id} scene={s} onClick={()=>go(s.id)}/>)}</div></section>
      {/* 训战陪练 · 课程分组 */}
      <section className="mt-8"><div className="flex items-center gap-2.5 mb-1"><span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-base">⚡</span><h2 className="text-lg font-bold text-stone-700">训战陪练</h2><Badge className="bg-stone-100 text-stone-400 border-0 text-xs">课程/项目 · 班级练习</Badge></div><p className="text-sm text-stone-500 mb-2 ml-10">上完课不等于学会了。按课程或项目组织的课后练习——点进去就是该班级的专属场景。</p><p className="text-xs text-stone-400 mb-3 ml-10"><strong className="text-emerald-600">{COURSE_DATA.length}</strong> 个课程 · <strong className="text-emerald-600">{tc}</strong> 个场景 · <strong className="text-emerald-600">{tr}</strong> 个可练</p><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{COURSE_DATA.map(c=><CourseCard key={c.id} course={c} onClick={()=>{toast.info(`${c.name} · 课程场景`,{description:c.scenes.map(s=>`${s.status==='ready'?'✅':'🔜'} ${s.name}（${s.diff}）`).join('\n')})}}/>)}<div onClick={()=>toast.info('创建课程练习：上传学员名单+选择场景→生成班级练习')} className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col items-center gap-2"><span className="text-2xl opacity-40">➕</span><span className="text-sm text-stone-500">创建课程练习</span><span className="text-xs text-stone-400">上传学员名单+选择场景→生成班级练习</span></div></div></section>
      {/* 管理陪练 */}
      <section className="mt-8"><div className="flex items-center gap-2.5 mb-1"><span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base">🎯</span><h2 className="text-lg font-bold text-stone-700">管理陪练</h2><Badge className="bg-stone-100 text-stone-400 border-0 text-xs">自主练习 · 管理发展 · {MGMT_DATA.length}个场景</Badge></div><p className="text-sm text-stone-500 mb-2 ml-10">绩效面谈、跨部门协调、向上汇报……管理虽然没有标准答案，但这里给你一个安全的练习场。</p><p className="text-xs text-stone-400 mb-3 ml-10"><strong className="text-emerald-600">{r}</strong> 个可练 · {so} 个待建 · {ar} 个已归档</p>
        <div className="flex gap-1 mb-3 flex-wrap">{['all','对下管理','跨部门协作','拿结果','向上管理','绩效面谈'].map(tab=>(<button key={tab} onClick={()=>setActiveTab(tab)} className={`px-3 py-1.5 rounded-full border text-xs transition-all ${activeTab===tab?'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold':'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>{tab==='all'?'全部':tab}</button>))}</div>
        <div className="flex items-center gap-1.5 mb-3 flex-wrap text-xs"><span className="text-stone-400 font-semibold">难度</span>{['all','入门','进阶','挑战'].map(v=>(<button key={v} onClick={()=>setDiffFilter(v)} className={`px-3 py-1 rounded-full border transition-all ${diffFilter===v?'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold':'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>{v==='all'?'全部':v}</button>))}<span className="w-px h-4 bg-stone-200 mx-1"/><span className="text-stone-400 font-semibold">条线</span>{['all','营销','工程','综合'].map(v=>(<button key={v} onClick={()=>setProfFilter(v)} className={`px-3 py-1 rounded-full border transition-all ${profFilter===v?'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold':'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>{v==='all'?'全部':v}</button>))}<span className="w-px h-4 bg-stone-200 mx-1"/><button onClick={()=>setReadyOnly(!readyOnly)} className={`px-3 py-1 rounded-full border transition-all ${readyOnly?'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold':'border-stone-200 text-stone-500 hover:border-emerald-400'}`}>{readyOnly?'仅可练 ✓':'仅可练'}</button><span onClick={()=>setShowAssessment(true)} className="text-emerald-600 font-medium cursor-pointer ml-auto">先测再练 →</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{filtered.map(s=><SceneCard key={s.id} scene={s} onClick={()=>go(s.id)}/>)}{filtered.length===0&&<div className="col-span-full text-center py-10 text-stone-400 text-sm">没有匹配的场景，试试调整筛选条件</div>}</div></section>
      {/* 业务陪练 */}
      <section className="mt-8"><div className="flex items-center gap-2.5 mb-1"><span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-base">💼</span><h2 className="text-lg font-bold text-stone-700">业务陪练</h2><Badge className="bg-stone-100 text-stone-400 border-0 text-xs">上传话术 · 自动生成</Badge></div><p className="text-sm text-stone-500 mb-2 ml-10">把你的产品手册或话术模板上传，AI 自动生成练习场景。练的是你自己的真实任务、真实场景，练完就能用。</p><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{['📞 销售场景 · 话术训练','🎧 客服场景 · 投诉处理','📋 自定义场景'].map((l,i)=>(<div key={i} onClick={()=>toast.info('业务陪练模块建设中')} className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-300 transition-all flex flex-col items-center gap-2"><span className="text-2xl opacity-40">{l.charAt(0)}</span><span className="text-sm text-stone-500">{l.slice(2)}</span><span className="text-xs text-stone-400">{i<2?'上传模板 → AI生成':'自建模板上传'}</span></div>))}</div></section>
      {/* AI生成 */}
      <section className="mt-8"><div onClick={()=>navigate('/scenario/generate')} className="cursor-pointer rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 p-5 flex items-center gap-4 hover:border-emerald-400 hover:shadow-md transition-all"><div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0"><Wand2 className="w-5 h-5 text-emerald-600"/></div><div className="flex-1"><h3 className="text-base font-semibold text-stone-800">AI 智能生成场景</h3><p className="text-sm text-stone-500 mt-0.5">根据你的维度评估，AI 为你定制专属陪练场景</p></div><span className="text-sm text-emerald-600 font-medium shrink-0">去看看 →</span></div></section>
    </div>
    {showAssessment&&<AssessmentModal onClose={()=>setShowAssessment(false)}/>}
  </div>);
};

export default CoachingPage;
