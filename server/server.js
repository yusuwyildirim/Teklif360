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
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:8080', 
  'http://localhost:8081', 
  'http://localhost:5173',
  // Add your Netlify URL here when deployed
  // 'https://your-app.netlify.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session storage (her kullanıcı için cookies)
const sessions = new Map();

/**
 * GET /health
 * Health check endpoint for Railway/Render deployment
 */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    sessions: sessions.size
  });
});

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

    // ADIM 4: POST isteği at - REDIRECT'LERİ MANUEL TAKİP ET
    console.log('📤 Login POST isteği gönderiliyor (manuel redirect tracking)...');
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
        maxRedirects: 0, // MANUEL REDIRECT TAKİBİ
        validateStatus: (status) => status >= 200 && status < 500
      }
    );

    // TÜM COOKIE'LERİ TOPLA
    let allCookies = [...setCookies]; // GET cookies
    console.log('📊 POST Response Status:', response.status);
    
    // POST response cookie'leri
    const postCookies = response.headers['set-cookie'] || [];
    console.log('🍪 POST response cookies:', postCookies.length, 'adet');
    if (postCookies.length > 0) {
      console.log('🍪 POST cookies:', JSON.stringify(postCookies));
      allCookies = [...allCookies, ...postCookies];
    }
    
    // REDIRECT varsa takip et
    let finalResponse = response;
    let redirectCount = 0;
    const maxRedirects = 5;
    
    while ((finalResponse.status === 301 || finalResponse.status === 302 || finalResponse.status === 303 || finalResponse.status === 307 || finalResponse.status === 308) && redirectCount < maxRedirects) {
      const redirectLocation = finalResponse.headers['location'];
      if (!redirectLocation) break;
      
      redirectCount++;
      console.log(`🔀 Redirect ${redirectCount}: ${redirectLocation}`);
      
      // Tüm cookie'leri birleştir ve redirect request'e ekle
      const currentCookieString = allCookies.map(c => c.split(';')[0]).join('; ');
      
      // Redirect'i takip et
      const redirectUrl = redirectLocation.startsWith('http') 
        ? redirectLocation 
        : `https://www.oskabulut.com${redirectLocation}`;
        
      finalResponse = await axios.get(redirectUrl, {
        headers: {
          'Cookie': currentCookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.oskabulut.com/kullanici-girisi'
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 500
      });
      
      // Redirect response'dan gelen cookie'leri ekle
      const redirectCookies = finalResponse.headers['set-cookie'] || [];
      console.log(`🍪 Redirect ${redirectCount} cookies:`, redirectCookies.length, 'adet');
      if (redirectCookies.length > 0) {
        console.log(`🍪 Redirect ${redirectCount} cookies:`, JSON.stringify(redirectCookies));
        allCookies = [...allCookies, ...redirectCookies];
      }
    }
    
    console.log('✅ Redirect chain completed');
    console.log('🍪 GET cookies:', setCookies.length, 'adet');
    console.log('🍪 POST+Redirect cookies:', allCookies.length - setCookies.length, 'adet');
    console.log('🍪 Total cookies:', allCookies.length, 'adet');
    
    // Response body'yi kontrol et (final response'dan)
    const bodyPreview = typeof finalResponse.data === 'string' 
      ? finalResponse.data.substring(0, 300) 
      : JSON.stringify(finalResponse.data).substring(0, 300);
    
    // Başarı kontrolü: 302 redirect veya 200 OK ve hata mesajı yok
    const isSuccessful = (response.status === 302 || finalResponse.status === 200) && 
                        allCookies.length >= 2; // En az 2 cookie olmalı
    
    const hasError = bodyPreview.includes('Geçersiz') || 
                     bodyPreview.includes('hatalı') || 
                     bodyPreview.includes('field-validation-error');
    
    console.log('✅ Success check:', isSuccessful);
    console.log('❌ Error check:', hasError);
    
    if (isSuccessful && !hasError && allCookies.length > 0) {
      // Session ID oluştur
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Cookie'leri sakla (şifre de ekle - Puppeteer için gerekli)
      sessions.set(sessionId, {
        cookies: allCookies,
        csrfToken: csrfToken,  // CSRF token'ı sakla
        initialCookie: cookieJar,  // İlk cookie'yi sakla
        email: email,
        password: password,
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
 * Oskabulut'ta arama yapar - Gerçek API: POST /ManageLibrary/GetLibraryWorkItems
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

  const session = sessions.get(sessionId);
  
  // ÖNCE /kutuphane sayfasını ziyaret et (ASP.NET_SessionId almak için!)
  console.log(`🔍 Searching via API: ${query}`);
  console.log(`📄 /kutuphane sayfası ziyaret ediliyor...`);
  
  // İlk cookie string: login'den gelen cookie'ler
  let cookieString = session.cookies.map(c => c.split(';')[0]).join('; ');
  
  try {
    const kutuphaneResponse = await axios.get('https://www.oskabulut.com/kutuphane', {
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'Referer': 'https://www.oskabulut.com/'
      }
    });
    
    // YENİ COOKIE'LERİ AL (ASP.NET_SessionId burada gelir!)
    const newCookies = kutuphaneResponse.headers['set-cookie'] || [];
    if (newCookies.length > 0) {
      console.log(`✅ /kutuphane sayfasından ${newCookies.length} yeni cookie alındı`);
      // Yeni cookie'leri session'a ekle
      session.cookies = [...session.cookies, ...newCookies];
      // Cookie string'i güncelle - TÜM cookie'ler (login + kutuphane)
      cookieString = session.cookies.map(c => c.split(';')[0]).join('; ');
    }
    console.log(`✅ /kutuphane sayfası başarıyla ziyaret edildi`);
    console.log(`🍪 Login cookies: ${session.cookies.length - newCookies.length}`);
    console.log(`🍪 Kutuphane cookies: ${newCookies.length}`);
    console.log(`🍪 Toplam cookie sayısı: ${session.cookies.length}`);
    console.log(`🍪 Cookie string preview: ${cookieString.substring(0, 200)}...`);
  } catch (pageError) {
    console.warn(`⚠️ /kutuphane sayfası hatası (devam ediliyor): ${pageError.message}`);
  }

  try {

    // Request payload hazırla (TAM FORMAT - manuel testten)
    const payload = new URLSearchParams();
    
    // libraryBookFascicleIds array (11 kitap - ÇŞB, TSE, vb.)
    for (let i = 0; i < 11; i++) {
      payload.append(`libraryBookFascicleIds[${i}][LibraryBookId]`, String(i + 1));
      payload.append(`libraryBookFascicleIds[${i}][LibraryFascicleId]`, '');
    }
    
    // Diğer parametreler
    payload.append('includeObsoleteWorkItems', 'false');
    payload.append('searchInTermsOfProduction', 'false');
    payload.append('selectedYear', '2025-Kasım');
    payload.append('searchText', query);  // searchBox DEĞİL, searchText!
    payload.append('take', '50');
    payload.append('skip', '0');
    payload.append('page', '1');
    payload.append('pageSize', '50');

    // Gerçek API endpoint: POST /ManageLibrary/GetLibraryWorkItems
    const response = await axios.post(
      'https://www.oskabulut.com/ManageLibrary/GetLibraryWorkItems',
      payload.toString(),
      {
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.oskabulut.com/kutuphane',
          'Origin': 'https://www.oskabulut.com'
        }
      }
    );

    console.log(`✅ API Response Status: ${response.status}`);

    // API response format kontrolü
    let rawResults = [];
    if (Array.isArray(response.data)) {
      rawResults = response.data;
    } else if (response.data.Data) {
      rawResults = response.data.Data;
    } else if (response.data.data) {
      rawResults = response.data.data;
    }

    console.log(`✅ Found ${rawResults.length} results`);

    // Frontend için parse et (LibraryWorkItemPrices'dan fiyat çıkar)
    const results = rawResults.map(item => {
      // En güncel fiyatı al (genelde ilk eleman)
      const latestPrice = item.LibraryWorkItemPrices && item.LibraryWorkItemPrices.length > 0
        ? item.LibraryWorkItemPrices[0].UnitPrice
        : 0;

      return {
        pozNo: item.Number || '',
        tanim: item.Description || '',
        birim: item.Unit || '',
        birimFiyat: latestPrice || 0, // NUMBER olarak gönder, string değil!
        kitapAdi: item.LibraryBookName || 'Oskabulut',
        fasikulAdi: item.LibraryFascicleName || 'Genel',
        rawData: item // Debug için orijinal veriyi sakla
      };
    });

    console.log(`📊 Parsed ${results.length} items, sample:`, results[0] || 'no results');

    return res.json({
      success: true,
      data: results,
      searchTerm: query
    });

  } catch (error) {
    console.error('❌ Search error:', error.message);

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Teklif360 Proxy Server çalışıyor`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
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
