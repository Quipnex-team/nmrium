import { getAPIConfig } from "./apiConfig.js";

export class BaseAPIService {
    private cache = new Map<string, { data: any; timestamp: number }>();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
    protected getCacheKey(key: string): string {
      return `api_cache_${key}`;
    }

    protected getCacheKeys() {
        return this.cache.keys();
    }
  
    protected getFromCache(key: string): any | null {
      const cacheKey = this.getCacheKey(key);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      
      this.cache.delete(cacheKey);
      return null;
    }
  
    protected setCache(key: string, data: any) {
      const cacheKey = this.getCacheKey(key);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    protected deleteFromCache(key: string) {
      const cacheKey = this.getCacheKey(key);
      this.cache.delete(cacheKey);
    }

    protected async fetchWithAuth(url: string, options: RequestInit = {}) {
        const apiBaseUrl = '/nmrium';
        const config = getAPIConfig();
        const headers = {
          'Content-Type': 'application/json',
          ...config.headers,
          ...(config.token && { Authorization: `Bearer ${config.token}` }),
          ...options.headers,
        };
    
        try {
          const response = await fetch(`${config.baseURL}${apiBaseUrl}${url}`, {
            ...options,
            headers,
          });
    
          if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }
    
          return await response.json();
        } catch (error) {
          console.error('API Request failed:', error);
          throw error;
        }
      }
}