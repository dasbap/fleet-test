import { supabase } from "@/integrations/supabase/client";

export const CEMAC_COUNTRIES = [
  { code: "CM", label: "Cameroun" },
  { code: "CF", label: "République centrafricaine" },
  { code: "TD", label: "Tchad" },
  { code: "CG", label: "Congo" },
  { code: "GA", label: "Gabon" },
  { code: "GQ", label: "Guinée équatoriale" },
] as const;

export type CemacCountryCode = (typeof CEMAC_COUNTRIES)[number]["code"];
export type IdentityDocumentType = "national_id" | "passport" | "residence_permit";

export interface DriverLegalProfile {
  user_id: string;
  birth_date: string;
  birth_place: string;
  nationality_country: string;
  residence_country: string;
  address: string;
  identity_document_type: IdentityDocumentType;
  identity_document_number: string;
  identity_issued_at: string;
  identity_expires_at: string | null;
  identity_document_path: string;
  driving_license_number: string;
  driving_license_categories: string[];
  driving_license_issued_at: string;
  driving_license_expires_at: string;
  driving_license_country: string;
  driving_license_document_path: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  updated_at: string;
}

export interface DriverLegalProfileInput {
  birth_date: string;
  birth_place: string;
  nationality_country: string;
  residence_country: string;
  address: string;
  identity_document_type: IdentityDocumentType;
  identity_document_number: string;
  identity_issued_at: string;
  identity_expires_at?: string;
  driving_license_number: string;
  driving_license_categories: string[];
  driving_license_issued_at: string;
  driving_license_expires_at: string;
  driving_license_country: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface VehicleLegalDocumentsInput {
  country_code: string;
  registration_certificate_number: string;
  insurer_name: string;
  insurance_policy_number: string;
  insurance_issued_at: string;
  insurance_expires_at: string;
  technical_inspection_number: string;
  technical_inspection_issued_at: string;
  technical_inspection_expires_at: string;
  road_tax_reference?: string;
  road_tax_expires_at?: string;
  transport_license_number?: string;
  transport_license_expires_at?: string;
}

function extensionFor(file: File): string {
  const byName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (byName) return byName.slice(0, 8);
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function assertSupportedFile(file: File): void {
  const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) {
    throw new Error("Format non accepté. Utilisez PDF, JPG, PNG ou WEBP.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Chaque document doit faire au maximum 10 Mo.");
  }
}

async function uploadLegalDocument(prefix: string, kind: string, file: File): Promise<string> {
  assertSupportedFile(file);
  const path = `${prefix}/${kind}-${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from("legal-documents").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return path;
}

export class LegalComplianceService {
  async getDriverProfile(userId: string): Promise<DriverLegalProfile | null> {
    const { data, error } = await supabase
      .from("driver_legal_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as DriverLegalProfile | null;
  }

  async isDriverCompliant(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_driver_legally_compliant", {
      p_driver_user_id: userId,
    });
    if (error) throw new Error(error.message);
    return data === true;
  }

  async saveDriverProfile(params: {
    userId: string;
    input: DriverLegalProfileInput;
    identityFile?: File | null;
    drivingLicenseFile?: File | null;
  }): Promise<DriverLegalProfile> {
    const existing = await this.getDriverProfile(params.userId);
    const identityPath = params.identityFile
      ? await uploadLegalDocument(`drivers/${params.userId}`, "identity", params.identityFile)
      : existing?.identity_document_path;
    const licensePath = params.drivingLicenseFile
      ? await uploadLegalDocument(`drivers/${params.userId}`, "driving-license", params.drivingLicenseFile)
      : existing?.driving_license_document_path;

    if (!identityPath || !licensePath) {
      throw new Error("La pièce d'identité et le permis de conduire sont obligatoires.");
    }

    const payload = {
      user_id: params.userId,
      birth_date: params.input.birth_date,
      birth_place: params.input.birth_place.trim(),
      nationality_country: params.input.nationality_country.toUpperCase(),
      residence_country: params.input.residence_country.toUpperCase(),
      address: params.input.address.trim(),
      identity_document_type: params.input.identity_document_type,
      identity_document_number: params.input.identity_document_number.trim().toUpperCase(),
      identity_issued_at: params.input.identity_issued_at,
      identity_expires_at: params.input.identity_expires_at || null,
      identity_document_path: identityPath,
      driving_license_number: params.input.driving_license_number.trim().toUpperCase(),
      driving_license_categories: params.input.driving_license_categories.map((value) => value.trim().toUpperCase()).filter(Boolean),
      driving_license_issued_at: params.input.driving_license_issued_at,
      driving_license_expires_at: params.input.driving_license_expires_at,
      driving_license_country: params.input.driving_license_country.toUpperCase(),
      driving_license_document_path: licensePath,
      emergency_contact_name: params.input.emergency_contact_name?.trim() || null,
      emergency_contact_phone: params.input.emergency_contact_phone?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("driver_legal_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as DriverLegalProfile;
  }

  async isVehicleCompliant(vehicleId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_vehicle_legally_compliant", {
      p_vehicle_id: vehicleId,
    });
    if (error) throw new Error(error.message);
    return data === true;
  }

  async saveVehicleDocuments(params: {
    fleetId: string;
    vehicleId: string;
    input: VehicleLegalDocumentsInput;
    registrationCertificateFile: File;
    insuranceFile: File;
    technicalInspectionFile: File;
  }): Promise<void> {
    const prefix = `vehicles/${params.fleetId}/${params.vehicleId}`;
    const uploaded: string[] = [];
    try {
      const registrationPath = await uploadLegalDocument(prefix, "registration-certificate", params.registrationCertificateFile);
      uploaded.push(registrationPath);
      const insurancePath = await uploadLegalDocument(prefix, "insurance", params.insuranceFile);
      uploaded.push(insurancePath);
      const inspectionPath = await uploadLegalDocument(prefix, "technical-inspection", params.technicalInspectionFile);
      uploaded.push(inspectionPath);

      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase.from("vehicle_legal_documents").upsert({
        vehicle_id: params.vehicleId,
        country_code: params.input.country_code.toUpperCase(),
        registration_certificate_number: params.input.registration_certificate_number.trim().toUpperCase(),
        registration_certificate_path: registrationPath,
        insurer_name: params.input.insurer_name.trim(),
        insurance_policy_number: params.input.insurance_policy_number.trim().toUpperCase(),
        insurance_issued_at: params.input.insurance_issued_at,
        insurance_expires_at: params.input.insurance_expires_at,
        insurance_document_path: insurancePath,
        technical_inspection_number: params.input.technical_inspection_number.trim().toUpperCase(),
        technical_inspection_issued_at: params.input.technical_inspection_issued_at,
        technical_inspection_expires_at: params.input.technical_inspection_expires_at,
        technical_inspection_document_path: inspectionPath,
        road_tax_reference: params.input.road_tax_reference?.trim().toUpperCase() || null,
        road_tax_expires_at: params.input.road_tax_expires_at || null,
        transport_license_number: params.input.transport_license_number?.trim().toUpperCase() || null,
        transport_license_expires_at: params.input.transport_license_expires_at || null,
        created_by: authData.user?.id ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "vehicle_id" });
      if (error) throw new Error(error.message);
    } catch (error) {
      if (uploaded.length > 0) {
        await supabase.storage.from("legal-documents").remove(uploaded);
      }
      throw error;
    }
  }
}

export const legalComplianceService = new LegalComplianceService();
