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

  // LEVEL 1: POZ NO ile arama (farklı formatlarda dene)
  if (pozNo && pozNo.trim().length > 0) {
    const pozVariations = [
      pozNo.trim(),
      pozNo.replace(/\./g, ''),        // 15.120.1101 → 151201101
      pozNo.replace(/\./g, '/'),       // 15.120.1101 → 15/120/1101
      pozNo.split('.').slice(0, 2).join('.'), // 15.120.1101 → 15.120
      pozNo.split('.')[0] + '.' + pozNo.split('.')[1] // 15.120.1101 → 15.120
    ];
    
    for (const pozVariation of pozVariations) {
      attempts++;
      console.log(`[Smart Search] Level 1: POZ NO arama - "${pozVariation}"`);
      
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
      
      // İlk deneme başarısızsa diğer varyasyonları deneme
      if (attempts >= 2) break;
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
 * Progressive truncation search - AKILLI KISALTMA
 * Gereksiz kelimeleri atlayıp sadece önemli anahtar kelimeleri ara
 * 
 * Strateji:
 * 1. Önce önemsiz kelimeleri temizle (ve, ile, her, gibi)
 * 2. İlk 3-5 önemli kelimeyi al
 * 3. Bu kelimelerle ara
 * 4. Bulamazsa 2-3 kelimeye düşür
 */
async function searchWithTruncation(productName: string): Promise<SmartSearchResult | null> {
  if (!productName || productName.trim().length === 0) {
    return null;
  }

  // Önemsiz kelimeleri çıkar
  const stopWords = ['ve', 'ile', 'her', 'gibi', 'için', 'olan', 'veya', 'dahil', 'de', 'da'];
  const words = productName.trim()
    .split(/\s+/)
    .filter(word => !stopWords.includes(word.toLowerCase()) && word.length > 2);
  
  // En az 2 anlamlı kelime olmalı
  if (words.length < 2) {
    return null;
  }

  let attempts = 0;
  
  // AKILLI KADEMELER - Tüm kelimeleri değil, sadece kritik kombinasyonları dene
  const searchStrategies = [
    words.slice(0, 5).join(' '),  // İlk 5 anahtar kelime
    words.slice(0, 3).join(' '),  // İlk 3 anahtar kelime
    words.slice(0, 2).join(' '),  // İlk 2 anahtar kelime
  ];

  // Kısa ürünler için ekstra strateji
  if (words.length >= 4) {
    searchStrategies.splice(1, 0, words.slice(0, 4).join(' ')); // İlk 4 kelime
  }

  for (const searchTerm of searchStrategies) {
    attempts++;
    
    console.log(`[Smart Search] Level 3.${attempts}: Akıllı arama - "${searchTerm}"`);
    
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

    // Rate limiting için kısa delay
    await delay(300);
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
