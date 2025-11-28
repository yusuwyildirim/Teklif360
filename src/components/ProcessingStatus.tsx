import { Loader2, FileSearch, FileText, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ProcessingStatusProps {
  pdfProgress?: {
    currentPage: number;
    totalPages: number;
    percentage: number;
    itemsFound: number;
    currentChunk?: number;
    totalChunks?: number;
  };
  isPdfProcessing?: boolean;
  onCancel?: () => void;
  cancelText?: string;
}

export const ProcessingStatus = ({ pdfProgress, isPdfProcessing, onCancel, cancelText = "İptal Et" }: ProcessingStatusProps) => {
  // PDF processing için özel UI
  if (isPdfProcessing && pdfProgress) {
    return (
      <Card className="p-8 max-w-2xl mx-auto bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border-border/50 shadow-xl">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 mb-2">
              <FileText className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground">PDF İşleniyor</h3>
            <p className="text-muted-foreground">
              Birim fiyat listesi parse ediliyor...
            </p>
          </div>

          <div className="space-y-4">
            <Progress value={pdfProgress.percentage} className="h-3" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {pdfProgress.currentPage} / {pdfProgress.totalPages}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Sayfa</p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-success">
                  {pdfProgress.itemsFound}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Kalem Bulundu</p>
              </div>
            </div>

            {pdfProgress.currentChunk && pdfProgress.totalChunks && (
              <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  📦 Chunk {pdfProgress.currentChunk} / {pdfProgress.totalChunks} işleniyor
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Her chunk ~50 sayfa içerir
                </p>
              </div>
            )}
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                {cancelText}
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Standart processing UI (Word parse vs.)
  return (
    <Card className="p-8 max-w-2xl mx-auto bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border-border/50 shadow-xl">
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground">İşleniyor</h3>
          <p className="text-muted-foreground">Dokümanınız işleniyor, lütfen bekleyin...</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border-2 border-primary/20">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary text-primary-foreground">
              <FileSearch className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Belge analiz ediliyor...</p>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <div className="flex justify-center pt-4">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              {cancelText}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
