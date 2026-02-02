import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const vehicleFormSchema = z.object({
  plate: z.string().min(1, "L'immatriculation est requise"),
  brand: z.string().min(1, "La marque est requise"),
  model: z.string().min(1, "Le modèle est requis"),
  year: z.coerce.number().min(1990, "Année invalide").max(new Date().getFullYear() + 1, "Année invalide"),
  km: z.coerce.number().min(0, "Kilométrage invalide"),
  status: z.enum(["active", "maintenance", "blocked"]),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    km: number;
    status: "active" | "maintenance" | "blocked";
  };
}

const VehicleFormDialog = ({ open, onOpenChange, vehicle }: VehicleFormDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!vehicle;

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle || {
      plate: "",
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      km: 0,
      status: "active",
    },
  });

  const onSubmit = async (data: VehicleFormValues) => {
    setIsSubmitting(true);
    try {
      // TODO: Connect to Supabase
      console.log("Vehicle data:", data);
      
      toast({
        title: isEditing ? "Véhicule modifié" : "Véhicule ajouté",
        description: isEditing 
          ? "Les modifications ont été enregistrées."
          : "Le véhicule a été ajouté à la flotte.",
      });
      
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? "Modifier le véhicule" : "Ajouter un véhicule"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations du véhicule ci-dessous."
              : "Remplissez les informations pour ajouter un nouveau véhicule à la flotte."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Immatriculation</FormLabel>
                  <FormControl>
                    <Input placeholder="LT 1234 A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle</FormLabel>
                    <FormControl>
                      <Input placeholder="Corolla" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2023" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilométrage</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="maintenance">En entretien</SelectItem>
                      <SelectItem value="blocked">Bloqué</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : isEditing ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleFormDialog;
