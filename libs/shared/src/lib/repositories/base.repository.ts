export interface BaseRepository<T, CreateDto, UpdateDto> {
  create(tenantId: string, data: CreateDto): Promise<T>;
  findAll(tenantId: string, skip?: number, take?: number): Promise<T[]>;
  findById(tenantId: string, id: string): Promise<T | null>;
  update(tenantId: string, id: string, data: UpdateDto): Promise<T>;
  delete(tenantId: string, id: string): Promise<T>;
}
