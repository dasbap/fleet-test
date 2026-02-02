import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Banknote, Smartphone, CreditCard, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const closureFormSchema = z.object({
  kmEnd: z.coerce.number().min(0, "Kilométrage invalide"),
  revenueDeclared: z.coerce.number().min(0, "Montant invalide"),
  collectionMode: z.enum(["cash", "mobile_money", "mixed"]),
  proofType: z.string().optional(),
  proofValue: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // kmEnd must be greater than or equal to kmStart (passed as context)
  return true;
}, {
  message: "Le kilométrage final doit être supérieur au kilométrage initial",
  path: ["kmEnd"],
});

type ClosureFormValues = z.infer<typeof closureFormSchema>;

interface ShiftClosureFormProps {
  shiftId: string;
  kmStart: number;
}

const collectionModes = [
  { value: "cash", label: "Espèces", icon: Banknote },
  { value: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { value: "mixed", label: "Mixte", icon: CreditCard },
];

const ShiftClosureForm = ({ shiftId, kmStart }: ShiftClosureFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClosureFormValues>({
    resolver: zodResolver(closureFormSchema),
    defaultValues: {
      kmEnd: kmStart,
      revenueDeclared: 0,
      collectionMode: "cash",
      proofType: "",
      proofValue: "",
      notes: "",
    },
  });

  const watchKmEnd = form.watch("kmEnd");
  const kmDriven = watchKmEnd - kmStart;
  const watchRevenue = form.watch("revenueDeclared");

  const onSubmit = async (data: ClosureFormValues) => {
    if (data.kmEnd < kmStart) {
      form.setError("kmEnd", {
        type: "manual",
        message: `Le kilométrage final doit être supérieur à ${kmStart.toLocaleString()} km`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Connect to Supabase
      console.log("Closure data:", { shiftId, ...data });
      
      toast({
        title: "Clôture envoyée",
        description: "Votre clôture journalière a été soumise pour validation.",
      });
      
      form.reset();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Formulaire de clôture</CardTitle>
        <CardDescription>
          Renseignez les informations de fin de service pour validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Kilometers Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Kilométrage
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">KM départ</div>
                  <div className="text-2xl font-bold">{kmStart.toLocaleString()}</div>
                </div>

                <FormField
                  control={form.control}
                  name="kmEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KM arrivée</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={kmStart.toString()} 
                          {...field} 
                          className="text-lg font-semibold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* KM Driven Summary */}
              <div className={cn(
                "p-4 rounded-lg border",
                kmDriven < 0 ? "bg-destructive/10 border-destructive/20" : "bg-primary/5 border-primary/20"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Distance parcourue</span>
                  <span className={cn(
                    "text-xl font-bold",
                    kmDriven < 0 ? "text-destructive" : "text-primary"
                  )}>
                    {kmDriven >= 0 ? `+${kmDriven.toLocaleString()}` : kmDriven.toLocaleString()} km
                  </span>
                </div>
                {kmDriven < 0 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span>Le kilométrage final doit être supérieur au kilométrage initial</span>
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Recettes
              </h3>

              <FormField
                control={form.control}
                name="revenueDeclared"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant total déclaré (FCFA)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          className="text-lg font-semibold pl-12"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          XAF
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Déclarez le montant total des recettes de la journée
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collectionMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode d'encaissement</FormLabel>
                    <div className="grid grid-cols-3 gap-3">
                      {collectionModes.map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = field.value === mode.value;
                        return (
                          <button
                            key={mode.value}
                            type="button"
                            onClick={() => field.onChange(mode.value)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                              isSelected 
                                ? "bg-primary/10 border-primary text-primary" 
                                : "bg-muted/30 border-border hover:bg-muted/50"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm font-medium">{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary */}
              {watchRevenue > 0 && (
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Recette déclarée</span>
                    <span className="text-xl font-bold text-success">
                      {watchRevenue.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Remarques (optionnel)
              </h3>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Ajoutez des remarques sur votre service (incidents, problèmes techniques, etc.)" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isSubmitting || kmDriven < 0}
            >
              {isSubmitting ? "Envoi en cours..." : "Soumettre la clôture"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ShiftClosureForm;
