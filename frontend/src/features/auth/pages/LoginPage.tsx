import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { useAuth } from '@/features/auth/use-auth.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

type LoginFields = z.infer<typeof loginSchema>

type LocationState = {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

function getRedirectTarget(state: LocationState | null) {
  const pathname = state?.from?.pathname || '/'
  const search = state?.from?.search || ''
  const hash = state?.from?.hash || ''
  return `${pathname}${search}${hash}`
}

export function LoginPage() {
  useDocumentTitle('Sign in')

  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = useMemo(
    () => getRedirectTarget((location.state as LocationState | null) ?? null),
    [location.state],
  )

  const {
    register,
    handleSubmit,
    resetField,
    formState: { isSubmitting },
  } = useForm<LoginFields>({ resolver: zodResolver(loginSchema) })

  if (auth.status === 'authenticated') {
    return <Navigate replace to={redirectTo} />
  }

  async function onSubmit(data: LoginFields) {
    try {
      await auth.login(data)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      resetField('password')
      toast.error(err instanceof Error ? err.message : 'Falha ao autenticar.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50 p-4">
      <Card className="w-full max-w-sm border-slate-200 bg-white shadow-lg">
        <CardHeader className="space-y-2 pb-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Presell Creator
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Acesse o painel administrativo
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-900">
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Digite seu usuário"
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                {...register('username')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-900">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Autenticando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  )
}
