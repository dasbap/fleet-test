"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createFleetInvitationCode } from "@/lib/onboarding/actions";
import { useOrg } from "@/lib/hooks/use-org";
import { canManageVehicles } from "@/lib/dashboard/roles";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Camera,
  Copy,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const driverSchema = z.object({
  first_name: z.string().min(2, "Prénom requis"),
  last_name: z.string().min(2, "Nom requis"),
  phone: z.string().min(8, "Téléphone requis"),
  email: z
    .string()
    .email("Email invalide")
    .optional()
    .or(z.literal("")),
  id_number: z.string().optional(),
  license_number: z.string().optional(),
  license_expires_at: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type DriverForm = z.infer<typeof driverSchema>;

const LICENSE_CATEGORIES = ["A", "B", "C", "D", "E", "F"] as const;

export default function NouveauConducteurPage() {
  const router = useRouter();
  const { orgId, fleetId, role, loading: orgLoading } = useOrg();
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteSummary, setInviteSummary] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
  });

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo max 5 Mo");
      return;
    }
    setPreview(URL.createObjectURL(file));
    toast.message(
      "Photo conservée localement — le conducteur pourra ajouter son avatar après inscription.",
    );
  }

  function buildInviteMessage(data: DriverForm, code: string) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    const lines = [
      `Bonjour ${data.first_name},`,
      `Invitation E-Samba — code : ${code}`,
      appUrl ? `Inscription : ${appUrl}/inscription` : null,
      `Téléphone renseigné : ${data.phone}`,
      data.license_number
        ? `Permis n° ${data.license_number}${selectedCategories.length ? ` (cat. ${selectedCategories.join(", ")})` : ""}`
        : null,
      data.license_expires_at
        ? `Expiration permis : ${data.license_expires_at}`
        : null,
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function onSubmit(data: DriverForm) {
    if (!orgId || !fleetId) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      const code = await createFleetInvitationCode(supabase, fleetId);
      const summary = buildInviteMessage(data, code);

      setInviteCode(code);
      setInviteSummary(summary);
      toast.success(
        `${data.first_name} ${data.last_name} — code d'invitation généré`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvite() {
    if (!inviteSummary) return;
    await navigator.clipboard.writeText(inviteSummary);
    toast.success("Message copié");
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
        <Link href="/dashboard/conducteurs" className="text-primary">
          Retour
        </Link>
      </p>
    );
  }

  if (inviteCode) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Invitation prête</h2>
          <p className="text-sm text-muted-foreground">
            Partagez ce message au conducteur pour qu&apos;il crée son compte et
            rejoigne la flotte.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={inviteCode} className="font-mono" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void navigator.clipboard.writeText(inviteCode)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <textarea
            readOnly
            className="min-h-[140px] w-full rounded-lg border bg-muted/30 p-3 text-sm"
            value={inviteSummary ?? ""}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => void copyInvite()}
            >
              Copier le message
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => router.push("/dashboard/conducteurs")}
            >
              Terminer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/conducteurs"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 px-0")}
        >
          <ArrowLeft className="h-4 w-4" />
          Conducteurs
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Nouveau conducteur</span>
      </div>

      <div>
        <h1 className="text-xl font-bold">Ajouter un conducteur</h1>
        <p className="text-sm text-muted-foreground">
          Collectez les informations puis envoyez le code d&apos;invitation au
          conducteur.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="space-y-5"
      >
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Identité
          </h2>

          <div className="mb-2 flex items-center gap-4">
            <label className="group cursor-pointer">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/30">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground/40" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Photo de profil
              <br />
              <span className="text-xs">Optionnel — après inscription</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input placeholder="Jean" {...register("first_name")} />
              {errors.first_name ? (
                <p className="text-xs text-destructive">
                  {errors.first_name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input placeholder="Dupont" {...register("last_name")} />
              {errors.last_name ? (
                <p className="text-xs text-destructive">
                  {errors.last_name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <Input placeholder="+237 6XX XXX XXX" {...register("phone")} />
              {errors.phone ? (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Email (optionnel)</Label>
              <Input
                type="email"
                placeholder="conducteur@email.com"
                {...register("email")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>N° CNI</Label>
              <Input placeholder="Carte nationale" {...register("id_number")} />
            </div>
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input placeholder="Douala" {...register("city")} />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Permis de conduire
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Numéro de permis</Label>
              <Input placeholder="N° du permis" {...register("license_number")} />
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;expiration</Label>
              <Input type="date" {...register("license_expires_at")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catégories de permis</Label>
            <div className="flex flex-wrap gap-3">
              {LICENSE_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm font-medium">Cat. {cat}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-xl border bg-card p-5">
          <Label>Notes (optionnel)</Label>
          <textarea
            className={cn(
              "min-h-[80px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            )}
            placeholder="Compétences spéciales, remarques..."
            {...register("notes")}
          />
        </section>

        <div className="flex gap-3 pb-6">
          <Link href="/dashboard/conducteurs" className="flex-1">
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
              <UserPlus className="h-4 w-4" />
            )}
            {submitting ? "Génération..." : "Générer l'invitation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
