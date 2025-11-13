/**
 * PDF Birim Fiyat Listesi yükleme komponenti
 * Birden fazla PDF yüklenebilir
 */

import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface PdfUploaderProps {
  onFilesUpload: (files: File[]) => void;
  uploadedFiles?: File[];
}

export const PdfUploader = ({ onFilesUpload, uploadedFiles = [] }: PdfUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>(uploadedFiles);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    // PDF kontrolü
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast({
        title: "Geçersiz dosya formatı",
        description: "Lütfen .pdf formatında bir dosya yükleyin.",
        variant: "destructive",
      });
      return false;
    }

    // Boyut kontrolü (50 MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Dosya çok büyük",
        description: "Dosya boyutu 50 MB'dan küçük olmalıdır.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(validateFile);
      if (files.length > 0) {
        const newFiles = [...selectedFiles, ...files];
        setSelectedFiles(newFiles);
      }
    },
    [selectedFiles]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(validateFile);
      if (validFiles.length > 0) {
        const newFiles = [...selectedFiles, ...validFiles];
        setSelectedFiles(newFiles);
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Dosya seçilmedi",
        description: "Lütfen en az bir PDF dosyası seçin.",
        variant: "destructive",
      });
      return;
    }
    onFilesUpload(selectedFiles);
  };

  return (
    <div className="w-full space-y-4">
      {/* Seçilen dosyalar listesi */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            Seçilen PDF Dosyaları ({selectedFiles.length})
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center
          transition-all duration-300 ease-in-out
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-accent/5"
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="pdf-upload"
          className="hidden"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
        />

        <div className="space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10">
            {isDragging ? (
              <Upload className="w-10 h-10 text-accent animate-bounce" />
            ) : (
              <FileText className="w-10 h-10 text-accent" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {isDragging ? "Dosyaları bırakın" : "Birim Fiyat Listelerini Yükleyin"}
            </h3>
            <p className="text-muted-foreground">
              Birden fazla PDF birim fiyat listesi yükleyebilirsiniz
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => document.getElementById("pdf-upload")?.click()}
              size="lg"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              PDF Ekle
            </Button>
            
            {selectedFiles.length > 0 && (
              <Button
                onClick={handleUpload}
                size="lg"
                className="bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity"
              >
                <FileText className="w-4 h-4 mr-2" />
                {selectedFiles.length} Dosyayı İşle
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Desteklenen format: .pdf • Maksimum dosya boyutu: 50 MB
          </p>
        </div>
      </div>
    </div>
  );
};
