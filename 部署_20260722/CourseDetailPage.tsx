import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, ArrowLeft } from 'lucide-react';
import { COURSE_DATA, DIFF_CN, DIFF_STYLE } from './CoachingPage';

const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const course = COURSE_DATA.find(c => c.id === courseId);

  if (!course) return <div className="p-10 text-center text-stone-400">课程不存在</div>;

  return (
    <div className="w-full bg-stone-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6">
          <ArrowLeft className="w-4 h-4" />返回
        </button>
        <h1 className="text-2xl font-bold text-stone-700 mb-1">{course.name}</h1>
        <p className="text-stone-500 mb-2">{course.desc}</p>
        <div className="flex gap-1 mb-8">
          <Badge className="bg-emerald-50 text-emerald-600 border-0 text-xs">{course.mod}</Badge>
          <Badge className="bg-stone-100 text-stone-500 border-0 text-xs">{course.tag}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {course.scenes.map(s => (
            <div key={s.id} className="bg-white rounded-xl p-4 border border-stone-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                {s.status === 'ready' ? <span className="text-emerald-500">✅</span> : <span className="text-orange-400">🔜</span>}
                <span className="text-sm font-semibold text-stone-700">{s.name}</span>
              </div>
              <Badge className={`border-0 text-xs ${DIFF_STYLE[s.diff]||'bg-stone-100 text-stone-500'}`}>{DIFF_CN[s.diff]||s.diff}</Badge>
              <div className="mt-3">
                {s.status === 'ready' ? (
                  <Button className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold" size="sm" onClick={() => navigate('/tg001/prepare')}>
                    <Play className="w-3 h-3 fill-white mr-1" />开始练习
                  </Button>
                ) : (
                  <Button className="w-full h-9 rounded-xl" variant="outline" size="sm" disabled>即将上线</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
