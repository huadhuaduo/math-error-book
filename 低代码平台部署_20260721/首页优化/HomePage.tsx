import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, User, LogOut, Layers, Shield, Menu, X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/coaching', label: '全部场景' },
  { path: '/practice', label: '实战应用' },
  { path: '/dashboard', label: '成长轨迹' },
];

const HomePageNav: React.FC = () => {
  const userInfo = useCurrentUserProfile();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const dataloom = await getDataloom() as unknown as { service: { session: { signOut: () => Promise<void> } } };
    await dataloom.service.session.signOut();
    window.location.reload();
  };

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4"
        style={{ backgroundColor: 'rgba(11, 61, 46, 0.3)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-wide">AI 陪练</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link key={item.path} to={item.path}
                className="text-white/80 hover:text-white text-sm font-medium transition-colors relative group">
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-300 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin-login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-white text-sm font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">管理员</span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10">
                  <User className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium max-w-20 truncate">
                    {userInfo.name || '用户'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/15 bg-white/8 text-white">
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed top-[72px] left-0 right-0 z-40 md:hidden px-6 py-4"
          style={{ backgroundColor: 'rgba(11, 61, 46, 0.95)', backdropFilter: 'blur(16px)' }}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)}
              className="block py-3 text-white/80 hover:text-white text-sm font-medium border-b border-white/5 last:border-0">
              {item.label}
            </Link>
          ))}
        </motion.div>
      )}
    </>
  );
};

const HomePage: React.FC = () => {
  return (
    <>
      <HomePageNav />

      <section className="relative w-full h-screen flex flex-col overflow-hidden">
        {/* Merged background: gradient + 3 radial glows */}
        <div className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(circle at 20% 15%, rgba(255,255,255,0.04) 0%, transparent 55%),
              radial-gradient(circle at 80% 75%, rgba(52,211,153,0.06) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 50%),
              linear-gradient(160deg, #0B3D2E 0%, #0F5240 30%, #147A5F 60%, #1BA37E 100%)
            `
          }}
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            {/* Title row */}
            <div className="flex items-baseline gap-4 md:gap-8">
              <span className="hidden md:block text-xs text-white/20 tracking-[0.3em] uppercase font-light">AI Coaching</span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="text-5xl md:text-7xl font-bold text-white tracking-tight"
              >
                AI陪练实战平台
              </motion.h1>
              <span className="hidden md:block text-xs text-white/20 tracking-[0.3em] uppercase font-light">Evolution</span>
            </div>

            {/* CTA – simplified: no Button asChild wrapper */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link to="/coaching"
                className="inline-flex items-center gap-2 mt-12 px-10 py-5 rounded-full
                           bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40
                           text-base font-medium text-white backdrop-blur-sm transition-all duration-300 group">
                点击进入
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Slogan – animation directly on p */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="mt-10 text-base md:text-lg text-white/50 tracking-[0.3em] font-light"
            >
              每一次对话，都是蜕变的开始
            </motion.p>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
