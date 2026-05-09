import ShiftClosureForm from "@/components/driver/ShiftClosureForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Car, Clock, Gauge } from "lucide-react";

// Mock active shift data
const mockActiveShift = {
  id: "shift-1",
  vehicle: {
    plate: "LT 1234 A",
    brand: "Toyota",
    model: "Corolla",
  },
  kmStart: 45230,
  startedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
};

const ShiftClosure = () => {
  const { role } = useAuth();
  const userRole = role ?? "driver";

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold">
                  Clôture journalière
                </h1>
                <p className="text-muted-foreground mt-1">
                  Déclarez vos kilomètres et recettes du jour
                </p>
              </div>

              {/* Active Shift Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-heading">Service en cours</CardTitle>
                  <CardDescription>Informations sur votre service actif</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Véhicule</div>
                        <div className="font-semibold">{mockActiveShift.vehicle.plate}</div>
                        <div className="text-xs text-muted-foreground">
                          {mockActiveShift.vehicle.brand} {mockActiveShift.vehicle.model}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Gauge className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">KM départ</div>
                        <div className="font-semibold">{mockActiveShift.kmStart.toLocaleString()} km</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Durée</div>
                        <div className="font-semibold">{formatDuration(mockActiveShift.startedAt)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Closure Form */}
              <ShiftClosureForm 
                shiftId={mockActiveShift.id}
                kmStart={mockActiveShift.kmStart}
              />
    </div>
  );
};

export default ShiftClosure;
