import { useEffect } from "react";
import { Link } from "react-router-dom";
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
import { useActiveAssignments, useAssignVehicle, useFleetDrivers } from "@/hooks/useAssignments";
import { useVehiclesSimple } from "@/hooks/useVehicles";
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

function formatVehicleLabel(registration: string, brand?: string | null, model?: string | null): string {
  const details = [brand, model].filter(Boolean).join(" ");
  return details ? `${registration} – ${details}` : registration;
}

function formatDriverLabel(fullName: string | null, phone: string | null): string {
  const name = fullName?.trim() || "Sans nom";
  return phone ? `${name} (${phone})` : name;
}

export function AssignmentFormDialog({
  open,
  onOpenChange,
  fleetId,
  preselectedVehicleId,
}: AssignmentFormDialogProps) {
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehiclesSimple(fleetId);
  const { data: drivers = [], isLoading: loadingDrivers } = useFleetDrivers(fleetId);
  const { data: activeAssignments = [], isLoading: loadingAssignments } = useActiveAssignments(fleetId);
  const assignVehicle = useAssignVehicle();

  const availableVehicles = vehicles.filter((v) => v.status === "ok");
  const assignedDriverIds = new Set(activeAssignments.map((assignment) => assignment.driver_user_id));
  const availableDrivers = drivers.filter((driver) => !assignedDriverIds.has(driver.user_id));

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
    } catch {
      // Erreur gérée par la mutation
    }
  };

  const isLoading = loadingVehicles || loadingDrivers || loadingAssignments;

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
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="Sélectionner un véhicule">
                          <SelectValue placeholder="Sélectionnez un véhicule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" sideOffset={4}>
                        {availableVehicles.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Aucun véhicule disponible
                          </div>
                        ) : (
                          availableVehicles.map((vehicle) => (
                            <SelectItem
                              key={vehicle.id}
                              value={vehicle.id}
                              textValue={formatVehicleLabel(
                                vehicle.registration,
                                vehicle.brand,
                                vehicle.model,
                              )}
                            >
                              {formatVehicleLabel(vehicle.registration, vehicle.brand, vehicle.model)}
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
                    {drivers.length > 0 && availableDrivers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Aucun chauffeur disponible. Tous les chauffeurs actifs ont dÃ©jÃ  un vÃ©hicule affectÃ©.
                      </p>
                    ) : null}
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={availableDrivers.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="Sélectionner un chauffeur">
                          <SelectValue placeholder="Sélectionnez un chauffeur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" sideOffset={4}>
                        {drivers.length === 0 ? (
                          <div className="space-y-2 p-3 text-center text-sm text-muted-foreground">
                            <p>Aucun chauffeur actif dans cette flotte.</p>
                            <p>
                              Ajoutez un membre avec le rôle{" "}
                              <strong className="text-foreground">Chauffeur</strong> dans{" "}
                              <Link
                                to="/dashboard/teams"
                                className="text-primary underline-offset-4 hover:underline"
                                onClick={() => onOpenChange(false)}
                              >
                                Équipe
                              </Link>
                              .
                            </p>
                          </div>
                        ) : availableDrivers.length === 0 ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            Aucun chauffeur disponible. Tous les chauffeurs actifs ont dÃ©jÃ  un vÃ©hicule affectÃ©.
                          </div>
                        ) : (
                          availableDrivers.map((driver) => (
                            <SelectItem
                              key={driver.user_id}
                              value={driver.user_id}
                              textValue={formatDriverLabel(driver.full_name, driver.phone)}
                            >
                              {formatDriverLabel(driver.full_name, driver.phone)}
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
                  disabled={assignVehicle.isPending || availableDrivers.length === 0}
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
