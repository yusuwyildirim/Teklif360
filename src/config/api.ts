/**
 * API Configuration
 * Handles different API URLs for development and production
 */

// Development: localhost:3001
// Production: Railway backend URL
// PRIORITY 1: Check if pre-loaded from index.html
const preloadedUrl = typeof window !== 'undefined' && (window as any).__TEKLIF360_API_URL__;

// PRIORITY 2: Multi-layer detection for maximum reliability
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '' ||
  window.location.hostname === '::1'
);

const isLocalPort = typeof window !== 'undefined' && (
  window.location.port === '8080' ||
  window.location.port === '5173' ||
  window.location.port === '8081'
);

const isDevelopment = isLocalhost || isLocalPort;

// Use pre-loaded URL if available, otherwise detect environment
export const API_BASE_URL = preloadedUrl || (isDevelopment 
  ? 'http://localhost:3001'
  : 'https://teklif360-production.up.railway.app');

console.log('🚀 TEKLIF360 API CONFIG LOADED');
console.log('🔧 API Base URL:', API_BASE_URL);
console.log('🌍 Environment:', isDevelopment ? 'development' : 'production');
console.log('📦 Pre-loaded URL:', preloadedUrl || 'None');
console.log('🏠 Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');
console.log('🔌 Port:', typeof window !== 'undefined' ? window.location.port : 'N/A');
console.log('🌐 Protocol:', typeof window !== 'undefined' ? window.location.protocol : 'N/A');
