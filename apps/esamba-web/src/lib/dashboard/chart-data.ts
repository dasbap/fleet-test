import { format, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  ExpenseChartRow,
  FuelJournalRow,
  KmChartRow,
  ShiftKmRow,
} from "./types";

function lastSixMonthKeys() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    return {
      key: format(startOfMonth(d), "yyyy-MM"),
      label: format(startOfMonth(d), "MMM yy", { locale: fr }),
    };
  });
}

export function buildEmptyExpenseChartData(): ExpenseChartRow[] {
  return buildEmptyChartData().expenses;
}

/** Données vides pour les graphiques (6 derniers mois). */
export function buildEmptyChartData(): {
  expenses: ExpenseChartRow[];
  km: KmChartRow[];
} {
  const months = lastSixMonthKeys().map(({ label }) => label);

  return {
    expenses: months.map((month) => ({
      month,
      carburant: 0,
      entretien: 0,
      assurance: 0,
      autres: 0,
      montant: 0,
    })),
    km: months.map((month) => ({ month, km: 0, trajets: 0 })),
  };
}

/** Agrège le journal carburant (pas de vue v_monthly_expenses en prod). */
export function buildFuelExpensesChartData(
  fuelRows: FuelJournalRow[],
): ExpenseChartRow[] {
  return lastSixMonthKeys().map(({ key, label }) => {
    const monthRows = fuelRows.filter((row) =>
      row.purchased_at.startsWith(key),
    );
    const carburant = monthRows.reduce(
      (sum, row) => sum + Number(row.amount_xof ?? 0),
      0,
    );

    return {
      month: label,
      carburant,
      entretien: 0,
      assurance: 0,
      autres: 0,
      montant: carburant,
    };
  });
}

export function buildEmptyKmChartData(): KmChartRow[] {
  return buildEmptyChartData().km;
}

/** Kilomètres à partir des créneaux conducteurs clôturés. */
export function buildKmChartData(shifts: ShiftKmRow[]): KmChartRow[] {
  return lastSixMonthKeys().map(({ key, label }) => {
    const monthShifts = shifts.filter((shift) =>
      shift.ended_at?.startsWith(key),
    );
    const km = monthShifts.reduce((sum, shift) => {
      const end = shift.km_end ?? shift.km_start;
      return sum + Math.max(0, end - shift.km_start);
    }, 0);

    return {
      month: label,
      km: Math.round(km),
      trajets: monthShifts.length,
    };
  });
}

export function sumFuelThisMonth(fuelRows: FuelJournalRow[]): number {
  const monthKey = format(startOfMonth(new Date()), "yyyy-MM");
  return fuelRows
    .filter((row) => row.purchased_at.startsWith(monthKey))
    .reduce((sum, row) => sum + Number(row.amount_xof ?? 0), 0);
}

export function sumKmThisMonth(shifts: ShiftKmRow[]): number {
  const monthKey = format(startOfMonth(new Date()), "yyyy-MM");
  return Math.round(
    shifts
      .filter((shift) => shift.ended_at?.startsWith(monthKey))
      .reduce((sum, shift) => {
        const end = shift.km_end ?? shift.km_start;
        return sum + Math.max(0, end - shift.km_start);
      }, 0),
  );
}
