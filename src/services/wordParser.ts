/**
 * Word (.docx) dosyalarını parse eden servis
 * Birim Fiyat Teklif Cetvelini Excel formatına dönüştürmek için kullanılır
 */

import mammoth from 'mammoth';
import type { TenderData, ParseResult } from '@/types/tender.types';

/**
 * Word dosyasını parse ederek TenderData dizisi döndürür
 * @param file - Yüklenecek .docx dosyası
 * @returns ParseResult - Parse sonucu ve veriler
 */
export async function parseWordDocument(file: File): Promise<ParseResult> {
  try {
    // Dosyayı ArrayBuffer olarak oku
    const arrayBuffer = await file.arrayBuffer();
    
    // Mammoth ile HTML'e dönüştür
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    // HTML'den tablo verilerini çıkar
    const tenderData = extractTableData(result.value);
    
    // Veri validasyonu
    if (tenderData.length === 0) {
      return {
        success: false,
        error: 'Word dosyasında geçerli tablo verisi bulunamadı.',
        warnings: result.messages.map(m => m.message)
      };
    }
    
    return {
      success: true,
      data: tenderData,
      rowCount: tenderData.length,
      warnings: result.messages.length > 0 
        ? result.messages.map(m => m.message) 
        : undefined
    };
    
  } catch (error) {
    console.error('Word parse hatası:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
      data: []
    };
  }
}

/**
 * HTML içeriğinden tablo verilerini çıkarır
 * @param html - Mammoth'dan dönen HTML içeriği
 * @returns TenderData[] - Parse edilmiş ihale verileri
 */
function extractTableData(html: string): TenderData[] {
  // HTML'i DOM parser ile parse et
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Tablolari bul
  const tables = doc.querySelectorAll('table');
  
  if (tables.length === 0) {
    console.warn('HTML içinde tablo bulunamadı');
    return [];
  }
  
  // İlk tabloyu al (genellikle veri tablosu)
  const table = tables[0];
  const rows = Array.from(table.querySelectorAll('tr'));
  
  if (rows.length < 2) {
    console.warn('Tabloda yeterli satır yok');
    return [];
  }
  
  // Başlık satırını atla ve veri satırlarını işle
  const dataRows = rows.slice(1); // İlk satır başlık
  const tenderData: TenderData[] = [];
  
  for (const row of dataRows) {
    const cells = Array.from(row.querySelectorAll('td'));
    
    // En az 5 sütun olmalı (Sıra No, Poz No, Tanım, Birim, Miktar)
    if (cells.length < 5) {
      continue;
    }
    
    const rowData = parseTableRow(cells);
    
    // Geçerli veri varsa ekle
    if (rowData && rowData.siraNo && rowData.pozNo) {
      tenderData.push(rowData);
    }
  }
  
  return tenderData;
}

/**
 * Tablo satırını parse ederek TenderData objesi oluşturur
 * @param cells - Tablo hücreleri
 * @returns TenderData | null
 */
function parseTableRow(cells: Element[]): TenderData | null {
  try {
    // Hücre içeriklerini temizle
    const siraNo = cleanText(cells[0]?.textContent || '');
    const pozNo = cleanText(cells[1]?.textContent || '');
    const tanim = cleanText(cells[2]?.textContent || '');
    const birim = cleanText(cells[3]?.textContent || '');
    const miktarText = cleanText(cells[4]?.textContent || '');
    
    // Sıra No ve Poz No boş ise atla (başlık satırı veya boş satır)
    if (!siraNo || !pozNo || siraNo.toLowerCase().includes('sıra') || pozNo.toLowerCase().includes('poz')) {
      return null;
    }
    
    // Miktarı sayıya çevir
    const miktar = parseMiktar(miktarText);
    
    // Geçerli miktar kontrolü
    if (miktar === 0 || isNaN(miktar)) {
      console.warn(`Geçersiz miktar: ${miktarText} (Satır: ${siraNo})`);
    }
    
    return {
      siraNo,
      pozNo,
      tanim,
      birim,
      miktar,
      birimFiyat: undefined,
      tutar: undefined
    };
    
  } catch (error) {
    console.error('Satır parse hatası:', error);
    return null;
  }
}

/**
 * Metin içeriğini temizler
 * @param text - Ham metin
 * @returns Temizlenmiş metin
 */
function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')  // Çoklu boşlukları tek boşluğa indir
    .replace(/\n/g, ' ')   // Yeni satırları boşluğa çevir
    .trim();
}

