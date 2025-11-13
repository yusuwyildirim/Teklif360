/**
 * İhale verileri ile PDF birim fiyat listesini eşleştiren servis
 */

import type { TenderData, PriceListItem, MatchResult } from '@/types/tender.types';
import { normalizePozNo } from './pdfParser';

/**
 * İhale verilerini fiyat listesi ile eşleştirir
 * @param tenderData - İhale verileri
 * @param priceList - PDF'den çıkarılan fiyat listesi
 * @returns MatchResult[] - Eşleştirme sonuçları
 */
export function matchPrices(
  tenderData: TenderData[],
  priceList: PriceListItem[]
): MatchResult[] {
  const results: MatchResult[] = [];
  
  console.log('\n🔍 Eşleştirme başlıyor...');
  console.log('- Word verileri:', tenderData.length);
  console.log('- PDF fiyat listesi:', priceList.length);
  
  let exactCount = 0;
  let partialPozCount = 0;
  let fuzzyCount = 0;
  let noneCount = 0;
  
  for (const tenderItem of tenderData) {
    // 1. Öncelik: Poz numarasına göre TAM eşleşme
    let priceItem = matchByPozNo(tenderItem.pozNo, priceList);
    let matchType: MatchResult['matchType'] = 'exact';
    let confidence = 100;
    
    if (priceItem) {
      exactCount++;
    }
    
    // 2. Poz numarası KISMI eşleşme (15.185.1013 bulamazsa 15.185.* ile başlayanları ara)
    if (!priceItem) {
      const partialResult = matchByPartialPozNo(tenderItem.pozNo, tenderItem.tanim, priceList);
      if (partialResult) {
        priceItem = partialResult.item;
        matchType = 'fuzzy';
        confidence = partialResult.confidence;
        partialPozCount++;
        
        if (partialPozCount <= 5) {
          console.log(`\n🔢 Kısmi POZ NO eşleşmesi #${partialPozCount}:`);
          console.log(`  Aranan POZ: ${tenderItem.pozNo}`);
          console.log(`  ✓ Bulunan POZ: ${priceItem.pozNo}`);
          console.log(`  Word tanım: ${tenderItem.tanim.substring(0, 50)}...`);
          console.log(`  PDF tanım: ${priceItem.tanim.substring(0, 50)}...`);
          console.log(`  ✓ Güven: %${confidence}`);
        }
      }
    }
    
    // 3. Tanıma göre benzerlik araması
    if (!priceItem) {
      const fuzzyResult = matchByDescription(tenderItem.tanim, priceList);
      if (fuzzyResult) {
        priceItem = fuzzyResult.item;
        matchType = 'fuzzy';
        confidence = fuzzyResult.confidence;
        fuzzyCount++;
        
        if (fuzzyCount <= 5) {
          console.log(`\n🔍 Fuzzy match #${fuzzyCount}:`);
          console.log(`  POZ NO: ${tenderItem.pozNo}`);
          console.log(`  Word tanım: ${tenderItem.tanim.substring(0, 50)}...`);
          console.log(`  ✓ Eşleşen POZ: ${priceItem.pozNo}`);
          console.log(`  ✓ PDF tanım: ${priceItem.tanim.substring(0, 50)}...`);
          console.log(`  ✓ Güven: %${confidence}`);
        }
      }
    }
    
    // Eşleşme yoksa
    if (!priceItem) {
      matchType = 'none';
      confidence = 0;
      noneCount++;
      
      if (noneCount <= 3) {
        console.log(`\n❌ Eşleşmedi #${noneCount}:`);
        console.log(`  POZ NO: ${tenderItem.pozNo}`);
        console.log(`  Tanım: ${tenderItem.tanim.substring(0, 60)}...`);
      }
    }
    
    results.push({
      tenderItem,
      priceItem,
      matchType,
      confidence
    });
  }
  
  console.log(`\n✅ Eşleştirme tamamlandı:`);
  console.log(`  - Tam POZ eşleşme: ${exactCount}`);
  console.log(`  - Kısmi POZ eşleşme: ${partialPozCount}`);
  console.log(`  - İsim eşleşme: ${fuzzyCount}`);
  console.log(`  - Eşleşmedi: ${noneCount}`);
  
  return results;
}

/**
 * Poz numarasına göre fiyat listesinde arama yapar
 * @param pozNo - Aranan poz numarası
 * @param priceList - Fiyat listesi
 * @returns Eşleşen fiyat bilgisi veya null
 */
