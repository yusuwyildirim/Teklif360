/**
 * Oskabulut Matching Service
 * İhale verileri ile Oskabulut.com verilerini eşleştiren servis
 * 
 * Not: Eski PDF-based priceMatching.ts yerine kullanılacak
 */

import type { TenderData, MatchResult } from '@/types/tender.types';
import type { OskabulutSearchResult, OskabulutSearchProgress } from '@/types/oskabulut.types';
import { smartSearch, batchSmartSearch, getSearchStats } from './smartSearch';
import { parseBirimFiyat } from './oskabulutScraper';

/**
 * Batch matching - Tüm ihale verilerini Oskabulut'tan ara ve eşleştir
 */
export async function matchWithOskabulut(
  tenderData: TenderData[],
  onProgress?: (progress: OskabulutSearchProgress) => void
): Promise<MatchResult[]> {
  
  console.log('\n🔍 Oskabulut ile eşleştirme başlıyor...');
  console.log('- Toplam kalem:', tenderData.length);

  // Smart search için veri hazırla
  const searchItems = tenderData.map(item => ({
    pozNo: item.pozNo,
    productName: item.tanim
  }));

  // Progress callback wrapper
  const progressCallback = onProgress 
    ? (completed: number, total: number, current: string) => {
        onProgress({
          total,
          completed,
          current,
          failed: 0 // SmartSearch'de başarısızlıkları takip etmiyoruz şu an
        });
      }
    : undefined;

  // Batch smart search
  const searchResults = await batchSmartSearch(searchItems, progressCallback);

  // MatchResult formatına dönüştür
  const matchResults: MatchResult[] = tenderData.map(tenderItem => {
    const key = tenderItem.pozNo || tenderItem.tanim;
    const smartResult = searchResults.get(key);

    if (!smartResult || !smartResult.result) {
      // Eşleşme bulunamadı
      return {
        tenderItem,
        priceItem: null,
        matchType: 'none',
        confidence: 0
      };
    }

    // Oskabulut sonucunu PriceListItem formatına dönüştür
    const oskabulutItem = smartResult.result;
    const priceItem = {
      pozNo: oskabulutItem.pozNo,
      tanim: oskabulutItem.tanim,
      birim: oskabulutItem.birim,
      birimFiyat: typeof oskabulutItem.birimFiyat === 'number' 
        ? oskabulutItem.birimFiyat 
        : parseFloat(oskabulutItem.birimFiyat) || 0,
      source: `${oskabulutItem.kitapAdi} - ${oskabulutItem.fasikulAdi}`
    };

    // Match type belirleme
    let matchType: MatchResult['matchType'];
    let confidence: number;

    if (smartResult.searchLevel === 'poz_no') {
      matchType = 'exact';
      confidence = 100;
    } else if (smartResult.searchLevel === 'full_name') {
      matchType = 'fuzzy';
      confidence = 85;
    } else { // truncated
      matchType = 'fuzzy';
      confidence = 70;
    }

    return {
      tenderItem,
      priceItem,
      matchType,
      confidence
    };
  });

  // İstatistikleri yazdır
  const stats = {
    exact: matchResults.filter(m => m.matchType === 'exact').length,
    fuzzy: matchResults.filter(m => m.matchType === 'fuzzy').length,
    none: matchResults.filter(m => m.matchType === 'none').length
  };

  console.log('\n✅ Oskabulut eşleştirme tamamlandı:');
  console.log(`  - Tam eşleşme (POZ NO): ${stats.exact}`);
  console.log(`  - Benzer eşleşme (İsim): ${stats.fuzzy}`);
  console.log(`  - Eşleşmedi: ${stats.none}`);
  console.log(`  - Başarı oranı: %${Math.round((stats.exact + stats.fuzzy) / matchResults.length * 100)}`);

  return matchResults;
}

/**
 * Eşleştirme sonuçlarını TenderData'ya uygula
 */
export function applyMatchesToTenderData(matches: MatchResult[]): TenderData[] {
  return matches.map((match, index) => ({
    ...match.tenderItem,
    birimFiyat: match.priceItem?.birimFiyat || 0,
    tutar: (match.tenderItem.miktar || 0) * (match.priceItem?.birimFiyat || 0)
  }));
}

/**
 * Eşleştirme istatistiklerini hesapla
 */
export function getMatchStatistics(matches: MatchResult[]) {
  const total = matches.length;
  const exact = matches.filter(m => m.matchType === 'exact').length;
  const fuzzy = matches.filter(m => m.matchType === 'fuzzy').length;
  const manual = 0; // Oskabulut'ta manual match yok şu an
  const none = matches.filter(m => m.matchType === 'none').length;
  const successRate = Math.round((exact + fuzzy) / total * 100);

  return {
    total,
    exact,
    fuzzy,
    manual,
    none,
    successRate
  };
}

/**
 * Export edilmiş fiyatları topla
 */
export function calculateTotalPrice(data: TenderData[]): number {
  return data.reduce((sum, item) => {
    const tutar = item.miktar * item.birimFiyat;
    return sum + tutar;
  }, 0);
}
