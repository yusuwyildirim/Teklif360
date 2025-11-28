/**
 * Teklif360 Proxy Server
 * Oskabulut.com için CORS bypass proxy servisi
 * Normal bir browser gibi davranır
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session storage (her kullanıcı için cookies)
const sessions = new Map();

/**
 * POST /api/login
 * Oskabulut'a giriş yapar, cookie'leri saklar
 */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email ve şifre gerekli' 
    });
  }

  try {
    console.log(`🔐 Login attempt: ${email}`);

    // ADIM 1: Önce login sayfasını GET ile al (normal kullanıcı gibi)
    console.log('📄 Login sayfası alınıyor...');
    const loginPageResponse = await axios.get('https://www.oskabulut.com/kullanici-girisi', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    // ADIM 2: HTML'den CSRF token'ı çek
    const $ = cheerio.load(loginPageResponse.data);
    const csrfToken = $('input[name="__RequestVerificationToken"]').val();
    
    console.log('🔑 CSRF Token bulundu:', csrfToken ? 'Evet ✓' : 'Hayır ✗');

    // ADIM 3: Gelen cookie'leri sakla
    const setCookies = loginPageResponse.headers['set-cookie'] || [];
    const cookieJar = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
    
    console.log('🍪 Cookies alındı:', setCookies.length, 'adet');

    // FormData hazırla (normal kullanıcı gibi)
    const formData = new URLSearchParams();
    formData.append('Email', email);
    formData.append('Password', password);
    formData.append('RememberMe', 'false');
    
    // CSRF token varsa ekle
    if (csrfToken) {
      formData.append('__RequestVerificationToken', csrfToken);
    }

    // ADIM 4: Şimdi POST isteği at (cookie ve CSRF token ile)
    console.log('📤 Login POST isteği gönderiliyor...');
    const response = await axios.post(
      'https://www.oskabulut.com/kullanici-girisi',
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://www.oskabulut.com/kullanici-girisi',
          'Origin': 'https://www.oskabulut.com',
          'Cookie': cookieJar
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 500
      }
    );

    // Cookie'leri al (POST response'dan VEYA önceki GET'ten)
    let allCookies = response.headers['set-cookie'] || [];
    
    // Eğer POST'ta yeni cookie geldiyse ekle, gelmediyse GET'teki cookie'leri kullan
    if (allCookies.length === 0) {
      allCookies = setCookies;
    } else {
      // Her iki setten de cookie'leri birleştir
      allCookies = [...setCookies, ...allCookies];
    }
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response StatusText:', response.statusText);
    console.log('🔀 Final URL:', response.request?.res?.responseUrl || response.config?.url || 'N/A');
    console.log('🍪 Total cookies:', allCookies.length, 'adet');
    
    // Response body'yi kontrol et (hata mesajı var mı?)
    const bodyPreview = typeof response.data === 'string' 
      ? response.data.substring(0, 300) 
      : JSON.stringify(response.data).substring(0, 300);
    
    // Başarı kontrolü: Anasayfaya yönlendirildi mi? Veya login sayfasında hata var mı?
    const isSuccessful = response.status === 200 && 
                        (bodyPreview.includes('Anasayfa') || 
                         bodyPreview.includes('HakedişBulut') ||
                         response.request?.res?.responseUrl?.includes('oskabulut.com/') &&
                         !response.request?.res?.responseUrl?.includes('kullanici-girisi'));
    
    const hasError = bodyPreview.includes('Geçersiz') || 
                     bodyPreview.includes('hatalı') || 
                     bodyPreview.includes('field-validation-error');
    
    console.log('✅ Success check:', isSuccessful);
    console.log('❌ Error check:', hasError);
    
    if (isSuccessful && !hasError && allCookies.length > 0) {
      // Session ID oluştur
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Cookie'leri sakla
      sessions.set(sessionId, {
        cookies: allCookies,
        email: email,
        createdAt: Date.now()
      });

      console.log(`✅ Login successful: ${email}`);
      console.log(`📝 Session ID: ${sessionId}`);

      return res.json({
        success: true,
        message: 'Giriş başarılı',
        sessionId: sessionId
      });
    }

    console.log(`❌ Login failed: ${email}`);
    console.log('📄 Body preview:', bodyPreview);
    return res.json({
      success: false,
      message: 'Giriş başarısız. Email veya şifre yanlış.'
    });

  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data?.substring(0, 200)
    });
    
    return res.status(500).json({
      success: false,
      message: `Giriş hatası: ${error.message}`
    });
  }
});

/**
 * GET /api/search
 * Oskabulut'ta arama yapar
 */
app.get('/api/search', async (req, res) => {
  const { query, sessionId } = req.query;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query parametresi gerekli'
    });
  }

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({
      success: false,
      error: 'Geçersiz session. Lütfen önce giriş yapın.'
    });
  }

  try {
    const session = sessions.get(sessionId);
    const searchUrl = `https://www.oskabulut.com/kutuphane?searchBox=${encodeURIComponent(query)}`;

    console.log(`🔍 Searching: ${query}`);

    // Search request with cookies
    const response = await axios.get(searchUrl, {
      headers: {
        'Cookie': session.cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.oskabulut.com/kutuphane'
      }
    });

    // HTML parse et
    const $ = cheerio.load(response.data);
    const results = [];

    // Tablo satırlarını bul: #genel-grid table tbody tr
    $('#genel-grid table tbody tr').each((i, row) => {
      const cells = $(row).find('td');
      
      if (cells.length >= 7) {
        const result = {
          pozNo: $(cells[1]).text().trim(),
          tanim: $(cells[2]).text().trim(),
          birim: $(cells[3]).text().trim(),
          birimFiyat: $(cells[4]).text().trim(),
          kitapAdi: $(cells[5]).text().trim(),
          fasikulAdi: $(cells[6]).text().trim()
        };

        if (result.pozNo || result.tanim) {
          results.push(result);
        }
      }
    });

    console.log(`✅ Found ${results.length} results for: ${query}`);

    return res.json({
      success: true,
      data: results,
      searchTerm: query
    });

  } catch (error) {
    console.error('Search error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      searchTerm: query
    });
  }
});

/**
 * GET /api/session-check
 * Session geçerliliğini kontrol eder
 */
app.get('/api/session-check', async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.json({ valid: false });
  }

  const session = sessions.get(sessionId);
  const ageMinutes = (Date.now() - session.createdAt) / 1000 / 60;

  // 30 dakikadan eski sessionlar geçersiz
  if (ageMinutes > 30) {
    sessions.delete(sessionId);
    return res.json({ valid: false });
  }

  return res.json({ valid: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeSessions: sessions.size,
    uptime: process.uptime()
  });
});

// Server başlat
app.listen(PORT, () => {
  console.log(`\n🚀 Teklif360 Proxy Server çalışıyor`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`\n✅ Hazır! Frontend'den istekleri kabul ediyor.\n`);
});

// Cleanup: Eski sessionları temizle (her 10 dakikada)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    const ageMinutes = (now - session.createdAt) / 1000 / 60;
    if (ageMinutes > 30) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired sessions`);
  }
}, 10 * 60 * 1000);
