import { FleetReportRepository } from '@/repositories/fleet-report.repository';

export interface FleetReportData {
  period: { start: Date; end: Date };
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
    byVehicle: Array<{ registration: string; amount: number }>;
  };
  kilometers: {
    total: number;
    average: number;
    byVehicle: Array<{ registration: string; km: number }>;
  };
  incidents: {
    total: number;
    bySeverity: { low: number; medium: number; high: number; critical: number };
    recent: Array<{ date: Date; vehicle: string; description: string; severity: string }>;
  };
  maintenance: {
    completed: number;
    inProgress: number;
    pending: number;
  };
  drivers: {
    total: number;
    active: number;
    topPerformers: Array<{ name: string; revenue: number; shifts: number }>;
    scores: Array<{
      driver_id: string;
      name: string;
      score_level: 'green' | 'orange' | 'red';
      financial_score: number;
    }>;
  };
  timeline: Array<{ date: Date; revenue: number; validated: boolean }>;
}

/**
 * Service pour la logique métier du rapport de flotte
 */
export class FleetReportService {
  constructor(private repository: FleetReportRepository) {}

  async getReport(fleetId: string, startDate: Date, endDate: Date): Promise<FleetReportData> {
    if (!fleetId) {
      throw new Error('L\'ID de la flotte est requis');
    }
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    const raw = await this.repository.getReportRaw(fleetId, startISO, endISO);

    const validatedClosures = raw.closures.filter((c) => c.status === 'validated');
    const pendingClosures = raw.closures.filter((c) => c.status === 'pending');
    const totalRevenue = raw.closures.reduce((sum, c) => sum + (c.revenue_declared || 0), 0);
    const validatedRevenue = validatedClosures.reduce((sum, c) => sum + (c.revenue_declared || 0), 0);
    const pendingRevenue = pendingClosures.reduce((sum, c) => sum + (c.revenue_declared || 0), 0);

    const revenueByVehicle: Record<string, number> = {};
    raw.closures.forEach((c) => {
      const reg = c.shift?.assignment?.vehicle?.registration;
      if (reg) {
        revenueByVehicle[reg] = (revenueByVehicle[reg] || 0) + (c.revenue_declared || 0);
      }
    });

    let totalKm = 0;
    const kmByVehicle: Record<string, number> = {};
    raw.closures.forEach((c) => {
      const shift = c.shift;
      if (shift?.km_start != null && shift?.km_end != null) {
        const km = shift.km_end - shift.km_start;
        totalKm += km;
        const reg = shift.assignment?.vehicle?.registration;
        if (reg) {
          kmByVehicle[reg] = (kmByVehicle[reg] || 0) + km;
        }
      }
    });

    const incidentsBySeverity = {
      low: raw.incidents.filter((i) => i.severity === 'low').length,
      medium: raw.incidents.filter((i) => i.severity === 'medium').length,
      high: raw.incidents.filter((i) => i.severity === 'high').length,
      critical: raw.incidents.filter((i) => i.severity === 'critical').length,
    };

    const driverStats: Record<string, { name: string; revenue: number; shifts: number }> = {};
    raw.closures.forEach((c) => {
      const driverName = c.shift?.assignment?.driver?.full_name;
      if (driverName) {
        if (!driverStats[driverName]) {
          driverStats[driverName] = { name: driverName, revenue: 0, shifts: 0 };
        }
        driverStats[driverName].revenue += c.revenue_declared || 0;
        driverStats[driverName].shifts += 1;
      }
    });

    return {
      period: { start: startDate, end: endDate },
      fleet: {
        name: raw.fleet?.name || 'Ma Flotte',
        totalVehicles: raw.vehicles.length,
        activeVehicles: raw.vehicles.filter((v) => v.status === 'ok').length,
        blockedVehicles: raw.vehicles.filter((v) => v.status === 'blocked').length,
      },
      revenue: {
        total: totalRevenue,
        validated: validatedRevenue,
        pending: pendingRevenue,
        byVehicle: Object.entries(revenueByVehicle)
          .map(([registration, amount]) => ({ registration, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10),
      },
      kilometers: {
        total: totalKm,
        average: raw.closures.length > 0 ? Math.round(totalKm / raw.closures.length) : 0,
        byVehicle: Object.entries(kmByVehicle)
          .map(([registration, km]) => ({ registration, km }))
          .sort((a, b) => b.km - a.km)
          .slice(0, 10),
      },
      incidents: {
        total: raw.incidents.length,
        bySeverity: incidentsBySeverity,
        recent: raw.incidents.slice(0, 10).map((i) => ({
          date: new Date(i.created_at),
          vehicle: i.vehicle?.registration || '—',
          description: i.description || '',
          severity: i.severity,
        })),
      },
      maintenance: {
        completed: raw.maintenance.filter((m) => m.status === 'ready').length,
        inProgress: raw.maintenance.filter((m) => m.status === 'in_progress').length,
        pending: raw.maintenance.filter((m) => m.status === 'queued').length,
      },
      drivers: {
        total: raw.members.length,
        active: raw.members.filter((m) => m.is_active).length,
        topPerformers: Object.values(driverStats)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        scores: raw.scores.map((s) => ({
          driver_id: s.driver_user_id,
          name: s.driver?.full_name || 'Chauffeur inconnu',
          score_level: s.score_level as 'green' | 'orange' | 'red',
          financial_score: s.financial_score,
        })),
      },
      timeline: raw.closures.map((c) => ({
        date: new Date(c.created_at),
        revenue: c.revenue_declared || 0,
        validated: c.status === 'validated',
      })),
    };
  }
}
