import { ArrowLeft, Languages, PhoneCall, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import './App.css'
import { content, type LanguageKey } from './content'

function App() {
  const [language, setLanguage] = useState<LanguageKey>('en')
  const [mode, setMode] = useState<'entry' | 'talk'>('entry')
  const copy = content[language]

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Talk language controls">
        <div className="brand-mark">
          <span className="pulse-dot" aria-hidden="true" />
          <span>TheFamilyDoctor.AI</span>
        </div>
        <div className="language-toggle" aria-label={copy.languageLabel}>
          <Languages size={18} aria-hidden="true" />
          {Object.values(content).map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === language ? 'active' : ''}
              aria-pressed={item.key === language}
              onClick={() => setLanguage(item.key)}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>
      </header>

      {mode === 'entry' ? (
        <section className="entry-screen" aria-labelledby="entry-title">
          <div className="entry-copy">
            <p className="eyebrow">{copy.entry.eyebrow}</p>
            <h1 id="entry-title">{copy.entry.title}</h1>
            <p className="intro">{copy.entry.subtitle}</p>
          </div>

          <div className="entry-actions">
            <button
              type="button"
              className="primary-action"
              onClick={() => setMode('talk')}
            >
              <PhoneCall size={22} aria-hidden="true" />
              {copy.entry.cta}
            </button>
            <div className="privacy-strip">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>{copy.entry.privacy}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="talk-placeholder" aria-labelledby="talk-title">
          <button
            type="button"
            className="ghost-action"
            onClick={() => setMode('entry')}
            aria-label={copy.talk.back}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <div className="avatar-standin" aria-hidden="true">
            <span />
          </div>
          <div className="placeholder-copy">
            <p className="eyebrow">{copy.talk.eyebrow}</p>
            <h2 id="talk-title">{copy.talk.title}</h2>
            <p>{copy.talk.body}</p>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
