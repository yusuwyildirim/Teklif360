/**
 * Settings yönetimi için custom hook
 * LocalStorage ile Oskabulut credentials ve tema ayarlarını yönetir
 */

import { useState, useEffect } from 'react';
import type { OskabulutCredentials } from '@/types/oskabulut.types';

const STORAGE_KEYS = {
  CREDENTIALS: 'oskabulut_credentials',
  THEME: 'app_theme'
} as const;

export type Theme = 'light' | 'dark';

interface SettingsState {
  credentials: OskabulutCredentials | null;
  theme: Theme;
}

/**
 * Settings hook - Oskabulut credentials ve tema yönetimi
 */
export function useSettings() {
  const [settings, setSettings] = useState<SettingsState>({
    credentials: null,
    theme: 'light'
  });

  // Component mount olduğunda localStorage'dan yükle
  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * LocalStorage'dan ayarları yükle
   */
  const loadSettings = () => {
    try {
      const credentialsStr = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      const themeStr = localStorage.getItem(STORAGE_KEYS.THEME);

      setSettings({
        credentials: credentialsStr ? JSON.parse(credentialsStr) : null,
        theme: (themeStr as Theme) || 'light'
      });
    } catch (error) {
      console.error('Settings load error:', error);
    }
  };

  /**
   * Credentials kaydet
   */
  const saveCredentials = (credentials: OskabulutCredentials) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
      setSettings(prev => ({ ...prev, credentials }));
      return true;
    } catch (error) {
      console.error('Credentials save error:', error);
      return false;
    }
  };

  /**
   * Credentials getir
   */
  const getCredentials = (): OskabulutCredentials | null => {
    return settings.credentials;
  };

  /**
   * Credentials temizle
   */
  const clearCredentials = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
      setSettings(prev => ({ ...prev, credentials: null }));
      return true;
    } catch (error) {
      console.error('Credentials clear error:', error);
      return false;
    }
  };

  /**
   * Tema değiştir
   */
  const setTheme = (theme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
      setSettings(prev => ({ ...prev, theme }));
      
      // HTML root element'e class ekle/çıkar
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      return true;
    } catch (error) {
      console.error('Theme save error:', error);
      return false;
    }
  };

  /**
   * Tema toggle
   */
  const toggleTheme = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  /**
   * Credentials'ın var olup olmadığını kontrol et
   */
  const hasCredentials = (): boolean => {
    return settings.credentials !== null && 
           settings.credentials.email.length > 0 && 
           settings.credentials.password.length > 0;
  };

  return {
    // State
    credentials: settings.credentials,
    theme: settings.theme,
    
    // Credentials methods
    saveCredentials,
    getCredentials,
    clearCredentials,
    hasCredentials,
    
    // Theme methods
    setTheme,
    toggleTheme,
    
    // Utility
    reload: loadSettings
  };
}
