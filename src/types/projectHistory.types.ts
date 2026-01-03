/**
 * Project History Types
 * Defines the structure for saved project sessions
 */

import type { TenderData } from './tender.types';

export interface ProjectHistory {
  id: string; // UUID from Supabase
  name: string; // User-provided project name
  fileName: string; // Original Word file name
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  date?: string; // Legacy support - backward compatibility
  itemCount: number; // Number of items in the project
  matchedCount: number; // Number of matched items
  totalAmount: number; // Total calculated amount
  status: 'active' | 'completed' | 'archived';
  data: TenderData[]; // The actual table data
}

// Legacy support - eski format
export interface TenderItem {
  siraNo: number;
  pozNo: string;
  tanim: string;
  birim: string;
  miktar: number;
  birimFiyat: number;
  tutar: number;
}

// Legacy storage format - artık kullanılmıyor (Supabase'e taşındı)
export interface ProjectHistoryStorage {
  projects: ProjectHistory[];
  lastUpdated: string;
}