function matchByPozNo(pozNo: string, priceList: PriceListItem[]): PriceListItem | null {
  const normalizedPozNo = normalizePozNo(pozNo);
  
  for (const item of priceList) {
    const normalizedItemPozNo = normalizePozNo(item.pozNo);
    
    if (normalizedPozNo === normalizedItemPozNo) {
      return item;
    }
  }
  
  return null;
}

/**
 * Kısmi POZ NO eşleştirmesi - tam eşleşme yoksa grup eşleştirmesi yapar
 * Örnek: 15.185.1013 bulamazsa 15.185.* ile başlayanları arar ve en uygununu seçer
 * @param pozNo - Aranan poz numarası
 * @param tanim - İş tanımı (benzerlik hesaplamak için)
 * @param priceList - Fiyat listesi
 * @returns En uygun eşleşme ve güven skoru
 */
function matchByPartialPozNo(
  pozNo: string,
  tanim: string,
  priceList: PriceListItem[]
): { item: PriceListItem; confidence: number } | null {
  // POZ NO'yu parçalara ayır: 15.185.1013 → [15, 185, 1013]
  const parts = pozNo.split(/[./]/);
  
  if (parts.length < 3) return null;
  
  // İlk 2 grup (15.185) ile başlayanları bul
  const prefix = `${parts[0]}.${parts[1]}`;
  const candidates: PriceListItem[] = [];
  
  for (const item of priceList) {
    if (item.pozNo.startsWith(prefix)) {
      candidates.push(item);
    }
  }
  
  if (candidates.length === 0) return null;
  
  // Adaylar arasından tanıma en uygun olanı seç
  let bestMatch: PriceListItem | null = null;
  let bestSimilarity = 0;
  
  const normalizedTanim = normalizeText(tanim);
  
  for (const candidate of candidates) {
    const normalizedCandidateTanim = normalizeText(candidate.tanim);
    const similarity = calculateSimilarity(normalizedTanim, normalizedCandidateTanim);
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = candidate;
    }
  }
  
  // Kısmi eşleşme için daha düşük eşik (%20)
  if (bestMatch && bestSimilarity >= 0.20) {
    return {
      item: bestMatch,
      confidence: Math.round(bestSimilarity * 100)
    };
  }
  
  // Hiç tanım eşleşmezse ama POZ prefix eşleşiyorsa, en yakın POZ NO'yu al
  if (candidates.length > 0) {
    // POZ NO'ları sayısal olarak sırala ve en yakın olanı seç
    candidates.sort((a, b) => {
      const aParts = a.pozNo.split(/[./]/).map(Number);
      const bParts = b.pozNo.split(/[./]/).map(Number);
      const targetParts = pozNo.split(/[./]/).map(Number);
      
      // Son rakamın farkını hesapla
      const aDiff = Math.abs((aParts[2] || 0) - (targetParts[2] || 0));
      const bDiff = Math.abs((bParts[2] || 0) - (targetParts[2] || 0));
      
      return aDiff - bDiff;
    });
    
    return {
      item: candidates[0],
      confidence: 15 // Düşük güven - sadece POZ prefix eşleşmesi
    };
  }
  
  return null;
}

/**
 * İş tanımına göre benzerlik hesaplayarak eşleştirme yapar
 * @param tanim - İş kalemi tanımı
 * @param priceList - Fiyat listesi
 * @returns En yakın eşleşme ve güven skoru
 */
function matchByDescription(
  tanim: string,
  priceList: PriceListItem[]
): { item: PriceListItem; confidence: number } | null {
  let bestMatch: PriceListItem | null = null;
  let bestSimilarity = 0;
  
  const normalizedTanim = normalizeText(tanim);
  
  // Anahtar kelimeleri çıkar (3 harften uzun, yaygın olmayan kelimeler)
  const keywords = extractKeywords(normalizedTanim);
  
  for (const item of priceList) {
    const normalizedItemTanim = normalizeText(item.tanim);
    
    // Normal benzerlik hesapla
    let similarity = calculateSimilarity(normalizedTanim, normalizedItemTanim);
    
    // Anahtar kelime bonusu - anahtar kelimeler eşleşirse +%20 bonus
    if (keywords.length > 0) {
      const itemKeywords = extractKeywords(normalizedItemTanim);
      const keywordMatches = keywords.filter(kw => itemKeywords.includes(kw)).length;
      const keywordBonus = (keywordMatches / keywords.length) * 0.2;
      similarity += keywordBonus;
    }
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = item;
    }
  }
  
  // Minimum %20 benzerlik eşiği (daha toleranslı)
  if (bestMatch && bestSimilarity >= 0.20) {
    return {
      item: bestMatch,
      confidence: Math.round(bestSimilarity * 100)
    };
  }
  
  return null;
}

