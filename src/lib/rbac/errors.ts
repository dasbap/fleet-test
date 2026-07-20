import type { Permission, PlatformRole } from '@/types/rbac';

/** Erreur levée lors d'un refus RBAC côté service. */
export class RbacError extends Error {
  readonly code: 'RBAC_DENIED' | 'RBAC_ROLE_DENIED' | 'NO_FLEET_ACCESS' | 'UNAUTHENTICATED';

  constructor(
    message: string,
    code: RbacError['code'] = 'RBAC_DENIED',
    readonly permission?: Permission,
    readonly role?: PlatformRole | null,
  ) {
    super(message);
    this.name = 'RbacError';
    this.code = code;
  }
}
