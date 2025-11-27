import { useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { PdfUploader } from "@/components/PdfUploader";
import { DataPreview } from "@/components/DataPreview";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Header } from "@/components/Header";
import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseWordDocument } from "@/services/wordParser";
import { parsePdfPriceList } from "@/services/pdfParser";
import { matchPrices, applyMatchesToTenderData, getMatchStatistics } from "@/services/priceMatching";
import { useToast } from "@/hooks/use-toast";
import type { TenderData, PriceListItem, MatchResult } from "@/types/tender.types";

type Step = 'word-upload' | 'word-processing' | 'pdf-upload' | 'pdf-processing' | 'preview';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>('word-upload');
  const [parsedTenderData, setParsedTenderData] = useState<TenderData[] | null>(null);
  const [priceList, setPriceList] = useState<PriceListItem[] | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [finalData, setFinalData] = useState<TenderData[] | null>(null);
  const [matchStats, setMatchStats] = useState<{ 
    total: number; 
    exact: number; 
    fuzzy: number; 
    manual: number; 
    none: number; 
    successRate: number;
  } | null>(null);
  const { toast } = useToast();

  const handleWordFileUpload = async (file: File) => {
    setCurrentStep('word-processing');
    
    try {
      const result = await parseWordDocument(file);
      
      if (result.success && result.data) {
        setParsedTenderData(result.data);
        setCurrentStep('pdf-upload');
        
        toast({
          title: "Başarılı!",
          description: `${result.rowCount} satır başarıyla işlendi. Şimdi PDF birim fiyat listesini yükleyin.`,
        });
      } else {
        toast({
          title: "Hata",
          description: result.error || "Dosya işlenirken bir hata oluştu.",
          variant: "destructive",
        });
        setCurrentStep('word-upload');
      }
    } catch (error) {
      console.error("Parse hatası:", error);
      toast({
        title: "Hata",
        description: "Dosya işlenirken beklenmeyen bir hata oluştu.",
        variant: "destructive",
      });
      setCurrentStep('word-upload');
    }
  };

  const handlePdfFileUpload = async (files: File[]) => {
    setCurrentStep('pdf-processing');
    
    try {
      console.log(`📁 ${files.length} adet PDF dosyası işleniyor...`);
      
      // Tüm PDF'leri parallel olarak parse et
      const allPrices: PriceListItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`\n📄 Dosya ${i + 1}/${files.length}: ${file.name}`);
        
        try {
          const prices = await parsePdfPriceList(file);
          console.log(`✅ ${file.name}: ${prices.length} fiyat bulundu`);
          allPrices.push(...prices);
        } catch (error) {
          console.error(`❌ ${file.name} parse hatası:`, error);
          toast({
            title: `${file.name} işlenemedi`,
            description: "Bu dosya atlandı, diğer dosyalar işlenmeye devam ediliyor.",
            variant: "destructive",
          });
        }
      }
      
      // Duplikaları temizle - aynı POZ NO varsa son bulananı tut
      const uniquePrices = new Map<string, PriceListItem>();
      for (const price of allPrices) {
        uniquePrices.set(price.pozNo, price);
      }
      const prices = Array.from(uniquePrices.values());
      
      setPriceList(prices);
      
      console.log('\n📊 Tüm PDF Parse Sonuçları:');
      console.log('- Toplam dosya sayısı:', files.length);
      console.log('- Toplam fiyat sayısı (duplikatlı):', allPrices.length);
      console.log('- Benzersiz fiyat sayısı:', prices.length);
      if (prices.length > 0) {
        console.log('- İlk 10 POZ NO:', prices.slice(0, 10).map(p => p.pozNo));
        console.log('- Örnek kayıt:', prices[0]);
      }
      
      console.log('\n📋 Word Verileri:');
      if (parsedTenderData) {
        console.log('- Toplam kalem sayısı:', parsedTenderData.length);
        console.log('- İlk 10 POZ NO:', parsedTenderData.slice(0, 10).map(t => t.pozNo));
        console.log('- Örnek kayıt:', parsedTenderData[0]);
      }
      
      if (parsedTenderData && prices.length > 0) {
        // Fiyatları eşleştir
        const matches = matchPrices(parsedTenderData, prices);
        setMatchResults(matches);
        
        console.log('\n🔗 Eşleştirme Sonuçları:');
        console.log('- Toplam:', matches.length);
        const exactMatches = matches.filter(m => m.matchType === 'exact');
        const fuzzyMatches = matches.filter(m => m.matchType === 'fuzzy');
        const noMatches = matches.filter(m => m.matchType === 'none');
        console.log('- Tam eşleşme (POZ NO):', exactMatches.length);
        console.log('- Benzer eşleşme (İsim):', fuzzyMatches.length);
        console.log('- Eşleşmedi:', noMatches.length);
        
        if (exactMatches.length > 0) {
          console.log('\n✅ İlk tam eşleşme örneği:', exactMatches[0]);
        }
        if (fuzzyMatches.length > 0) {
          console.log('\n🔍 İlk benzer eşleşme örneği:', fuzzyMatches[0]);
        }
        if (noMatches.length > 0 && noMatches.length <= 20) {
          console.log('\n❌ Eşleşmeyen POZ NO\'lar:', noMatches.map(m => `${m.tenderItem.pozNo} (${m.tenderItem.tanim.substring(0, 30)}...)`));
        }
        
        // Eşleşmeleri uygula
        const dataWithPrices = applyMatchesToTenderData(matches);
        setFinalData(dataWithPrices);
        
        // İstatistikleri sakla
        const stats = getMatchStatistics(matches);
        setMatchStats(stats);
        setMatchResults(matches);
        
        toast({
          title: "Fiyat Eşleştirme Tamamlandı!",
          description: `${files.length} PDF işlendi. ${stats.exact} tam eşleşme, ${stats.fuzzy} benzer eşleşme, ${stats.none} eşleşmedi. Başarı: %${stats.successRate}`,
        });
        
        setCurrentStep('preview');
      } else {
        toast({
          title: "Uyarı",
          description: "PDF'den fiyat bilgisi çıkarılamadı.",
          variant: "destructive",
        });
        setCurrentStep('pdf-upload');
      }
    } catch (error) {
      console.error("PDF parse hatası:", error);
      toast({
        title: "Hata",
        description: "PDF dosyası işlenirken bir hata oluştu.",
        variant: "destructive",
      });
      setCurrentStep('pdf-upload');
    }
  };

  const handleSkipPdf = () => {
    if (parsedTenderData) {
      setFinalData(parsedTenderData);
      setCurrentStep('preview');
      
      toast({
        title: "PDF Atlandı",
        description: "Birim fiyatlar boş bırakıldı. Excel'de manuel olarak doldurabilirsiniz.",
      });
    }
  };

  const handleReset = () => {
    setParsedTenderData(null);
    setPriceList(null);
    setMatchResults(null);
    setFinalData(null);
    setCurrentStep('word-upload');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center mb-4">
            <img 
              src="/Teklif360-PNG-ICO.png" 
              alt="Teklif360 Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Teklif360
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            İhale dokümanlarınızı otomatik olarak Excel formatına dönüştürün. 
            Hızlı, güvenilir ve kolay kullanım.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Step 1: Word Upload */}
          {currentStep === 'word-upload' && (
            <FileUploader onFileUpload={handleWordFileUpload} />
          )}

          {/* Step 2: Word Processing */}
          {currentStep === 'word-processing' && <ProcessingStatus />}

          {/* Step 3: PDF Upload */}
          {currentStep === 'pdf-upload' && parsedTenderData && (
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">Word Başarıyla İşlendi</h3>
                    <p className="text-sm text-muted-foreground">
                      {parsedTenderData.length} kalem ürün bulundu. Şimdi birim fiyatları yükleyin.
                    </p>
                  </div>
                  <Button onClick={handleSkipPdf} variant="outline" size="sm">
                    Atla <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
              <PdfUploader onFilesUpload={handlePdfFileUpload} />
            </div>
          )}

          {/* Step 4: PDF Processing */}
          {currentStep === 'pdf-processing' && <ProcessingStatus />}

          {/* Step 5: Preview & Download */}
          {currentStep === 'preview' && finalData && (
            <DataPreview 
              data={finalData} 
              onReset={handleReset}
              matchResults={matchResults || []}
              matchStats={matchStats || undefined}
            />
          )}
        </div>

        {/* Features Section */}
        {currentStep === 'word-upload' && (
          <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Otomatik Dönüşüm</h3>
              <p className="text-sm text-muted-foreground">
                Word belgelerinizi saniyeler içinde Excel formatına dönüştürün
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">Hatasız Hesaplama</h3>
              <p className="text-sm text-muted-foreground">
                Formüller otomatik oluşturulur, hesaplama hataları ortadan kalkar
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">Hızlı İşlem</h3>
              <p className="text-sm text-muted-foreground">
                Saatler süren işleriniz artık dakikalar içinde tamamlanır
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
