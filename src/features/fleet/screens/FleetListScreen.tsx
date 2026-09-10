import FleetVehiclesListPage from "./FleetVehiclesListPage";
import { VehicleGpsManagementSection } from "@/components/vehicles/VehicleGpsManagementSection";

export default function FleetListScreen() {
  return (
    <>
      <FleetVehiclesListPage />
      <VehicleGpsManagementSection />
    </>
  );
}
