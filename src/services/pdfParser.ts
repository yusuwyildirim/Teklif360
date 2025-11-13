/**
 * PDF dosyalarından birim fiyat listesini parse eden servis
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { PriceListItem } from '@/types/tender.types';

// PDF.js worker'ı local dosya olarak kullan
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * PDF parse ilerleme callback tipi
 */
export type ParseProgressCallback = (progress: {
  currentPage: number;
  totalPages: number;
  percentage: number;
  itemsFound: number;
  currentChunk?: number;
  totalChunks?: number;
}) => void;

/**
 * PDF dosyasını parse ederek birim fiyat listesini çıkarır
 * @param file - PDF dosyası
 * @param onProgress - İlerleme callback'i (opsiyonel)
 * @returns PriceListItem[] - Fiyat listesi
 */
export async function parsePdfPriceList(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<PriceListItem[]> {
  try {
    // PDF'i ArrayBuffer olarak oku
    const arrayBuffer = await file.arrayBuffer();
    
    // PDF dokümanını yükle
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer
    });
    const pdf = await loadingTask.promise;
    
    const totalPages = pdf.numPages;
    console.log('📄 PDF yüklendi, sayfa sayısı:', totalPages);
    
    // CHUNKED PARSING: Her seferde 50 sayfa işle (bellek optimizasyonu)
    const CHUNK_SIZE = 50;
    const chunks: number[][] = [];
    
    for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE - 1, totalPages);
      chunks.push(Array.from({ length: end - i + 1 }, (_, idx) => i + idx));
    }
    
    console.log(`🔢 PDF ${chunks.length} chunk'a bölündü (her biri ~${CHUNK_SIZE} sayfa)`);
    
    let allPriceItems: PriceListItem[] = [];
    let processedPages = 0;
    
    // Her chunk'ı sırayla işle
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const pageNumbers = chunks[chunkIndex];
      
      console.log(
        `⚙️ Chunk ${chunkIndex + 1}/${chunks.length} işleniyor ` +
        `(${pageNumbers[0]}-${pageNumbers[pageNumbers.length - 1]} sayfalar)...`
      );
      
      // Chunk için tüm sayfaların metnini birleştir
      let chunkText = '';
      
      for (const pageNum of pageNumbers) {
        const pageText = await extractPageText(pdf, pageNum);
        chunkText += pageText + '\n';
        
        processedPages++;
        
        // İlerleme callback'i
        if (onProgress) {
          onProgress({
            currentPage: processedPages,
            totalPages,
            percentage: Math.round((processedPages / totalPages) * 100),
            itemsFound: allPriceItems.length,
            currentChunk: chunkIndex + 1,
            totalChunks: chunks.length
          });
        }
      }
      
      // Chunk metnini parse et
      const chunkItems = parseTextToPriceList(chunkText);
      allPriceItems.push(...chunkItems);
      
      console.log(
        `✅ Chunk ${chunkIndex + 1} tamamlandı: ${chunkItems.length} yeni kalem ` +
        `(toplam: ${allPriceItems.length})`
      );
      
      // UI donmaması için küçük bir gecikme
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log('✅ Tüm PDF parse edildi, toplam kalem:', allPriceItems.length);
    
    // Duplikaları temizle
    const uniqueItems = removeDuplicates(allPriceItems);
    console.log('🎯 Benzersiz kalem sayısı:', uniqueItems.length);
    
    // Final progress
    if (onProgress) {
      onProgress({
        currentPage: totalPages,
        totalPages,
        percentage: 100,
        itemsFound: uniqueItems.length
      });
    }
    
    return uniqueItems;
    
  } catch (error) {
    console.error('PDF parse hatası:', error);
    throw new Error('PDF dosyası okunamadı: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
  }
}

/**
 * PDF'den basit metin çıkarma (manuel parsing)
 * Bu fonksiyon artık kullanılmıyor - pdfjs-dist kullanıyoruz
 */
async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  // Bu fonksiyon artık kullanılmıyor
  return '';
}

/**
 * Y pozisyonunu toleranslı hale getirir (satır birleştirme hataları için)
 * Bazı PDF'lerde aynı satır 0.5-1 piksel farkla iki farklı y değeri alabilir
 */
