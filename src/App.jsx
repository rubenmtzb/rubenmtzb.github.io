import './App.css'
import About from './components/About'
import Contact from './components/Contact'
import Experience from './components/Experience'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Navbar from './components/Navbar'
import Projects from './components/Projects'
import TechStack from './components/TechStack'

export default function App() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#030712] font-mono text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 z-0 grid-move opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 255, 136, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(0,255,136,0.08),transparent)]" />

      <Navbar />
      <main className="relative z-10">
        <Hero />
        <About />
        <TechStack />
        <Experience />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
