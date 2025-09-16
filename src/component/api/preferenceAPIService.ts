import { BaseAPIService } from "./baseAPIService.js";

// API Service for preferences
interface WorkspaceData {
    id: string;
    name: string;
    label: string;
    source: string;
    is_default: boolean;
    configuration: any;
}

interface PreferenceSection {
    section: string;
    preferences: any;
    workspace_id?: string;
}

export interface MigrationData {
    workspaces: Record<string, any>;
    current_workspace?: string;
    preferences?: any;
    exercises?: Record<string, any>;
}

class PreferencesAPIService extends BaseAPIService {
    private pendingRequests = new Map<string, Promise<any>>();
  
    // Workspace Management
    async getWorkspaces(): Promise<WorkspaceData[]> {
      const cacheKey = 'workspaces';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
  
      const data = await this.fetchWithAuth('/workspaces/');
      this.setCache(cacheKey, data);
      return data;
    }
  
    async createWorkspace(workspace: Omit<WorkspaceData, 'id'>): Promise<WorkspaceData> {
      const data = await this.fetchWithAuth('/workspaces/', {
        method: 'POST',
        body: JSON.stringify(workspace),
      });
      this.deleteFromCache('workspaces');
      return data;
    }
  
    async updateWorkspace(id: string, workspace: Partial<WorkspaceData>): Promise<WorkspaceData> {
      const data = await this.fetchWithAuth(`/workspaces/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(workspace),
      });
      this.deleteFromCache('workspaces');
      return data;
    }
  
    async setDefaultWorkspace(id: string): Promise<void> {
      await this.fetchWithAuth(`/workspaces/${id}/set-default/`, {
        method: 'PATCH',
      });
      this.deleteFromCache('workspaces');
    }
  
    async deleteWorkspace(id: string): Promise<void> {
      await this.fetchWithAuth(`/workspaces/${id}/`, {
        method: 'DELETE',
      });
      this.deleteFromCache('workspaces');
    }
  
    async getWorkspacePreferences(workspaceId?: string): Promise<any> {
      const sections = ['panels', 'display', 'general', 'export', 'print'];
      const preferences: any = {};
      
      try {
        const sectionPromises = sections.map(async (section) => {
          try {
            const data = await this.getPreferenceSection(section, workspaceId);
            return { section, preferences: data.preferences };
          } catch (error) {
            console.warn(`Failed to load ${section} preferences:`, error);
            return { section, preferences: {} };
          }
        });
        
        const results = await Promise.all(sectionPromises);
        results.forEach(({ section, preferences: sectionPrefs }) => {
          if (section === 'print') {
            preferences.printPageOptions = sectionPrefs;
          } else {
            preferences[section] = sectionPrefs;
          }
        });
        
        return preferences;
      } catch (error) {
        console.error('Failed to load workspace preferences:', error);
        return {};
      }
    }
  
    // Preference Sections
    async getPreferenceSection(section: string, workspaceId?: string): Promise<PreferenceSection> {
      const params = new URLSearchParams({ section });
      if (workspaceId) params.append('workspace_id', workspaceId);
      
      const cacheKey = `pref_${section}_${workspaceId || 'global'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
  
      const data = await this.fetchWithAuth(`/preferences/sections/?${params}`);
      this.setCache(cacheKey, data);
      return data;
    }
  
    async updatePreferenceSection(section: string, preferences: any, workspaceId?: string): Promise<PreferenceSection> {
      const body = { section, preferences, workspace_id: workspaceId };
      const data = await this.fetchWithAuth('/preferences/sections/', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      
      const cacheKey = `pref_${section}_${workspaceId || 'global'}`;
      this.deleteFromCache(cacheKey);
      return data;
    }
  
    async bulkUpdatePreferences(sections: PreferenceSection[], workspaceId?: string): Promise<PreferenceSection[]> {
      const data = await this.fetchWithAuth('/preferences/sections/bulk/', {
        method: 'POST',
        body: JSON.stringify({ sections, workspace_id: workspaceId }),
      });
      
      // Clear all preference caches
      for (const key of this.getCacheKeys()) {
        if (key.startsWith('api_cache_pref_')) {
            this.deleteFromCache(key);
        }
      }
      return data;
    }
  
    // Migration
    async migrateData(migrationData: MigrationData): Promise<any> {
      const key = 'migration';
      
      // Prevent duplicate migration requests
      if (this.pendingRequests.has(key)) {
        return this.pendingRequests.get(key);
      }
  
      const request = this.fetchWithAuth('/migrate/enhanced/', {
        method: 'POST',
        body: JSON.stringify(migrationData),
      }).finally(() => {
        this.pendingRequests.delete(key);
      });
  
      this.pendingRequests.set(key, request);
      return request;
    }
  
    // Legacy preferences (backward compatibility)
    async getUserPreferences(): Promise<any> {
      const cached = this.getFromCache('user_preferences');
      if (cached) return cached;
  
      const data = await this.fetchWithAuth('/preferences/');
      this.setCache('user_preferences', data);
      return data;
    }
  
    async updateUserPreferences(preferences: any): Promise<any> {
      const data = await this.fetchWithAuth('/preferences/', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      });
      this.deleteFromCache('user_preferences');
      return data;
    }
}

export const preferencesAPI = new PreferencesAPIService();