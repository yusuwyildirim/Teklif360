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
  
  // Türkçe format: 1.250,50 -> 1250.50
  // İngilizce format: 1,250.50 -> 1250.50
  
  // Nokta ve virgülü say
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  
  if (dotCount > 0 && commaCount > 0) {
    // İkisi de varsa, hangisi binlik ayracı hangisi ondalık ayracı?
    // Son karakter virgülse Türkçe format (1.250,50)
    if (cleaned.indexOf(',') > cleaned.indexOf('.')) {
      // Türkçe format
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // İngilizce format
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
