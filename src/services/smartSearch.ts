/**
 * Smart Search Algorithm v2.0
 * Geliştirilmiş 3-level arama stratejisi
 * 
 * Level 1: POZ NO ile arama (farklı formatlar)
 * Level 2: Temizlenmiş ürün adı ile arama
 * Level 3: Anahtar kelimelerle kademeli arama
 */

import { searchByPozNo, searchByName } from './oskabulutScraper';
import type { SmartSearchResult, OskabulutSearchResult, SearchLevel } from '@/types/oskabulut.types';

// Önemsiz kelimeler - aramadan çıkarılacak
const STOP_WORDS = new Set([
  've', 'ile', 'her', 'gibi', 'için', 'olan', 'veya', 'dahil', 'de', 'da',
  'olarak', 'uygun', 'yapılması', 'edilmesi', 'temini', 'verilmesi', 
  'konulması', 'montajı', 'yerine', 'işyerinde', 'şartname', 'şartnamesine',
  'kalite', 'sınıf', 'sınıfı', 'ekstra', 'birinci', 'türlü', 'çeşitli',
  'benzer', 'benzeri', 'kadar', 'arası', 'arasında', 'bir', 'bir', 'bu',
  'şu', 'ki', 'herhangi', 'tüm', 'bütün', 'özel', 'genel', 'çeşit'
]);

// TS/EN referanslarını temizle
const TS_EN_PATTERN = /\(?\s*TS\s*(?:EN\s*)?(?:ISO\s*)?\d+[\-\d\/]*\s*\)?/gi;

// Özel karakterleri temizle
const SPECIAL_CHARS = /[°ø²³×µ'"()[\]{}]/g;

/**
 * Arama metnini normalize et - ÖNEMLİ: 500 hatalarını önlemek için
 */
function normalizeSearchText(text: string): string {
  if (!text) return '';
  
  return text
    // TS/EN referanslarını kaldır
    .replace(TS_EN_PATTERN, ' ')
    // Özel karakterleri temizle
    .replace(SPECIAL_CHARS, ' ')
    // Tire ve alt çizgileri boşluğa çevir
    .replace(/[-_]/g, ' ')
    // Virgül ve noktalı virgülü temizle
    .replace(/[,;:]/g, ' ')
    // Sayı+birim kombinasyonlarını ayır (10mm → 10 mm)
    .replace(/(\d+)(mm|cm|m|kg|lt|kw|mpa|kpa)/gi, '$1 $2')
    // Çift boşlukları tek yap
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Anahtar kelimeleri çıkar
 */
function extractKeywords(text: string): string[] {
  const normalized = normalizeSearchText(text);
  
  const words = normalized
    .toLowerCase()
    .split(/\s+/)
    .filter(word => {
      // 2 karakterden kısa kelimeleri atla
      if (word.length < 3) return false;
      // Stop words'ü atla
      if (STOP_WORDS.has(word)) return false;
      // Sadece sayı olanları atla (ama sayı+harf olanları tut)
      if (/^\d+$/.test(word)) return false;
      return true;
    });
  
  return words;
}

/**
 * POZ NO formatlarını üret
 */
function generatePozVariations(pozNo: string): string[] {
  if (!pozNo || pozNo.trim().length === 0) return [];
  
  const clean = pozNo.trim();
  const variations = [clean];
  
  // Noktasız versiyon: 15.120.1101 → 151201101
  variations.push(clean.replace(/\./g, ''));
  
  // İlk iki grup: 15.120.1101 → 15.120
  const parts = clean.split('.');
  if (parts.length >= 2) {
    variations.push(parts.slice(0, 2).join('.'));
  }
  
  return [...new Set(variations)]; // Duplikatları kaldır
}

/**
 * Smart search - 3 level progressive search
 * 
 * @param pozNo - POZ numarası (varsa)
 * @param productName - Ürün tanımı
 * @returns En iyi eşleşme veya null
 */
export async function smartSearch(
  pozNo: string | undefined,
  productName: string
): Promise<SmartSearchResult> {
  
  let attempts = 0;

  // LEVEL 1: POZ NO ile arama (farklı formatlarda dene)
  if (pozNo && pozNo.trim().length > 0) {
    const pozVariations = generatePozVariations(pozNo);
    
    for (const pozVariation of pozVariations.slice(0, 2)) { // Max 2 deneme
      attempts++;
      console.log(`[Smart Search] Level 1: POZ NO arama - "${pozVariation}"`);
      
      try {
        const result = await searchByPozNo(pozVariation);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log(`[Smart Search] ✓ Level 1 başarılı - ${result.data.length} sonuç bulundu`);
          return {
            result: result.data[0],
            searchLevel: 'poz_no' as SearchLevel,
            searchTerm: pozVariation,
            attempts
          };
        }
      } catch (error) {
        console.warn(`[Smart Search] Level 1 hata: ${error}`);
      }
      
      await delay(200);
    }
  }

  // LEVEL 2: Temizlenmiş ürün adı ile arama (kısa versiyonu)
  if (productName && productName.trim().length > 0) {
    const cleanName = normalizeSearchText(productName);
    
    // Çok uzun ise kısalt (max 60 karakter)
    const shortName = cleanName.length > 60 ? cleanName.substring(0, 60).trim() : cleanName;
    
    if (shortName.length > 5) {
      attempts++;
      console.log(`[Smart Search] Level 2: Temiz ad arama - "${shortName.substring(0, 50)}..."`);
      
      try {
        const result = await searchByName(shortName);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log(`[Smart Search] ✓ Level 2 başarılı - ${result.data.length} sonuç bulundu`);
          return {
            result: result.data[0],
            searchLevel: 'full_name' as SearchLevel,
            searchTerm: shortName,
            attempts
          };
        }
      } catch (error) {
        console.warn(`[Smart Search] Level 2 hata: ${error}`);
      }
      
      await delay(200);
    }
  }

  // LEVEL 3: Progressive truncation - Anahtar kelimelerle ara
  const truncatedResults = await searchWithTruncation(productName);
  
  if (truncatedResults) {
    return {
      ...truncatedResults,
      attempts: attempts + truncatedResults.attempts
    };
  }

  // Hiçbir sonuç bulunamadı
  console.log(`[Smart Search] ✗ Hiçbir seviyede sonuç bulunamadı: "${productName.substring(0, 40)}..."`);
  return {
    result: null,
    searchLevel: 'truncated' as SearchLevel,
    searchTerm: productName,
    attempts
  };
}

