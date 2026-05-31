import type {
  OrganizerOperationsMock,
  ManagerOperationsMock,
  MockDriverDay,
  MechanicOperationsMock,
} from "@/features/operations/mocks/operationsMock";
import { getDefaultDriverChecklists } from "@/features/operations/mocks/operationsMock";
import { IncidentRepository } from "@/repositories/incident.repository";
import { MaintenanceRepository } from "@/repositories/maintenance.repository";
import { DriverShiftRepository } from "@/repositories/driver-shift.repository";
import { PlannedShiftRepository } from "@/repositories/planned-shift.repository";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import { DashboardRepository } from "@/repositories/dashboard.repository";
import { DvirRepository } from "@/repositories/dvir.repository";
import {
  buildOrganizerTasks,
  incidentToManagerCard,
  incidentToOperationalCard,
  maintenanceJobToIntervention,
  maintenanceJobToScheduledRow,
  shiftToCirculation,
  shiftToMissionCard,
  plannedShiftToMissionCard,
  startOfTodayIso,
} from "@/services/operations.mappers";
import { mergeServerChecklistProgress } from "@/services/driver-operations-checklist.service";

function vehicleLabelParts(brand: string | null | undefined, model: string | null | undefined, registration: string) {
  const name = [brand, model].filter(Boolean).join(" ").trim();
  return name || registration;
}

function formatKm(km: number) {
  return `${km.toLocaleString("fr-FR")} km`;
}

/**
 * Agrégats « Opérations » : lectures multi-tables via repositories métier.
 */
export class OperationsRepository {
  private incidents = new IncidentRepository();
  private maintenance = new MaintenanceRepository();
  private shifts = new DriverShiftRepository();
  private plannedShifts = new PlannedShiftRepository();
  private vehicles = new VehicleRepository();
  private dashboard = new DashboardRepository();
  private dvir = new DvirRepository();

  async fetchOrganizerSnapshot(fleetId: string): Promise<OrganizerOperationsMock> {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [openShifts, plannedToday, recentIncidents, pendingClosures, queuedJobs] = await Promise.all([
      this.shifts.findOpenShiftsByFleetId(fleetId),
      this.plannedShifts.findByFleetToday(fleetId),
      this.incidents.findAll({ fleet_id: fleetId, created_at_since: since30d, limit: 12 }),
      this.shifts.findPendingClosuresForFleet(fleetId),
      this.maintenance.findAll({ fleet_id: fleetId, status: "queued", limit: 30 }),
    ]);

    const missionsToday = openShifts.map(shiftToMissionCard);
    const plannedShiftsToday = plannedToday
      .filter((p) => p.status === 'confirmed' || p.status === 'missed')
      .map((p) => plannedShiftToMissionCard(p));
    const vehiclesInService = openShifts.map(shiftToCirculation);
    const operationalIncidents = recentIncidents.slice(0, 8).map(incidentToOperationalCard);

    const assignedTasks = buildOrganizerTasks({
      pendingClosureCount: pendingClosures.length,
      queuedMaintenanceCount: queuedJobs.length,
      recentIncidentCount: recentIncidents.length,
    });

    return {
      missionsToday,
      plannedShiftsToday,
      vehiclesInService,
      operationalIncidents,
      assignedTasks,
    };
  }

  async fetchManagerSnapshot(fleetId: string): Promise<ManagerOperationsMock> {
    const [stats, listIncidents, scheduled] = await Promise.all([
      this.dashboard.getStats(fleetId),
      this.incidents.findAll({ fleet_id: fleetId, limit: 12 }),
      this.maintenance.findScheduledForFleet(fleetId, 12),
    ]);

    const summary: ManagerOperationsMock["summary"] = [
      {
        label: "Véhicules opérationnels",
        value: String(stats.activeVehicles),
        hint: `${stats.totalVehicles} véhicules au total`,
      },
      {
        label: "Incidents (fenêtre stats)",
        value: String(stats.pendingIncidents),
        hint: "Signalements récents sur le parc",
      },
      {
        label: "Maintenance en cours",
        value: String(stats.maintenanceInProgress),
        hint: `${stats.pendingClosures} clôture(s) en attente`,
      },
    ];

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...listIncidents].sort(
      (a, b) =>
        (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) -
        (severityOrder[b.severity as keyof typeof severityOrder] ?? 4)
    );

    let scheduledMaintenance = scheduled.map(maintenanceJobToScheduledRow);
    if (scheduledMaintenance.length === 0) {
      const fallback = await this.maintenance.findAll({
        fleet_id: fleetId,
        status: "queued",
        limit: 6,
      });
      scheduledMaintenance = fallback.map((job) => {
        const row = maintenanceJobToScheduledRow(job);
        return job.planned_at
          ? row
          : {
              ...row,
              scheduledLabel: "À planifier",
            };
      });
    }

