import { VehicleRepository } from "@/repositories/vehicle.repository";

export class ScanRepository {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  async findVehicleById(vehicleId: string) {
    return this.vehicleRepository.findById(vehicleId);
  }

  async findVehicleByRegistration(registration: string, fleetId: string) {
    return this.vehicleRepository.findByRegistration(registration, fleetId);
  }
}

