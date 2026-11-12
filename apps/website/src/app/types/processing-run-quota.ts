export interface ProcessingRunQuota {
  limit: number;
  remaining: number;
  nextAvailableAt: string | null;
}
