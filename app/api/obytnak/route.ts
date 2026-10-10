// Čtení rozpočtu obytňáku ze Siesta Base (REST API). Klíč zůstává na serveru.
// Přístup chrání proxy.ts (nepřihlášený je přesměrován na /login).
import { NextResponse } from 'next/server'
import { mapMilnik, mapPolozka } from '@/lib/obytnak'

export const dynamic = 'force-dynamic'

const API = 'https://base.siesta.ai/api/v1'

async function nacti(entity: string) {
  const r = await fetch(`${API}/${entity}`, {
    headers: {
      'X-API-Key': process.env.BASE_API_KEY!,
      'X-Tenant-Id': process.env.BASE_TENANT_ID!,
      'X-Base-Id': process.env.BASE_BASE_ID!,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`Base ${entity}: HTTP ${r.status}`)
  const j = await r.json() as { data?: { id: string; fields: Record<string, unknown> }[] }
  return j.data ?? []
}

export async function GET() {
  if (!process.env.BASE_API_KEY || !process.env.BASE_TENANT_ID || !process.env.BASE_BASE_ID) {
    return NextResponse.json({ error: 'Base není nastavená (chybí BASE_API_KEY / BASE_TENANT_ID / BASE_BASE_ID).' }, { status: 503 })
  }
  try {
    const [m, p] = await Promise.all([nacti('milnik'), nacti('polozka_rozpoctu')])
    return NextResponse.json({ milniky: m.map(mapMilnik), polozky: p.map(mapPolozka) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