function getApproxY(yValue: number): number {
  return Math.round(yValue / 2) * 2; // 2px hassasiyet toleransı
}

/**
 * Tek bir sayfanın metnini çıkarır (iyileştirilmiş)
 */
async function extractPageText(pdf: any, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent();
  
  // Metin öğelerini y pozisyonuna göre grupla (toleranslı)
  const linesByY: { [key: number]: any[] } = {};
  
  textContent.items.forEach((item: any) => {
    const y = getApproxY(item.transform[5]); // Toleranslı y pozisyonu
    if (!linesByY[y]) {
      linesByY[y] = [];
    }
    linesByY[y].push({
      x: item.transform[4],
      text: item.str
    });
  });
  
  // Her satırı x pozisyonuna göre sırala ve birleştir
  const sortedYs = Object.keys(linesByY).map(Number).sort((a, b) => b - a); // Yukarıdan aşağıya
  
  let pageText = '';
  for (const y of sortedYs) {
    const lineItems = linesByY[y].sort((a, b) => a.x - b.x); // Soldan sağa
    const lineText = lineItems.map(item => item.text).join(' ');
    if (lineText.trim()) {
      pageText += lineText + '\n';
    }
  }
  
  return pageText;
}

/**
 * Duplikaları temizler
 */
function removeDuplicates(items: PriceListItem[]): PriceListItem[] {
  const uniqueList: PriceListItem[] = [];
  const seenPozNos = new Set<string>();
  
  for (const item of items) {
    if (!seenPozNos.has(item.pozNo)) {
      seenPozNos.add(item.pozNo);
      uniqueList.push(item);
    }
  }
  
  return uniqueList;
}

/**
 * PDF'den çıkarılan metni parse ederek fiyat listesi oluşturur (İYİLEŞTİRİLMİŞ)
 * @param text - PDF'den çıkarılan ham metin
 * @returns PriceListItem[]
 */
function parseTextToPriceList(text: string): PriceListItem[] {
  const priceList: PriceListItem[] = [];
  const lines = text.split('\n');
  
  console.log('📝 Parse başlıyor, toplam satır sayısı:', lines.length);
  
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    if (!trimmedLine) continue;
    
    // Sadece POZ NO içeren satırları işle (performans optimizasyonu)
    if (!/\d{2}\.\d{3}/.test(trimmedLine)) continue;
    
    // POZ NO pattern'i - ÖNCE 10 haneli ara (15.120.1101 formatı)
    const pozNo10Pattern = /\b(\d{2}\.\d{3}\.\d{4})\b/g;
    const pozNo10Matches = Array.from(trimmedLine.matchAll(pozNo10Pattern));
    
    // 10 haneli POZ NO bulunursa işle
    if (pozNo10Matches.length > 0) {
      for (const match of pozNo10Matches) {
        const pozNo = match[1];
        const result = extractPriceFromLine(trimmedLine, pozNo, match.index || 0);
        
        if (result) {
          priceList.push(result);
        }
      }
      continue; // 10 haneli bulunduğunda 5 haneli aramaya gerek yok
    }
    
    // 10 haneli yoksa, 5 haneli ara (03.027 formatı)
    const pozNo5Pattern = /\b(\d{2}\.\d{3})\b/g;
    const pozNo5Matches = Array.from(trimmedLine.matchAll(pozNo5Pattern));
    
    if (pozNo5Matches.length > 0) {
      for (const match of pozNo5Matches) {
        const pozNo = match[1];
        const result = extractPriceFromLine(trimmedLine, pozNo, match.index || 0);
        
        if (result) {
          priceList.push(result);
        }
      }
    }
  }
  
  console.log('✅ Parse tamamlandı, toplam poz sayısı:', priceList.length);
  
  return priceList;
}

/**
 * Satırdan POZ NO, tanım, birim ve fiyat bilgilerini çıkarır (İYİLEŞTİRİLMİŞ)
 * Context-aware parsing ile daha doğru sonuçlar
 */
