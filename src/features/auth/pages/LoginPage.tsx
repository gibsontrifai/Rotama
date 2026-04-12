import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuthStore } from '../../../shared/store/useAuthStore'

const loginSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginInput = z.infer<typeof loginSchema>
type ShiftMode = 'day' | 'night'
type ShiftPreference = 'auto' | ShiftMode
const SHIFT_PREFERENCE_KEY = 'safetyhub-shift-preference'
const MIN_SIGNIN_LOADING_MS = 900

function getInitialShiftMode(): ShiftMode {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? 'day' : 'night'
}

function getInitialShiftPreference(): ShiftPreference {
  if (typeof window === 'undefined') {
    return 'auto'
  }

  const storedPreference = window.localStorage.getItem(SHIFT_PREFERENCE_KEY)
  if (storedPreference === 'day' || storedPreference === 'night' || storedPreference === 'auto') {
    return storedPreference
  }

  return 'auto'
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)
  const [logoSrc, setLogoSrc] = useState('/gea.jpg')
  const [shiftPreference, setShiftPreference] = useState<ShiftPreference>(() => getInitialShiftPreference())
  const [clockTick, setClockTick] = useState(0)
  const login = useAuthStore((state) => state.login)

  const shiftMode = shiftPreference === 'auto' ? getInitialShiftMode() : shiftPreference
  const isNight = shiftMode === 'night'

  useEffect(() => {
    window.localStorage.setItem(SHIFT_PREFERENCE_KEY, shiftPreference)
  }, [shiftPreference])

  useEffect(() => {
    if (shiftPreference !== 'auto') {
      return
    }

    const intervalId = window.setInterval(() => {
      // Trigger rerender each minute so auto mode follows shift schedule seamlessly.
      setClockTick((prev) => prev + 1)
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [shiftPreference])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      setAuthError(null)
      await Promise.all([
        login(data),
        new Promise((resolve) => {
          window.setTimeout(resolve, MIN_SIGNIN_LOADING_MS)
        }),
      ])

      const redirect = searchParams.get('redirect') || '/dashboard'
      navigate(redirect, { replace: true })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal login')
    }
  }

  return (
    <section
      data-shift-tick={clockTick}
      className={[
        'relative min-h-screen overflow-hidden px-4 py-8 md:px-8 md:py-12',
        isNight
          ? 'bg-[linear-gradient(132deg,#041320_0%,#0b2b3d_36%,#15435e_68%,#1f6f78_100%)]'
          : 'bg-[linear-gradient(132deg,#0a3a52_0%,#0f766e_40%,#22c55e_72%,#84cc16_100%)]',
      ].join(' ')}
    >
      <div
        className={[
          'pointer-events-none absolute inset-0',
          isNight
            ? 'bg-[radial-gradient(circle_at_14%_18%,rgba(34,197,94,0.35),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(56,189,248,0.28),transparent_30%),radial-gradient(circle_at_72%_84%,rgba(250,204,21,0.2),transparent_34%)]'
            : 'bg-[radial-gradient(circle_at_14%_18%,rgba(16,185,129,0.34),transparent_32%),radial-gradient(circle_at_86%_16%,rgba(14,165,233,0.24),transparent_30%),radial-gradient(circle_at_72%_84%,rgba(253,224,71,0.24),transparent_32%)]',
        ].join(' ')}
      />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(203,213,225,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(203,213,225,0.2)_1px,transparent_1px)] [background-size:34px_34px]" />

      <div
        className={[
          'relative mx-auto w-full max-w-6xl overflow-hidden rounded-[30px] border bg-white/10 shadow-2xl backdrop-blur-sm',
          isNight ? 'border-cyan-100/30' : 'border-emerald-100/40',
        ].join(' ')}
      >
        <div className="grid lg:grid-cols-[1fr_0.92fr]">
          <aside
            className={[
              'relative overflow-hidden p-6 text-slate-100 md:p-9',
              isNight
                ? 'bg-[linear-gradient(145deg,rgba(5,23,38,0.9)_0%,rgba(8,47,73,0.84)_52%,rgba(14,116,144,0.78)_100%)]'
                : 'bg-[linear-gradient(145deg,rgba(6,46,59,0.84)_0%,rgba(13,117,104,0.82)_52%,rgba(34,197,94,0.76)_100%)]',
            ].join(' ')}
          >
            <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-cyan-200/20 blur-2xl" />
            <div className="pointer-events-none absolute -right-14 top-0 h-44 w-44 rounded-full bg-emerald-200/20 blur-2xl" />

            <div className="mb-4 inline-flex items-center rounded-2xl border border-cyan-100/20 bg-white/10 p-2.5">
              <img
                src={logoSrc}
                alt="Company logo"
                className="h-11 w-11 rounded-lg object-contain"
                onError={() => {
                  setLogoSrc('/gea.jpg')
                }}
              />
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">SafetyHub Plant Portal</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
              Satu Platform Untuk Operasi K3 Perusahaan
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200/90">
              Pantau kepatuhan SOP, incident handling, dan action plan K3 secara real-time untuk setiap area kerja.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-900/35 p-4">
              <svg viewBox="0 0 440 220" role="img" aria-label="Ilustrasi animasi petugas K3" className="h-48 w-full">
                <defs>
                  <linearGradient id="k3Floor" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#164e63" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                  <linearGradient id="k3Vest" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="k3Helmet" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                  <linearGradient id="k3SkinShade" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fed7aa" />
                    <stop offset="100%" stopColor="#fdba74" />
                  </linearGradient>
                  <linearGradient id="k3Glove" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                  <linearGradient id="k3Screen" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>

                <rect x="0" y="176" width="440" height="44" fill="url(#k3Floor)" opacity="0.86" />
                <rect x="24" y="188" width="394" height="8" rx="4" fill="#0b2234" opacity="0.78" />

                <g opacity="0.32">
                  <rect x="22" y="54" width="164" height="8" rx="4" fill="#93c5fd" />
                  <circle cx="46" cy="72" r="8" fill="#67e8f9" />
                  <circle cx="78" cy="72" r="8" fill="#67e8f9" />
                  <circle cx="110" cy="72" r="8" fill="#67e8f9" />
                  <circle cx="142" cy="72" r="8" fill="#67e8f9" />
                  <circle cx="174" cy="72" r="8" fill="#67e8f9" />
                </g>

                <g opacity="0.38">
                  <rect x="332" y="136" width="52" height="14" rx="4" fill="#1e293b" />
                  <rect x="370" y="124" width="18" height="16" rx="3" fill="#334155" />
                  <rect x="354" y="128" width="12" height="8" rx="2" fill="#93c5fd" />
                  <circle cx="344" cy="154" r="7" fill="#0f172a" />
                  <circle cx="378" cy="154" r="7" fill="#0f172a" />
                  <circle cx="344" cy="154" r="3" fill="#64748b" />
                  <circle cx="378" cy="154" r="3" fill="#64748b" />
                </g>

                <g opacity="0.2">
                  <rect x="228" y="44" width="6" height="60" fill="#bae6fd" />
                  <rect x="244" y="44" width="6" height="60" fill="#bae6fd" />
                  <rect x="228" y="44" width="22" height="6" fill="#bae6fd" />
                </g>

                <g className="k3-bob" style={{ transformOrigin: '82px 152px', animationDelay: '0.8s' }}>
                  <ellipse cx="84" cy="183" rx="34" ry="8" fill="#0b2234" opacity="0.58" />

                  <rect x="56" y="140" width="55" height="26" rx="12" fill="#e2e8f0" opacity="0.8" />
                  <rect x="74" y="130" width="22" height="20" rx="8" fill="#0ea5e9" />

                  <circle cx="85" cy="112" r="15" fill="url(#k3SkinShade)" />
                  <path d="M70 111a16 12 0 0 1 30 0v4H70z" fill="url(#k3Helmet)" />
                  <rect x="75" y="112" width="20" height="4" rx="2" fill="#ca8a04" />

                  <rect x="70" y="126" width="30" height="30" rx="8" fill="#38bdf8" />
                  <rect x="80" y="126" width="7" height="30" fill="#e0f2fe" opacity="0.75" />

                  <rect x="61" y="130" width="10" height="24" rx="5" fill="url(#k3SkinShade)" />
                  <rect x="99" y="130" width="10" height="24" rx="5" fill="url(#k3SkinShade)" />
                  <rect x="56" y="145" width="10" height="8" rx="4" fill="url(#k3Glove)" />
                  <rect x="104" y="145" width="10" height="8" rx="4" fill="url(#k3Glove)" />

                  <rect x="88" y="141" width="19" height="15" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <line x1="92" y1="146" x2="103" y2="146" stroke="#0f766e" strokeWidth="1.5" />
                  <line x1="92" y1="150" x2="101" y2="150" stroke="#0f766e" strokeWidth="1.5" />

                  <rect x="74" y="156" width="10" height="25" rx="5" fill="#1e293b" />
                  <rect x="87" y="156" width="10" height="25" rx="5" fill="#1e293b" />
                  <rect x="72" y="178" width="14" height="6" rx="3" fill="#475569" />
                  <rect x="85" y="178" width="14" height="6" rx="3" fill="#475569" />
                </g>

                <g className="k3-bob" style={{ transformOrigin: '160px 130px' }}>
                  <ellipse cx="162" cy="182" rx="52" ry="10" fill="#0b2234" opacity="0.68" />
                  <circle cx="161" cy="72" r="23" fill="url(#k3SkinShade)" />
                  <ellipse cx="161" cy="82" rx="10" ry="5" fill="#fca5a5" opacity="0.45" />
                  <path d="M136 71a25 21 0 0 1 50 0v5h-50z" fill="url(#k3Helmet)" />
                  <rect x="143" y="71" width="36" height="6" rx="3" fill="#ca8a04" />
                  <rect x="149" y="76" width="8" height="3" rx="1.5" fill="#ffffff" opacity="0.35" />
                  <rect x="165" y="76" width="8" height="3" rx="1.5" fill="#ffffff" opacity="0.35" />

                  <g>
                    <rect x="147" y="67" width="11" height="6" rx="3" fill="#0c4a6e" opacity="0.8" />
                    <rect x="164" y="67" width="11" height="6" rx="3" fill="#0c4a6e" opacity="0.8" />
                    <rect x="158" y="69" width="6" height="2" rx="1" fill="#93c5fd" opacity="0.8" />
                  </g>

                  <rect x="132" y="98" width="58" height="64" rx="14" fill="url(#k3Vest)" />
                  <rect x="156" y="98" width="10" height="64" fill="#fff" opacity="0.74" />
                  <rect x="134" y="100" width="54" height="8" rx="4" fill="#ffffff" opacity="0.18" />
                  <rect x="132" y="120" width="58" height="8" fill="#334155" opacity="0.3" />

                  <g className="k3-wave" style={{ transformOrigin: '122px 116px' }}>
                    <rect x="112" y="106" width="20" height="45" rx="10" fill="url(#k3SkinShade)" />
                    <rect x="102" y="130" width="18" height="12" rx="6" fill="url(#k3Glove)" />
                    <rect x="112" y="118" width="20" height="5" rx="2.5" fill="#f1f5f9" opacity="0.5" />
                  </g>

                  <rect x="190" y="106" width="20" height="45" rx="10" fill="url(#k3SkinShade)" />
                  <rect x="200" y="130" width="18" height="12" rx="6" fill="url(#k3Glove)" />
                  <rect x="190" y="118" width="20" height="5" rx="2.5" fill="#f1f5f9" opacity="0.45" />

                  <rect x="145" y="134" width="32" height="14" rx="6" fill="#0f172a" opacity="0.22" />

                  <rect x="138" y="161" width="18" height="31" rx="8" fill="#1e293b" />
                  <rect x="166" y="161" width="18" height="31" rx="8" fill="#1e293b" />
                  <rect x="135" y="188" width="23" height="8" rx="4" fill="#475569" />
                  <rect x="163" y="188" width="23" height="8" rx="4" fill="#475569" />
                </g>

                <g>
                  <rect x="260" y="68" width="146" height="94" rx="10" fill="#0b2234" stroke="#67e8f9" strokeWidth="2" />
                  <rect x="272" y="80" width="122" height="60" rx="7" fill="url(#k3Screen)" opacity="0.22" />
                  <rect x="274" y="82" width="118" height="56" rx="6" fill="#082f49" />
                  <path d="M286 128l18-13 15 8 20-20 13 11 19-22 11 9" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="319" cy="97" r="6" fill="#facc15" className="k3-blink" />
                  <rect x="286" y="92" width="40" height="6" rx="3" fill="#93c5fd" opacity="0.35" />
                  <rect x="302" y="152" width="62" height="8" rx="4" fill="#1e293b" />
                </g>
              </svg>
            </div>

            <div className="mt-7 rounded-xl border border-amber-200/45 bg-[repeating-linear-gradient(135deg,rgba(251,191,36,0.22),rgba(251,191,36,0.22)_10px,rgba(15,23,42,0)_10px,rgba(15,23,42,0)_20px)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
              Shift A is active • Line 2 under close monitoring
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-cyan-100/20 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-300">Plant Status</p>
                <p className="mt-2 text-xl font-semibold text-emerald-200">Normal</p>
              </article>
              <article className="rounded-2xl border border-cyan-100/20 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-300">Open CAPA</p>
                <p className="mt-2 text-xl font-semibold text-cyan-200">11 Items</p>
              </article>
              <article className="rounded-2xl border border-cyan-100/20 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-300">TRIR (Monthly)</p>
                <p className="mt-2 text-xl font-semibold text-amber-200">0.42</p>
              </article>
            </div>
          </aside>

          <div
            className={[
              'border-t p-6 md:p-9 lg:border-l lg:border-t-0',
              isNight ? 'border-cyan-100/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(240,249,255,0.95)_100%)]' : 'border-emerald-100/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(240,253,250,0.96)_100%)]',
            ].join(' ')}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={logoSrc}
                  alt="Company logo"
                  className="h-7 w-7 rounded-md object-contain"
                  onError={() => {
                    setLogoSrc('/gea.jpg')
                  }}
                />
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">Secure Access</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShiftPreference((prev) => {
                      if (prev === 'auto') {
                        return 'day'
                      }

                      if (prev === 'day') {
                        return 'night'
                      }

                      return 'auto'
                    })
                  }}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  {shiftPreference === 'auto' ? `Shift Auto (${isNight ? 'Malam' : 'Siang'})` : shiftPreference === 'night' ? 'Shift Malam' : 'Shift Siang'}
                </button>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">ISO 45001</span>
              </div>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Hai, selamat datang kembali</h1>
            <p className="mt-2 text-sm text-slate-600">Masuk dengan akun internal perusahaan untuk melanjutkan.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Employee ID / Username</span>
                <input
                  {...register('username')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none ring-sky-200 transition placeholder:text-slate-400 focus:border-sky-400 focus:ring"
                  placeholder="misal: prod.Gibson"
                  autoComplete="username"
                />
                {errors.username ? <p className="text-xs text-rose-700">{errors.username.message}</p> : null}
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  {...register('password')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none ring-sky-200 transition placeholder:text-slate-400 focus:border-sky-400 focus:ring"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                />
                {errors.password ? <p className="text-xs text-rose-700">{errors.password.message}</p> : null}
              </label>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600" defaultChecked />
                  Ingat perangkat ini
                </label>
                <button type="button" className="font-semibold text-sky-700 hover:text-sky-800">
                  Lupa kata sandi?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[linear-gradient(92deg,#0f172a_0%,#0f766e_48%,#22c55e_100%)] px-4 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:brightness-105 disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In To Dashboard'}
              </button>

              {authError ? <p className="text-sm text-rose-700">{authError}</p> : null}

              <p className="pt-1 text-xs text-slate-500">
                Authorized personnel only. Aktivitas login tercatat untuk audit keamanan internal.
              </p>
            </form>
          </div>
        </div>
      </div>

      {isSubmitting ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
          <div className="w-[92%] max-w-md rounded-2xl border border-cyan-100/30 bg-slate-900/90 p-5 text-slate-100 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-cyan-100/25 bg-white/10 p-2">
                <img
                  src={logoSrc}
                  alt="Company logo"
                  className="h-8 w-8 object-contain"
                  onError={() => {
                    setLogoSrc('/gea.jpg')
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">SafetyHub</p>
                <p className="text-xs text-slate-300">Redirecting to operational dashboard</p>
              </div>
            </div>

            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-700/70">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#34d399_45%,#facc15_100%)]" />
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="font-semibold">Memproses Login</p>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-amber-300 [animation-delay:240ms]" />
              </div>
            </div>

            <p className="mt-1 text-xs text-slate-300">
              Validasi kredensial dan inisialisasi data K3 sedang berjalan...
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
