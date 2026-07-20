import type { Mission } from "@/types/mission";

/**
 * Service missions — prêt pour branchement repository / API.
 * Aucun appel Supabase ici tant que la couche données n’est pas définie.
 */
export class MissionService {
  async listForFleet(_fleetId: string): Promise<Mission[]> {
    return [];
  }
}
