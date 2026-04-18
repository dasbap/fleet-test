import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Zap, ArrowLeft, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/auth-actions";
import type { AppRole } from "@/types/auth";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import {
  getSafePostLoginPath,
  LEGACY_POST_LOGIN_REDIRECT_PARAM,
  POST_LOGIN_NEXT_PARAM,
} from "@/navigation/postLoginRedirect";
import { cn } from "@/lib/utils";
import {
  DEMO_CREDENTIAL_ACCOUNTS,
  DEMO_SHARED_PASSWORD,
} from "@/features/auth/data/demoCredentials";

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Saisissez un email ou un numéro de téléphone")
    .refine(
      (v) => {
        const t = v.trim();
        if (t.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
        return t.replace(/\D/g, "").length >= 8;
      },
      { message: "Format email ou téléphone invalide (min. 8 chiffres)" },
    ),
  password: z.string().min(4, "Au moins 4 caractères"),
  testRole: z.enum(["organizer", "manager", "driver", "mechanic"]),
});

type LoginForm = z.infer<typeof loginSchema>;

const ROLE_LABELS: Record<AppRole, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mécanicien",
};

/**
 * Connexion mobile-first — session mockée (VITE_USE_MOCK_AUTH).
 * Prêt pour branchement OTP / backend réel.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const postLoginTarget = useMemo(
    () =>
      getSafePostLoginPath(searchParams.get(POST_LOGIN_NEXT_PARAM)) ??
      getSafePostLoginPath(searchParams.get(LEGACY_POST_LOGIN_REDIRECT_PARAM)) ??
      ROUTE_PATHS.dashboard,
    [searchParams],
  );

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      testRole: "manager",
    },
  });

  async function onSubmit(values: LoginForm) {
    const { error } = await signIn(
      values.identifier.trim(),
      values.password,
      values.testRole,
    );
    if (error) {
      toast({
        title: "Connexion impossible",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Connexion réussie",
      description: "Redirection…",
    });
    navigate(postLoginTarget, { replace: true });
  }

  function fillDemoCredentials(email: string): void {
    form.setValue("identifier", email, { shouldValidate: true, shouldDirty: true });
    form.setValue("password", DEMO_SHARED_PASSWORD, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pt-safe pb-safe">
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-md space-y-7 sm:space-y-8">
          <Link
            to={ROUTE_PATHS.home}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Retour
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold leading-tight">
                Flotte E-Samba
              </p>
              <p className="text-xs text-muted-foreground">Connexion (mode démo)</p>
            </div>
          </div>

          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-[1.75rem]">
              Connexion
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              Email ou téléphone, puis mot de passe. Session stockée localement pour
              les tests.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email ou téléphone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          autoComplete="username"
                          inputMode="text"
                          placeholder="vous@exemple.com ou +221…"
                          className="pl-11"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="pl-11"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle (test)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Simule le rôle applicatif pour valider les écrans par profil.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="lg"
                className="w-full touch-manipulation"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Connexion…" : "Se connecter"}
              </Button>

              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Identifiants démo rapides (mot de passe commun :{" "}
                  <code className="rounded bg-muted px-1 py-0.5">{DEMO_SHARED_PASSWORD}</code>)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DEMO_CREDENTIAL_ACCOUNTS.map((account) => (
                    <Button
                      key={account.email}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn("h-auto max-w-full truncate")}
                      onClick={() => fillDemoCredentials(account.email)}
                    >
                      {account.role}
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground">
            Connexion par code SMS (OTP) :{" "}
            <span className="text-foreground/80">bientôt disponible</span>
          </p>
        </div>
      </div>
    </div>
  );
}
