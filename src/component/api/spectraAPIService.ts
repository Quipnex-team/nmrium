import { BaseAPIService } from "./baseAPIService.ts";

interface SpectraData {
    id?: number;
    name?: string;
    metadata?: any;
    data: any;
}

class SpectraAPIService extends BaseAPIService {

    async getSpectraList(): Promise<SpectraData[]> {
        const cacheKey = 'spectra';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
    
        const data = await this.fetchWithAuth('/spectra/');
        this.setCache(cacheKey, data);
        return data;
    }
}

export const spectraAPI = new SpectraAPIService();