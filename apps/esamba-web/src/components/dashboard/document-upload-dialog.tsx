"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle,
  File,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_BUCKET = "incident-evidence";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;

const DOC_TYPES = [
  { value: "insurance", label: "Assurance" },
  { value: "technical_control", label: "Contrôle technique" },
  { value: "vignette", label: "Vignette" },
  { value: "grey_card", label: "Carte grise" },
  { value: "transport_license", label: "Autorisation transport" },
  { value: "drivers_license", label: "Permis de conduire" },
  { value: "medical_certificate", label: "Certificat médical" },
  { value: "other", label: "Autre document" },
] as const;

const DRIVER_DOC_TYPES = new Set(["drivers_license", "medical_certificate"]);

const docSchema = z
  .object({
    doc_type: z.string().min(1, "Type requis"),
    doc_number: z.string().optional(),
    expires_at: z.string().optional(),
    issuer: z.string().optional(),
    notes: z.string().optional(),
    license_category: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.doc_type === "drivers_license" && !data.doc_number?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Numéro de permis requis",
        path: ["doc_number"],
      });
    }
  });

type DocForm = z.infer<typeof docSchema>;

interface FleetVehicleOption {
  id: string;
  label: string;
}

interface FleetDriverOption {
  userId: string;
  label: string;
}

interface DocumentUploadDialogProps {
  fleetId: string;
  orgId?: string;
  vehicleId?: string;
  driverUserId?: string;
  driverId?: string;
  triggerLabel?: string;
  open?: boolean;
  hideTrigger?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

function isDriverDocument(docType: string) {
  return DRIVER_DOC_TYPES.has(docType);
}

function defaultLicenseCategory(docType: string) {
  if (docType === "medical_certificate") return "medical";
  return "B";
}

export function DocumentUploadDialog({
  fleetId,
  vehicleId: presetVehicleId,
  driverUserId,
  driverId,
  triggerLabel = "Ajouter un document",
  open: controlledOpen,
  hideTrigger = false,
  onClose,
  onSuccess,
}: DocumentUploadDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const presetDriverId = driverUserId ?? driverId;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    presetVehicleId ?? "",
  );
  const [selectedDriverId, setSelectedDriverId] = useState(
    presetDriverId ?? "",
  );
  const [vehicles, setVehicles] = useState<FleetVehicleOption[]>([]);
  const [drivers, setDrivers] = useState<FleetDriverOption[]>([]);

  const vehicleId = presetVehicleId ?? (selectedVehicleId || undefined);
  const resolvedDriverId = presetDriverId ?? (selectedDriverId || undefined);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DocForm>({
    resolver: zodResolver(docSchema),
    defaultValues: {
      doc_type: presetDriverId ? "drivers_license" : "insurance",
      license_category: "B",
    },
  });

  const docType = watch("doc_type");
  const needsDriver = isDriverDocument(docType);
  const needsVehicle = !needsDriver;

  useEffect(() => {
    if (!open) {
      reset({
        doc_type: presetDriverId ? "drivers_license" : "insurance",
        license_category: "B",
      });
      setFile(null);
      setUploadPct(0);
    }
  }, [open, presetDriverId, reset]);

  useEffect(() => {
    if (!open) return;

    const supabase = createClient();
    void (async () => {
      const [{ data: vehicules }, { data: adhesions }] = await Promise.all([
        supabase
          .from("vehicules")
          .select("id, registration, brand, model")
          .eq("fleet_id", fleetId)
          .order("registration"),
        supabase
          .from("flotte_adhesions")
          .select("user_id, profils(full_name)")
          .eq("fleet_id", fleetId)
          .eq("role", "driver")
          .eq("is_active", true),
      ]);

      setVehicles(
        (vehicules ?? []).map((v) => ({
          id: v.id,
          label: [v.registration, v.brand, v.model].filter(Boolean).join(" · "),
        })),
      );

      setDrivers(
        (adhesions ?? []).map((row) => {
          const profil = row.profils as
            | { full_name?: string | null }
            | { full_name?: string | null }[]
            | null;
          const name = Array.isArray(profil)
            ? profil[0]?.full_name
            : profil?.full_name;
          return {
            userId: row.user_id,
            label: name ?? row.user_id.slice(0, 8),
          };
        }),
      );
    })();
  }, [open, fleetId]);

