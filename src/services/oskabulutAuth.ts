/**
 * Oskabulut.com authentication servisi
 * Web scraping için login/logout işlemleri
 */

import type { OskabulutCredentials, OskabulutLoginResponse } from '@/types/oskabulut.types';

// Proxy server URL
const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

/**
 * Oskabulut.com'a login yapar (proxy üzerinden)
 * Proxy server normal bir browser gibi davranır
 */
export async function login(credentials: OskabulutCredentials): Promise<OskabulutLoginResponse> {
  try {
    console.log('🔐 Proxy üzerinden giriş yapılıyor...');

    const response = await fetch(`${PROXY_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    const data = await response.json();

    if (data.success && data.sessionId) {
      // Session ID'yi localStorage'a kaydet
      localStorage.setItem('oskabulut_session_id', data.sessionId);
      console.log('✅ Giriş başarılı, session kaydedildi');
    }

    return data;

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
    const sessionId = localStorage.getItem('oskabulut_session_id');
    if (!sessionId) return false;

    const response = await fetch(`${PROXY_URL}/api/session-check?sessionId=${sessionId}`);
    const data = await response.json();

    return data.valid || false;
  } catch (error) {
    console.error('Session check error:', error);
    return false;
  }
}

/**
 * Logout yapar
 */
export async function logout(): Promise<boolean> {
  try {
    localStorage.removeItem('oskabulut_session_id');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * Session ID'yi al
 */
export function getSessionId(): string | null {
  return localStorage.getItem('oskabulut_session_id');
}
