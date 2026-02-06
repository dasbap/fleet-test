import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Calendar, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DriverHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string | null;
}

interface AssignmentHistory {
  id: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  vehicle: {
    id: string;
    registration: string;
    brand: string | null;
    model: string | null;
  } | null;
}

const DriverHistoryDialog = ({ open, onOpenChange, driverId }: DriverHistoryDialogProps) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['driver-history', driverId],
    queryFn: async () => {
      if (!driverId) return [];

      const { data, error } = await supabase
        .from('affectations_vehicules')
        .select(`
          id,
          starts_at,
          ends_at,
          is_active,
          vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(id, registration, brand, model)
        `)
        .eq('driver_user_id', driverId)
        .order('starts_at', { ascending: false });

      if (error) {
        console.error('Error fetching driver history:', error);
        throw new Error(error.message);
      }

      // Transform data to match expected interface
      return (data || []).map((item: any) => ({
        id: item.id,
        starts_at: item.starts_at,
        ends_at: item.ends_at,
        is_active: item.is_active,
        vehicle: item.vehicle ? {
          id: item.vehicle.id,
          registration: item.vehicle.registration,
          brand: item.vehicle.brand,
          model: item.vehicle.model,
        } : null,
      })) as AssignmentHistory[];
    },
    enabled: !!driverId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Historique des affectations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Car className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucune affectation dans l'historique
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((assignment) => (
                <Card key={assignment.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Car className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium font-mono">
                            {assignment.vehicle?.registration || "Véhicule inconnu"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.vehicle?.brand} {assignment.vehicle?.model}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          assignment.is_active
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {assignment.is_active ? "En cours" : "Terminée"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Début: {format(new Date(assignment.starts_at), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      {assignment.ends_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            Fin: {format(new Date(assignment.ends_at), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverHistoryDialog;
