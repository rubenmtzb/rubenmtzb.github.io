import './App.css'

const PARTICLES = [
  { top: '15%', left: '8%',  size: 6,  dur: '2.8s', delay: '0s' },
  { top: '25%', left: '92%', size: 4,  dur: '3.5s', delay: '0.6s' },
  { top: '70%', left: '5%',  size: 8,  dur: '2.2s', delay: '1.1s' },
  { top: '80%', left: '88%', size: 5,  dur: '3.1s', delay: '0.3s' },
  { top: '45%', left: '3%',  size: 3,  dur: '4s',   delay: '1.8s' },
  { top: '55%', left: '95%', size: 7,  dur: '2.6s', delay: '0.9s' },
  { top: '10%', left: '50%', size: 4,  dur: '3.8s', delay: '0.4s' },
  { top: '90%', left: '45%', size: 5,  dur: '2.4s', delay: '1.4s' },
]

const STATUS_LINES = [
  { label: 'SYSTEM',   value: 'INITIALIZING...',      color: 'text-green-400' },
  { label: 'STATUS',   value: 'UNDER CONSTRUCTION',   color: 'text-yellow-400' },
  { label: 'AI_CORE',  value: 'ACTIVE ██████████ 98%', color: 'text-cyan-400' },
  { label: 'ETA',      value: 'LOADING...',            color: 'text-purple-400' },
]

export default function App() {
  return (
    <div className="relative min-h-screen w-full bg-[#030712] overflow-hidden flex items-center justify-center font-mono">

      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-20 grid-move"
        style={{
          backgroundImage: 'linear-gradient(#00ff8822 1px, transparent 1px), linear-gradient(90deg, #00ff8822 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,#00ff8811,transparent)]" />

      {/* Scanline */}
      <div
        className="scanline-anim absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-400/60 to-transparent pointer-events-none z-20"
        style={{ top: 0 }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="particle absolute rounded-full bg-green-400/60"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            '--dur': p.dur,
            '--delay': p.delay,
          }}
        />
      ))}

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 text-green-500/40 text-xs select-none">
        [ RMB_PORTFOLIO v0.1.0 ]
      </div>
      <div className="absolute top-4 right-4 text-green-500/40 text-xs select-none">
        [ AI_INSTANCE::ACTIVE ]
      </div>
      <div className="absolute bottom-4 left-4 text-green-500/30 text-xs select-none">
        &gt; UPTIME: ∞
      </div>
      <div className="absolute bottom-4 right-4 text-green-500/30 text-xs select-none">
        &gt; BUILD: PENDING
      </div>

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 py-12 max-w-2xl w-full">

        {/* Excavator + title block */}
        <div className="flex flex-col items-center gap-4">
          {/* Excavator emoji animated */}
          <div className="excavator-anim text-6xl select-none" aria-hidden="true">
            🏗️
          </div>

          {/* Glitch title */}
          <div className="relative text-center dig-text-anim">
            <h1
              className="glitch-layer text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-widest uppercase text-white text-glow-green"
              data-text="WORK IN PROGRESS"
            >
              WORK IN PROGRESS
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-green-400/70 text-sm sm:text-base tracking-[0.3em] uppercase fade-up" style={{ '--delay': '0.3s' }}>
            Something awesome is being built
          </p>
        </div>

        {/* Terminal status block */}
        <div
          className="w-full border border-green-500/30 rounded-lg bg-black/50 backdrop-blur-sm p-5 glow-pulse fade-up"
          style={{ '--delay': '0.5s' }}
        >
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-500/20">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-green-400/50 text-xs tracking-widest">TERMINAL — portfolio.init</span>
          </div>

          <div className="space-y-2 text-sm">
            {STATUS_LINES.map((line, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-green-500/60 w-16 shrink-0">{line.label}</span>
                <span className="text-green-500/40 shrink-0">::</span>
                <span className={line.color}>{line.value}</span>
              </div>
            ))}
            <div className="flex gap-3 mt-4 pt-3 border-t border-green-500/20">
              <span className="text-green-400">&gt;</span>
              <span className="text-green-300">portfolio.build --mode=full --stack=react,tailwind</span>
              <span className="blink-anim text-green-400 ml-1">▌</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full fade-up" style={{ '--delay': '0.7s' }}>
          <div className="flex justify-between text-xs text-green-500/50 mb-1 tracking-widest">
            <span>PROGRESS</span>
            <span>LOADING...</span>
          </div>
          <div className="w-full h-2 bg-green-900/30 rounded-full overflow-hidden border border-green-500/20">
            <div
              className="h-full bg-gradient-to-r from-green-600 via-cyan-400 to-green-400 rounded-full"
              style={{ width: '18%', boxShadow: '0 0 10px #00ff88' }}
            />
          </div>
        </div>

        {/* Tag line */}
        <p className="text-green-400/40 text-xs tracking-[0.25em] uppercase text-center fade-up" style={{ '--delay': '0.9s' }}>
          rubenmtzb.github.io — Stay tuned
        </p>
      </div>
    </div>
  )
}
