# İhale Parser Projesi - Detaylı Geliştirme Planı

## 📋 Proje Özeti

**Amaç:** İhale dokümanlarını (Word formatı) otomatik olarak Excel formatına dönüştürmek ve PDF birim fiyat listesinden fiyatları otomatik olarak eşleştirerek Excel'e yazmak.

**Kullanıcı Akışı:**
1. Kullanıcı Word dosyası yükler (İhale Birim Fiyat Teklif Cetveli)
2. Sistem Word'ü parse edip Excel formatına çevirir
3. Kullanıcı PDF birim fiyat listesi yükler
4. Sistem PDF'i analiz eder ve ürünleri eşleştirir
5. Sistem fiyatları Excel'e yazar ve formülleri hesaplar
6. Kullanıcı tamamlanmış Excel dosyasını indirir

---

## 🎯 Faz 1: Word Dosyası Parse İşlemi

### 1.1 Kütüphane Kurulumu ve Yapılandırma

**Gerekli NPM Paketleri:**
```json
{
  "mammoth": "^1.6.0",        // Word (.docx) dosyalarını parse etmek için
  "docx": "^8.5.0",           // Word manipülasyonu için alternatif
  "pizzip": "^3.1.6",         // .docx zip işlemleri için
  "xml2js": "^0.6.2"          // XML parse için
}
```

**Dosya Yapısı:**
```
src/
  services/
    wordParser.ts              // Word parse servisi
    excelGenerator.ts          // Excel oluşturma servisi
    pdfParser.ts               // PDF parse servisi
    priceMatching.ts           // Fiyat eşleştirme algoritması
  types/
    tender.types.ts            // Tip tanımlamaları
  utils/
    fileValidation.ts          // Dosya doğrulama yardımcıları
```

**Görevler:**
- [ ] 1.1.1 - mammoth, docx, pizzip, xml2js paketlerini yükle
- [ ] 1.1.2 - src/services/ klasörünü oluştur
- [ ] 1.1.3 - src/types/ klasörünü oluştur
- [ ] 1.1.4 - TypeScript tip tanımlamalarını oluştur

### 1.2 Word Dosyası Analizi

**Gereklidosyalar Klasöründeki Dosya:**
- `2025-1375651_Birim_Fiyat_Teklif_Cetveli.docx`

**Analiz Edilecek Yapı:**
- Tablo formatı (satır/sütun yapısı)
- Sütun başlıkları: Sıra No, Poz No, İş Kaleminin Adı, Birimi, Miktarı, Birim Fiyat, Tutarı
- Veri satırlarının başlangıç/bitiş noktaları
- Özel karakterler ve formatlamalar

**Görevler:**
- [ ] 1.2.1 - Word dosyasını manuel olarak incele ve yapıyı dokümante et
- [ ] 1.2.2 - Tablo başlıklarını tespit etme fonksiyonu yaz
- [ ] 1.2.3 - Satır satır veri çıkarma fonksiyonu yaz
- [ ] 1.2.4 - Veri temizleme ve normalizasyon fonksiyonu yaz

### 1.3 Word Parser Servisi Geliştirme

**Dosya:** `src/services/wordParser.ts`

**Fonksiyonlar:**
```typescript
interface ParsedTenderData {
  siraNo: string;           // Sıra No
  pozNo: string;            // İş Kalemi No (Poz No)
  tanim: string;            // İş Kaleminin Adı ve Kısa Açıklaması
  birim: string;            // Birimi (m³, m², adet, vb.)
  miktar: number;           // Miktarı
  birimFiyat?: number;      // Teklif Edilen Birim Fiyat (opsiyonel)
  tutar?: number;           // Tutarı (opsiyonel, formülle hesaplanacak)
}

async parseWordDocument(file: File): Promise<ParsedTenderData[]>
extractTableFromWord(buffer: ArrayBuffer): Promise<any[]>
normalizeTableData(rawData: any[]): ParsedTenderData[]
validateParsedData(data: ParsedTenderData[]): boolean
```

