export interface EventType {
  id: string
  label: string
  color: string
  image: string         // ikona pro mapu (pin)
  timelineImage: string // ikona pro časovou osu + detail
  iconPadding?: number  // padding pro vizuální normalizaci velikosti na timeline (px)
  mapIconSize?: number  // velikost ikonky v map pinu (default 22)
}

export const EVENT_TYPES: EventType[] = [
  {
    id: 'rande',
    label: 'Rande',
    color: '#e85d75',
    image: '/transparent_rande_icon.png',
    timelineImage: '/transparent_rande_icon.png',
    mapIconSize: 18,
  },
  {
    id: 'kamaradi',
    label: 'Kamarádi',
    color: '#9b59b6',
    image: '/transparent_kamaradi_icon.png',
    timelineImage: '/transparent_kamaradi_icon.png',
    iconPadding: 32,
    mapIconSize: 14,
  },
  {
    id: 'obytnak',
    label: 'Obytňák',
    color: '#e8932a',
    image: '/11_van_scene_transparent.png',
    timelineImage: '/11_van_scene_transparent.png',
  },
  {
    id: 'hory',
    label: 'Hory',
    color: '#3a8c5c',
    image: '/lezeni.png',
    timelineImage: '/03_via_ferrata_transparent.png',
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: '#2980b9',
    image: '/kultura.png',
    timelineImage: '/kultura.png',
    iconPadding: -8,
  },
  {
    id: 'cestovani',
    label: 'Cestování',
    color: '#16a085',
    image: '/06_trekking_backpack_transparent.png',
    timelineImage: '/06_trekking_backpack_transparent.png',
  },
]

export const getType = (id: string) => EVENT_TYPES.find(t => t.id === id) ?? EVENT_TYPES[0]

// HTML marker pro Mapbox
export const createMarkerHTML = (typeId: string, count = 1): string => {
  const type = getType(typeId)
  if (count > 1) {
    return `
      <div style="position:relative;width:48px;height:56px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
        <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 2C13.5 2 5 10.5 5 21C5 37 24 54 24 54C24 54 43 37 43 21C43 10.5 34.5 2 24 2Z" fill="${type.color}" stroke="white" stroke-width="2"/>
        </svg>
        <div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);color:white;font-size:15px;font-weight:700;">${count}</div>
      </div>
    `
  }
  return `
    <div style="position:relative;width:44px;height:52px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
      <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 2C12.5 2 5 9.5 5 19C5 33 22 50 22 50C22 50 39 33 39 19C39 9.5 31.5 2 22 2Z" fill="${type.color}" stroke="white" stroke-width="2"/>
        <circle cx="22" cy="19" r="11" fill="white"/>
      </svg>
      <img src="${type.image}" style="position:absolute;top:${8 + (22 - (type.mapIconSize ?? 22)) / 2}px;left:${11 + (22 - (type.mapIconSize ?? 22)) / 2}px;width:${type.mapIconSize ?? 22}px;height:${type.mapIconSize ?? 22}px;object-fit:contain;mix-blend-mode:multiply;" />
    </div>
  `
}
