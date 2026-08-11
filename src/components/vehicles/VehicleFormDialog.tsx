import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vehicleCreateFormSchema,
  type VehicleCreateFormValues,
} from "@/domain/schemas/vehicle.schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVehicle } from "@/hooks/useVehicles";
import { useActivation } from "@/hooks/useActivation";
import { useFleetSubscriptions } from "@/hooks/useSubscriptionManagement";

const vehicleFormSchema = vehicleCreateFormSchema;
type VehicleFormValues = VehicleCreateFormValues;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleetId: string;
  onSuccess?: () => void;
}

const VehicleFormDialog = ({ open, onOpenChange, fleetId, onSuccess }: VehicleFormDialogProps) => {
  const createVehicle = useCreateVehicle();
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useFleetSubscriptions(fleetId);
  const { completeStep } = useActivation();
  const subscriptionOptions = useMemo(
    () =>
      subscriptions.filter(
        (subscription) =>
          (subscription.status === "active" || subscription.status === "trial") &&
          subscription.availableSlots > 0,
      ),
    [subscriptions],
  );

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      registration: "",
      subscription_id: "",
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      current_km: 0,
    },
  });

  const onSubmit = async (data: VehicleFormValues) => {
    await createVehicle.mutateAsync({
      fleet_id: fleetId,
      subscription_id: data.subscription_id,
      registration: data.registration,
      brand: data.brand,
      model: data.model,
      year: data.year,
      current_km: data.current_km,
    });
    await completeStep("first_vehicle");
    
    onOpenChange(false);
    form.reset();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Ajouter un véhicule</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour ajouter un nouveau véhicule à la flotte.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="registration"
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

            <FormField
              control={form.control}
              name="subscription_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abonnement</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="Selectionner un abonnement">
                        <SelectValue placeholder="Choisir un abonnement actif" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subscriptionOptions.map((subscription) => (
                        <SelectItem key={subscription.id} value={subscription.id}>
                          {subscription.planName ?? subscription.planCode ?? "Abonnement"} -{" "}
                          {subscription.availableSlots} slot
                          {subscription.availableSlots > 1 ? "s" : ""} disponible
                          {subscription.availableSlots > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {!subscriptionsLoading && subscriptionOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aucun abonnement actif avec slot vehicule disponible.
                    </p>
                  ) : null}
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
                name="current_km"
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createVehicle.isPending || subscriptionsLoading || subscriptionOptions.length === 0}
              >
                {createVehicle.isPending ? "Enregistrement..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleFormDialog;
