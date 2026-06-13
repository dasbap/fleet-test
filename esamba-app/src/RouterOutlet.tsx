import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

/** Contenu principal — remplacer par les routes dashboard. */
export default function RouterOutlet() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>E-Samba</h1>
          <p>
            Éditez <code>src/App.tsx</code> et branchez vos écrans dashboard.
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((value) => value + 1)}
        >
          Count is {count}
        </button>
      </section>
    </>
  )
}
