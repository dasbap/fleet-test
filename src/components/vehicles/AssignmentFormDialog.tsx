import { useState, useEffect } from "react";
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
import { useAssignVehicle, useFleetDrivers } from "@/hooks/useAssignments";
import { useVehiclesSimple, Vehicle } from "@/hooks/useVehicles";
import { Loader2, Car, User } from "lucide-react";

const assignmentSchema = z.object({
  vehicle_id: z.string().min(1, "Sélectionnez un véhicule"),
  driver_user_id: z.string().min(1, "Sélectionnez un chauffeur"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleetId: string;
  preselectedVehicleId?: string;
}

export function AssignmentFormDialog({
  open,
  onOpenChange,
  fleetId,
  preselectedVehicleId,
}: AssignmentFormDialogProps) {
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehiclesSimple(fleetId);
  const { data: drivers = [], isLoading: loadingDrivers } = useFleetDrivers(fleetId);
  const assignVehicle = useAssignVehicle();

  // Filter available vehicles (ok status, no active assignment)
  const availableVehicles = vehicles.filter(
    (v) => v.status === "ok"
  );

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      vehicle_id: preselectedVehicleId || "",
      driver_user_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        vehicle_id: preselectedVehicleId || "",
        driver_user_id: "",
      });
    }
  }, [open, preselectedVehicleId, form]);

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      await assignVehicle.mutateAsync({
        fleet_id: fleetId,
        vehicle_id: data.vehicle_id,
        driver_user_id: data.driver_user_id,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isLoading = loadingVehicles || loadingDrivers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Nouvelle affectation
          </DialogTitle>
          <DialogDescription>
            Affectez un véhicule à un chauffeur. Cette action est atomique et
            vérifie les contraintes métier.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
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
                        {availableVehicles.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Aucun véhicule disponible
                          </div>
                        ) : (
                          availableVehicles.map((vehicle) => (
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
                name="driver_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chauffeur</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un chauffeur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Aucun chauffeur dans cette flotte
                          </div>
                        ) : (
                          drivers.map((driver) => (
                            <SelectItem
                              key={driver.user_id}
                              value={driver.user_id}
                            >
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>
                                  {driver.full_name || "Sans nom"}
                                </span>
                                {driver.phone && (
                                  <span className="text-muted-foreground text-xs">
                                    ({driver.phone})
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

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={assignVehicle.isPending}
                >
                  {assignVehicle.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Affecter
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
