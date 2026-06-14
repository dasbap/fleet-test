import { DemoRequestRepository } from "@/repositories/demo-request.repository";

export interface SubmitDemoRequestInput {
  name: string;
  company?: string;
  phone: string;
  fleetSize?: string;
}

/**
 * Logique métier des demandes de démo publiques.
 */
export class DemoRequestService {
  constructor(private repository: DemoRequestRepository) {}

  async submitRequest(input: SubmitDemoRequestInput): Promise<void> {
    const fullName = input.name.trim();
    const phone = input.phone.trim();
    const company = input.company?.trim() ?? "";

    if (!fullName) {
      throw new Error("Le nom est requis.");
    }

    if (!phone) {
      throw new Error("Le numéro de téléphone est requis.");
    }

    let fleetSize: number | null = null;
    if (input.fleetSize?.trim()) {
      const parsed = Number.parseInt(input.fleetSize.trim(), 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error("La taille de flotte doit être un nombre positif.");
      }
      fleetSize = parsed;
    }

    await this.repository.create({
      full_name: fullName,
      company: company || null,
      phone,
      fleet_size: fleetSize,
    });
  }
}
