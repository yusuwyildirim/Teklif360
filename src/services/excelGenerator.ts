/**
 * Excel dosyaları oluşturan servis
 * TenderData'yı formüllü Excel formatına dönüştürür
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TenderData } from '@/types/tender.types';

/**
 * TenderData dizisinden Excel dosyası oluşturur ve indirir
 * @param data - İhale verileri
 * @param fileName - İndirilecek dosyanın adı (varsayılan: BirimFiyatTeklifi.xlsx)
 */
export async function generateAndDownloadExcel(
  data: TenderData[], 
  fileName: string = 'BirimFiyatTeklifi.xlsx'
): Promise<void> {
  try {
    // Workbook oluştur
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Birim Fiyat Teklifi');
    
    // Başlık satırını ekle
    addHeaders(worksheet);
    
    // Veri satırlarını ekle
    addDataRows(worksheet, data);
    
    // Formülleri ekle
    addFormulas(worksheet, data.length);
    
    // Toplam satırını ekle
    addTotalRow(worksheet, data.length);
    
    // Stil uygula
    styleWorksheet(worksheet, data.length);
    
    // Excel'i blob olarak oluştur
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Dosyayı indir
    saveAs(blob, fileName);
    
  } catch (error) {
    console.error('Excel oluşturma hatası:', error);
    throw new Error('Excel dosyası oluşturulurken bir hata oluştu');
  }
}

/**
 * Başlık satırını ekler
 */
function addHeaders(worksheet: ExcelJS.Worksheet): void {
  const headers = [
    'Sıra No',
    'Poz No',
    'İş Kaleminin Adı ve Kısa Açıklaması',
    'Birimi',
    'Miktarı',
    'Teklif Edilen Birim Fiyat',
    'Tutarı'
  ];
  
  worksheet.addRow(headers);
  
  // Sütun genişliklerini ayarla
  worksheet.columns = [
    { width: 10 },  // Sıra No
    { width: 15 },  // Poz No
    { width: 50 },  // İş Kaleminin Adı
    { width: 10 },  // Birimi
    { width: 12 },  // Miktarı
    { width: 20 },  // Birim Fiyat
    { width: 20 }   // Tutarı
  ];
}

/**
 * Veri satırlarını ekler
 */
function addDataRows(worksheet: ExcelJS.Worksheet, data: TenderData[]): void {
  data.forEach((item) => {
    worksheet.addRow([
      item.siraNo,
      item.pozNo,
      item.tanim,
      item.birim,
      item.miktar,
      item.birimFiyat || '', // Boş bırak (kullanıcı dolduracak)
      '' // Tutar - formülle hesaplanacak
    ]);
  });
}

/**
 * Tutar sütununa formülleri ekler
 * Formül: =F2*E2 (Birim Fiyat * Miktar)
 */
function addFormulas(worksheet: ExcelJS.Worksheet, rowCount: number): void {
  // Satır 2'den başla (1. satır başlık)
  for (let i = 2; i <= rowCount + 1; i++) {
    const tutarCell = worksheet.getCell(`G${i}`);
    // Formül: Birim Fiyat (F sütunu) * Miktar (E sütunu)
    tutarCell.value = { formula: `F${i}*E${i}` };
  }
}

/**
 * Toplam satırını ekler
 */
function addTotalRow(worksheet: ExcelJS.Worksheet, dataRowCount: number): void {
  const totalRowIndex = dataRowCount + 2; // +1 başlık, +1 bir sonraki satır
  
  worksheet.addRow([
    '',
    '',
    '',
    '',
    '',
    'TOPLAM TUTAR (KDV Hariç)',
    { formula: `SUM(G2:G${dataRowCount + 1})` }
  ]);
}

/**
 * Worksheet'e stil uygular
 */
function styleWorksheet(worksheet: ExcelJS.Worksheet, dataRowCount: number): void {
  // Başlık satırı stili (1. satır)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' } // Koyu mavi
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 30;
  
  // Tüm hücrelere kenarlık ekle
  const totalRows = dataRowCount + 2; // Veri + başlık + toplam
  for (let i = 1; i <= totalRows; i++) {
    const row = worksheet.getRow(i);
    
    for (let j = 1; j <= 7; j++) {
      const cell = row.getCell(j);
      
      // Kenarlık
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      
      // Veri satırları için hizalama
      if (i > 1 && i <= dataRowCount + 1) {
        // Sıra No, Miktar, Birim Fiyat, Tutar: Sağa hizalı
        if (j === 1 || j === 5 || j === 6 || j === 7) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (j === 4) {
          // Birim: Ortaya hizalı
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          // Diğerleri: Sola hizalı
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      }
    }
  }
  
  // Toplam satırı stili
  const totalRow = worksheet.getRow(totalRows);
  totalRow.font = { bold: true, size: 12 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7E6E6' } // Açık gri
  };
  totalRow.height = 25;
  
  // Toplam satırındaki "TOPLAM TUTAR" hücresini birleştir (F sütunu)
  const totalLabelCell = worksheet.getCell(`F${totalRows}`);
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
  
  // Toplam tutar hücresini formatla
  const totalAmountCell = worksheet.getCell(`G${totalRows}`);
  totalAmountCell.alignment = { vertical: 'middle', horizontal: 'right' };
  totalAmountCell.font = { bold: true, size: 12, color: { argb: 'FF0070C0' } };
  
  // Sayı formatları
  for (let i = 2; i <= dataRowCount + 1; i++) {
    // Miktar sütunu (E) - sayı formatı
    const miktarCell = worksheet.getCell(`E${i}`);
    miktarCell.numFmt = '#,##0.00';
    
    // Birim Fiyat sütunu (F) - para formatı
    const birimFiyatCell = worksheet.getCell(`F${i}`);
    birimFiyatCell.numFmt = '#,##0.00 "₺"';
    
    // Tutar sütunu (G) - para formatı
    const tutarCell = worksheet.getCell(`G${i}`);
    tutarCell.numFmt = '#,##0.00 "₺"';
  }
  
  // Toplam tutar formatı
  const totalValueCell = worksheet.getCell(`G${totalRows}`);
  totalValueCell.numFmt = '#,##0.00 "₺"';
  
  // Satır yüksekliklerini ayarla
  for (let i = 2; i <= dataRowCount + 1; i++) {
    worksheet.getRow(i).height = 20;
  }
  
  // Pencereleri dondur (başlık satırını sabitle)
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];
}

/**
 * Excel önizlemesi için veriyi hazırlar (browser'da gösterim için)
 * @param data - İhale verileri
 * @returns Formüllü veriler
 */
export function prepareExcelPreview(data: TenderData[]): TenderData[] {
  return data.map(item => ({
    ...item,
    tutar: item.birimFiyat && item.miktar 
      ? item.birimFiyat * item.miktar 
      : undefined
  }));
}

/**
 * Toplam tutarı hesaplar
 * @param data - İhale verileri
 * @returns Toplam tutar
 */
export function calculateTotal(data: TenderData[]): number {
  return data.reduce((total, item) => {
    if (item.birimFiyat && item.miktar) {
      return total + (item.birimFiyat * item.miktar);
    }
    return total;
  }, 0);
}
