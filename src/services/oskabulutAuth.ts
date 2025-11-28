/**
 * Oskabulut.com authentication servisi
 * Web scraping için login/logout işlemleri
 */

import type { OskabulutCredentials, OskabulutLoginResponse } from '@/types/oskabulut.types';

const BASE_URL = 'https://www.oskabulut.com';
const LOGIN_URL = `${BASE_URL}/kullanici-girisi`;
const LIBRARY_URL = `${BASE_URL}/kutuphane`;

/**
 * Oskabulut.com'a login yapar
 * Not: Bu fonksiyon CORS nedeniyle browser'dan çalışmayabilir.
 * Production'da backend proxy veya browser extension gerekebilir.
 */
export async function login(credentials: OskabulutCredentials): Promise<OskabulutLoginResponse> {
  try {
    // Form data hazırla
    const formData = new FormData();
    formData.append('Email', credentials.email);
    formData.append('Password', credentials.password);
    formData.append('RememberMe', 'false');

    // Login request
    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Cookie'leri dahil et
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml',
      },
      redirect: 'follow'
    });

    // Başarılı login kontrolü
    // Eğer /kutuphane sayfasına yönlendirildiyse başarılı
    if (response.url.includes('/kutuphane') || response.status === 200) {
      return {
        success: true,
        message: 'Giriş başarılı',
        sessionId: extractSessionFromCookies(response)
      };
    }

    return {
      success: false,
      message: 'Giriş başarısız. Email veya şifre yanlış.'
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Bilinmeyen hata'
    };
  }
}

/**
 * Session'ın geçerli olup olmadığını kontrol eder
 */
export async function checkSession(): Promise<boolean> {
  try {
    const response = await fetch(LIBRARY_URL, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual'
    });

    // Eğer login sayfasına yönlendirildiyse session geçersiz
    if (response.status === 302 || response.url.includes('kullanici-girisi')) {
      return false;
    }

    return response.status === 200;
  } catch (error) {
    console.error('Session check error:', error);
    return false;
  }
}

/**
 * Logout yapar (varsa)
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/cikis`, {
      method: 'GET',
      credentials: 'include'
    });

    return response.ok;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * Response header'larından session ID çıkarır
 */
function extractSessionFromCookies(response: Response): string | undefined {
  const cookies = response.headers.get('set-cookie');
  if (!cookies) return undefined;

  // ASP.NET session cookie'sini bul
  const sessionMatch = cookies.match(/ASP\.NET_SessionId=([^;]+)/);
  return sessionMatch ? sessionMatch[1] : undefined;
}

/**
 * CORS problemi için not:
 * Browser'dan direkt Oskabulut.com'a istek atmak CORS hatası verebilir.
 * Çözüm seçenekleri:
 * 1. Backend proxy servisi (Node.js/Express)
 * 2. Browser extension
 * 3. CORS proxy servisi (dikkatli kullanılmalı)
 * 
 * Development için test: Postman/Insomnia ile login flow test edilebilir
 */