**Görevler:**
- [ ] 1.3.1 - wordParser.ts dosyasını oluştur
- [ ] 1.3.2 - parseWordDocument ana fonksiyonunu yaz
- [ ] 1.3.3 - extractTableFromWord ile tablo verilerini çıkar
- [ ] 1.3.4 - normalizeTableData ile verileri temizle ve düzenle
- [ ] 1.3.5 - validateParsedData ile veri doğrulama yap
- [ ] 1.3.6 - Hata yönetimi ve logging ekle
- [ ] 1.3.7 - Unit testler yaz (opsiyonel ama önerilen)

### 1.4 Tip Tanımlamaları

**Dosya:** `src/types/tender.types.ts`

```typescript
export interface TenderData {
  siraNo: string;
  pozNo: string;
  tanim: string;
  birim: string;
  miktar: number;
  birimFiyat?: number;
  tutar?: number;
}

export interface ParseResult {
  success: boolean;
  data?: TenderData[];
  error?: string;
  warnings?: string[];
}

export interface ExcelExportOptions {
  fileName: string;
  includeFormulas: boolean;
  includeTotal: boolean;
}
```

**Görevler:**
- [ ] 1.4.1 - tender.types.ts dosyasını oluştur
- [ ] 1.4.2 - Tüm interface'leri tanımla
- [ ] 1.4.3 - Enum'ları ekle (BirimTipi, DurumTipi vb.)

---

## 🎯 Faz 2: Excel Oluşturma İşlemi

### 2.1 Excel Kütüphanesi Kurulumu

**Gerekli NPM Paketleri:**
```json
{
  "exceljs": "^4.4.0",        // Excel dosyaları oluşturmak için
  "file-saver": "^2.0.5"      // Dosya indirme için
}
```

**Görevler:**
- [ ] 2.1.1 - exceljs ve file-saver paketlerini yükle
- [ ] 2.1.2 - @types/file-saver paketini yükle

### 2.2 Excel Generator Servisi

**Dosya:** `src/services/excelGenerator.ts`

**Hedef Excel Formatı:**
```
| A (Sıra No) | B (Poz No) | C (İş Kaleminin Adı) | D (Birimi) | E (Miktarı) | F (Birim Fiyat) | G (Tutarı) |
|-------------|------------|----------------------|------------|-------------|-----------------|------------|
| 1           | 15.120.1101| Toprak kazısı        | m³         | 1250        | [boş]           | =F2*E2     |
| 2           | 15.130.1102| Sert zemin kazısı    | m³         | 850         | [boş]           | =F3*E3     |
| ...         | ...        | ...                  | ...        | ...         | [boş]           | ...        |
| TOPLAM      |            |                      |            |             |                 | =SUM(G2:G244) |
```

**Fonksiyonlar:**
```typescript
async generateExcel(data: TenderData[]): Promise<Blob>
createWorkbook(): ExcelJS.Workbook
addHeaders(worksheet: ExcelJS.Worksheet): void
addDataRows(worksheet: ExcelJS.Worksheet, data: TenderData[]): void
addFormulas(worksheet: ExcelJS.Worksheet, rowCount: number): void
addTotalRow(worksheet: ExcelJS.Worksheet, lastDataRow: number): void
styleWorksheet(worksheet: ExcelJS.Worksheet): void
```

**Görevler:**
- [ ] 2.2.1 - excelGenerator.ts dosyasını oluştur
- [ ] 2.2.2 - generateExcel ana fonksiyonunu yaz
- [ ] 2.2.3 - createWorkbook ile yeni çalışma kitabı oluştur
- [ ] 2.2.4 - addHeaders ile sütun başlıklarını ekle
- [ ] 2.2.5 - addDataRows ile veri satırlarını ekle
- [ ] 2.2.6 - addFormulas ile formülleri ekle (=F2*E2, =F3*E3, ...)
- [ ] 2.2.7 - addTotalRow ile toplam satırını ekle (=SUM(G2:G{son}))
- [ ] 2.2.8 - styleWorksheet ile hücre formatlamalarını yap
- [ ] 2.2.9 - Excel'i Blob olarak dönüştür ve döndür

