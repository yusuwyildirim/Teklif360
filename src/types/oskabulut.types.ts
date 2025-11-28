/**
 * Oskabulut.com entegrasyonu için tip tanımları
 */

/**
 * Oskabulut kullanıcı giriş bilgileri
 */
export interface OskabulutCredentials {
  email: string;
  password: string;
}

/**
 * Oskabulut arama sonucu (scraping ile elde edilen)
 */
export interface OskabulutSearchResult {
  pozNo: string;          // 15.341.3001
  tanim: string;          // Ürün açıklaması
  birim: string;          // m², adet, kg vb.
  birimFiyat: string;     // "1.159,69" formatında
  kitapAdi: string;       // ÇŞB
  fasikulAdi: string;     // İnşaat
}

/**
 * Login response durumu
 */
export interface OskabulutLoginResponse {
  success: boolean;
  message?: string;
  sessionId?: string;
}

/**
 * Scraping işlemi sonucu
 */
export interface OskabulutScraperResult {
  success: boolean;
  data?: OskabulutSearchResult[];
  error?: string;
  searchTerm?: string;
}

/**
 * Batch arama için progress tracking
 */
export interface OskabulutSearchProgress {
  total: number;
  completed: number;
  current: string;  // Şu anda aranan terim
  failed: number;
}

/**
 * Smart search stratejisi seviyeleri
 */
export enum SearchLevel {
  POZ_NO = 'poz_no',           // Level 1: POZ numarası ile arama
  FULL_NAME = 'full_name',     // Level 2: Tam ürün adı ile arama
  TRUNCATED = 'truncated'      // Level 3: Kısaltılmış ad ile arama
}

/**
 * Smart search sonucu
 */
export interface SmartSearchResult {
  result: OskabulutSearchResult | null;
  searchLevel: SearchLevel;
  searchTerm: string;
  attempts: number;  // Kaç deneme yapıldı
}