    return {
      summary,
      incidents: sorted.slice(0, 8).map(incidentToManagerCard),
      scheduledMaintenance,
    };
  }

  private async enrichDriverChecklists(
    userId: string,
    fleetId: string | null,
    vehicleId: string | null,
    shiftId: string | null,
    shiftKmEnd: number | null,
  ) {
    const defaults = getDefaultDriverChecklists();
    if (!fleetId || !vehicleId) {
      return defaults;
    }

    const todayStart = startOfTodayIso();
    const [dvirToday, closure] = await Promise.all([
      this.dvir.getList({
        fleetId,
        vehicleId,
        inspectedBy: userId,
        dateFrom: todayStart,
        limit: 10,
      }),
      shiftId ? this.shifts.findClosureByShiftId(shiftId) : Promise.resolve(null),
    ]);

    const hasPreTripDvirToday = dvirToday.some((d) => d.inspection_type === "pre_trip");
    const hasPostTripDvirToday = dvirToday.some((d) => d.inspection_type === "post_trip");
    const hasClosureWithKm = Boolean(closure) || (shiftKmEnd ?? 0) > 0;

    return mergeServerChecklistProgress(defaults, {
      hasPreTripDvirToday,
      hasPostTripDvirToday,
      hasClosureWithKm,
    });
  }

  async fetchDriverDay(userId: string): Promise<MockDriverDay> {
    const shift = await this.shifts.findActiveShiftByDriverId(userId);
    if (shift?.assignment?.vehicle) {
      const v = shift.assignment.vehicle;
      const reg = v.registration;
      const fleetId = shift.assignment.fleet_id;
      const fullVehicle = await this.vehicles.findById(v.id);
      const km = fullVehicle?.current_km ?? shift.km_start;
      const { departureChecklist, arrivalChecklist } = await this.enrichDriverChecklists(
        userId,
        fleetId,
        v.id,
        shift.id,
        shift.km_end,
      );

      return {
        missionTitle: "Créneau en cours",
        missionRoute: "Service actif — clôturez le créneau en fin de tournée depuis la page dédiée.",
        missionStatus: "in_progress",
        missionTime: `Démarré à ${new Date(shift.started_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })} · km départ ${shift.km_start}`,
        vehicleLabel: vehicleLabelParts(v.brand, v.model, reg),
        vehiclePlate: reg,
        vehicleKm: formatKm(km),
        activeShiftId: shift.id,
        vehicleId: v.id,
        fleetId,
        departureChecklist,
        arrivalChecklist,
      };
    }

    const assign = await this.vehicles.findActiveAssignmentVehicleForDriver(userId);
    if (assign) {
      const v = assign.vehicle;
      const { departureChecklist, arrivalChecklist } = await this.enrichDriverChecklists(
        userId,
        assign.fleetId,
        v.id,
        null,
        null,
      );

      return {
        missionTitle: "Aucun créneau ouvert",
        missionRoute: "Démarrez un créneau lorsque vous prenez le véhicule, ou contactez la régulation.",
        missionStatus: "planned",
        missionTime: "—",
        vehicleLabel: vehicleLabelParts(v.brand, v.model, v.registration),
        vehiclePlate: v.registration,
        vehicleKm: formatKm(v.current_km ?? 0),
        activeShiftId: null,
        vehicleId: v.id,
        fleetId: assign.fleetId,
        departureChecklist,
        arrivalChecklist,
      };
    }

    const { departureChecklist, arrivalChecklist } = getDefaultDriverChecklists();

    return {
      missionTitle: "Aucune mission assignée",
      missionRoute: "Aucune affectation véhicule active — vérifiez avec votre superviseur.",
      missionStatus: "planned",
      missionTime: "—",
      vehicleLabel: "—",
      vehiclePlate: "—",
      vehicleKm: "—",
      activeShiftId: null,
      vehicleId: null,
      fleetId: null,
      departureChecklist,
      arrivalChecklist,
    };
  }

  async fetchMechanicDay(fleetId: string): Promise<MechanicOperationsMock> {
    const start = startOfTodayIso();
    let jobs = await this.maintenance.findAll({
      fleet_id: fleetId,
      created_at_since: start,
      limit: 40,
    });
    if (jobs.length === 0) {
      jobs = await this.maintenance.findAll({ fleet_id: fleetId, limit: 25 });
    }
    const interventionsToday = jobs.map(maintenanceJobToIntervention);
    return { interventionsToday };
  }
}
