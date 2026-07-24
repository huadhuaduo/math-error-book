import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Zap } from 'lucide-react';
import { getTeamMotivationScenes } from '@client/src/api/team-motivation';
import type { TMSceneListItem } from '@shared/coaching-team-motivation';

const DIFFICULTY_STYLES: Record<string, string> = {
  '中等': 'bg-teal-50 text-teal-700 border-teal-200',
  '中高': 'bg-amber-50 text-amber-700 border-amber-200',
  '高': 'bg-rose-50 text-rose-700 border-rose-200',
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const TeamMotivationSection: React.FC = () => {
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<TMSceneListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeamMotivationScenes()
      .then((res) => setScenes(res.items ?? []))
      .catch(() => setScenes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap className="size-5 text-amber-500" />
          <h2 className="text-xl font-semibold text-stone-800">
            团队激励专区
          </h2>
        </div>
        <p className="text-sm text-stone-500 ml-7">
          基于 D-P-F 决策模型，掌握诊断士气根源、匹配激励策略的实战能力
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-stone-200 bg-white animate-pulse h-72"
            />
          ))}
        </div>
      ) : scenes.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">
          暂无团队激励场景
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {scenes.map((scene) => (
            <motion.div
              key={scene.id}
              variants={cardVariants}
              className="group rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() =>
                navigate(
                  scene.id === 'tm_tg001'
                    ? '/tg001/prepare'
                    : `/coaching/team-motivation/${scene.id}`,
                )
              }
            >
              <div className="relative h-36 overflow-hidden">
                <img
                  src={scene.coverImg}
                  alt={scene.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DIFFICULTY_STYLES[scene.difficulty] ?? 'bg-stone-100 text-stone-600 border-stone-200'}`}
                  >
                    {scene.difficulty}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-2">
                  <TrendingUp className="size-3" />
                  <span>{scene.dVector?.D1_士气根源 ?? '士气诊断'}</span>
                </div>
                <h3 className="text-base font-semibold text-stone-800 mb-1.5 leading-snug">
                  {scene.title}
                </h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    <Clock className="size-3" />
                    {scene.estimatedDurationMin}分钟
                  </span>
                  <span className="text-xs font-medium text-teal-600 group-hover:text-teal-700 transition-colors">
                    开始练习 →
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
};

export default TeamMotivationSection;
