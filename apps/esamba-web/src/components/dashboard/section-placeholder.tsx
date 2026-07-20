import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionPlaceholderProps {
  title: string;
  description: string;
}

export function SectionPlaceholder({
  title,
  description,
}: SectionPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Construction className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au tableau de bord
      </Link>
    </div>
  );
}
