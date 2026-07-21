import { DemoRequestRepository } from "@/repositories/demo-request.repository";

export interface SubmitDemoRequestInput {
  name: string;
  email: string;
  company?: string;
  phone: string;
  companyIdentifier: string;
  countryCode: string;
}

const CENTRAL_AFRICA_COUNTRY_CODES = new Set(["CM", "CF", "TD", "CG", "GA", "GQ"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Logique métier des demandes de démo publiques.
 */
export class DemoRequestService {
  constructor(private repository: DemoRequestRepository) {}

  async submitRequest(input: SubmitDemoRequestInput): Promise<void> {
    const fullName = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    const company = input.company?.trim() ?? "";
    const companyIdentifier = input.companyIdentifier.trim();
    const countryCode = input.countryCode.trim().toUpperCase();

    if (!fullName) {
      throw new Error("Le nom est requis.");
    }

    if (!EMAIL_PATTERN.test(email)) {
      throw new Error("Une adresse email valide est requise.");
    }

    if (!phone) {
      throw new Error("Le numéro de téléphone est requis.");
    }

    if (!companyIdentifier) {
      throw new Error("Le numéro d'identifiant entreprise est requis.");
    }

    if (!CENTRAL_AFRICA_COUNTRY_CODES.has(countryCode)) {
      throw new Error("Sélectionnez un pays d'Afrique centrale.");
    }

    await this.repository.create({
      full_name: fullName,
      email,
      company: company || null,
      phone,
      company_identifier: companyIdentifier,
      country_code: countryCode,
    });
  }
}
