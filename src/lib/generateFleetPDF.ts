import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FleetReportData } from '@/hooks/useFleetReport';

export function generateFleetPDF(data: FleetReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper function
  const addSection = (title: string) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204);
    doc.text(title, 14, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 204);
  doc.text('E-Samba', 14, yPos);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Rapport de Flotte', pageWidth - 14, yPos, { align: 'right' });
  
  yPos += 10;
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(data.fleet.name, 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Période: ${format(data.period.start, 'dd MMMM yyyy', { locale: fr })} - ${format(data.period.end, 'dd MMMM yyyy', { locale: fr })}`,
    14,
    yPos
  );
  doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth - 14, yPos, { align: 'right' });

  // Divider
  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, yPos, pageWidth - 14, yPos);

  // Summary Section
  addSection('📊 Résumé');
  
  const summaryData = [
    ['Véhicules actifs', `${data.fleet.activeVehicles} / ${data.fleet.totalVehicles}`],
    ['Véhicules bloqués', data.fleet.blockedVehicles.toString()],
    ['Chauffeurs actifs', `${data.drivers.active} / ${data.drivers.total}`],
    ['Revenus validés', formatMoney(data.revenue.validated)],
    ['Revenus en attente', formatMoney(data.revenue.pending)],
    ['Kilomètres parcourus', `${data.kilometers.total.toLocaleString('fr-FR')} km`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'left' },
    },
    margin: { left: 14 },
  });

  const docWithAutoTable = doc as { lastAutoTable?: { finalY: number } };
  yPos = (docWithAutoTable.lastAutoTable?.finalY ?? yPos) + 5;

  // Revenue Section
  addSection('💰 Revenus par Véhicule');
  
  if (data.revenue.byVehicle.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Immatriculation', 'Revenus']],
      body: data.revenue.byVehicle.map(v => [v.registration, formatMoney(v.amount)]),
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14 },
    });
    yPos = (docWithAutoTable.lastAutoTable?.finalY ?? yPos) + 5;
  } else {
    doc.text('Aucune donnée de revenu pour cette période.', 14, yPos);
    yPos += 8;
  }

  // Kilometers Section
  addSection('🚗 Kilomètres par Véhicule');
  
  if (data.kilometers.byVehicle.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Immatriculation', 'Kilomètres']],
      body: data.kilometers.byVehicle.map(v => [v.registration, `${v.km.toLocaleString('fr-FR')} km`]),
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14 },
    });
    yPos = (docWithAutoTable.lastAutoTable?.finalY ?? yPos) + 5;
  } else {
    doc.text('Aucune donnée de kilométrage pour cette période.', 14, yPos);
    yPos += 8;
  }

  // Incidents Section
  addSection('⚠️ Incidents');
  
  const incidentSummary = [
    ['Total incidents', data.incidents.total.toString()],
    ['Critiques', data.incidents.bySeverity.critical.toString()],
    ['Élevés', data.incidents.bySeverity.high.toString()],
    ['Moyens', data.incidents.bySeverity.medium.toString()],
    ['Faibles', data.incidents.bySeverity.low.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: incidentSummary,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
    },
    margin: { left: 14 },
  });
  yPos = (docWithAutoTable.lastAutoTable?.finalY ?? yPos) + 5;

  if (data.incidents.recent.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Véhicule', 'Description', 'Sévérité']],
      body: data.incidents.recent.map(i => [
        format(i.date, 'dd/MM/yyyy', { locale: fr }),
        i.vehicle,
        i.description.substring(0, 40) + (i.description.length > 40 ? '...' : ''),
        i.severity,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204], fontSize: 10 },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 14 },
    });
    yPos = (docWithAutoTable.lastAutoTable?.finalY ?? yPos) + 5;
  }

  // Maintenance Section
  addSection('🔧 Maintenance');
  
  const maintenanceData = [
    ['Terminées', data.maintenance.completed.toString()],
    ['En cours', data.maintenance.inProgress.toString()],
    ['En attente', data.maintenance.pending.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: maintenanceData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
    },
    margin: { left: 14 },
  });
  yPos = (docWithAutoTable.lastAutoTable?.finalY ?? yPos) + 5;

  // Top Performers Section
  if (data.drivers.topPerformers.length > 0) {
    addSection('🏆 Top Chauffeurs');
    
    autoTable(doc, {
      startY: yPos,
      head: [['Chauffeur', 'Revenus', 'Créneaux']],
      body: data.drivers.topPerformers.map(d => [
        d.name,
        formatMoney(d.revenue),
        d.shifts.toString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} / ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'E-Samba - Smart Mobility Africa',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const fileName = `rapport-flotte-${format(data.period.start, 'yyyy-MM-dd')}-${format(data.period.end, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
