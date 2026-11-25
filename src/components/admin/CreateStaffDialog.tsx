import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { APP_ROLES, ROLE_LABELS } from '@/lib/roles'
import { describeStaffError } from '@/lib/staff-errors'
import { supabase } from '@/lib/supabase/client'

const createStaffSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter the staff member’s full name')
      .max(160, 'Full name is too long'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .max(320, 'Email is too long'),
    role: z.enum(['administrator', 'registrar', 'digitization_staff'], {
      message: 'Select a role',
    }),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm the temporary password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'The passwords do not match',
    path: ['confirmPassword'],
  })

type CreateStaffValues = z.infer<typeof createStaffSchema>

interface CreateStaffDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateStaffDialog({
  open,
  onClose,
  onCreated,
}: CreateStaffDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'digitization_staff',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: CreateStaffValues) => {
    if (!supabase) {
      setSubmitError('Supabase is not configured.')
      return
    }

    setSubmitError(null)
    const { error } = await supabase.rpc('create_staff_account', {
      p_email: values.email,
      p_full_name: values.fullName,
      p_role: values.role,
      p_password: values.password,
    })

    if (error) {
      setSubmitError(describeStaffError(error.message))
      return
    }

    toast.success('Staff account created. Activate it to grant access.')
    reset()
    onCreated()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add staff account"
      description="Creates the Supabase user and a TRACE profile. New accounts start inactive."
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-staff-form"
            isLoading={isSubmitting}
            leftIcon={<UserPlus className="size-4" aria-hidden="true" />}
          >
            Create account
          </Button>
        </>
      }
    >
      <form
        id="create-staff-form"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event)
        }}
        className="space-y-4"
        noValidate
      >
        {submitError ? (
          <Alert variant="danger" title="Account not created">
            {submitError}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="create-fullName"
            label="Full name"
            required
            error={errors.fullName?.message}
          >
            <Input
              id="create-fullName"
              autoComplete="name"
              placeholder="Maria Santos"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={
                errors.fullName ? 'create-fullName-error' : undefined
              }
              {...register('fullName')}
            />
          </FormField>

          <FormField
            id="create-email"
            label="Staff email"
            required
            error={errors.email?.message}
          >
            <Input
              id="create-email"
              type="email"
              autoComplete="off"
              placeholder="registrar@school.edu.ph"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'create-email-error' : undefined}
              {...register('email')}
            />
          </FormField>
        </div>

        <FormField
          id="create-role"
          label="Role"
          required
          hint="Administrator, Registrar, or Digitization Staff. New accounts start inactive."
          error={errors.role?.message}
        >
          <Select
            id="create-role"
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? 'create-role-error' : undefined}
            {...register('role')}
          >
            {APP_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="create-password"
            label="Temporary password"
            required
            hint="At least 8 characters. Share it securely with the staff member."
            error={errors.password?.message}
          >
            <div className="relative">
              <Input
                id="create-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'create-password-error' : undefined
                }
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </FormField>

          <FormField
            id="create-confirmPassword"
            label="Confirm password"
            required
            error={errors.confirmPassword?.message}
          >
            <Input
              id="create-confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword
                  ? 'create-confirmPassword-error'
                  : undefined
              }
              {...register('confirmPassword')}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  )
}
