import { useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { DataPreview } from "@/components/DataPreview";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Header } from "@/components/Header";
import { ProjectHistorySidebar } from "@/components/ProjectHistorySidebar";
import { ProjectNameDialog } from "@/components/ProjectNameDialog";
import { FileText, Search, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseWordDocument } from "@/services/wordParser";
import { matchWithOskabulut, applyMatchesToTenderData, getMatchStatistics } from "@/services/oskabulutMatching";
import { login } from "@/services/oskabulutAuth";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { useProjectHistory } from "@/hooks/useProjectHistory";
import type { ProjectHistory } from "@/types/projectHistory.types";
import type { TenderData, MatchResult } from "@/types/tender.types";
import type { OskabulutSearchProgress } from "@/types/oskabulut.types";
import { Link } from "react-router-dom";

type Step = 'word-upload' | 'word-processing' | 'oskabulut-search' | 'preview';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>('word-upload');
  const [parsedTenderData, setParsedTenderData] = useState<TenderData[] | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [finalData, setFinalData] = useState<TenderData[] | null>(null);
  const [searchProgress, setSearchProgress] = useState<OskabulutSearchProgress | null>(null);
  const [matchStats, setMatchStats] = useState<{ 
    total: number; 
    exact: number; 
    fuzzy: number; 
    manual: number; 
    none: number; 
    successRate: number;
  } | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const [projectNameDialogOpen, setProjectNameDialogOpen] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState<string>("");
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { credentials, hasCredentials } = useSettings();
  const { projects, saveProject, deleteProject, getProject } = useProjectHistory();

  const handleWordFileUpload = async (file: File) => {
    // Önce credentials kontrolü
    if (!hasCredentials()) {
      toast({
        title: "Giriş Bilgileri Eksik",
        description: "Lütfen önce Ayarlar sayfasından Oskabulut giriş bilgilerinizi kaydedin.",
        variant: "destructive",
      });
      return;
    }

    // Store file and show project name dialog
    setPendingFile(file);
    setCurrentFileName(file.name);
    setProjectNameDialogOpen(true);
  };

  const handleProjectNameConfirm = async (projectName: string) => {
    setCurrentProjectName(projectName);
    setProjectNameDialogOpen(false);
    
    // Now process the stored file
    if (pendingFile) {
      await processWordFile(pendingFile);
    }
  };

  const processWordFile = async (file: File) => {
    setCurrentStep('word-processing');
    
    try {
      const result = await parseWordDocument(file);
      
      if (result.success && result.data) {
        setParsedTenderData(result.data);
        
        toast({
          title: "Word Başarıyla İşlendi!",
          description: `${result.rowCount} satır başarıyla işlendi. Oskabulut araması başlatılıyor...`,
        });

        // Otomatik olarak Oskabulut aramasını başlat
        await handleOskabulutSearch(result.data);
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

  /**
   * Oskabulut ile otomatik arama ve eşleştirme
   */
  const handleOskabulutSearch = async (tenderData: TenderData[]) => {
    if (!credentials) {
      toast({
        title: "Giriş Bilgileri Eksik",
        description: "Lütfen önce Ayarlar sayfasından Oskabulut giriş bilgilerinizi kaydedin.",
        variant: "destructive",
      });
      setCurrentStep('word-upload');
      return;
    }

    setCurrentStep('oskabulut-search');
    setSearchProgress({ total: tenderData.length, completed: 0, current: '', failed: 0 });

    try {
      // Önce login yap
      console.log('🔐 Oskabulut\'a giriş yapılıyor...');
      const loginResult = await login(credentials);

      if (!loginResult.success) {
        toast({
          title: "Giriş Başarısız",
          description: "Oskabulut giriş yapılamadı. Lütfen ayarlardan bilgilerinizi kontrol edin.",
          variant: "destructive",
        });
        setCurrentStep('word-upload');
        return;
      }

      console.log('✅ Giriş başarılı, arama başlatılıyor...');

      // Progress callback
      const onProgress = (progress: OskabulutSearchProgress) => {
        setSearchProgress(progress);
      };

      // Tüm ürünleri Oskabulut'tan ara
      const matches = await matchWithOskabulut(tenderData, onProgress);
      setMatchResults(matches);

      // Eşleşmeleri uygula
      const dataWithPrices = applyMatchesToTenderData(matches);
      setFinalData(dataWithPrices);

      // İstatistikleri sakla
      const stats = getMatchStatistics(matches);
      setMatchStats(stats);

      toast({
        title: "Arama Tamamlandı!",
        description: `${stats.exact} tam eşleşme, ${stats.fuzzy} benzer eşleşme, ${stats.none} eşleşmedi. Başarı: %${stats.successRate}`,
      });

      setCurrentStep('preview');

    } catch (error) {
      console.error("Oskabulut search error:", error);
      toast({
        title: "Arama Hatası",
        description: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.",
        variant: "destructive",
      });
      setCurrentStep('word-upload');
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    toast({
      title: "İptal Edildi",
      description: "İşlem iptal edildi. Ana sayfaya dönülüyor...",
    });
    handleReset();
  };

  // Calculate estimated time remaining for Oskabulut search
  const calculateEstimatedTime = (progress: OskabulutSearchProgress) => {
    const avgTimePerItem = 2; // Average 2 seconds per item
    const remaining = progress.total - progress.completed;
    const estimatedSeconds = remaining * avgTimePerItem;
    
    if (estimatedSeconds < 60) {
      return `yaklaşık ${estimatedSeconds} saniye`;
    } else {
      const minutes = Math.ceil(estimatedSeconds / 60);
      return `yaklaşık ${minutes} dakika`;
    }
  };

  const handleReset = () => {
    setParsedTenderData(null);
    setMatchResults(null);
    setFinalData(null);
    setSearchProgress(null);
    setMatchStats(null);
    setIsCancelled(false);
    setCurrentStep('word-upload');
    setCurrentProjectName("");
    setCurrentFileName("");
    setSelectedProjectId(undefined);
    setPendingFile(null);
  };

  const handleSaveProject = (data: TenderData[]) => {
    if (!currentProjectName) return;

    const totalAmount = data.reduce((sum, item) => sum + (item.tutar || 0), 0);

    const project: ProjectHistory = {
      id: Date.now().toString(),
      name: currentProjectName,
      date: new Date().toISOString(),
      fileName: currentFileName,
      itemCount: data.length,
      totalAmount,
      data: data.map(item => ({
        siraNo: item.siraNo,
        pozNo: item.pozNo,
        tanim: item.tanim,
        birim: item.birim,
        miktar: item.miktar,
        birimFiyat: item.birimFiyat || 0,
        tutar: item.tutar || 0,
      })),
    };

    saveProject(project);
    setSelectedProjectId(project.id);
  };

  const handleSelectProject = (projectId: string) => {
    const project = getProject(projectId);
    if (project) {
      setSelectedProjectId(projectId);
      setCurrentProjectName(project.name);
      setCurrentFileName(project.fileName);
      setFinalData(project.data as TenderData[]);
      setCurrentStep('preview');
      toast({
        title: "İşlem Yüklendi",
        description: `"${project.name}" yüklendi.`,
      });
    }
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    if (selectedProjectId === projectId) {
      handleReset();
    }
    toast({
      title: "İşlem Silindi",
      description: "İşlem geçmişten silindi.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex">
      {/* Project History Sidebar */}
      <ProjectHistorySidebar
        projects={projects}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
        selectedProjectId={selectedProjectId}
      />
      
      {/* Project Name Dialog */}
      <ProjectNameDialog
        open={projectNameDialogOpen}
        onConfirm={handleProjectNameConfirm}
        defaultName={currentFileName.replace('.docx', '').replace('.doc', '')}
      />
      
      <div className="flex-1">
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
          {/* Credentials Check Alert */}
          {currentStep === 'word-upload' && !hasCredentials() && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Oskabulut Giriş Bilgileri Gerekli</AlertTitle>
              <AlertDescription>
                Fiyat verilerini çekmek için Oskabulut hesap bilgileriniz gereklidir.
                <Link to="/settings" className="ml-2 underline font-medium">
                  Ayarlar sayfasından giriş yapın
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Word Upload */}
          {currentStep === 'word-upload' && (
            <FileUploader onFileUpload={handleWordFileUpload} />
          )}

          {/* Step 2: Word Processing */}
          {currentStep === 'word-processing' && (
            <ProcessingStatus 
              onCancel={handleCancel}
              cancelText="İşlemi İptal Et"
            />
          )}

          {/* Step 3: Oskabulut Search */}
          {currentStep === 'oskabulut-search' && searchProgress && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
                    <Search className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">Oskabulut Araması Devam Ediyor</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchProgress.completed} / {searchProgress.total} ürün tamamlandı
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(searchProgress.completed / searchProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <p>Şu an aranıyor: {searchProgress.current}</p>
                    {searchProgress.completed > 0 && (
                      <p className="font-medium">Tahmini kalan süre: {calculateEstimatedTime(searchProgress)}</p>
                    )}
                  </div>
                </div>

                {/* Cancel Button */}
                <div className="flex justify-center pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Aramayı İptal Et
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Step 4: Preview & Download */}
          {currentStep === 'preview' && finalData && (
            <DataPreview 
              data={finalData} 
              onReset={handleReset}
              matchResults={matchResults || []}
              matchStats={matchStats || undefined}
              onSaveProject={handleSaveProject}
              projectName={currentProjectName}
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
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Oskabulut Entegrasyonu</h3>
              <p className="text-sm text-muted-foreground">
                Güncel POZ fiyatları otomatik olarak Oskabulut.com'dan çekilir
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
    </div>
  );
};

export default Index;
