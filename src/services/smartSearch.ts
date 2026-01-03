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

// Özel karakterleri temizle - "/" eklendi (500 hatasına neden oluyordu)
const SPECIAL_CHARS = /[°ø²³×µ'"()[\]{}\/\\]/g;

/**
 * Arama metnini normalize et - ÖNEMLİ: 500 hatalarını önlemek için
 */
function normalizeSearchText(text: string): string {
  if (!text) return '';
  
  return text
    // TS/EN referanslarını kaldır
    .replace(TS_EN_PATTERN, ' ')
    // Özel karakterleri temizle (/, \ dahil)
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

  // LEVEL 2 & 3: Kademeli kelime kısaltma ile arama
  // Tam isimle başla, bulamazsa her seferinde 1 kelime kısalt
  if (productName && productName.trim().length > 0) {
    const cleanName = normalizeSearchText(productName);
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    
    // Kaç kelime varsa ondan başla (limit yok), minimum 2 kelimeye kadar kısalt
    const maxWords = words.length;
    const minWords = 2;
    
    for (let wordCount = maxWords; wordCount >= minWords; wordCount--) {
      const searchTerm = words.slice(0, wordCount).join(' ');
      
      if (searchTerm.length < 5) continue;
      
      attempts++;
      const levelName = wordCount === maxWords ? 'Level 2' : `Level 3.${maxWords - wordCount}`;
      console.log(`[Smart Search] ${levelName}: Arama (${wordCount} kelime) - "${searchTerm.substring(0, 50)}..."`);
      
      try {
        const result = await searchByName(searchTerm);
        
        if (result.success && result.data && result.data.length > 0) {
          // En iyi eşleşmeyi bul
          const bestMatch = findBestMatch(result.data, productName);
          console.log(`[Smart Search] ✓ ${levelName} başarılı - ${result.data.length} sonuç, en iyi eşleşme seçildi`);
          return {
            result: bestMatch,
            searchLevel: wordCount === maxWords ? 'full_name' as SearchLevel : 'truncated' as SearchLevel,
            searchTerm: searchTerm,
            attempts
          };
        }
      } catch (error) {
        console.warn(`[Smart Search] ${levelName} hata: ${error}`);
      }
      
      await delay(200);
      
      // Maksimum 5 deneme
      if (attempts >= 5) break;
    }
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
 * Birden fazla sonuç arasından en iyi eşleşmeyi bul
 * Basit benzerlik skorlaması kullanır
 */
function findBestMatch(results: OskabulutSearchResult[], originalQuery: string): OskabulutSearchResult {
  if (results.length === 1) return results[0];
  
  const queryLower = originalQuery.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  let bestScore = -1;
  let bestMatch = results[0];
  
  for (const result of results) {
    const resultName = (result.tanim || '').toLowerCase();
    let score = 0;
    
    // Tam eşleşme kontrolü
    if (resultName === queryLower) {
      return result; // Tam eşleşme bulundu
    }
    
    // Kelime eşleşmesi skorla
    for (const word of queryWords) {
      if (resultName.includes(word)) {
        score += word.length; // Uzun kelime eşleşmesi daha değerli
      }
    }
    
    // Başlangıç eşleşmesi bonus
    if (resultName.startsWith(queryWords[0] || '')) {
      score += 10;
    }
    
    // Uzunluk benzerliği (çok uzun veya çok kısa sonuçları cezalandır)
    const lengthDiff = Math.abs(resultName.length - queryLower.length);
    score -= lengthDiff * 0.1;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }
  
  return bestMatch;
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
