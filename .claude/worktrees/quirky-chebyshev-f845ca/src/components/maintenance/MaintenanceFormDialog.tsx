import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { useCreateMaintenanceJob, type Priority } from "@/hooks/useMaintenance";
import { useVehiclesSimple } from "@/hooks/useVehicles";
import { Loader2, Wrench, Car } from "lucide-react";

const maintenanceSchema = z.object({
  vehicle_id: z.string().min(1, "Sélectionnez un véhicule"),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleetId?: string;
}

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "critical", label: "Critique" },
];

export function MaintenanceFormDialog({
  open,
  onOpenChange,
  fleetId,
}: MaintenanceFormDialogProps) {
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehiclesSimple(fleetId);
  const createJob = useCreateMaintenanceJob();

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      vehicle_id: "",
      priority: "medium",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ vehicle_id: "", priority: "medium" });
    }
  }, [open, form]);

  const onSubmit = async (data: MaintenanceFormData) => {
    const vehicle = vehicles.find(v => v.id === data.vehicle_id);
    if (!vehicle) return;

    try {
      await createJob.mutateAsync({
        vehicle_id: data.vehicle_id,
        fleet_id: vehicle.fleet_id,
        priority: data.priority,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Nouvelle intervention
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle intervention de maintenance pour un véhicule.
          </DialogDescription>
        </DialogHeader>

        {loadingVehicles ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Véhicule</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un véhicule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Aucun véhicule disponible
                          </div>
                        ) : (
                          vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                <span className="font-medium">
                                  {vehicle.registration}
                                </span>
                                {vehicle.brand && (
                                  <span className="text-muted-foreground">
                                    - {vehicle.brand} {vehicle.model}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une priorité" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createJob.isPending}>
                  {createJob.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Créer
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