/**
 * Miktar metnini sayıya çevirir
 * Türkçe sayı formatını destekler (1.250,50 veya 1250.50)
 * @param text - Miktar metni
 * @returns Sayı değeri
 */
function parseMiktar(text: string): number {
  if (!text) return 0;
  
  // Temizle
  let cleaned = text.trim();
  
  // Türkçe format: 1.250,50 -> 1250.50 (nokta binlik, virgül ondalık)
  // Türkçe format: 2.000 -> 2000 (nokta binlik, ondalık yok)
  // Türkçe format: 31.692 -> 31692 (nokta binlik, ondalık yok)
  // İngilizce format: 1,250.50 -> 1250.50 (virgül binlik, nokta ondalık)
  
  // Nokta ve virgülü say
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  
  if (dotCount > 0 && commaCount > 0) {
    // İkisi de varsa, hangisi binlik ayracı hangisi ondalık ayracı?
    // Virgül noktadan sonra geliyorsa Türkçe format (1.250,50)
    if (cleaned.indexOf(',') > cleaned.indexOf('.')) {
      // Türkçe format: noktalar binlik ayracı, virgül ondalık
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // İngilizce format: virgüller binlik ayracı, nokta ondalık
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (dotCount > 0) {
    // Sadece nokta varsa
    if (dotCount === 1) {
      // Tek nokta - ondalık mı binlik mi?
      // Noktadan sonra 3 hane varsa veya daha fazla varsa binlik ayracıdır
      const parts = cleaned.split('.');
      if (parts.length === 2) {
        const afterDot = parts[1];
        if (afterDot.length === 3 && /^\d+$/.test(afterDot)) {
          // 3 hane tam sayı -> muhtemelen binlik ayracı (2.000, 1.250)
          cleaned = cleaned.replace(/\./g, '');
        }
        // Aksi halde ondalık ayracı olarak bırak
      }
    } else {
      // Çoklu nokta - kesinlikle binlik ayracı (31.692, 1.250.000)
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (commaCount > 0) {
    // Sadece virgül varsa
    if (commaCount === 1) {
      // Tek virgül - ondalık mı binlik mi?
      const parts = cleaned.split(',');
      if (parts.length === 2) {
        const beforeComma = parts[0];
        const afterComma = parts[1];
        
        // ÖNEMLİ: Virgülden önce "0" varsa kesinlikle ondalık sayı (0,415 → 0.415)
        if (beforeComma === '0' || beforeComma === '') {
          cleaned = cleaned.replace(',', '.');
        }
        // Virgülden sonra 3 hane VE sol taraf 4+ hane ise binlik (1234,567 -> muhtemelen değil)
        // Virgülden sonra 3 hane VE sol taraf 1-3 hane ise binlik olabilir (1,250)
        else if (afterComma.length === 3 && /^\d+$/.test(afterComma) && beforeComma.length <= 3 && parseInt(beforeComma) >= 1) {
          // Ama sayı 1000'den küçükse ondalık olma ihtimali yüksek
          // 0,079 veya 0,415 gibi durumlar yukarıda yakalandı
          // 1,250 gibi durumlar binlik olabilir ama...
          // Daha güvenli: beforeComma tek haneli değilse binlik say
          if (beforeComma.length > 1) {
            cleaned = cleaned.replace(/,/g, '');
          } else {
            // Tek haneli + 3 hane (1,250) - İngilizce binlik formatı olabilir
            // Ama Türkçe belgelerde genelde 1,25 gibi yazılır
            // Güvenli ol: ondalık olarak kabul et
            cleaned = cleaned.replace(',', '.');
          }
        } else {
          // Ondalık ayracı (Türkçe): 0,5 veya 12,75 veya 0,079
          cleaned = cleaned.replace(',', '.');
        }
      }
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
 * Parse edilen verileri valide eder
 * @param data - TenderData dizisi
 * @returns Validasyon sonucu
 */
export function validateParsedData(data: TenderData[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || data.length === 0) {
    errors.push('Veri bulunamadı');
    return { valid: false, errors };
  }
  
  data.forEach((item, index) => {
    if (!item.siraNo) {
      errors.push(`Satır ${index + 1}: Sıra No eksik`);
    }
    if (!item.pozNo) {
      errors.push(`Satır ${index + 1}: Poz No eksik`);
    }
    if (!item.tanim) {
      errors.push(`Satır ${index + 1}: Tanım eksik`);
    }
    if (!item.birim) {
      errors.push(`Satır ${index + 1}: Birim eksik`);
    }
    if (item.miktar === 0 || isNaN(item.miktar)) {
      errors.push(`Satır ${index + 1}: Geçersiz miktar`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
