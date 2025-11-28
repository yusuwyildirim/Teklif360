import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, CheckCircle2, Filter, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TenderData, MatchResult } from "@/types/tender.types";
import { generateAndDownloadExcel } from "@/services/excelGenerator";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataPreviewProps {
  data: TenderData[];
  onReset?: () => void;
  matchResults?: MatchResult[];
  matchStats?: {
    total: number;
    exact: number;
    fuzzy: number;
    manual: number;
    none: number;
    successRate: number;
  };
  onSaveProject?: (data: TenderData[]) => void;
  projectName?: string;
}

export const DataPreview = ({ data, onReset, matchResults = [], matchStats, onSaveProject, projectName }: DataPreviewProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "exact" | "fuzzy" | "none">("all");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'price' | 'quantity' | null>(null);
  const [editedData, setEditedData] = useState<TenderData[]>(data);
  const [tempPrice, setTempPrice] = useState<string>("");
  const [tempQuantity, setTempQuantity] = useState<string>("");

  // Satır için match bilgisini bul
  const getMatchInfo = (pozNo: string) => {
    return matchResults.find(m => m.tenderItem.pozNo === pozNo);
  };

  // Güven skoruna göre satır rengini belirle
  const getRowColor = (pozNo: string, birimFiyat: number | undefined) => {
    if (birimFiyat === undefined) {
      return "bg-red-50 hover:bg-red-100"; // Eşleşmedi
    }
    
    const match = getMatchInfo(pozNo);
    if (!match) return "";
    
    if (match.matchType === 'exact' && match.confidence === 100) {
      return "bg-green-50 hover:bg-green-100"; // Tam eşleşme
    } else if (match.matchType === 'fuzzy' && match.confidence >= 50) {
      return "bg-yellow-50 hover:bg-yellow-100"; // İyi fuzzy
    } else if (match.matchType === 'fuzzy' && match.confidence >= 20) {
      return "bg-orange-50 hover:bg-orange-100"; // Düşük güven fuzzy
    }
    
    return "";
  };

  // Güven skorunu göster
  const getConfidenceBadge = (pozNo: string) => {
    const match = getMatchInfo(pozNo);
    if (!match || !match.priceItem) return null;
    
    const confidence = match.confidence;
    let colorClass = "bg-gray-100 text-gray-800";
    
    if (confidence === 100) {
      colorClass = "bg-green-100 text-green-800";
    } else if (confidence >= 50) {
      colorClass = "bg-yellow-100 text-yellow-800";
    } else if (confidence >= 20) {
      colorClass = "bg-orange-100 text-orange-800";
    }
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colorClass}`}>
        %{confidence}
      </span>
    );
  };

  // Filtreleme
  const filteredData = editedData.filter(row => {
    if (filterType === "all") return true;
    
    const match = getMatchInfo(row.pozNo);
    const hasPriceItem = match?.priceItem !== null && match?.priceItem !== undefined;
    
    if (filterType === "exact") {
      return match?.matchType === 'exact' && match?.confidence === 100;
    } else if (filterType === "fuzzy") {
      return match?.matchType === 'fuzzy' || (match?.matchType === 'exact' && match?.confidence < 100);
    } else if (filterType === "none") {
      return !hasPriceItem || !row.birimFiyat;
    }
    
    return true;
  });

  // İstatistikler
  const pricedCount = matchStats 
    ? matchStats.exact + matchStats.fuzzy + matchStats.manual 
    : editedData.filter(d => d.birimFiyat !== undefined).length;
  
  const pendingCount = matchStats 
    ? matchStats.none 
    : editedData.filter(d => d.birimFiyat === undefined).length;


  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      // Excel dosyasını oluştur ve indir (editedData kullan)
      await generateAndDownloadExcel(editedData, projectName);
      
      // Save project to history
      if (onSaveProject) {
        onSaveProject(editedData);
      }
      
      toast({
        title: "Başarılı!",
        description: "Excel dosyanız indirildi ve işlem kaydedildi.",
      });
    } catch (error) {
      console.error("Excel indirme hatası:", error);
      toast({
        title: "Hata",
        description: "Excel dosyası oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEditStart = (index: number, field: 'price' | 'quantity', currentValue?: number) => {
    setEditingIndex(index);
    setEditingField(field);
    if (field === 'price') {
      setTempPrice(currentValue !== undefined ? currentValue.toString() : "");
    } else {
      setTempQuantity(currentValue !== undefined ? currentValue.toString() : "");
    }
  };

  const handleEditSave = (index: number) => {
    const updatedData = [...editedData];
    
    if (editingField === 'price') {
      const newPrice = parseFloat(tempPrice.replace(",", "."));
      
      if (isNaN(newPrice) || newPrice < 0) {
        toast({
          title: "Geçersiz Fiyat",
          description: "Lütfen geçerli bir sayı girin.",
          variant: "destructive",
        });
        return;
      }

      updatedData[index] = {
        ...updatedData[index],
        birimFiyat: newPrice,
        tutar: newPrice * updatedData[index].miktar,
      };
      
      toast({
        title: "Kaydedildi",
        description: "Birim fiyat başarıyla güncellendi.",
      });
    } else if (editingField === 'quantity') {
      const newQuantity = parseFloat(tempQuantity.replace(",", "."));
      
      if (isNaN(newQuantity) || newQuantity < 0) {
        toast({
          title: "Geçersiz Miktar",
          description: "Lütfen geçerli bir sayı girin.",
          variant: "destructive",
        });
        return;
      }

      updatedData[index] = {
        ...updatedData[index],
        miktar: newQuantity,
        tutar: (updatedData[index].birimFiyat || 0) * newQuantity,
      };
      
      toast({
        title: "Kaydedildi",
        description: "Miktar başarıyla güncellendi.",
      });
    }
    
    setEditedData(updatedData);
    setEditingIndex(null);
    setEditingField(null);
    setTempPrice("");
    setTempQuantity("");
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditingField(null);
    setTempPrice("");
    setTempQuantity("");
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Success Header */}
      <Card className="p-6 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Dönüşüm Tamamlandı</h3>
            <p className="text-sm text-muted-foreground">
              {data.length} kalem başarıyla işlendi
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Yeni Dosya
            </Button>
            <Button 
              onClick={handleDownload} 
              size="sm" 
              className="bg-gradient-to-r from-primary to-accent"
              disabled={isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "İndiriliyor..." : "Excel İndir"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Statistics Cards - Moved from bottom */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-card to-card/50">
          <p className="text-sm text-muted-foreground mb-1">Toplam Kalem</p>
          <p className="text-2xl font-bold text-foreground">{data.length}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <p className="text-sm text-muted-foreground mb-1">Fiyatlandırılmış</p>
          <p className="text-2xl font-bold text-green-700">{pricedCount}</p>
          {matchStats && (
            <p className="text-xs text-green-600 mt-1">
              {matchStats.exact} tam, {matchStats.fuzzy} benzer
            </p>
          )}
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <p className="text-sm text-muted-foreground mb-1">Bekleyen</p>
          <p className="text-2xl font-bold text-orange-700">{pendingCount}</p>
        </Card>
      </div>

      {/* Filter Section */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Filtreleme
            </label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtre seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü ({data.length})</SelectItem>
                <SelectItem value="exact">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Kesin Eşleşme ({matchStats?.exact || 0})
                  </span>
                </SelectItem>
                <SelectItem value="fuzzy">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    Benzer Eşleşme ({matchStats?.fuzzy || 0})
                  </span>
                </SelectItem>
                <SelectItem value="none">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    Eşleşmedi ({matchStats?.none || 0})
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredData.length} kayıt gösteriliyor
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Sıra No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Poz No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">İş Kaleminin Adı</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Birimi</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Miktarı</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Birim Fiyat</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Güven</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Tutarı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredData.map((row, index) => (
                <tr
                  key={index}
                  className={`
                    transition-colors
                    ${getRowColor(row.pozNo, row.birimFiyat)}
                    ${index % 2 === 0 && !getRowColor(row.pozNo, row.birimFiyat) ? "bg-background" : ""}
                    ${index % 2 !== 0 && !getRowColor(row.pozNo, row.birimFiyat) ? "bg-muted/30" : ""}
                  `}
                >
                  <td className="px-4 py-3 text-sm text-foreground">{row.siraNo}</td>
                  <td className="px-4 py-3 text-sm font-mono text-primary">{row.pozNo}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.tanim}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.birim}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-foreground group">
                    {editingIndex === index && editingField === 'quantity' ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="text"
                          value={tempQuantity}
                          onChange={(e) => setTempQuantity(e.target.value)}
                          className="w-24 h-7 text-right text-sm"
                          placeholder="0.00"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          onClick={() => handleEditSave(index)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={handleEditCancel}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span>{row.miktar}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700"
                          onClick={() => handleEditStart(index, 'quantity', row.miktar)}
                          title="Düzenle"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground group">
                    {editingIndex === index && editingField === 'price' ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="text"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="w-28 h-7 text-right text-sm"
                          placeholder="0.00"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          onClick={() => handleEditSave(index)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={handleEditCancel}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span>
                          {row.birimFiyat !== undefined ? row.birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : "-"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 hover:text-purple-700"
                          onClick={() => handleEditStart(index, 'price', row.birimFiyat)}
                          title="Düzenle"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {getConfidenceBadge(row.pozNo)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                    {row.tutar !== undefined ? row.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gradient-to-r from-primary/5 to-accent/5 border-t-2 border-primary/20">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  TOPLAM TUTAR:
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-primary">
                  {editedData
                    .reduce((sum, row) => sum + (row.tutar || 0), 0)
                    .toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
