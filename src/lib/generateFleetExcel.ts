import * as XLSX from 'xlsx';
import { FleetReportData } from '@/hooks/useFleetReport';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function generateFleetExcel(data: FleetReportData) {
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Rapport de Flotte - ' + data.fleet.name],
    [''],
    ['Période', `${format(data.period.start, 'dd/MM/yyyy', { locale: fr })} - ${format(data.period.end, 'dd/MM/yyyy', { locale: fr })}`],
    [''],
    ['RÉSUMÉ'],
    ['Véhicules totaux', data.fleet.totalVehicles],
    ['Véhicules actifs', data.fleet.activeVehicles],
    ['Véhicules bloqués', data.fleet.blockedVehicles],
    [''],
    ['REVENUS'],
    ['Total', `${data.revenue.total.toLocaleString('fr-FR')} FCFA`],
    ['Validés', `${data.revenue.validated.toLocaleString('fr-FR')} FCFA`],
    ['En attente', `${data.revenue.pending.toLocaleString('fr-FR')} FCFA`],
    [''],
    ['KILOMÉTRAGE'],
    ['Total', `${data.kilometers.total.toLocaleString('fr-FR')} km`],
    ['Moyenne par créneau', `${data.kilometers.average.toLocaleString('fr-FR')} km`],
    [''],
    ['INCIDENTS'],
    ['Total', data.incidents.total],
    ['Critiques', data.incidents.bySeverity.critical],
    ['Élevés', data.incidents.bySeverity.high],
    ['Moyens', data.incidents.bySeverity.medium],
    ['Faibles', data.incidents.bySeverity.low],
    [''],
    ['MAINTENANCE'],
    ['Terminées', data.maintenance.completed],
    ['En cours', data.maintenance.inProgress],
    ['En attente', data.maintenance.pending],
    [''],
    ['CHAUFFEURS'],
    ['Total', data.drivers.total],
    ['Actifs', data.drivers.active],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');
  
  // Revenue by vehicle sheet
  if (data.revenue.byVehicle.length > 0) {
    const revenueHeaders = ['Immatriculation', 'Revenus (FCFA)'];
    const revenueRows = data.revenue.byVehicle.map(v => [
      v.registration,
      v.amount
    ]);
    const revenueSheet = XLSX.utils.aoa_to_sheet([revenueHeaders, ...revenueRows]);
    revenueSheet['!cols'] = [{ wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenus par véhicule');
  }
  
  // Kilometers by vehicle sheet
  if (data.kilometers.byVehicle.length > 0) {
    const kmHeaders = ['Immatriculation', 'Kilomètres'];
    const kmRows = data.kilometers.byVehicle.map(v => [
      v.registration,
      v.km
    ]);
    const kmSheet = XLSX.utils.aoa_to_sheet([kmHeaders, ...kmRows]);
    kmSheet['!cols'] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, kmSheet, 'Kilomètres par véhicule');
  }
  
  // Top performers sheet
  if (data.drivers.topPerformers.length > 0) {
    const driversHeaders = ['Chauffeur', 'Revenus (FCFA)', 'Nombre de créneaux'];
    const driversRows = data.drivers.topPerformers.map(d => [
      d.name,
      d.revenue,
      d.shifts
    ]);
    const driversSheet = XLSX.utils.aoa_to_sheet([driversHeaders, ...driversRows]);
    driversSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, driversSheet, 'Top Chauffeurs');
  }
  
  // Incidents sheet
  if (data.incidents.recent.length > 0) {
    const incidentsHeaders = ['Date', 'Véhicule', 'Sévérité', 'Description'];
    const incidentsRows = data.incidents.recent.map(i => [
      format(i.date, 'dd/MM/yyyy HH:mm', { locale: fr }),
      i.vehicle,
      i.severity,
      i.description
    ]);
    const incidentsSheet = XLSX.utils.aoa_to_sheet([incidentsHeaders, ...incidentsRows]);
    incidentsSheet['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, incidentsSheet, 'Incidents');
  }
  
  // Generate filename and download
  const filename = `rapport-flotte-${format(data.period.start, 'yyyy-MM-dd')}-${format(data.period.end, 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
