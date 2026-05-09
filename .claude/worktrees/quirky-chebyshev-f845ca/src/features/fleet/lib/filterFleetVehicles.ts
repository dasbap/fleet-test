import type {
  FleetVehicleAvailability,
  FleetVehicleFilterTab,
  FleetVehicleListItem,
} from "@/types/fleet-vehicle";

/** Filtre et recherche sur la liste mock / future API. */
export function filterFleetVehicleList(
  items: FleetVehicleListItem[],
  tab: FleetVehicleFilterTab,
  search: string
): FleetVehicleListItem[] {
  const q = search.trim().toLowerCase();
  let out = items;

  if (tab !== "all") {
    out = out.filter((v) => v.availability === (tab as FleetVehicleAvailability));
  }

  if (q.length > 0) {
    out = out.filter((v) => {
      const reg = v.registration.toLowerCase();
      const brand = v.brand.toLowerCase();
      const model = v.model.toLowerCase();
      return reg.includes(q) || brand.includes(q) || model.includes(q);
    });
  }

  return out;
}