### 2.3 Excel Formatı ve Styling

**Başlık Satırı Stili:**
- Kalın yazı
- Arka plan rengi (açık mavi veya gri)
- Kenarlıklar
- Metin hizalama (ortalanmış)

**Veri Satırları Stili:**
- Kenarlıklar
- Sayı formatları (miktar ve fiyatlar için)
- Tutar hücreleri: Para birimi formatı

**Toplam Satırı Stili:**
- Kalın yazı
- Farklı arka plan rengi
- Kalın kenarlık

**Görevler:**
- [ ] 2.3.1 - Başlık satırı stilini uygula
- [ ] 2.3.2 - Veri satırları stilini uygula
- [ ] 2.3.3 - Toplam satırı stilini uygula
- [ ] 2.3.4 - Sütun genişliklerini otomatik ayarla

---

## 🎯 Faz 3: PDF Birim Fiyat Parse İşlemi

### 3.1 PDF Parser Kütüphanesi Kurulumu

**Gerekli NPM Paketleri:**
```json
{
  "pdf-parse": "^1.1.1",      // PDF metin çıkarma
  "pdfjs-dist": "^4.0.0"      // Mozilla PDF.js kütüphanesi
}
```

**Görevler:**
- [ ] 3.1.1 - pdf-parse ve pdfjs-dist paketlerini yükle
- [ ] 3.1.2 - Worker yapılandırmasını ayarla (PDF.js için)

### 3.2 PDF Parser Servisi

**Dosya:** `src/services/pdfParser.ts`

**Gereklidosyalar Klasöründeki Dosya:**
- `2025YiliBirimFiyatListesi.pdf`

**Analiz Edilecek Yapı:**
- PDF içindeki tablo formatı
- Poz numaraları
- İş kalemi tanımları
- Birim fiyatlar
- Birimi bilgisi

**Fonksiyonlar:**
```typescript
interface PriceListItem {
  pozNo: string;            // Poz numarası
  tanim: string;            // İş tanımı
  birim: string;            // Birim
  birimFiyat: number;       // Birim fiyat
}

async parsePDF(file: File): Promise<PriceListItem[]>
extractTextFromPDF(buffer: ArrayBuffer): Promise<string>
parseTextToPriceList(text: string): PriceListItem[]
normalizePozNo(pozNo: string): string
```

**Görevler:**
- [ ] 3.2.1 - pdfParser.ts dosyasını oluştur
- [ ] 3.2.2 - parsePDF ana fonksiyonunu yaz
- [ ] 3.2.3 - extractTextFromPDF ile PDF'den metin çıkar
- [ ] 3.2.4 - parseTextToPriceList ile metni parse et
- [ ] 3.2.5 - Regex ile poz numarası ve fiyat çıkarma yaz
- [ ] 3.2.6 - normalizePozNo ile poz numaralarını standartlaştır
- [ ] 3.2.7 - Hata yönetimi ekle

### 3.3 Fiyat Eşleştirme Algoritması

**Dosya:** `src/services/priceMatching.ts`

**Eşleştirme Mantığı:**
1. **Birincil Eşleştirme:** Poz numarasına göre tam eşleşme
2. **İkincil Eşleştirme:** İş kalemi tanımına göre benzerlik algoritması (fuzzy matching)
3. **Manuel Eşleştirme:** Eşleşmeyen ürünler için kullanıcı müdahalesi

**Fonksiyonlar:**
```typescript
interface MatchResult {
  tenderItem: TenderData;
  priceItem?: PriceListItem;
  matchType: 'exact' | 'fuzzy' | 'manual' | 'none';
  confidence: number;          // 0-100 arası eşleşme güveni
}

matchPrices(
  tenderData: TenderData[], 
  priceList: PriceListItem[]
): MatchResult[]

matchByPozNo(pozNo: string, priceList: PriceListItem[]): PriceListItem | null
matchByDescription(tanim: string, priceList: PriceListItem[]): PriceListItem | null
calculateSimilarity(str1: string, str2: string): number
applyPricesToTenderData(matches: MatchResult[]): TenderData[]
```

