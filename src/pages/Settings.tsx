/**
 * Settings sayfası
 * Oskabulut credentials ve tema ayarları
 */

import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { login, checkSession } from '@/services/oskabulutAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Trash2, CheckCircle, XCircle, Moon, Sun } from 'lucide-react';

export default function Settings() {
  const { 
    credentials, 
    theme, 
    saveCredentials, 
    clearCredentials, 
    toggleTheme,
    hasCredentials 
  } = useSettings();
  
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Mevcut credentials'ı form'a yükle
  useEffect(() => {
    if (credentials) {
      setEmail(credentials.email);
      setPassword(credentials.password);
    }
  }, [credentials]);

  /**
   * Kaydet butonu handler
   */
  const handleSave = async () => {
    // Validation
    if (!email || !password) {
      toast({
        title: "Eksik Bilgi",
        description: "Email ve şifre alanları zorunludur.",
        variant: "destructive"
      });
      return;
    }

    if (!email.includes('@')) {
      toast({
        title: "Geçersiz Email",
        description: "Lütfen geçerli bir email adresi girin.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Önce giriş bilgilerini test et (proxy üzerinden)
      const loginResult = await login({ email, password });

      if (!loginResult.success) {
        toast({
          title: "Giriş Başarısız",
          description: loginResult.message || "Kullanıcı bilgileri doğrulanamadı. Proxy server çalışıyor mu?",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Başarılı login - credentials'ı kaydet
      const saved = saveCredentials({ email, password });

      if (saved) {
        setConnectionStatus('success');
        toast({
          title: "Kaydedildi",
          description: "Oskabulut giriş bilgileriniz başarıyla kaydedildi.",
        });
      } else {
        toast({
          title: "Kayıt Hatası",
          description: "Bilgiler kaydedilemedi. Lütfen tekrar deneyin.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.",
        variant: "destructive"
      });
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Temizle butonu handler
   */
  const handleClear = () => {
    const cleared = clearCredentials();
    if (cleared) {
      setEmail('');
      setPassword('');
      setConnectionStatus('idle');
      toast({
        title: "Temizlendi",
        description: "Oskabulut giriş bilgileri silindi.",
      });
    }
  };

  /**
   * Bağlantıyı test et
   */
  const handleTestConnection = async () => {
    if (!hasCredentials()) {
      toast({
        title: "Bilgi Eksik",
        description: "Önce giriş bilgilerini kaydedin.",
        variant: "destructive"
      });
      return;
    }

    setIsTestingConnection(true);
    
    try {
      const isValid = await checkSession();
      
      if (isValid) {
        setConnectionStatus('success');
        toast({
          title: "Bağlantı Başarılı",
          description: "Oskabulut.com ile bağlantı kuruldu.",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Bağlantı Hatası",
          description: "Session geçersiz. Lütfen bilgilerinizi güncelleyin.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Test Başarısız",
        description: "Bağlantı test edilemedi.",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ayarlar</h1>
        <p className="text-muted-foreground">
          Oskabulut giriş bilgilerinizi ve tema tercihlerinizi yönetin.
        </p>
      </div>

      <div className="space-y-6">
        {/* Oskabulut Credentials Card */}
        <Card>
          <CardHeader>
            <CardTitle>Oskabulut.com Giriş Bilgileri</CardTitle>
            <CardDescription>
              POZ fiyat verilerini çekmek için Oskabulut hesap bilgileriniz gereklidir.
              {hasCredentials() && (
                <span className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Giriş bilgileri kaydedildi
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Connection Status */}
            {connectionStatus !== 'idle' && (
              <div className={`flex items-center gap-2 p-3 rounded-md ${
                connectionStatus === 'success' 
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
              }`}>
                {connectionStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Bağlantı başarılı</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm">Bağlantı başarısız</span>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Kaydet ve Test Et
                  </>
                )}
              </Button>

              {hasCredentials() && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test Et'
                    )}
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleClear}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              ℹ️ Bilgileriniz yalnızca tarayıcınızda localStorage'da saklanır ve güvenlidir.
            </p>
          </CardContent>
        </Card>

        {/* Theme Card */}
        <Card>
          <CardHeader>
            <CardTitle>Görünüm</CardTitle>
            <CardDescription>
              Uygulamanın tema tercihini seçin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
                <div>
                  <Label htmlFor="theme-toggle" className="text-base cursor-pointer">
                    {theme === 'dark' ? 'Karanlık Mod' : 'Aydınlık Mod'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Göz rahatlığı için karanlık temayı aktifleştirin
                  </p>
                </div>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              ℹ️ Proxy Server Bilgisi
            </h3>
            <p className="text-sm text-muted-foreground">
              Oskabulut.com ile iletişim için proxy server kullanılıyor. 
              Proxy server çalışmazsa giriş yapamayabilirsiniz.
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
              <li>Proxy URL: <code className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">http://localhost:3001</code></li>
              <li>Kurulum: <code className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">cd server && npm install && npm start</code></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}