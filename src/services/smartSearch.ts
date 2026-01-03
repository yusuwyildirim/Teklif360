/**
 * Smart Search Algorithm v2.1
 * Geliştirilmiş 3-level arama stratejisi + Önbellek
 * 
 * Level 1: POZ NO ile arama (farklı formatlar)
 * Level 2: Temizlenmiş ürün adı ile arama
 * Level 3: Anahtar kelimelerle kademeli arama
 */

import { searchByPozNo, searchByName } from './oskabulutScraper';
import type { SmartSearchResult, OskabulutSearchResult, SearchLevel } from '@/types/oskabulut.types';

// ÖNBELLEK - Aynı sorguları tekrar aratmaz (hızlandırma)
const searchCache = new Map<string, SmartSearchResult>();
const CACHE_MAX_SIZE = 500; // Maksimum önbellek boyutu

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
  
  // ÖNBELLEK KONTROLÜ - Aynı sorgu daha önce yapılmış mı?
  const cacheKey = `${pozNo || ''}_${productName}`.toLowerCase().trim();
  if (searchCache.has(cacheKey)) {
    console.log(`[Smart Search] Önbellekten alındı: "${productName.substring(0, 30)}..."`);
    return searchCache.get(cacheKey)!;
  }
  
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
          const searchResult: SmartSearchResult = {
            result: result.data[0],
            searchLevel: 'poz_no' as SearchLevel,
            searchTerm: pozVariation,
            attempts
          };
          // Önbelleğe kaydet
          cacheResult(cacheKey, searchResult);
          return searchResult;
        }
      } catch (error) {
        console.warn(`[Smart Search] Level 1 hata: ${error}`);
      }
      
      await delay(100); // 200 -> 100ms (hızlandırma)
    }
  }

  // LEVEL 2 & 3: Kademeli kelime kısaltma ile arama
  // Tam isimle başla, bulamazsa 2'şer kelime kısalt (daha hızlı)
  if (productName && productName.trim().length > 0) {
    const cleanName = normalizeSearchText(productName);
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    
    // Maksimum 12 kelime (URL çok uzun olmasın, 500 hatası önlenir)
    // Minimum 2 kelime, 2'şer atlayarak ara (12→10→8→6→4→2)
    const maxWords = Math.min(words.length, 12);
    const minWords = 2;
    const step = 2; // Her seferinde 2 kelime kısalt (daha hızlı)
    
    for (let wordCount = maxWords; wordCount >= minWords; wordCount -= step) {
      const searchTerm = words.slice(0, wordCount).join(' ');
      
      // URL çok uzun olmasın (max 100 karakter)
      if (searchTerm.length > 100) continue;
      if (searchTerm.length < 5) continue;
      
      attempts++;
      const levelName = wordCount === maxWords ? 'Level 2' : `Level 3.${maxWords - wordCount}`;
      console.log(`[Smart Search] ${levelName}: Arama (${wordCount} kelime) - "${searchTerm.substring(0, 50)}..."`);
      
      try {
        const result = await searchByName(searchTerm);
        
        if (result.success && result.data && result.data.length > 0) {
          // En iyi eşleşmeyi bul ve doğruluk skorunu hesapla
          const { match: bestMatch, score: matchScore } = findBestMatchWithScore(result.data, productName);
          const confidencePercent = Math.min(100, Math.round(matchScore));
          console.log(`[Smart Search] ✓ ${levelName} başarılı - ${result.data.length} sonuç, doğruluk: %${confidencePercent}`);
          const searchResult: SmartSearchResult = {
            result: bestMatch,
            searchLevel: wordCount === maxWords ? 'full_name' as SearchLevel : 'truncated' as SearchLevel,
            searchTerm: searchTerm,
            attempts
          };
          // Önbelleğe kaydet
          cacheResult(cacheKey, searchResult);
          return searchResult;
        }
      } catch (error) {
        console.warn(`[Smart Search] ${levelName} hata: ${error}`);
      }
      
      await delay(100); // 200 -> 100ms (hızlandırma)
      
      // Maksimum 5 deneme
      if (attempts >= 5) break;
    }
  }

  // Hiçbir sonuç bulunamadı - bunu da önbelleğe kaydet (tekrar aramayı önle)
  console.log(`[Smart Search] ✗ Hiçbir seviyede sonuç bulunamadı: "${productName.substring(0, 40)}..."`);
  const notFoundResult: SmartSearchResult = {
    result: null,
    searchLevel: 'truncated' as SearchLevel,
    searchTerm: productName,
    attempts
  };
  cacheResult(cacheKey, notFoundResult);
  return notFoundResult;
}

/**
 * Önbelleğe sonuç kaydet (LRU benzeri - maksimum boyut aşılırsa eski kayıtları sil)
 */
function cacheResult(key: string, result: SmartSearchResult): void {
  if (searchCache.size >= CACHE_MAX_SIZE) {
    // En eski kaydı sil (ilk eklenen)
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, result);
}

/**
 * Önbelleği temizle (isteğe bağlı)
 */
export function clearSearchCache(): void {
  searchCache.clear();
  console.log('[Smart Search] Önbellek temizlendi');
}

/**
 * Birden fazla sonuç arasından en iyi eşleşmeyi bul
 * Benzerlik skorlaması kullanır, skor ve eşleşmeyi döndürür
 */
function findBestMatchWithScore(results: OskabulutSearchResult[], originalQuery: string): { match: OskabulutSearchResult; score: number } {
  if (results.length === 1) {
    return { match: results[0], score: 80 }; // Tek sonuç = %80 güven
  }
  
  const queryLower = originalQuery.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const totalQueryWords = queryWords.length;
  
  let bestScore = -1;
  let bestMatch = results[0];
  
  for (const result of results) {
    const resultName = (result.tanim || '').toLowerCase();
    let matchedWords = 0;
    let score = 0;
    
    // Tam eşleşme kontrolü
    if (resultName === queryLower) {
      return { match: result, score: 100 }; // Tam eşleşme = %100
    }
    
    // Kelime eşleşmesi skorla
    for (const word of queryWords) {
      if (resultName.includes(word)) {
        matchedWords++;
        score += word.length; // Uzun kelime eşleşmesi daha değerli
      }
    }
    
    // Başlangıç eşleşmesi bonus
    if (resultName.startsWith(queryWords[0] || '')) {
      score += 15;
    }
    
    // Uzunluk benzerliği (çok uzun veya çok kısa sonuçları cezalandır)
    const lengthDiff = Math.abs(resultName.length - queryLower.length);
    score -= lengthDiff * 0.05;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }
  
  // Yüzde hesapla: eşleşen kelime oranı + bonus
  const wordMatchPercent = totalQueryWords > 0 ? (bestScore / (totalQueryWords * 5)) * 100 : 50;
  const finalScore = Math.max(30, Math.min(95, wordMatchPercent)); // %30-%95 arası
  
  return { match: bestMatch, score: finalScore };
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
        console.warn('[Batch Search] Too many consecutive errors, waiting 1.5 seconds...');
        await delay(1500); // 2000 -> 1500ms
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

    // Her 15 aramada bir biraz daha uzun bekle (10 -> 15)
    if (i > 0 && i % 15 === 0) {
      await delay(200); // 400 -> 200ms
    } else {
      await delay(100); // 250 -> 100ms (hızlandırma)
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
