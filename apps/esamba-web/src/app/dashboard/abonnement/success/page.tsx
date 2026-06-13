import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SuccessPageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function PaymentSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { ref } = await searchParams;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Paiement confirmé !</h1>
      <p className="mb-2 max-w-md text-muted-foreground">
        Votre abonnement E-Samba est en cours d&apos;activation.
        {ref ? (
          <>
            {" "}
            Référence : <span className="font-mono text-foreground">{ref}</span>
          </>
        ) : null}
      </p>
      <p className="mb-8 text-sm text-muted-foreground">
        La confirmation peut prendre 1 à 2 minutes (délai Mobile Money ou
        webhook prestataire).
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className={cn(buttonVariants())}>
          Aller au tableau de bord
        </Link>
        <Link
          href="/dashboard/abonnement"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Voir mon abonnement
        </Link>
      </div>
    </div>
  );
}