function extractPriceFromLine(line: string, pozNo: string, pozIndex: number): PriceListItem | null {
  // POZ NO'dan sonraki kısmı al
  const afterPozNo = line.substring(pozIndex + pozNo.length).trim();
  
  // CONTEXT-AWARE PARSING: Önce fiyat sütununu bul (satır sonunda olmalı)
  const pricePattern = /(\d{1,}(?:[\s.]\d{3})*[,\.]\d{2})\s*$/; // Satır sonunda fiyat
  const priceMatch = afterPozNo.match(pricePattern);
  
  if (!priceMatch || !priceMatch.index) {
    return null; // Fiyat bulunamadı
  }
  
  const priceText = priceMatch[1];
  const birimFiyat = parsePrice(priceText);
  
  if (birimFiyat <= 0 || birimFiyat > 1000000) {
    return null; // Mantıksız fiyatları filtrele
  }
  
  // Fiyattan önceki kısmı al
  const beforePrice = afterPozNo.substring(0, priceMatch.index).trim();
  
  // Birim: fiyattan hemen önce (son kelime olmalı)
  const words = beforePrice.split(/\s+/);
  const lastWord = words[words.length - 1]?.toLowerCase();
  
  // Genişletilmiş geçerli birimler listesi
  const validUnits = [
    'm3', 'm2', 'm³', 'm²', 'metrekare', 'metreküp', 
    'ton', 'kg', 'gr', 'adet', 'ad', 'lt', 'litre', 
    'metre', 'm', 'sa', 'saat', 'gün', 'dekar', 
    'ano', 'takım', 'grup', 'km', 'cm', 'mm',
    'kw', 'kwh', 'mva', 'kvah', 'kvar', 'kva'
  ];
  
  let birim = 'adet'; // Default
  if (lastWord && validUnits.includes(lastWord)) {
    birim = lastWord;
    words.pop(); // Birimi çıkar
  }
  
  // Tanım: kalan metin
  let tanim = words.join(' ').trim();
  
  // Eğer tanım çok kısa ise, POZ NO'dan önceki kısmı kontrol et
  if (tanim.length < 5) {
    const beforePozNo = line.substring(0, pozIndex).trim();
    // Sıra numarasını temizle (satır başında olabilir)
    const cleanBeforePoz = beforePozNo.replace(/^\d+\s+/, '').trim();
    if (cleanBeforePoz.length > 3) {
      tanim = cleanBeforePoz;
    }
  }
  
  // Tanım hala çok kısaysa, geçersiz kabul et
  if (tanim.length < 3) {
    return null;
  }
  
  return {
    pozNo,
    tanim,
    birim,
    birimFiyat
  };
}

/**
 * Fiyat metnini sayıya çevirir (Türkçe ve İngilizce formatları destekler)
 * @param text - Fiyat metni (örn: "1.234,56" veya "1,234.56")
 * @returns number
 */
function parsePrice(text: string): number {
  if (!text) return 0;
  
  let cleaned = text.trim();
  
  // TL, ₺ gibi para birimi işaretlerini temizle
  cleaned = cleaned.replace(/TL|₺/g, '').trim();
  
  // Nokta ve virgülü say
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  
  if (dotCount > 0 && commaCount > 0) {
    // İkisi de varsa, hangisi binlik ayracı hangisi ondalık ayracı?
    if (cleaned.indexOf(',') > cleaned.indexOf('.')) {
      // Türkçe format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // İngilizce format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (commaCount > 0) {
    // Sadece virgül varsa
    if (commaCount === 1) {
      // Tek virgül - muhtemelen ondalık ayracı (Türkçe)
      cleaned = cleaned.replace(',', '.');
    } else {
      // Çoklu virgül - binlik ayracı (İngilizce)
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  // Sayısal olmayan karakterleri temizle
  cleaned = cleaned.replace(/[^\d.]/g, '');
  
  const number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
}

/**
 * Poz numarasını normalize eder (karşılaştırma için)
 * @param pozNo - Poz numarası
 * @returns Normalize edilmiş poz numarası
 */
export function normalizePozNo(pozNo: string): string {
  // Boşlukları temizle, büyük harfe çevir
  return pozNo.trim().toUpperCase().replace(/\s+/g, '');
}
