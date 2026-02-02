import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export type VehicleStatus = 'active' | 'maintenance' | 'blocked';

export interface Vehicle {
  id: string;
  fleet_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  status: VehicleStatus;
  blocked_reason: string | null;
  driver?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleInsert {
  fleet_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  km?: number;
  status?: VehicleStatus;
}

// Mock data for now - will be replaced with Supabase queries once tables are created
const mockVehicles: Vehicle[] = [
  {
    id: "1",
    fleet_id: "fleet-1",
    plate: "LT 1234 A",
    brand: "Toyota",
    model: "Corolla",
    year: 2022,
    km: 45230,
    status: "active",
    blocked_reason: null,
    driver: "Alain Mbarga",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    fleet_id: "fleet-1",
    plate: "LT 5678 B",
    brand: "Hyundai",
    model: "Elantra",
    year: 2021,
    km: 62150,
    status: "active",
    blocked_reason: null,
    driver: "Marie Essomba",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    fleet_id: "fleet-1",
    plate: "LT 9012 C",
    brand: "Nissan",
    model: "Sunny",
    year: 2020,
    km: 89340,
    status: "maintenance",
    blocked_reason: null,
    driver: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    fleet_id: "fleet-1",
    plate: "LT 3456 D",
    brand: "Toyota",
    model: "Yaris",
    year: 2023,
    km: 12450,
    status: "active",
    blocked_reason: null,
    driver: "Paul Ndjock",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    fleet_id: "fleet-1",
    plate: "LT 7890 E",
    brand: "Kia",
    model: "Rio",
    year: 2021,
    km: 78900,
    status: "blocked",
    blocked_reason: "2 clôtures manquées",
    driver: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useVehicles(fleetId?: string) {
  return useQuery({
    queryKey: ['vehicles', fleetId],
    queryFn: async () => {
      // TODO: Replace with Supabase query once tables are created
      return mockVehicles;
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicle: VehicleInsert) => {
      // TODO: Replace with Supabase insert once tables are created
      const newVehicle: Vehicle = {
        id: Math.random().toString(36).substring(7),
        ...vehicle,
        km: vehicle.km || 0,
        status: vehicle.status || 'active',
        blocked_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return newVehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Véhicule ajouté',
        description: 'Le véhicule a été créé avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vehicle> & { id: string }) => {
      // TODO: Replace with Supabase update once tables are created
      return { id, ...updates } as Vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Véhicule modifié',
        description: 'Les modifications ont été enregistrées.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
