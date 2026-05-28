import { useMemo } from 'react'
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Presell Creator</CardTitle>
          <CardDescription>Acesse o painel administrativo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                placeholder="admin"
                {...register('username')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