**Görevler:**
- [ ] 3.3.1 - priceMatching.ts dosyasını oluştur
- [ ] 3.3.2 - matchPrices ana fonksiyonunu yaz
- [ ] 3.3.3 - matchByPozNo ile poz numarasına göre eşleştir
- [ ] 3.3.4 - matchByDescription ile tanıma göre eşleştir
- [ ] 3.3.5 - calculateSimilarity ile metin benzerliği hesapla (Levenshtein distance)
- [ ] 3.3.6 - applyPricesToTenderData ile fiyatları uygula
- [ ] 3.3.7 - Eşleşme sonuçlarını logla ve raporla

---

## 🎯 Faz 4: UI/UX Geliştirmeleri

### 4.1 Çok Aşamalı Dosya Yükleme Akışı

**Hedef Akış:**
```
[1. Word Yükle] → [2. Word Parse] → [3. PDF Yükle] → [4. Fiyat Eşleştir] → [5. Excel İndir]
```

**Görevler:**
- [ ] 4.1.1 - Multi-step wizard komponenti oluştur
- [ ] 4.1.2 - Adım adım ilerleme göstergesi ekle
- [ ] 4.1.3 - Her adım için ayrı UI durumu yönet

### 4.2 Word Upload & Preview

**Dosya:** `src/components/WordUploader.tsx`

**Özellikler:**
- Drag & drop Word dosyası yükleme
- Dosya validasyonu (.docx, max 10MB)
- Yükleme sonrası parse edilmiş verilerin önizlemesi
- Parse edilen satır sayısı göstergesi

**Görevler:**
- [ ] 4.2.1 - WordUploader komponenti oluştur
- [ ] 4.2.2 - FileUploader komponentini yeniden kullan/genişlet
- [ ] 4.2.3 - Parse sonucu önizleme tablosu ekle
- [ ] 4.2.4 - "Devam Et" ve "Yeniden Yükle" butonları ekle

### 4.3 PDF Upload & Price Matching UI

**Dosya:** `src/components/PdfUploader.tsx`

**Özellikler:**
- PDF dosyası yükleme
- Fiyat listesi parse durumu
- Eşleştirme sonuçları tablosu
- Eşleşme güveni göstergesi (confidence bar)
- Manuel düzenleme seçeneği

**Eşleştirme Sonuçları Tablosu:**
```
| Sıra | Poz No | Ürün Adı | Eşleşen Fiyat | Durum | Güven | Aksiyon |
|------|--------|----------|---------------|-------|-------|---------|
| 1    | 15.120 | ...      | 125,50 TL     | ✓     | 95%   | [Düzenle] |
| 2    | 15.130 | ...      | -             | ⚠     | 0%    | [Elle Gir] |
```

**Görevler:**
- [ ] 4.3.1 - PdfUploader komponenti oluştur
- [ ] 4.3.2 - Eşleştirme sonuçları tablosu oluştur
- [ ] 4.3.3 - Güven göstergesi (progress bar) ekle
- [ ] 4.3.4 - Manuel fiyat girişi modal'ı oluştur
- [ ] 4.3.5 - Eşleşmeyen ürünler için uyarı göster

### 4.4 Excel Preview & Download

**Dosya:** `src/components/ExcelPreview.tsx`

**Özellikler:**
- Oluşturulan Excel'in önizlemesi
- Formüllerin çalıştığını gösteren hesaplamalar
- Toplam tutar göstergesi
- İndirme butonu
- Yeni işlem başlatma butonu

**Görevler:**
- [ ] 4.4.1 - ExcelPreview komponentini genişlet
- [ ] 4.4.2 - Formül hesaplamalarını göster
- [ ] 4.4.3 - Toplam tutar kartı ekle
- [ ] 4.4.4 - İndirme fonksiyonunu entegre et
- [ ] 4.4.5 - "Yeni İşlem" butonu ekle

