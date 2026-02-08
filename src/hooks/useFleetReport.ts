import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { FleetReportService } from '@/services/fleet-report.service';
import { FleetReportRepository } from '@/repositories/fleet-report.repository';

const fleetReportRepository = new FleetReportRepository();
const fleetReportService = new FleetReportService(fleetReportRepository);

export interface FleetReportData {
  period: {
    start: Date;
    end: Date;
  };
  fleet: {
    name: string;
    totalVehicles: number;
    activeVehicles: number;
    blockedVehicles: number;
  };
  revenue: {
    total: number;
    validated: number;
    pending: number;
    byVehicle: Array<{
      registration: string;
      amount: number;
    }>;
  };
  kilometers: {
    total: number;
    average: number;
    byVehicle: Array<{
      registration: string;
      km: number;
    }>;
  };
  incidents: {
    total: number;
    bySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    recent: Array<{
      date: Date;
      vehicle: string;
      description: string;
      severity: string;
    }>;
  };
  maintenance: {
    completed: number;
    inProgress: number;
    pending: number;
  };
  drivers: {
    total: number;
    active: number;
    topPerformers: Array<{
      name: string;
      revenue: number;
      shifts: number;
    }>;
    scores: Array<{
      driver_id: string;
      name: string;
      score_level: 'green' | 'orange' | 'red';
      financial_score: number;
    }>;
  };
  timeline: Array<{
    date: Date;
    revenue: number;
    validated: boolean;
  }>;
}

export function useFleetReport(startDate: Date, endDate: Date) {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['fleet-report', userFleetId, startDate.toISOString(), endDate.toISOString()],
    queryFn: (): Promise<FleetReportData> => {
      if (!userFleetId) throw new Error('No fleet ID available');
      return fleetReportService.getReport(userFleetId, startDate, endDate);
    },
    enabled: !!userFleetId,
  });
}