/**
 * Tanımdan anahtar kelimeleri çıkarır
 * @param text - Normalize edilmiş metin
 * @returns Anahtar kelimeler
 */
function extractKeywords(text: string): string[] {
  // Yaygın kelimeleri filtrele (stop words)
  const stopWords = new Set([
    'ile', 'her', 'turlu', 'olan', 'ait', 'gore', 'icin', 'ise', 've', 'veya',
    'bir', 'iki', 'uc', 'dort', 'bes', 'yapilmasi', 'yapilması', 'yapimi',
    'edilmesi', 'etmek', 'olarak', 'olmak', 'gibi', 'kadar', 'daha'
  ]);
  
  const words = text.split(/\s+/).filter(w => w.length > 3);
  const keywords = words.filter(w => !stopWords.has(w));
  
  return Array.from(new Set(keywords)); // Benzersiz kelimeler
}

/**
 * İki metin arasındaki benzerliği hesaplar (0-1 arası)
 * Kelime bazlı Jaccard benzerliği + substring matching kullanır
 * @param text1 - İlk metin
 * @param text2 - İkinci metin
 * @returns Benzerlik skoru (0-1)
 */
function calculateSimilarity(text1: string, text2: string): number {
  // Kelime bazlı Jaccard benzerliği
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  const jaccardSimilarity = union.size === 0 ? 0 : intersection.size / union.size;
  
  // Substring eşleşmesi - önemli kelimeler aynı mı?
  const text1Lower = text1.toLowerCase();
  const text2Lower = text2.toLowerCase();
  
  // Önemli kelimeleri kontrol et (3 harften uzun)
  const importantWords1 = Array.from(words1).filter(w => w.length > 3);
  const importantWords2 = Array.from(words2).filter(w => w.length > 3);
  
  let substringScore = 0;
  const totalWords = Math.max(importantWords1.length, importantWords2.length);
  
  if (totalWords > 0) {
    for (const word of importantWords1) {
      if (text2Lower.includes(word)) {
        substringScore += 1;
      }
    }
    substringScore = substringScore / totalWords;
  }
  
  // Levenshtein mesafesi ile benzerlik (kısa metinler için)
  let levenshteinScore = 0;
  if (text1.length < 50 && text2.length < 50) {
    const distance = levenshteinDistance(text1, text2);
    const maxLen = Math.max(text1.length, text2.length);
    levenshteinScore = maxLen > 0 ? 1 - (distance / maxLen) : 0;
  }
  
  // Ağırlıklı ortalama: Jaccard %50, Substring %30, Levenshtein %20
  return (jaccardSimilarity * 0.5) + (substringScore * 0.3) + (levenshteinScore * 0.2);
}

/**
 * Levenshtein mesafesini hesaplar (edit distance)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Metni normalize eder (karşılaştırma için)
 * @param text - Ham metin
 * @returns Normalize edilmiş metin
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^\w\s]/g, '') // Noktalama işaretlerini kaldır
    .trim();
}

/**
 * Eşleştirme sonuçlarını ihale verilerine uygular
 * @param matches - Eşleştirme sonuçları
 * @returns Güncellenmiş ihale verileri
 */
export function applyMatchesToTenderData(matches: MatchResult[]): TenderData[] {
  return matches.map(match => {
    if (match.priceItem) {
      return {
        ...match.tenderItem,
        birimFiyat: match.priceItem.birimFiyat,
        tutar: match.tenderItem.miktar * match.priceItem.birimFiyat
      };
    }
    return match.tenderItem;
  });
}

/**
 * Eşleştirme istatistiklerini hesaplar
 * @param matches - Eşleştirme sonuçları
 * @returns İstatistikler
 */
export function getMatchStatistics(matches: MatchResult[]): {
  total: number;
  exact: number;
  fuzzy: number;
  manual: number;
  none: number;
  successRate: number;
} {
  const stats = {
    total: matches.length,
    exact: 0,
    fuzzy: 0,
    manual: 0,
    none: 0,
    successRate: 0
  };
  
  for (const match of matches) {
    switch (match.matchType) {
      case 'exact':
        stats.exact++;
        break;
      case 'fuzzy':
        stats.fuzzy++;
        break;
      case 'manual':
        stats.manual++;
        break;
      case 'none':
        stats.none++;
        break;
    }
  }
  
  const matched = stats.exact + stats.fuzzy + stats.manual;
  stats.successRate = stats.total > 0 ? Math.round((matched / stats.total) * 100) : 0;
  
  return stats;
}