  function assignFile(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      toast.error("Fichier trop lourd (max 10 Mo)");
      return;
    }
    if (!ACCEPTED_MIME.includes(next.type as (typeof ACCEPTED_MIME)[number])) {
      toast.error("Format accepté : PDF, JPG, PNG");
      return;
    }
    setFile(next);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    assignFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    assignFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function onSubmit(data: DocForm) {
    if (!file) {
      toast.error("Sélectionnez un fichier.");
      return;
    }

    if (needsDriver && !resolvedDriverId) {
      toast.error("Sélectionnez un conducteur.");
      return;
    }

    if (needsVehicle && !vehicleId) {
      toast.error("Sélectionnez un véhicule.");
      return;
    }

    setUploading(true);
    setUploadPct(10);

    const supabase = createClient();

    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const scope = vehicleId ?? resolvedDriverId ?? "general";
      const objectPath = `${fleetId}/documents/${scope}/${data.doc_type}_${Date.now()}.${ext}`;

      setUploadPct(40);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(objectPath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      setUploadPct(70);

      if (needsDriver) {
        const { error } = await supabase.from("driver_licenses").insert({
          fleet_id: fleetId,
          driver_user_id: resolvedDriverId,
          license_number: data.doc_number?.trim() || `DOC-${Date.now()}`,
          license_category:
            data.license_category?.trim() ||
            defaultLicenseCategory(data.doc_type),
          expires_at: data.expires_at || null,
          issuing_country: data.issuer?.trim() || "CM",
          document_url: objectPath,
        });

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("vehicle_documents").insert({
          fleet_id: fleetId,
          vehicle_id: vehicleId,
          doc_type: data.doc_type,
          doc_number: data.doc_number?.trim() || null,
          expires_at: data.expires_at || null,
          issuer: data.issuer?.trim() || null,
          notes: data.notes?.trim() || null,
          file_path: objectPath,
        });

        if (error) {
          throw new Error(
            "Documents véhicule indisponibles en production. Utilisez un permis conducteur ou contactez le support.",
          );
        }
      }

      setUploadPct(100);
      toast.success("Document ajouté avec succès");

      if (onSuccess) onSuccess();
      else {
        setInternalOpen(false);
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Échec du téléversement.",
      );
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose?.();
    if (controlledOpen === undefined) setInternalOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <DialogTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Upload className="h-4 w-4" />
          {triggerLabel}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Ajouter un document
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Type de document *</Label>
            <Select
              value={docType}
              onValueChange={(value) => {
                setValue("doc_type", value as string, { shouldValidate: true });
                if (value === "medical_certificate") {
                  setValue("license_category", "medical");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir le type" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doc_type ? (
              <p className="text-xs text-destructive">{errors.doc_type.message}</p>
            ) : null}
          </div>

          {needsDriver && !presetDriverId ? (
            <div className="space-y-1.5">
              <Label>Conducteur *</Label>
              <Select
                value={selectedDriverId || "none"}
                onValueChange={(value) =>
                  setSelectedDriverId(value === "none" ? "" : (value as string))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un conducteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sélectionner —</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.userId} value={driver.userId}>
                      {driver.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {needsVehicle && !presetVehicleId ? (
            <div className="space-y-1.5">
              <Label>Véhicule *</Label>
              <Select
                value={selectedVehicleId || "none"}
                onValueChange={(value) =>
                  setSelectedVehicleId(value === "none" ? "" : (value as string))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sélectionner —</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                {docType === "drivers_license" ? "N° permis *" : "Numéro (optionnel)"}
              </Label>
              <Input placeholder="N° du document" {...register("doc_number")} />
              {errors.doc_number ? (
                <p className="text-xs text-destructive">
                  {errors.doc_number.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;expiration</Label>
              <Input type="date" {...register("expires_at")} />
            </div>
          </div>

          {docType === "drivers_license" ? (
            <div className="space-y-1.5">
              <Label>Catégorie permis</Label>
              <Input placeholder="B" {...register("license_category")} />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Organisme émetteur (optionnel)</Label>
            <Input
              placeholder="ex : NSIA Assurances, MINTP..."
              {...register("issuer")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fichier (PDF, JPG, PNG — max 10 Mo)</Label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  fileRef.current?.click();
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                "border-border hover:border-primary/50 hover:bg-primary/5",
              )}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="max-w-[200px] truncate text-sm font-medium">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} Ko
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFile(null);
                    }}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Cliquez pour sélectionner un fichier
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ou glissez-déposez ici
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optionnel)</Label>
            <Input placeholder="Remarques..." {...register("notes")} />
          </div>

          {uploading ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Upload en cours...</span>
                <span>{uploadPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={uploading} className="gap-2">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {uploading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
