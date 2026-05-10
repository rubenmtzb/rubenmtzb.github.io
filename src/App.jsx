import { lazy, Suspense } from 'react'
import './App.css'
import Hero from './components/Hero'
import Navbar from './components/Navbar'

const About = lazy(() => import('./components/About'))
const TechStack = lazy(() => import('./components/TechStack'))
const Experience = lazy(() => import('./components/Experience'))
const Education = lazy(() => import('./components/Education'))
const Projects = lazy(() => import('./components/Projects'))
const Research = lazy(() => import('./components/Research'))
const Certifications = lazy(() => import('./components/Certifications'))
const ResumeSection = lazy(() => import('./components/ResumeSection'))
const Contact = lazy(() => import('./components/Contact'))
const Blog = lazy(() => import('./components/Blog'))
const Testimonials = lazy(() => import('./components/Testimonials'))
const Footer = lazy(() => import('./components/Footer'))

export default function App() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#030712] font-mono text-slate-100">
      {/* Global grid background */}
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
        <Suspense fallback={null}>
          <About />
          <TechStack />
          <Experience />
          <Education />
          <Projects />
          <Research />
          <Certifications />
          <ResumeSection />
          <Contact />

          {/* Secondary sections — coming soon */}
          <div className="relative py-8">
            <div className="mx-auto flex max-w-md items-center gap-4 px-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
              <span className="text-xs uppercase tracking-[0.35em] text-green-500/40">coming soon</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-green-500/30 to-transparent" />
            </div>
          </div>
          <Blog />
          <Testimonials />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  )
}
