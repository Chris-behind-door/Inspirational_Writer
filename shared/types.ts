export type InspirationTag = 'role' | 'plot' | 'world' | 'dialogue';

export interface InspirationItem {
  id: string;
  type: string;
  prompt: string;
  result: string;
  createdAt: number;
  title: string;
  content: string;
  folderName: string;
  tags: InspirationTag[];
  updatedAt?: number;
}
