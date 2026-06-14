import {
  ProspectDemoRepository,
  type ProspectStatusRpcResult,
} from "@/repositories/prospect-demo.repository";

export type { ProspectStatusRpcResult };

/**
 * Service compte prospect démo.
 */
export class ProspectDemoService {
  constructor(private repository: ProspectDemoRepository) {}

  async getStatus(): Promise<ProspectStatusRpcResult> {
    return this.repository.getStatus();
  }
}
