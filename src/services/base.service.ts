/**
 * Interface de base pour les services
 * Les services contiennent la logique métier
 */
export interface IService<T, TInsert = Partial<T>, TUpdate = Partial<T>> {
  /**
   * Récupère les éléments avec application de la logique métier
   */
  getAll(filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Récupère un élément par son ID avec application de la logique métier
   */
  getById(id: string): Promise<T | null>;

  /**
   * Crée un nouvel élément avec validation métier
   */
  create(data: TInsert): Promise<T>;

  /**
   * Met à jour un élément avec validation métier
   */
  update(id: string, data: TUpdate): Promise<T>;

  /**
   * Supprime un élément avec validation métier
   */
  delete(id: string): Promise<void>;
}
