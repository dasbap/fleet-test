"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mapAuthErrorMessage } from "@/lib/auth/errors";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const inscriptionSchema = z
  .object({
    full_name: z.string().min(2, "Nom requis (min 2 caractères)"),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Minimum 8 caractères"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type InscriptionFormValues = z.infer<typeof inscriptionSchema>;

export function InscriptionForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InscriptionFormValues>({
    resolver: zodResolver(inscriptionSchema),
  });

  const passwordValue = watch("password", "");

  async function onSubmit(data: InscriptionFormValues) {
    const supabase = createClient();
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: { full_name: data.full_name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      toast.error(mapAuthErrorMessage(error.message));
      return;
    }

    if (authData.session) {
      toast.success("Compte créé, bienvenue !");
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setCreatedEmail(data.email.trim());
  }

  if (createdEmail) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Compte créé</CardTitle>
          <CardDescription>
            Votre compte <strong>{createdEmail}</strong> est enregistré.
            Vous pouvez vous connecter pour continuer la configuration de votre
            flotte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/connexion"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    );
  }

  const strengthChecks = [
    { label: "8 caractères minimum", ok: passwordValue.length >= 8 },
    { label: "Une majuscule", ok: /[A-Z]/.test(passwordValue) },
    { label: "Un chiffre", ok: /[0-9]/.test(passwordValue) },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input
              id="full_name"
              placeholder="Jean Dupont"
              autoComplete="name"
              disabled={isSubmitting}
              {...register("full_name")}
            />
            {errors.full_name ? (
              <p className="text-xs text-destructive">
                {errors.full_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email professionnel</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@entreprise.com"
              autoComplete="email"
              disabled={isSubmitting}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
            {passwordValue ? (
              <ul className="space-y-1 pt-1">
                {strengthChecks.map((check) => (
                  <li
                    key={check.label}
                    className={`text-xs ${check.ok ? "text-green-600" : "text-muted-foreground"}`}
                  >
                    {check.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register("confirm")}
            />
            {errors.confirm ? (
              <p className="text-xs text-destructive">
                {errors.confirm.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Créer mon compte gratuitement
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="font-medium text-primary hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
