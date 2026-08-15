const MAX_MINUTES = 5 * 5 * 8 * 60 // 5 tydnu strop

export function parseEstimate(input: string): number | null {
  const s = input.trim().replace(',', '.')
  if (!s) return null
  let totalMinutes = 0
  let rest = s
  while (rest.length > 0) {
    rest = rest.trim()
    if (!rest) break
    const m = rest.match(/^(\d+(?:\.\d+)?)\s*([wWdDhHmM]?)/)
    if (!m) throw new Error(`Neznamy format: "${rest}"`)
    const num = parseFloat(m[1])
    const unit = m[2].toLowerCase()
    rest = rest.slice(m[0].length)
    if (unit === 'w') totalMinutes += num * 5 * 8 * 60
    else if (unit === 'd') totalMinutes += num * 8 * 60
    else if (unit === 'h' || unit === '') totalMinutes += num * 60
    else if (unit === 'm') totalMinutes += num
  }
  const result = Math.round(totalMinutes)
  if (result > MAX_MINUTES) throw new Error('Odhad je prilis velky (max 5 tydnu)')
  return result || null
}

export function formatEstimate(minutes: number | null): string {
  if (!minutes) return ''
  let r = minutes
  const d = Math.floor(r / 480); r -= d * 480
  const h = Math.floor(r / 60); r -= h * 60
  const m = r
  return ([d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}m` : ''] as string[]).filter(Boolean).join(' ')
}
