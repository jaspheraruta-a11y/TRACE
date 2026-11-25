import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Archive,
  ArrowRight,
  Eye,
  EyeOff,
  FileSearch,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { FullPageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { describeAuthError } from '@/lib/auth-errors'
import { supabase, supabaseConfig } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginValues = z.infer<typeof loginSchema>

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Find incomplete details',
    description:
      'Search by partial names, approximate years, subjects, or locator codes.',
  },
  {
    icon: MapPin,
    title: 'Locate the original',
    description:
      'Follow a structured code from cabinet to shelf, box, and folder.',
  },
  {
    icon: ShieldCheck,
    title: 'Protect the record',
    description:
      'Role-based access, private scans, and an accountable audit trail.',
  },
]

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { status, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const state = location.state as { from?: unknown } | null
  const requestedPath =
    typeof state?.from === 'string' ? state.from : '/dashboard'
  const from =
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    requestedPath !== '/login'
      ? requestedPath
      : '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (session) {
      navigate(from, { replace: true })
    }
  }, [session, from, navigate])

  if (status === 'initializing') {
    return <FullPageLoader label="Checking your session" />
  }

  async function onSubmit(values: LoginValues) {
    if (!supabase) return

    setFormError(null)
    setIsSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setFormError(describeAuthError(error.message))
      setIsSubmitting(false)
      return
    }

    // Sign-in events are written server-side with the actor taken from the
    // authenticated session. A failure here must never block the sign-in.
    void supabase
      .rpc('record_sign_in')
      .then(({ error: auditError }) => {
        if (auditError) {
          console.warn('Unable to record the sign-in event:', auditError.message)
        }
      })

    navigate(from, { replace: true })
  }

  return (
    <div className="grid min-h-svh bg-slate-100 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 bg-archive-grid opacity-70"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-40 -left-24 size-[28rem] rounded-full bg-brand-700/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 bg-gradient-to-tl from-brand-500/10 to-transparent"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Archive className="size-5 text-brand-100" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-semibold tracking-[0.24em]">
              TRACE
            </span>
            <span className="block text-[10px] font-medium tracking-wide text-slate-400">
              Registrar Archive
            </span>
          </span>
        </div>

        <div className="relative max-w-lg py-14">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-brand-200 uppercase">
            <span className="size-1.5 rounded-full bg-brand-300" aria-hidden="true" />
            Internal archival system
          </p>
          <h1 className="text-[42px] leading-[1.08] font-semibold tracking-[-0.03em] text-white xl:text-[48px]">
            Every record
            <br />
            has a place.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-300">
            TRACE brings decades of Junior High School student records into a
            single searchable archive — and keeps the path back to every
            physical original.
          </p>

          <dl className="mt-10 space-y-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-brand-200">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="text-sm font-medium text-white">
                      {feature.title}
                    </dt>
                    <dd className="mt-0.5 max-w-sm text-xs leading-relaxed text-slate-400">
                      {feature.description}
                    </dd>
                  </div>
                </div>
              )
            })}
          </dl>
        </div>

        <div className="relative border-t border-white/10 pt-5 text-xs text-slate-400">
          <p className="font-medium text-slate-300">
            Junior High School Registrar&apos;s Office
          </p>
          <p className="mt-1">
            Authorized personnel only · Activity is recorded for accountability
          </p>
        </div>
      </section>

      <section className="flex min-h-svh flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-950 text-white">
            <Archive className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.24em] text-brand-950">
              TRACE
            </span>
            <span className="block text-[10px] text-slate-500">
              Registrar Archive
            </span>
          </span>
        </div>

        <div className="w-full max-w-[420px] animate-rise">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-brand-600 uppercase">
              Registrar&apos;s Office
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Sign in to TRACE
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Use the staff account issued by your administrator.
            </p>

            {!supabaseConfig.isConfigured ? (
              <Alert
                variant="warning"
                title="Supabase is not configured"
                className="mt-6"
              >
                <p>
                  Create a <code className="font-mono text-xs">.env.local</code>{' '}
                  file with your project URL and anon key, then restart the
                  development server. See{' '}
                  <code className="font-mono text-xs">README.md</code> for the
                  exact variables.
                </p>
              </Alert>
            ) : null}

            {formError ? (
              <Alert variant="danger" className="mt-6">
                {formError}
              </Alert>
            ) : null}

            <form
              className="mt-6 space-y-5"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <FormField
                id="email"
                label="Email address"
                error={errors.email?.message}
                required
              >
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@school.edu.ph"
                    className="pl-9"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email ? 'email-error' : undefined
                    }
                    disabled={!supabaseConfig.isConfigured || isSubmitting}
                    {...register('email')}
                  />
                </div>
              </FormField>

              <FormField
                id="password"
                label="Password"
                error={errors.password?.message}
                required
              >
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="pr-10 pl-9"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? 'password-error' : undefined
                    }
                    disabled={!supabaseConfig.isConfigured || isSubmitting}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showPassword}
                    disabled={!supabaseConfig.isConfigured}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormField>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                disabled={!supabaseConfig.isConfigured}
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
                {!isSubmitting ? (
                  <ArrowRight className="size-4" aria-hidden="true" />
                ) : null}
              </Button>
            </form>

            <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200 ring-inset">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              <p>
                TRACE is an internal system. Accounts are provisioned by an
                administrator — there is no public sign-up or alumni portal.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-[11px] text-slate-400">
            <span>TRACE v1.0.0 · Archive system</span>
            <span>Secured by Supabase Auth</span>
          </div>
        </div>
      </section>
    </div>
  )
}
