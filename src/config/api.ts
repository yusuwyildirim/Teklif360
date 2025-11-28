/**
 * API Configuration
 * Handles different API URLs for development and production
 */

// Development: localhost:3001
// Production: Railway backend URL
// Multi-layer detection for maximum reliability
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

// ALWAYS use production URL if not explicitly local development
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001'
  : 'https://teklif360-production.up.railway.app';

console.log('🔧 API Base URL:', API_BASE_URL);
console.log('🌍 Environment:', isDevelopment ? 'development' : 'production');
console.log('🏠 Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');
console.log('🔌 Port:', typeof window !== 'undefined' ? window.location.port : 'N/A');
console.log('🌐 Protocol:', typeof window !== 'undefined' ? window.location.protocol : 'N/A');
