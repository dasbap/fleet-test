import { useState, useEffect } from 'react';

export interface Incident {
  id: string;
  vehicle_id: string;
  fleet_id: string;
  reported_by: string;
  validated_by: string | null;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'validated' | 'in_progress' | 'resolved' | 'rejected';
  location: string | null;
  photo_urls: string[] | null;
  validation_notes: string | null;
  reported_at: string;
  validated_at: string | null;
  resolved_at: string | null;
  vehicle?: {
    id: string;
    plate_number: string;
    brand: string;
    model: string;
  };
}

// Mock data for demonstration
const mockIncidents: Incident[] = [
  {
    id: '1',
    vehicle_id: '1',
    fleet_id: '1',
    reported_by: 'driver-1',
    validated_by: null,
    title: 'Crevaison pneu avant droit',
    description: 'Crevaison sur la route de Thiès, pneu complètement à plat',
    severity: 'high',
    status: 'reported',
    location: 'Route de Thiès, km 45',
    photo_urls: null,
    validation_notes: null,
    reported_at: new Date().toISOString(),
    validated_at: null,
    resolved_at: null,
    vehicle: {
      id: '1',
      plate_number: 'DK-1234-AB',
      brand: 'Toyota',
      model: 'Hiace',
    },
  },
  {
    id: '2',
    vehicle_id: '2',
    fleet_id: '1',
    reported_by: 'driver-2',
    validated_by: 'mechanic-1',
    title: 'Feu stop arrière gauche HS',
    description: 'Le feu stop ne fonctionne plus',
    severity: 'medium',
    status: 'validated',
    location: null,
    photo_urls: null,
    validation_notes: 'Ampoule à remplacer, pièce commandée',
    reported_at: new Date(Date.now() - 86400000).toISOString(),
    validated_at: new Date().toISOString(),
    resolved_at: null,
    vehicle: {
      id: '2',
      plate_number: 'DK-5678-CD',
      brand: 'Renault',
      model: 'Master',
    },
  },
  {
    id: '3',
    vehicle_id: '3',
    fleet_id: '1',
    reported_by: 'driver-3',
    validated_by: 'mechanic-1',
    title: 'Vidange à effectuer',
    description: 'Kilométrage atteint pour la vidange programmée',
    severity: 'low',
    status: 'in_progress',
    location: null,
    photo_urls: null,
    validation_notes: 'Vidange en cours au garage',
    reported_at: new Date(Date.now() - 172800000).toISOString(),
    validated_at: new Date(Date.now() - 86400000).toISOString(),
    resolved_at: null,
    vehicle: {
      id: '3',
      plate_number: 'DK-9012-EF',
      brand: 'Mercedes',
      model: 'Sprinter',
    },
  },
  {
    id: '4',
    vehicle_id: '1',
    fleet_id: '1',
    reported_by: 'driver-1',
    validated_by: 'mechanic-1',
    title: 'Problème de frein',
    description: 'Bruit de grincement au freinage',
    severity: 'critical',
    status: 'resolved',
    location: 'Garage central',
    photo_urls: null,
    validation_notes: 'Plaquettes remplacées, véhicule opérationnel',
    reported_at: new Date(Date.now() - 604800000).toISOString(),
    validated_at: new Date(Date.now() - 518400000).toISOString(),
    resolved_at: new Date(Date.now() - 432000000).toISOString(),
    vehicle: {
      id: '1',
      plate_number: 'DK-1234-AB',
      brand: 'Toyota',
      model: 'Hiace',
    },
  },
];

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      // Simulate API call - will be replaced with real Supabase query
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIncidents(mockIncidents);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des incidents');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  return {
    incidents,
    isLoading,
    error,
    refetch: fetchIncidents,
  };
}