/**
 * Progressive truncation search - AKILLI KISALTMA
 * Gereksiz kelimeleri atlayıp sadece önemli anahtar kelimeleri ara
 */
async function searchWithTruncation(productName: string): Promise<SmartSearchResult | null> {
  if (!productName || productName.trim().length === 0) {
    return null;
  }

  // Anahtar kelimeleri çıkar
  const keywords = extractKeywords(productName);
  
  // En az 2 anlamlı kelime olmalı
  if (keywords.length < 2) {
    return null;
  }

  let attempts = 0;
  
  // AKILLI KADEMELER - Farklı kombinasyonları dene
  const searchStrategies: string[] = [];
  
  // İlk 4-5 kelime
  if (keywords.length >= 5) {
    searchStrategies.push(keywords.slice(0, 5).join(' '));
  }
  if (keywords.length >= 4) {
    searchStrategies.push(keywords.slice(0, 4).join(' '));
  }
  // İlk 3 kelime
  if (keywords.length >= 3) {
    searchStrategies.push(keywords.slice(0, 3).join(' '));
  }
  // İlk 2 kelime
  searchStrategies.push(keywords.slice(0, 2).join(' '));
  
  // İlk ve son önemli kelimeleri de dene (bazen malzeme adı sonda olur)
  if (keywords.length >= 4) {
    searchStrategies.push(`${keywords[0]} ${keywords[keywords.length - 1]}`);
  }

  // Max 3 deneme yap
  for (let i = 0; i < Math.min(searchStrategies.length, 3); i++) {
    const searchTerm = searchStrategies[i];
    
    if (!searchTerm || searchTerm.length < 5) continue;
    
    attempts++;
    console.log(`[Smart Search] Level 3.${attempts}: Anahtar kelime arama - "${searchTerm}"`);
    
    try {
      const result = await searchByName(searchTerm);
      
      if (result.success && result.data && result.data.length > 0) {
        console.log(`[Smart Search] ✓ Level 3 başarılı - ${result.data.length} sonuç bulundu`);
        return {
          result: result.data[0],
          searchLevel: 'truncated' as SearchLevel,
          searchTerm: searchTerm,
          attempts
        };
      }
    } catch (error) {
      console.warn(`[Smart Search] Level 3.${attempts} hata: ${error}`);
    }

    // Rate limiting için kısa delay
    await delay(200);
  }

  return null;
}

/**
 * Batch smart search - Birden fazla ürün için
 * Otomatik hata yönetimi ve ilerleme takibi
 */
export async function batchSmartSearch(
  items: Array<{ pozNo?: string; productName: string }>,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<Map<string, SmartSearchResult>> {
  
  const results = new Map<string, SmartSearchResult>();
  const total = items.length;
  let consecutiveErrors = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.pozNo || item.productName;

    // Progress callback
    if (onProgress) {
      onProgress(i, total, item.productName.substring(0, 50));
    }

    try {
      // Search
      const result = await smartSearch(item.pozNo, item.productName);
      results.set(key, result);
      consecutiveErrors = 0; // Reset error counter
    } catch (error) {
      console.error(`[Batch Search] Error for item ${i}: ${error}`);
      consecutiveErrors++;
      
      // Çok fazla ardışık hata varsa daha uzun bekle
      if (consecutiveErrors >= 3) {
        console.warn('[Batch Search] Too many consecutive errors, waiting 2 seconds...');
        await delay(2000);
        consecutiveErrors = 0;
      }
      
      // Hata durumunda boş sonuç kaydet
      results.set(key, {
        result: null,
        searchLevel: 'truncated' as SearchLevel,
        searchTerm: item.productName,
        attempts: 1
      });
    }

    // Her 10 aramada bir biraz daha uzun bekle
    if (i > 0 && i % 10 === 0) {
      await delay(400);
    } else {
      await delay(250);
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress(total, total, 'Tamamlandı');
  }

  return results;
}

/**
 * Utility: Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search statistics helper
 */
export function getSearchStats(results: Map<string, SmartSearchResult>) {
  const stats = {
    total: results.size,
    found: 0,
    notFound: 0,
    byLevel: {
      poz_no: 0,
      full_name: 0,
      truncated: 0
    },
    totalAttempts: 0
  };

  results.forEach(result => {
    if (result.result !== null) {
      stats.found++;
      if (result.searchLevel === 'poz_no') stats.byLevel.poz_no++;
      else if (result.searchLevel === 'full_name') stats.byLevel.full_name++;
      else stats.byLevel.truncated++;
    } else {
      stats.notFound++;
    }
    stats.totalAttempts += result.attempts;
  });

  return stats;
}
