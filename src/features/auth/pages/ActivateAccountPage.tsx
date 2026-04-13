import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { activateAccountApi } from '../api/authApi'

type ActivationStatus = 'loading' | 'success' | 'error'

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<ActivationStatus>('loading')
  const [message, setMessage] = useState('Memproses aktivasi akun...')

  useEffect(() => {
    let ignore = false

    const run = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Token aktivasi tidak ditemukan.')
        return
      }

      setStatus('loading')
      setMessage('Memproses aktivasi akun...')

      try {
        const successMessage = await activateAccountApi(token)
        if (ignore) {
          return
        }

        setStatus('success')
        setMessage(successMessage)
      } catch (error) {
        if (ignore) {
          return
        }

        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Aktivasi akun gagal.')
      }
    }

    void run()

    return () => {
      ignore = true
    }
  }, [token])

  const tone = useMemo(() => {
    if (status === 'success') {
      return {
        badge: 'bg-emerald-100 text-emerald-700',
        card: 'border-emerald-200 bg-emerald-50/70',
        title: 'Aktivasi Berhasil',
      }
    }

    if (status === 'error') {
      return {
        badge: 'bg-rose-100 text-rose-700',
        card: 'border-rose-200 bg-rose-50/70',
        title: 'Aktivasi Gagal',
      }
    }

    return {
      badge: 'bg-sky-100 text-sky-700',
      card: 'border-sky-200 bg-sky-50/70',
      title: 'Aktivasi Akun',
    }
  }, [status])

  return (
    <section className="relative min-h-screen overflow-hidden bg-[linear-gradient(140deg,#e2e8f0_0%,#ccfbf1_45%,#ecfccb_100%)] px-4 py-8 md:px-8 md:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(16,185,129,0.26),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(14,165,233,0.24),transparent_30%),radial-gradient(circle_at_70%_86%,rgba(250,204,21,0.2),transparent_34%)]" />

      <div className="relative mx-auto flex min-h-[80vh] w-full max-w-2xl items-center justify-center">
        <article className={["w-full rounded-3xl border p-6 shadow-xl backdrop-blur-sm md:p-9", tone.card].join(' ')}>
          <span className={["inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase", tone.badge].join(' ')}>
            SafetyHub
          </span>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">{tone.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-700">{message}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Ke Halaman Login
            </Link>
            {status !== 'loading' ? (
              <span className="text-xs text-slate-500">Jika masih ada kendala, hubungi administrator SafetyHub.</span>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  )
}
