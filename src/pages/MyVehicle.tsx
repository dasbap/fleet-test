import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const MyVehicle = () => {
  const { role } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <Car className="h-7 w-7" />
          Mon véhicule
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez les informations de votre véhicule assigné
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mon véhicule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Page en développement</h3>
            <p className="text-muted-foreground">
              Les informations de votre véhicule seront bientôt disponibles.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyVehicle;
