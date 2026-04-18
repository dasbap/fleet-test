/**
 * Précharge un petit lot de fiches véhicule pour améliorer l'accès hors ligne.
 */
export async function prefetchVehicleDetails(
  ids: string[],
  fetchVehicleDetail: (id: string) => Promise<unknown>
) {
  const uniqueIds = [...new Set(ids)].slice(0, 12);
  await Promise.allSettled(uniqueIds.map((id) => fetchVehicleDetail(id)));
}
