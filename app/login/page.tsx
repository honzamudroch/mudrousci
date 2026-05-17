'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Zkus to ještě jednou, prosím.')
      setLoading(false)
    } else {
      router.push('/home')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12" style={{background: '#ffffff'}}>
      {/* Dekorativní obrázky */}
      <img src="/01_paragliding_transparent.png" alt="" aria-hidden
        className="pointer-events-none select-none absolute opacity-80"
        style={{left: '50%', top: '20px', width: '166px', transform: 'translateX(-50%) rotate(-3deg)', zIndex: 5}} />
      <img src="/02_paddleboard_woman_transparent.png" alt="" aria-hidden
        className="pointer-events-none select-none absolute opacity-80"
        style={{left: '420px', bottom: '18%', width: '165px', transform: 'rotate(6deg)', zIndex: 5}} />
      <img src="/03_via_ferrata_transparent.png" alt="" aria-hidden
        className="pointer-events-none select-none absolute opacity-80"
        style={{right: 'calc(50% + 200px)', top: '38%', width: '143px', transform: 'rotate(-8deg)', zIndex: 5}} />
      <img src="/04_cycling_woman_transparent.png" alt="" aria-hidden
        className="pointer-events-none select-none absolute opacity-80"
        style={{left: 'calc(50% + 260px)', top: '38%', width: '157px', transform: 'rotate(7deg)', zIndex: 5}} />
      <img src="/09_tent_campfire_transparent.png" alt="" aria-hidden
        className="pointer-events-none select-none absolute opacity-80"
        style={{right: '750px', bottom: '8%', width: '166px', transform: 'rotate(-6deg)', zIndex: 5}} />
      <img src="/11_van_scene_transparent.png" alt="" aria-hidden
        className="pointer-events-none select-none absolute opacity-80"
        style={{right: '400px', top: '35%', width: '162px', transform: 'rotate(5deg)', zIndex: 5}} />

      {/* Polaroid vlevo */}
      <div className="polaroid hidden lg:block absolute" style={{top: '20%', left: '460px', width: '265px', transform: 'rotate(-5deg)', zIndex: 10}}>
        <img src="/IMG_8882.jpg" style={{height: '178px', width: '100%', objectFit: 'cover', borderRadius: '2px', display: 'block'}} alt="" />
        <p className="font-notes text-xs text-center mt-2" style={{color: 'hsl(25 15% 40%)'}}>Spolu v horách</p>
      </div>

      {/* Polaroid vpravo nahoře */}
      <div className="polaroid hidden lg:block absolute" style={{top: '5%', right: '550px', width: '265px', transform: 'rotate(4deg)', zIndex: 10}}>
        <img src="/IMG_3236.jpg" style={{height: '178px', width: '100%', objectFit: 'cover', borderRadius: '2px', display: 'block'}} alt="" />
        <p className="font-notes text-xs text-center mt-2" style={{color: 'hsl(25 15% 40%)'}}>Liška Eliška</p>
      </div>

      {/* Polaroid vpravo dole */}
      <div className="polaroid hidden lg:block absolute" style={{bottom: '12%', right: '400px', width: '265px', transform: 'rotate(-3deg)', zIndex: 10}}>
        <img src="/IMG_8829.jpg" style={{height: '178px', width: '100%', objectFit: 'cover', borderRadius: '2px', display: 'block'}} alt="" />
        <p className="font-notes text-xs text-center mt-2" style={{color: 'hsl(25 15% 40%)'}}>Poprvé ve Švýcarsku</p>
      </div>

      <form onSubmit={handleLogin} className="paper-card border w-full max-w-md px-8 py-10 md:px-12 md:py-12"
        style={{borderColor: '#e0e0e0', transform: 'rotate(-0.4deg)'}}>

        <h1 className="font-hand text-center leading-none" style={{fontSize: '3.5rem', color: 'hsl(25 30% 15%)'}}>
          Naše cesta ...
        </h1>
        <p className="font-notes text-center mt-3" style={{color: 'hsl(25 15% 40%)', fontSize: '1.1rem'}}>
          Vítej na naší společné cestě
        </p>

        <label className="block mt-6">
          <span className="font-notes text-sm" style={{color: 'hsl(25 30% 15% / 0.7)'}}>e-mail</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full bg-transparent outline-none py-2 font-notes text-lg"
            style={{borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(50, 36, 27, 0.4)'}}
            placeholder="honza@nasecesta.cz" required suppressHydrationWarning />
        </label>

        <label className="block mt-5">
          <span className="font-notes text-sm" style={{color: 'hsl(25 30% 15% / 0.7)'}}>heslo</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="mt-1 w-full bg-transparent outline-none py-2 font-notes text-lg"
            style={{borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(50, 36, 27, 0.4)'}}
            suppressHydrationWarning
            placeholder="••••••••" required />
        </label>

        {error && <p className="mt-3 font-notes text-sm" style={{color: 'hsl(0 70% 45%)'}}>{error}</p>}

        <button type="submit" disabled={loading}
          className="mt-8 w-full font-hand text-2xl py-3 rounded-md transition-colors"
          style={{background: 'hsl(25 30% 15%)', color: 'hsl(40 35% 95%)'}}>
          {loading ? 'Přihlašuji...' : 'Vstoupit →'}
        </button>

        <p className="mt-6 text-center font-notes text-xs" style={{color: 'hsl(25 15% 40%)'}}>
          soukromé místo jen pro nás dva
        </p>
      </form>
    </div>
  )
}