### 4.5 İlerleme ve Hata Yönetimi

**Komponentler:**
- `ProcessingStatus.tsx` (mevcut, genişletilecek)
- `ErrorHandler.tsx` (yeni)
- `SuccessNotification.tsx` (yeni)

**Görevler:**
- [ ] 4.5.1 - ProcessingStatus'u her aşama için güncelle
- [ ] 4.5.2 - ErrorHandler komponenti oluştur
- [ ] 4.5.3 - Toast notification sistemi kur (zaten var, genişlet)
- [ ] 4.5.4 - Hata loglarını konsola ve UI'da göster
- [ ] 4.5.5 - Başarı mesajları ekle

---

## 🎯 Faz 5: State Management ve Veri Akışı

### 5.1 State Management Yapısı

**Mevcut:** useState hook'ları (Index.tsx içinde)
**Hedef:** Daha organize state yönetimi

**Seçenekler:**
1. **Zustand** (önerilen - minimal, kolay)
2. **React Context API** (built-in, orta karmaşıklık)
3. **Redux Toolkit** (karmaşık, büyük projeler için)

**Görevler:**
- [ ] 5.1.1 - State management kütüphanesi seç ve yükle (Zustand öneriyorum)
- [ ] 5.1.2 - Store yapısını oluştur

### 5.2 Store Yapısı (Zustand Örneği)

**Dosya:** `src/store/tenderStore.ts`

```typescript
interface TenderStore {
  // Word Parse State
  wordFile: File | null;
  parsedTenderData: TenderData[];
  parseStatus: 'idle' | 'parsing' | 'success' | 'error';
  parseError: string | null;
  
  // PDF Parse State
  pdfFile: File | null;
  priceList: PriceListItem[];
  pdfParseStatus: 'idle' | 'parsing' | 'success' | 'error';
  pdfParseError: string | null;
  
  // Matching State
  matchResults: MatchResult[];
  matchingStatus: 'idle' | 'matching' | 'success' | 'error';
  
  // Excel Generation State
  excelBlob: Blob | null;
  excelStatus: 'idle' | 'generating' | 'success' | 'error';
  
  // Actions
  uploadWordFile: (file: File) => Promise<void>;
  uploadPdfFile: (file: File) => Promise<void>;
  matchPrices: () => Promise<void>;
  generateExcel: () => Promise<void>;
  updatePrice: (siraNo: string, price: number) => void;
  reset: () => void;
}
```

**Görevler:**
- [ ] 5.2.1 - tenderStore.ts dosyasını oluştur
- [ ] 5.2.2 - State interface'ini tanımla
- [ ] 5.2.3 - Actions'ları implement et
- [ ] 5.2.4 - Servislerle entegre et
- [ ] 5.2.5 - Hata yönetimini ekle

### 5.3 Komponentleri Store'a Bağlama

**Güncellenecek Komponentler:**
- `src/pages/Index.tsx`
- `src/components/WordUploader.tsx`
- `src/components/PdfUploader.tsx`
- `src/components/DataPreview.tsx`

**Görevler:**
- [ ] 5.3.1 - Index.tsx'i store kullanacak şekilde güncelle
- [ ] 5.3.2 - WordUploader'ı store'a bağla
- [ ] 5.3.3 - PdfUploader'ı store'a bağla
- [ ] 5.3.4 - DataPreview'ı store'a bağla

---

## 🎯 Faz 6: Test ve Doğrulama

### 6.1 Manuel Test Senaryoları

**Test Dosyaları:**
- `gereklidosyalar/2025-1375651_Birim_Fiyat_Teklif_Cetveli.docx`
- `gereklidosyalar/2025YiliBirimFiyatListesi.pdf`
- `gereklidosyalar/Yeni Microsoft Excel Çalışma Sayfası (2).xlsx` (referans)

**Test Senaryoları:**
1. **Başarılı Akış:**
   - Word yükle → Parse et → PDF yükle → Eşleştir → Excel indir
   - Tüm ürünler eşleşiyor
   - Formüller doğru çalışıyor

