import { BaseAPIService } from "./baseAPIService.ts";

interface SpectraData {
    id?: number;
    name?: string;
    metadata?: any;
    data: any;
}

class SpectraAPIService extends BaseAPIService {

    async getSpectraList(workspaceId?: string): Promise<SpectraData[]> {
        const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
        const cacheKey = workspaceId ? `spectra_${workspaceId}` : 'spectra';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
    
        const data = await this.fetchWithAuth(`/spectra/${params}`);
        this.setCache(cacheKey, data);
        return data;
    }

    async saveSpectrum(name: string, data: any, metadata: any = {}, workspaceId?: string): Promise<SpectraData> {
        const body: any = { name, data, metadata };
        if (workspaceId) {
            body.workspace_id = workspaceId;
        }
        const response = await this.fetchWithAuth('/spectra/', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        this.deleteFromCache('spectra'); // Clear list cache
        if (workspaceId) {
            this.deleteFromCache(`spectra_${workspaceId}`); // Clear workspace-specific cache
        }
        return response;
    }

    async updateSpectrum(id: string, data: any, metadata: any = {}, workspaceId?: string): Promise<SpectraData> {
        const response = await this.fetchWithAuth(`/spectra/${id}/`, {
            method: 'PUT',
            body: JSON.stringify({ data, metadata })
        });
        this.deleteFromCache('spectra');
        this.deleteFromCache(`spectrum_${id}`);
        if (workspaceId) {
            this.deleteFromCache(`spectra_${workspaceId}`);
        }
        return response;
    }

    async loadSpectrum(id: string): Promise<SpectraData> {
        const cacheKey = `spectrum_${id}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        const data = await this.fetchWithAuth(`/spectra/${id}/`);
        this.setCache(cacheKey, data);
        return data;
    }

    async deleteSpectrum(id: string): Promise<void> {
        await this.fetchWithAuth(`/spectra/${id}/`, {
            method: 'DELETE'
        });
        this.deleteFromCache('spectra');
        this.deleteFromCache(`spectrum_${id}`);
    }
}

export const spectraAPI = new SpectraAPIService();