/**
 * Project History Types
 * Defines the structure for saved project sessions
 */

export interface ProjectHistory {
  id: string; // Unique identifier (timestamp-based)
  name: string; // User-provided project name
  date: string; // ISO date string
  fileName: string; // Original Word file name
  itemCount: number; // Number of items in the project
  totalAmount: number; // Total calculated amount
  data: TenderItem[]; // The actual table data
}

export interface TenderItem {
  siraNo: number;
  pozNo: string;
  tanim: string;
  birim: string;
  miktar: number;
  birimFiyat: number;
  tutar: number;
}

export interface ProjectHistoryStorage {
  projects: ProjectHistory[];
  lastUpdated: string;
}