2. **Kısmi Eşleşme:**
   - Bazı ürünler eşleşmiyor
   - Manuel fiyat girişi yapılıyor
   - Excel yine doğru oluşuyor

3. **Hata Senaryoları:**
   - Yanlış format dosya yükleme
   - Bozuk Word dosyası
   - Boş PDF dosyası
   - İnternet bağlantısı yok (offline çalışma)

**Görevler:**
- [ ] 6.1.1 - Her test senaryosunu manuel olarak çalıştır
- [ ] 6.1.2 - Bulunan hataları dokümante et
- [ ] 6.1.3 - Hataları düzelt
- [ ] 6.1.4 - Regresyon testi yap

### 6.2 Veri Doğrulama

**Kontrol Edilecekler:**
- [ ] 6.2.1 - Word'den çıkarılan satır sayısı doğru mu?
- [ ] 6.2.2 - Poz numaraları doğru parse ediliyor mu?
- [ ] 6.2.3 - Miktarlar sayısal olarak doğru mu?
- [ ] 6.2.4 - PDF'den fiyatlar doğru çıkıyor mu?
- [ ] 6.2.5 - Eşleştirme algoritması düzgün çalışıyor mu?
- [ ] 6.2.6 - Excel formülleri doğru oluşuyor mu?
- [ ] 6.2.7 - Toplam hesaplama doğru mu?

### 6.3 Performans Testleri

**Test Edilecekler:**
- Word parse süresi (hedef: <5 saniye)
- PDF parse süresi (hedef: <10 saniye)
- Eşleştirme süresi (hedef: <3 saniye)
- Excel oluşturma süresi (hedef: <2 saniye)
- Toplam süreç süresi (hedef: <20 saniye)

**Görevler:**
- [ ] 6.3.1 - Her aşama için süre ölçümü ekle
- [ ] 6.3.2 - Performans darboğazlarını tespit et
- [ ] 6.3.3 - Optimizasyon yap

---

## 🎯 Faz 7: İyileştirmeler ve Ekstra Özellikler

### 7.1 Kullanıcı Deneyimi İyileştirmeleri

**Özellikler:**
- [ ] 7.1.1 - Keyboard shortcuts ekle (Enter, Esc vb.)
- [ ] 7.1.2 - Loading animasyonları iyileştir
- [ ] 7.1.3 - Tooltip'ler ekle (bilgi mesajları)
- [ ] 7.1.4 - Onboarding tour ekle (ilk kullanıcılar için)
- [ ] 7.1.5 - Dark mode desteği (zaten mevcut, iyileştir)

### 7.2 Veri Saklama ve Geçmiş

**Özellikler:**
- [ ] 7.2.1 - LocalStorage'da son işlemleri sakla
- [ ] 7.2.2 - Geçmiş işlemler sayfası oluştur
- [ ] 7.2.3 - "Son kaldığınız yerden devam edin" özelliği

### 7.3 İleri Düzey Özellikler

