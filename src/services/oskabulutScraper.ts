/**
 * Oskabulut.com web scraping servisi
 * HTML parse ederek POZ bilgilerini çeker
 */

import type { OskabulutSearchResult, OskabulutScraperResult } from '@/types/oskabulut.types';

const LIBRARY_URL = 'https://www.oskabulut.com/kutuphane';

/**
 * POZ numarasına göre arama yapar ve sonuçları parse eder
 */
export async function searchByPozNo(pozNo: string): Promise<OskabulutScraperResult> {
  try {
    // Arama parametresi ile GET request
    const searchUrl = `${LIBRARY_URL}?searchBox=${encodeURIComponent(pozNo)}`;
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml',
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        searchTerm: pozNo
      };
    }

    const html = await response.text();
    const results = parseSearchResults(html);

    return {
      success: true,
      data: results,
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
  return searchByPozNo(name); // Aynı endpoint, farklı query
}

/**
 * HTML içeriğini parse ederek sonuçları çıkarır
 * XPath: //*[@id="genel-grid"]/div[3]/table/tbody/tr/td[2..7]
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
