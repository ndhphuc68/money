export type SyncableRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  revision: number;
  originDeviceId: string;
};
