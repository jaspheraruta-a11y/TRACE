import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Select } from '@/components/ui/Select'
import { APP_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/roles'
import type { AppRole } from '@/lib/supabase/database.types'

interface ChangeRoleDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (role: AppRole) => void
  staffName: string
  currentRole: AppRole
  isLoading?: boolean
}

export function ChangeRoleDialog({
  open,
  onClose,
  onConfirm,
  staffName,
  currentRole,
  isLoading = false,
}: ChangeRoleDialogProps) {
  const [role, setRole] = useState<AppRole>(currentRole)

  const unchanged = role === currentRole

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change staff role"
      description={`Assign a new role to ${staffName}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(role)}
            disabled={unchanged || isLoading}
            isLoading={isLoading}
            leftIcon={<ShieldCheck className="size-4" aria-hidden="true" />}
          >
            Save role
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Current role</span>
          <RoleBadge role={currentRole} />
        </div>

        <FormField
          id="role-change"
          label="New role"
          required
          hint={ROLE_DESCRIPTIONS[role]}
        >
          <Select
            id="role-change"
            value={role}
            onChange={(event) => setRole(event.target.value as AppRole)}
          >
            {APP_ROLES.map((option) => (
              <option key={option} value={option} disabled={option === currentRole}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </Select>
        </FormField>

        <p className="text-xs leading-relaxed text-slate-500">
          Role changes are written to the audit trail and take effect on the
          next profile refresh.
        </p>
      </div>
    </Dialog>
  )
}
