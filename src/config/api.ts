/**
 * API Configuration
 * Handles different API URLs for development and production
 */

// Development: localhost:3001
// Production: Railway backend URL
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001'
  : 'https://teklif360-production.up.railway.app';

console.log('🔧 API Base URL:', API_BASE_URL);
console.log('🌍 Environment:', isDevelopment ? 'development' : 'production');
