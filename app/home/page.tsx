'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

const Tile = ({ onClick, title, subtitle, rotate, image, imageAlt, imageClass }: {
  onClick: () => void, title: string, subtitle: string, rotate: number,
  image: string, imageAlt: string, imageClass?: string
}) => (
  <button onClick={onClick}
    className="paper-card border text-left block w-full p-8 md:p-10 hover:-translate-y-1 transition-transform"
    style={{borderColor: '#e0e0e0', transform: `rotate(${rotate}deg)`}}>
    <h2 className="font-hand" style={{fontSize: '2.5rem', color: 'hsl(25 30% 15%)'}}>{title}</h2>
    <p className="font-notes mt-2" style={{color: 'hsl(25 15% 40%)', fontSize: '1rem'}}>{subtitle}</p>
    <img src={image} alt={imageAlt} className={`mt-6 w-full object-contain ${imageClass ?? 'h-40 md:h-48'}`} />
    <div className="font-hand mt-4" style={{fontSize: '1.3rem', color: 'hsl(145 25% 30%)'}}>otevřít →</div>
  </button>
)

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-16">
        <h2 className="font-hand" style={{fontSize: '3rem', color: 'hsl(25 30% 15%)'}}>
          Místa, která jsme spolu objevili
        </h2>
        <p className="font-notes mt-3 max-w-2xl" style={{color: 'hsl(25 15% 40%)', fontSize: '1.1rem'}}>
          Momentky, které tvoří náš příběh — hory, voda, lezení, koncerty a kilometry v obytňáku.
        </p>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 mt-12 md:mt-16">
          <Tile
            onClick={() => router.push('/map')}
            title="Mapa našich vzpomínek"
            subtitle="Místa, kde jsme společně byli — od českých skal po Dolomity."
            rotate={-1.2}
            image="/map-illustration.png"
            imageAlt="Ilustrace mapy"
            imageClass="h-52 md:h-60"
          />
          <Tile
            onClick={() => router.push('/timeline')}
            title="Časová osa zážitků"
            subtitle="Náš příběh chronologicky — kapitola po kapitole."
            rotate={1.2}
            image="/timeline-illustration.png"
            imageAlt="Ilustrace časové osy"
            imageClass="h-64 md:h-72"
          />
        </div>

        <div className="mt-16 text-center font-notes" style={{color: 'hsl(25 15% 40%)'}}>
          brzy přidáme další kapitoly
        </div>
      </main>
    </div>
  )
}
