import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
}

export const FileUploader = ({ onFileUpload }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
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
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith(".docx")) {
      toast({
        title: "Geçersiz dosya formatı",
        description: "Lütfen .docx formatında bir Word belgesi yükleyin.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Dosya çok büyük",
        description: "Dosya boyutu 10 MB'dan küçük olmalıdır.",
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

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && validateFile(files[0])) {
        onFileUpload(files[0]);
      }
    },
    [onFileUpload, toast]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && validateFile(files[0])) {
      onFileUpload(files[0]);
    }
  };

  return (
    <div className="w-full">
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
          id="file-upload"
          className="hidden"
          accept=".docx,.doc"
          onChange={handleFileSelect}
        />

        <div className="space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10">
            {isDragging ? (
              <Upload className="w-10 h-10 text-primary animate-bounce" />
            ) : (
              <img 
                src="/Teklif360-PNG-ICO.png" 
                alt="Teklif360" 
                className="w-12 h-12 object-contain"
              />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {isDragging ? "Dosyayı bırakın" : "Birim Fiyat Teklif Cetvelini Yükleyin"}
            </h3>
            <p className="text-muted-foreground">
              Word belgenizi sürükleyip bırakın veya seçin
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => document.getElementById("file-upload")?.click()}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <Upload className="w-4 h-4 mr-2" />
              Dosya Seç
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Desteklenen format: .docx • Maksimum boyut: 10 MB
          </p>
        </div>
      </div>
    </div>
  );
};
