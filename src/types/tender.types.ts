/**
 * İhale verileri için tip tanımlamaları
 */

export interface TenderData {
  siraNo: string;           // Sıra No
  pozNo: string;            // İş Kalemi No (Poz No)
  tanim: string;            // İş Kaleminin Adı ve Kısa Açıklaması
  birim: string;            // Birimi (m³, m², adet, kg, vb.)
  miktar: number;           // Miktarı
  birimFiyat?: number;      // Teklif Edilen Birim Fiyat (opsiyonel)
  tutar?: number;           // Tutarı (opsiyonel, formülle hesaplanacak)
}

export interface ParseResult {
  success: boolean;
  data?: TenderData[];
  error?: string;
  warnings?: string[];
  rowCount?: number;
}

export interface ExcelExportOptions {
  fileName: string;
  includeFormulas: boolean;
  includeTotal: boolean;
}

export interface PriceListItem {
  pozNo: string;            // Poz numarası
  tanim: string;            // İş tanımı
  birim: string;            // Birim
  birimFiyat: number;       // Birim fiyat
}

export interface MatchResult {
  tenderItem: TenderData;
  priceItem?: PriceListItem;
  matchType: 'exact' | 'fuzzy' | 'manual' | 'none';
  confidence: number;       // 0-100 arası eşleşme güveni
}

export enum ProcessingStatus {
  IDLE = 'idle',
  PARSING = 'parsing',
  SUCCESS = 'success',
  ERROR = 'error'
}
