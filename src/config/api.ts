/**
 * API Configuration
 * Handles different API URLs for development and production
 */

// Development: localhost:3001
// Production: Railway backend URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('🔧 API Base URL:', API_BASE_URL);
console.log('🌍 Environment:', import.meta.env.MODE);
