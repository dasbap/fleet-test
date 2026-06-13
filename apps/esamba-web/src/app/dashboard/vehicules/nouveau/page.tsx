"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createFirstVehicle } from "@/lib/onboarding/actions";
import { useOrg } from "@/lib/hooks/use-org";
import { canManageVehicles } from "@/lib/dashboard/roles";
import { cn } from "@/lib/utils";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_BUCKET = "fleet-assets";

const vehicleSchema = z.object({
  plate_number: z.string().min(3, "Plaque requise (min 3 caractères)"),
  brand: z.string().min(1, "Marque requise"),
  model: z.string().min(1, "Modèle requis"),
  year: z.string().optional(),
  color: z.string().optional(),
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  engine_capacity: z.string().optional(),
  seats: z.string().optional(),
  payload_tons: z.string().optional(),
  current_mileage: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_price: z.string().optional(),
  fleet_id: z.string().optional(),
  notes: z.string().optional(),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

const BRANDS = [
  "Toyota",
  "Mercedes",
  "Renault",
  "Peugeot",
  "Ford",
  "Mitsubishi",
  "Nissan",
  "Isuzu",
  "MAN",
  "Volvo",
  "Scania",
  "DAF",
  "Iveco",
  "Hyundai",
  "Kia",
  "Autre",
] as const;

const FUEL_TYPES = [
  { value: "diesel", label: "Diesel" },
  { value: "gasoline", label: "Essence" },
  { value: "lpg", label: "GPL" },
  { value: "electric", label: "Électrique" },
  { value: "hybrid", label: "Hybride" },
] as const;

const TRANSMISSIONS = [
  { value: "manual", label: "Manuelle" },
  { value: "automatic", label: "Automatique" },
] as const;

export default function NouveauVehiculePage() {
  const router = useRouter();
  const { orgId, fleetId, fleets, role, loading: orgLoading } = useOrg();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      fuel_type: "diesel",
      transmission: "manual",
      fleet_id: fleetId ?? undefined,
      current_mileage: "0",
    },
  });

  const selectedBrand = watch("brand");

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo max 5 Mo");
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function onSubmit(data: VehicleForm) {
    if (!orgId) return;

    const targetFleetId = data.fleet_id || fleetId;
    if (!targetFleetId) {
      toast.error("Flotte introuvable.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      const year = data.year?.trim()
        ? Number.parseInt(data.year, 10)
        : undefined;
      const currentKm = data.current_mileage?.trim()
        ? Number.parseInt(data.current_mileage, 10)
        : 0;

      const vehicleId = await createFirstVehicle(supabase, {
        fleetId: targetFleetId,
        registration: data.plate_number,
        brand: data.brand,
        model: data.model,
        year: Number.isFinite(year) ? year : undefined,
      });

      if (Number.isFinite(currentKm) && currentKm >= 0) {
        await supabase
          .from("vehicules")
          .update({ current_km: currentKm })
          .eq("id", vehicleId);
      }

      if (photo) {
        const ext = photo.name.split(".").pop() ?? "jpg";
        const objectPath = `${targetFleetId}/vehicles/${vehicleId}/primary.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(objectPath, photo, { upsert: true });

        if (uploadError) {
          toast.message(
            "Véhicule créé — photo non enregistrée (vérifiez les droits Storage).",
          );
        }
      }

      toast.success(`Véhicule ${data.plate_number.toUpperCase()} ajouté !`);
      router.push(`/dashboard/vehicules/${vehicleId}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Problème inattendu",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (orgLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orgId || !canManageVehicles(role ?? "")) {
    return (
      <p className="text-sm text-muted-foreground">
        Accès refusé.{" "}
        <Link href="/dashboard/vehicules" className="text-primary">
          Retour
        </Link>
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/vehicules"
          className="flex items-center gap-1 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Véhicules
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Nouveau véhicule</span>
      </div>

      <div>
        <h1 className="text-xl font-bold">Ajouter un véhicule</h1>
        <p className="text-sm text-muted-foreground">
          Renseignez les informations du véhicule
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="space-y-6"
      >
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Identification
          </h2>

          <div className="flex items-center gap-4">
            <label className="group cursor-pointer">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors group-hover:border-primary/50">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground/40 group-hover:text-primary" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Photo du véhicule</p>
              <p className="text-xs">JPG, PNG · Max 5 Mo · Optionnel</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Numéro de plaque *</Label>
              <Input
                placeholder="LT-1234-A"
                className="font-mono uppercase"
                {...register("plate_number")}
              />
              {errors.plate_number ? (
                <p className="text-xs text-destructive">
                  {errors.plate_number.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Marque *</Label>
              <Select
                value={selectedBrand ?? ""}
                onValueChange={(value) => setValue("brand", value as string)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.brand ? (
                <p className="text-xs text-destructive">{errors.brand.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Modèle *</Label>
              <Input
                placeholder="Hilux, Sprinter, Transit..."
                {...register("model")}
              />
              {errors.model ? (
                <p className="text-xs text-destructive">{errors.model.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Année</Label>
              <Input
                type="number"
                placeholder="2022"
                min={1990}
                max={new Date().getFullYear() + 1}
                {...register("year")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <Input placeholder="Blanc, Gris..." {...register("color")} />
            </div>

            {fleets.length > 1 ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Flotte</Label>
                <Select
                  value={watch("fleet_id") ?? fleetId ?? ""}
                  onValueChange={(value) =>
                    setValue("fleet_id", value as string)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assigner à une flotte" />
                  </SelectTrigger>
                  <SelectContent>
                    {fleets.map((fleet) => (
                      <SelectItem key={fleet.id} value={fleet.id}>
                        {fleet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Caractéristiques
          </h2>
          <p className="text-xs text-muted-foreground">
            Carburant et transmission : informatifs (schéma véhicule simplifié en
            prod).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Carburant</Label>
              <Select
                value={watch("fuel_type") ?? "diesel"}
                onValueChange={(value) =>
                  setValue("fuel_type", value as string)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((fuel) => (
                    <SelectItem key={fuel.value} value={fuel.value}>
                      {fuel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Transmission</Label>
              <Select
                value={watch("transmission") ?? "manual"}
                onValueChange={(value) =>
                  setValue("transmission", value as string)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSMISSIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Cylindrée (litres)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="2.4"
                {...register("engine_capacity")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nombre de places</Label>
              <Input
                type="number"
                placeholder="5"
                min={1}
                {...register("seats")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Charge utile (tonnes)</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="3.5"
                {...register("payload_tons")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kilométrage actuel</Label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                {...register("current_mileage")}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Informations financières
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date d&apos;achat</Label>
              <Input type="date" {...register("purchase_date")} />
            </div>
            <div className="space-y-1.5">
              <Label>Prix d&apos;achat (XAF)</Label>
              <Input
                type="number"
                placeholder="12000000"
                {...register("purchase_price")}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-5">
          <Label>Notes (optionnel)</Label>
          <textarea
            className={cn(
              "min-h-[80px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            )}
            placeholder="Informations complémentaires..."
            {...register("notes")}
          />
        </section>

        <div className="flex gap-3 pb-6">
          <Link href="/dashboard/vehicules" className="flex-1">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={submitting}
            >
              Annuler
            </Button>
          </Link>
          <Button type="submit" className="flex-1 gap-2" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {submitting ? "Enregistrement..." : "Ajouter le véhicule"}
          </Button>
        </div>
      </form>
    </div>
  );
}
