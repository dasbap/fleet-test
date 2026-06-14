import {
  DemoSessionRepository,
  type DemoUpsertSessionResult,
} from "@/repositories/demo-session.repository";

export type { DemoUpsertSessionResult };

/**
 * Service session démo — encapsule les appels RPC.
 */
export class DemoSessionService {
  constructor(private repository: DemoSessionRepository) {}

  async upsertSession(userAgent?: string | null): Promise<DemoUpsertSessionResult> {
    return this.repository.upsertSession(userAgent);
  }
}
