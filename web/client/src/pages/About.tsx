import logoIcon from '@/assets/icons/logo.svg'

export function About() {
  const version = 'v1.0.0'

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col items-center justify-center p-6 md:p-12 relative">
      {/* About Card */}
      <section className="w-full max-w-2xl bg-[#131b2e]/60 backdrop-blur-[40px] rounded-3xl p-10 border border-white/5 flex flex-col items-center text-center" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
        {/* Logo */}
        <div className="mb-8 relative">
          <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-tr from-[#131b2e] to-[#0b1326] border border-white/10 flex items-center justify-center shadow-xl mx-auto mb-5" style={{boxShadow:'inset 0.5px 0.5px 0 0 rgba(255,255,255,0.1)'}}>
            <img src={logoIcon} alt="FreeAI-Gateway" className="w-20 h-20" />
          </div>
          <h1 className="text-4xl font-light tracking-tighter text-cyan-400 font-headline">FreeAI-Gateway</h1>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Version</span>
            <span className="text-sm font-medium text-white">{version}</span>
          </div>
        </div>

        {/* 检查更新按钮 */}
        <button className="group relative px-8 py-3.5 bg-cyan-400 text-[#0b1326] font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-400/20 mb-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]" style={{fontFamily:'Material Symbols Outlined'}}>system_update</span>
            <span>检查更新</span>
          </div>
        </button>

        {/* 链接网格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-10">
          <a
            href="https://github.com/xiaoY233/Chat2API"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-400/30 transition-all duration-300 flex flex-col items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-[#1e2740] flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-400/10 transition-colors">
              <span className="material-symbols-outlined" style={{fontFamily:'Material Symbols Outlined'}}>code</span>
            </div>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">GitHub 代码仓库</span>
          </a>
          <a
            href="#"
            className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-400/30 transition-all duration-300 flex flex-col items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-[#1e2740] flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-400/10 transition-colors">
              <span className="material-symbols-outlined" style={{fontFamily:'Material Symbols Outlined'}}>description</span>
            </div>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">文档中心</span>
          </a>
          <a
            href="https://github.com/xiaoY233/Chat2API/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-400/30 transition-all duration-300 flex flex-col items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-[#1e2740] flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-400/10 transition-colors">
              <span className="material-symbols-outlined" style={{fontFamily:'Material Symbols Outlined'}}>chat_bubble</span>
            </div>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">反馈问题</span>
          </a>
        </div>

        {/* 分隔线 */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* 底部版权 */}
        <div className="space-y-2 text-center">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#bcc9cd] uppercase">
            由{' '}
            <a
              href="https://github.com/xiaoY233/Chat2API"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >Chat2API</a>
            {' '}改版而来
          </p>
          <p className="text-xs text-[#869397] max-w-lg mx-auto leading-relaxed">
            基于 React、TypeScript、Tailwind CSS、Zustand、Express 等优秀的开源项目构建。
          </p>
          <p className="text-[10px] text-[#869397] font-mono">
            © {new Date().getFullYear()} FreeAI-Gateway • GPL-3.0 License
          </p>
        </div>
      </section>
    </div>
  )
}

export default About
