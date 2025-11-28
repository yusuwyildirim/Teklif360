/**
 * Oskabulut.com web scraping servisi
 * HTML parse ederek POZ bilgilerini çeker
 */

import type { OskabulutSearchResult, OskabulutScraperResult } from '@/types/oskabulut.types';
import { getSessionId } from './oskabulutAuth';
import { API_BASE_URL } from '@/config/api';

// Use centralized API configuration
const PROXY_URL = API_BASE_URL;

/**
 * POZ numarasına göre arama yapar (proxy üzerinden)
 */
export async function searchByPozNo(pozNo: string): Promise<OskabulutScraperResult> {
  try {
    const sessionId = getSessionId();
    
    if (!sessionId) {
      return {
        success: false,
        error: 'Session bulunamadı. Lütfen önce giriş yapın.',
        searchTerm: pozNo
      };
    }

    const response = await fetch(
      `${PROXY_URL}/api/search?query=${encodeURIComponent(pozNo)}&sessionId=${sessionId}`
    );

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Arama başarısız',
        searchTerm: pozNo
      };
    }

    return {
      success: true,
      data: data.data || [],
      searchTerm: pozNo
    };

  } catch (error) {
    console.error('Search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      searchTerm: pozNo
    };
  }
}

/**
 * Ürün adına göre arama yapar
 */
export async function searchByName(name: string): Promise<OskabulutScraperResult> {
  return searchByPozNo(name); // Aynı proxy endpoint
}

/**
 * HTML içeriğini parse ederek sonuçları çıkarır
 * Not: Artık backend'de parse ediliyor, bu fonksiyon kullanılmıyor
 * @deprecated Backend'de cheerio ile parse ediliyor
 */
export function parseSearchResults(html: string): OskabulutSearchResult[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const results: OskabulutSearchResult[] = [];

  // Tablo satırlarını bul: #genel-grid table tbody tr
  const table = doc.querySelector('#genel-grid table tbody');
  if (!table) {
    console.warn('Tablo bulunamadı - belki giriş yapılmamış veya sonuç yok');
    return results;
  }

  const rows = table.querySelectorAll('tr');
  
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    
    // td[2] = Poz No, td[3] = Tanım, td[4] = Birim, td[5] = Birim Fiyat, td[6] = Kitap, td[7] = Fasikül
    if (cells.length >= 7) {
      const result: OskabulutSearchResult = {
        pozNo: cells[1]?.textContent?.trim() || '',          // td[2] - index 1
        tanim: cells[2]?.textContent?.trim() || '',          // td[3] - index 2
        birim: cells[3]?.textContent?.trim() || '',          // td[4] - index 3
        birimFiyat: cells[4]?.textContent?.trim() || '',     // td[5] - index 4
        kitapAdi: cells[5]?.textContent?.trim() || '',       // td[6] - index 5
        fasikulAdi: cells[6]?.textContent?.trim() || ''      // td[7] - index 6
      };

      // Boş olmayan sonuçları ekle
      if (result.pozNo || result.tanim) {
        results.push(result);
      }
    }
  });

  return results;
}

/**
 * Birim fiyat string'ini number'a çevirir
 * Örnek: "1.159,69" -> 1159.69
 */
export function parseBirimFiyat(fiyatStr: string): number {
  if (!fiyatStr) return 0;

  // Türkçe format: 1.159,69 -> 1159.69
  const normalized = fiyatStr
    .replace(/\./g, '')      // Binlik ayraçlarını kaldır
    .replace(',', '.');       // Ondalık ayracı . yap

  return parseFloat(normalized) || 0;
}

/**
 * Test için HTML mock
 * Production'da silinecek
 */
export function getMockHTML(): string {
  return `
    <div id="genel-grid">
      <div></div>
      <div></div>
      <div>
        <table>
          <tbody>
            <tr>
              <td></td>
              <td>15.341.3001</td>
              <td>5 cm kalınlıkta yüzeye dik çekme mukavemeti en az 7,5kPa (TR7,5) taşyünü levhalar ile dış duvarlarda dıştan ısı yalıtımı ve üzerine ısı yalıtım sıvası yapılması (Mantolama)</td>
              <td>m²</td>
              <td>1.159,69</td>
              <td>ÇŞB</td>
              <td>İnşaat</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}