**Özellikler:**
- [ ] 7.3.1 - Toplu Word dosyası yükleme (batch processing)
- [ ] 7.3.2 - Excel şablonu özelleştirme
- [ ] 7.3.3 - PDF OCR desteği (taranmış PDF'ler için)
- [ ] 7.3.4 - Manuel eşleştirme için AI önerileri
- [ ] 7.3.5 - Export formatı seçenekleri (CSV, JSON)

### 7.4 Dokümantasyon

**Oluşturulacak Dökümanlar:**
- [ ] 7.4.1 - Kullanıcı kılavuzu (USER_GUIDE.md)
- [ ] 7.4.2 - Geliştirici dokümantasyonu (DEVELOPER.md)
- [ ] 7.4.3 - API dokümantasyonu (servisler için)
- [ ] 7.4.4 - Video tutorial (opsiyonel)

---

## 📊 Öncelik Sıralaması

### Kritik (Mutlaka Yapılmalı)
1. ✅ Faz 1: Word Parse İşlemi
2. ✅ Faz 2: Excel Oluşturma
3. ✅ Faz 3: PDF Parse ve Fiyat Eşleştirme
4. ✅ Faz 4: Temel UI/UX

### Yüksek (Önerilen)
5. ⚠️ Faz 5: State Management
6. ⚠️ Faz 6: Test ve Doğrulama

### Orta (Zaman Varsa)
7. 💡 Faz 7.1: UX İyileştirmeleri
8. 💡 Faz 7.2: Veri Saklama

### Düşük (Opsiyonel)
9. 🎁 Faz 7.3: İleri Özellikler
10. 🎁 Faz 7.4: Dokümantasyon

---

## 🚀 Geliştirme Sırası Önerisi

**Hafta 1: Temel Altyapı**
- Gün 1-2: Kütüphane kurulumları, tip tanımlamaları, klasör yapısı
- Gün 3-5: Word parser servisi geliştirme
- Gün 6-7: Word parser test ve düzeltmeler

**Hafta 2: Excel ve PDF**
- Gün 1-3: Excel generator servisi
- Gün 4-5: PDF parser servisi
- Gün 6-7: Fiyat eşleştirme algoritması

**Hafta 3: UI/UX**
- Gün 1-2: Multi-step wizard
- Gün 3-4: Word ve PDF uploader komponentleri
- Gün 5-6: Excel preview ve download
- Gün 7: UI polish ve düzeltmeler

**Hafta 4: State Management ve Test**
- Gün 1-2: State management implementasyonu
- Gün 3-4: Komponentleri store'a bağlama
- Gün 5-6: Manuel test senaryoları
- Gün 7: Bug fix ve final test

---

## 🛠️ Teknoloji Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui

**Kütüphaneler:**
- `mammoth` - Word parse
- `exceljs` - Excel oluşturma
- `pdf-parse` - PDF parse
- `file-saver` - Dosya indirme
- `zustand` - State management (önerilen)
- `react-query` - Data fetching (mevcut)

**Geliştirme Araçları:**
- ESLint
- TypeScript
- Vite Dev Server

---

## 📝 Notlar ve Önemli Hatırlatmalar

### Güvenlik
- ✅ API key'leri `.env` dosyasında sakla
- ✅ `.env` dosyasının `.gitignore`'da olduğundan emin ol
- ✅ Dosya yükleme boyut limitleri koy (10MB)
- ✅ Dosya tiplerini valide et

### Performans
- ✅ Büyük dosyalar için chunk processing kullan
- ✅ Web Worker kullanımını değerlendir (ağır parse işlemleri için)
- ✅ Lazy loading uygula (route bazlı)

### Kodlama Standartları
- ✅ Temiz kod yaz
- ✅ Her fonksiyon tek bir iş yapsın
- ✅ TypeScript tip güvenliğini kullan
- ✅ Hata yönetimi ekle
- ✅ Console.log yerine uygun logging kullan

### Hata Ayıklama
- ✅ Dosyaları silip yeniden oluşturma
- ✅ Adım adım debug et
- ✅ Hata mesajlarını oku ve anla
- ✅ Minimal değişiklikler yap ve test et

---

## 🎯 Başarı Kriterleri

Proje aşağıdaki kriterleri karşılamalı:

1. ✅ Word dosyası başarıyla parse ediliyor
2. ✅ Excel dosyası doğru formatla oluşuyor
3. ✅ PDF'den fiyatlar doğru çıkarılıyor
4. ✅ Fiyat eşleştirme en az %80 doğrulukla çalışıyor
5. ✅ Excel formülleri doğru hesaplanıyor
6. ✅ Kullanıcı deneyimi akıcı ve hatasız
7. ✅ Hata durumları düzgün yönetiliyor
8. ✅ Toplam işlem süresi <30 saniye

---

## 📞 Destek ve Sorular

Bu TODO dosyası dinamik bir dokümandır. Geliştirme sırasında:
- Her tamamlanan görevi işaretle ✅
- Yeni gereksinimler ekle
- Öncelikleri güncelle
- Notlar ekle

**İyi çalışmalar! 🚀**
