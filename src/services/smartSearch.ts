/**
 * Smart Search Algorithm
 * 3-level search strategy for Oskabulut.com
 * 
 * Level 1: POZ NO ile arama
 * Level 2: Tam ürün adı ile arama
 * Level 3: Kısaltılmış ad ile arama (son kelimeler çıkarılarak)
 */

import { searchByPozNo, searchByName } from './oskabulutScraper';
import type { SmartSearchResult, OskabulutSearchResult, SearchLevel } from '@/types/oskabulut.types';

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

  // LEVEL 1: POZ NO ile arama
  if (pozNo && pozNo.trim().length > 0) {
    attempts++;
    console.log(`[Smart Search] Level 1: POZ NO arama - "${pozNo}"`);
    
    const result = await searchByPozNo(pozNo.trim());
    
    if (result.success && result.data && result.data.length > 0) {
      // Tam eşleşme bul
      const exactMatch = result.data.find(item => 
        item.pozNo.toLowerCase() === pozNo.toLowerCase().trim()
      );
      
      if (exactMatch) {
        console.log(`[Smart Search] ✓ Level 1 başarılı - Tam eşleşme bulundu`);
        return {
          result: exactMatch,
          searchLevel: 'poz_no' as SearchLevel,
          searchTerm: pozNo,
          attempts
        };
      }
    }
  }

  // LEVEL 2: Tam ürün adı ile arama
  if (productName && productName.trim().length > 0) {
    attempts++;
    console.log(`[Smart Search] Level 2: Tam ad arama - "${productName}"`);
    
    const result = await searchByName(productName.trim());
    
    if (result.success && result.data && result.data.length > 0) {
      // İlk sonucu al (en iyi eşleşme olmalı)
      console.log(`[Smart Search] ✓ Level 2 başarılı - ${result.data.length} sonuç bulundu`);
      return {
        result: result.data[0],
        searchLevel: 'full_name' as SearchLevel,
        searchTerm: productName,
        attempts
      };
    }
  }

  // LEVEL 3: Progressive truncation - Son kelimeleri kaldırarak ara
  const truncatedResults = await searchWithTruncation(productName);
  
  if (truncatedResults) {
    return {
      ...truncatedResults,
      attempts: attempts + truncatedResults.attempts
    };
  }

  // Hiçbir sonuç bulunamadı
  console.log(`[Smart Search] ✗ Hiçbir seviyede sonuç bulunamadı`);
  return {
    result: null,
    searchLevel: 'truncated' as SearchLevel,
    searchTerm: productName,
    attempts
  };
}

/**
 * Progressive truncation search
 * Ürün adından son kelimeleri kaldırarak arama yapar
 * 
 * Örnek:
 * "5 cm kalınlıkta yüzeye dik çekme mukavemeti..." 
 * → "yüzeye dik çekme mukavemeti..."
 * → "yüzeye dik çekme"
 * → "yüzeye dik"
 */
async function searchWithTruncation(productName: string): Promise<SmartSearchResult | null> {
  if (!productName || productName.trim().length === 0) {
    return null;
  }

  const words = productName.trim().split(/\s+/);
  
  // En az 2 kelime olmalı
  if (words.length < 2) {
    return null;
  }

  let attempts = 0;
  const minWords = 2; // En az bu kadar kelime kalmalı

  // Sondan başa doğru kelimeleri kaldır
  for (let wordCount = words.length - 1; wordCount >= minWords; wordCount--) {
    const truncatedName = words.slice(0, wordCount).join(' ');
    attempts++;
    
    console.log(`[Smart Search] Level 3.${attempts}: Truncated arama - "${truncatedName}"`);
    
    const result = await searchByName(truncatedName);
    
    if (result.success && result.data && result.data.length > 0) {
      console.log(`[Smart Search] ✓ Level 3 başarılı - ${result.data.length} sonuç bulundu`);
      return {
        result: result.data[0],
        searchLevel: 'truncated' as SearchLevel,
        searchTerm: truncatedName,
        attempts
      };
    }

    // Rate limiting için kısa delay
    await delay(200);
  }

  return null;
}

/**
 * Batch smart search - Birden fazla ürün için
 * Progress callback ile ilerleme takibi
 */
export async function batchSmartSearch(
  items: Array<{ pozNo?: string; productName: string }>,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<Map<string, SmartSearchResult>> {
  
  const results = new Map<string, SmartSearchResult>();
  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.pozNo || item.productName;

    // Progress callback
    if (onProgress) {
      onProgress(i, total, item.productName);
    }

    // Search
    const result = await smartSearch(item.pozNo, item.productName);
    results.set(key, result);

    // Rate limiting - her aramadan sonra kısa delay
    await delay(300);
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
      pozNo: 0,
      fullName: 0,
      truncated: 0
    },
    totalAttempts: 0
  };

  results.forEach(result => {
    if (result.result !== null) {
      stats.found++;
      stats.byLevel[result.searchLevel]++;
    } else {
      stats.notFound++;
    }
    stats.totalAttempts += result.attempts;
  });

  return stats;
}
