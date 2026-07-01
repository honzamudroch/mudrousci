import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://mudrousci.vercel.app' : 'http://localhost:3000'))
  // Smaž všechny Supabase session cookies
  response.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.delete(cookie.name)
    }
  })
  // Explicitně smaž hlavní auth cookie
  response.cookies.set('sb-wutrwgtghwfxhxfbiinc-auth-token', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb-wutrwgtghwfxhxfbiinc-auth-token-code-verifier', '', { maxAge: 0, path: '/' })
  return response
}
