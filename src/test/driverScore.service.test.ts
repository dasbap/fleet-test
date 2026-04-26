import { describe, expect, it, vi } from 'vitest';
import { DriverScoreService } from '@/services/driver-score.service';

describe('driver-score.service', () => {
  it('propage les options de récupération des scores', async () => {
    const repository = {
      findByFleet: vi.fn().mockResolvedValue([]),
      calculateScoreV2: vi.fn().mockResolvedValue('green'),
      findSnapshotsByDriver: vi.fn().mockResolvedValue([]),
    };
    const service = new DriverScoreService(repository as never);

    await service.getDriverScores('fleet-id', { limit: 5 });

    expect(repository.findByFleet).toHaveBeenCalledWith('fleet-id', { limit: 5 });
  });

  it('normalise un limit décimal vers un entier', async () => {
    const repository = {
      findByFleet: vi.fn().mockResolvedValue([]),
      calculateScoreV2: vi.fn().mockResolvedValue('green'),
      findSnapshotsByDriver: vi.fn().mockResolvedValue([]),
    };
    const service = new DriverScoreService(repository as never);

    await service.getDriverScores('fleet-id', { limit: 5.9 });

    expect(repository.findByFleet).toHaveBeenCalledWith('fleet-id', { limit: 5 });
  });

  it('ignore un limit invalide', async () => {
    const repository = {
      findByFleet: vi.fn().mockResolvedValue([]),
      calculateScoreV2: vi.fn().mockResolvedValue('green'),
      findSnapshotsByDriver: vi.fn().mockResolvedValue([]),
    };
    const service = new DriverScoreService(repository as never);

    await service.getDriverScores('fleet-id', { limit: -10 });

    expect(repository.findByFleet).toHaveBeenCalledWith('fleet-id', { limit: undefined });
  });

  it('borne un limit trop élevé', async () => {
    const repository = {
      findByFleet: vi.fn().mockResolvedValue([]),
      calculateScoreV2: vi.fn().mockResolvedValue('green'),
      findSnapshotsByDriver: vi.fn().mockResolvedValue([]),
    };
    const service = new DriverScoreService(repository as never);

    await service.getDriverScores('fleet-id', { limit: 1000 });

    expect(repository.findByFleet).toHaveBeenCalledWith('fleet-id', { limit: 100 });
  });

  it('passe le modelVersion v1-hybrid par défaut', async () => {
    const repository = {
      findByFleet: vi.fn().mockResolvedValue([]),
      calculateScoreV2: vi.fn().mockResolvedValue('green'),
      findSnapshotsByDriver: vi.fn().mockResolvedValue([]),
    };
    const service = new DriverScoreService(repository as never);

    await service.calculateDriverScore('driver-id', 'fleet-id');

    expect(repository.calculateScoreV2).toHaveBeenCalledWith(
      'driver-id',
      'fleet-id',
      'v1-hybrid',
    );
  });

  it('retourne tableau vide des snapshots si clés manquantes', async () => {
    const repository = {
      findByFleet: vi.fn().mockResolvedValue([]),
      calculateScoreV2: vi.fn().mockResolvedValue('green'),
      findSnapshotsByDriver: vi.fn().mockResolvedValue([]),
    };
    const service = new DriverScoreService(repository as never);

    await expect(service.getDriverScoreSnapshots('', 'fleet-id')).resolves.toEqual([]);
    expect(repository.findSnapshotsByDriver).not.toHaveBeenCalled();
  });
});
