/**
 * Interface de base pour les repositories
 * Définit les opérations CRUD standard
 */
export interface IRepository<T, TInsert = Partial<T>, TUpdate = Partial<T>> {
  /**
   * Récupère tous les éléments, optionnellement filtrés
   */
  findAll(filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Récupère un élément par son ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Crée un nouvel élément
   */
  create(data: TInsert): Promise<T>;

  /**
   * Met à jour un élément existant
   */
  update(id: string, data: TUpdate): Promise<T>;

  /**
   * Supprime un élément
   */
  delete(id: string): Promise<void>;
}

/**
 * Classe abstraite de base pour les repositories
 * Fournit une implémentation commune si nécessaire
 */
export abstract class BaseRepository<T, TInsert = Partial<T>, TUpdate = Partial<T>>
  implements IRepository<T, TInsert, TUpdate>
{
  abstract findAll(filters?: Record<string, unknown>): Promise<T[]>;
  abstract findById(id: string): Promise<T | null>;
  abstract create(data: TInsert): Promise<T>;
  abstract update(id: string, data: TUpdate): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
