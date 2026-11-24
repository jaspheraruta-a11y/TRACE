import type { AppRole } from '@/lib/supabase/database.types'
import { ROLE_LABELS } from '@/lib/roles'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'

const ROLE_VARIANTS: Record<AppRole, BadgeVariant> = {
  administrator: 'brand',
  registrar: 'neutral',
  digitization_staff: 'outline',
}

export function RoleBadge({ role }: { role: AppRole | null | undefined }) {
  if (!role) {
    return <Badge variant="danger">No role assigned</Badge>
  }

  return <Badge variant={ROLE_VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>
}
