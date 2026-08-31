import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_ADMIN, creerJeton, estAdmin, motDePasseValide, optionsCookie } from '@/lib/admin-auth'

export async function GET() {
  return NextResponse.json({ authenticated: await estAdmin() })
}

export async function POST(req: NextRequest) {
  let password: unknown
  try {
    const corps = await req.json()
    password = corps?.password
  } catch {
    return NextResponse.json({ error: 'Requete invalide' }, { status: 400 })
  }

  if (!motDePasseValide(password)) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const jeton = creerJeton()
  if (!jeton) {
    // Secret de signature absent : on refuse la connexion plutot que de poser un
    // cookie non signe, qui serait exactement le defaut que ce module corrige.
    console.error('[admin-auth] connexion refusee : ADMIN_SESSION_SECRET non configuree.')
    return NextResponse.json({ error: 'Configuration serveur incomplete' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_ADMIN, jeton, optionsCookie())
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_ADMIN, '', optionsCookie(0))
  return res
}
