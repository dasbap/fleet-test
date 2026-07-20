import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car } from 'lucide-react';

interface VehicleFilterProps {
  vehicles: string[];
  selectedVehicle: string | null;
  onSelect: (vehicle: string | null) => void;
}

export function VehicleFilter({ vehicles, selectedVehicle, onSelect }: VehicleFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Car className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedVehicle || 'all'}
        onValueChange={(value) => onSelect(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Tous les véhicules" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les véhicules</SelectItem>
          {vehicles.map((vehicle) => (
            <SelectItem key={vehicle} value={vehicle}>
              {vehicle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
