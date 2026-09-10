import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  CEMAC_COUNTRIES,
  legalComplianceService,
  type DriverLegalProfileInput,
  type IdentityDocumentType,
} from "@/services/legal-compliance.service";

const emptyForm: DriverLegalProfileInput = {
  birth_date: "",
  birth_place: "",
  nationality_country: "CM",
  residence_country: "CM",
  address: "",
  identity_document_type: "national_id",
  identity_document_number: "",
  identity_issued_at: "",
  identity_expires_at: "",
  driving_license_number: "",
  driving_license_categories: [],
  driving_license_issued_at: "",
  driving_license_expires_at: "",
  driving_license_country: "CM",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

function CountrySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {CEMAC_COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code}>{country.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DriverLegalComplianceForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DriverLegalProfileInput>(emptyForm);
  const [categories, setCategories] = useState("");
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  const profileQuery = useQuery({
    queryKey: ["driver-legal-profile", userId],
    queryFn: () => legalComplianceService.getDriverProfile(userId),
  });
  const complianceQuery = useQuery({
    queryKey: ["driver-legal-compliance", userId],
    queryFn: () => legalComplianceService.isDriverCompliant(userId),
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setForm({
      birth_date: profile.birth_date,
      birth_place: profile.birth_place,
      nationality_country: profile.nationality_country,
      residence_country: profile.residence_country,
      address: profile.address,
      identity_document_type: profile.identity_document_type,
      identity_document_number: profile.identity_document_number,
      identity_issued_at: profile.identity_issued_at,
      identity_expires_at: profile.identity_expires_at ?? "",
      driving_license_number: profile.driving_license_number,
      driving_license_categories: profile.driving_license_categories,
      driving_license_issued_at: profile.driving_license_issued_at,
      driving_license_expires_at: profile.driving_license_expires_at,
      driving_license_country: profile.driving_license_country,
      emergency_contact_name: profile.emergency_contact_name ?? "",
      emergency_contact_phone: profile.emergency_contact_phone ?? "",
    });
    setCategories(profile.driving_license_categories.join(", "));
  }, [profileQuery.data]);

  const mutation = useMutation({
    mutationFn: () => legalComplianceService.saveDriverProfile({
      userId,
      input: {
        ...form,
        driving_license_categories: categories.split(",").map((value) => value.trim()).filter(Boolean),
      },
      identityFile,
      drivingLicenseFile: licenseFile,
    }),
    onSuccess: () => {
      setIdentityFile(null);
      setLicenseFile(null);
      void queryClient.invalidateQueries({ queryKey: ["driver-legal-profile", userId] });
      void queryClient.invalidateQueries({ queryKey: ["driver-legal-compliance", userId] });
      toast({ title: "Dossier légal enregistré", description: "Vos justificatifs conducteur ont été mis à jour." });
    },
    onError: (error) => toast({
      title: "Dossier incomplet",
      description: error instanceof Error ? error.message : "Impossible d'enregistrer les justificatifs.",
      variant: "destructive",
    }),
  });

  const set = <K extends keyof DriverLegalProfileInput>(key: K, value: DriverLegalProfileInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const hasRequiredValues = Boolean(
    form.birth_date && form.birth_place.trim() && form.address.trim() &&
    form.identity_document_number.trim() && form.identity_issued_at &&
    form.driving_license_number.trim() && categories.trim() &&
    form.driving_license_issued_at && form.driving_license_expires_at,
  );
  const hasRequiredFiles = Boolean(
    (profileQuery.data?.identity_document_path || identityFile) &&
    (profileQuery.data?.driving_license_document_path || licenseFile),
  );

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Dossier légal chauffeur</CardTitle>
          <Badge variant={complianceQuery.data ? "secondary" : "destructive"}>
            {complianceQuery.data ? "Conforme" : "À compléter"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Référentiel CEMAC : identité et permis de conduire valides. Les règles nationales peuvent demander des pièces supplémentaires.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Date de naissance</Label><Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></div>
          <div className="space-y-2"><Label>Lieu de naissance</Label><Input value={form.birth_place} onChange={(e) => set("birth_place", e.target.value)} /></div>
          <div className="space-y-2"><Label>Nationalité</Label><CountrySelect value={form.nationality_country} onChange={(value) => set("nationality_country", value)} /></div>
          <div className="space-y-2"><Label>Pays de résidence</Label><CountrySelect value={form.residence_country} onChange={(value) => set("residence_country", value)} /></div>
        </div>
        <div className="space-y-2"><Label>Adresse de résidence</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></div>

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-medium">Pièce d'identité</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.identity_document_type} onValueChange={(value) => set("identity_document_type", value as IdentityDocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">Carte nationale d'identité</SelectItem>
                  <SelectItem value="passport">Passeport</SelectItem>
                  <SelectItem value="residence_permit">Titre de séjour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Numéro</Label><Input value={form.identity_document_number} onChange={(e) => set("identity_document_number", e.target.value)} /></div>
            <div className="space-y-2"><Label>Délivrée le</Label><Input type="date" value={form.identity_issued_at} onChange={(e) => set("identity_issued_at", e.target.value)} /></div>
            <div className="space-y-2"><Label>Expire le (si applicable)</Label><Input type="date" value={form.identity_expires_at ?? ""} onChange={(e) => set("identity_expires_at", e.target.value)} /></div>
          </div>
          <div className="mt-3 space-y-2">
            <Label>Scan / photo de la pièce</Label>
            <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setIdentityFile(e.target.files?.[0] ?? null)} />
            {profileQuery.data?.identity_document_path && !identityFile ? <p className="text-xs text-muted-foreground">Document déjà enregistré.</p> : null}
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-medium">Permis de conduire</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Numéro du permis</Label><Input value={form.driving_license_number} onChange={(e) => set("driving_license_number", e.target.value)} /></div>
            <div className="space-y-2"><Label>Catégories</Label><Input placeholder="B, C, D" value={categories} onChange={(e) => setCategories(e.target.value)} /></div>
            <div className="space-y-2"><Label>Pays de délivrance</Label><CountrySelect value={form.driving_license_country} onChange={(value) => set("driving_license_country", value)} /></div>
            <div className="space-y-2"><Label>Délivré le</Label><Input type="date" value={form.driving_license_issued_at} onChange={(e) => set("driving_license_issued_at", e.target.value)} /></div>
            <div className="space-y-2"><Label>Expire le</Label><Input type="date" value={form.driving_license_expires_at} onChange={(e) => set("driving_license_expires_at", e.target.value)} /></div>
          </div>
          <div className="mt-3 space-y-2">
            <Label>Scan / photo du permis</Label>
            <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)} />
            {profileQuery.data?.driving_license_document_path && !licenseFile ? <p className="text-xs text-muted-foreground">Document déjà enregistré.</p> : null}
          </div>
        </div>

        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Contact d'urgence</Label><Input value={form.emergency_contact_name ?? ""} onChange={(e) => set("emergency_contact_name", e.target.value)} /></div>
          <div className="space-y-2"><Label>Téléphone d'urgence</Label><Input value={form.emergency_contact_phone ?? ""} onChange={(e) => set("emergency_contact_phone", e.target.value)} /></div>
        </div>

        <Button className="w-full" disabled={!hasRequiredValues || !hasRequiredFiles || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Enregistrement…" : "Enregistrer mon dossier légal"}
        </Button>
      </CardContent>
    </Card>
  );
}
