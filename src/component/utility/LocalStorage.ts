import dlv from 'dlv';
import lodashSet from 'lodash/set.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MigrationData, preferencesAPI } from '../api/preferenceAPIService.ts';

export function useStateWithLocalStorage(localStorageKey, key?: string) {
  const [value, setValue] = useState(
    localStorage.getItem(localStorageKey) || '{}',
  );
  useEffect(() => {
    localStorage.setItem(localStorageKey, value);
  }, [localStorageKey, value]);

  const setData = useCallback(
    (data, key = null) => {
      let castData = JSON.parse(value);
      if (key) {
        lodashSet(castData, key, data);
      } else {
        castData = { ...castData, ...data };
      }
      setValue(JSON.stringify(castData));
    },
    [value],
  );

  return useMemo(() => {
    return [key ? dlv(JSON.parse(value), key, {}) : JSON.parse(value), setData];
  }, [key, setData, value]);
}

export function getLocalStorage(localStorageKey, isJson = true) {
  const settings = localStorage.getItem(localStorageKey);
  return settings && isJson ? JSON.parse(settings) : settings;
}

export function storeData(localStorageKey, value) {
  localStorage.setItem(localStorageKey, value);
}

export function getValue(object, keyPath, defaultValue: any = null) {
  return dlv(object, keyPath, defaultValue);
}

// Re-export API configuration from dedicated module
export { setAPIConfig, getAPIConfig, type APIConfig } from '../api/apiConfig.js';

// Enhanced hook with server-side storage support
export function useStateWithServerStorage(
  localStorageKey: string,
  key?: string,
  options?: {
    useServer?: boolean;
    syncInterval?: number;
    offlineSupport?: boolean;
  },
) {
  const [value, setValue] = useState(
    localStorage.getItem(localStorageKey) || '{}',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSyncRef = useRef<number>(0);

  const { useServer = true, syncInterval = 5000, offlineSupport = true } = options || {};

  // Sync with localStorage
  useEffect(() => {
    if (!useServer || offlineSupport) {
      localStorage.setItem(localStorageKey, value);
    }
  }, [localStorageKey, value, useServer, offlineSupport]);

  // Sync with server
  useEffect(() => {
    if (!useServer) return;

    const syncWithServer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, fetch data from server
        if (localStorageKey.includes('workspace') || localStorageKey.includes('settings')) {
          try {
            // Fetch workspaces from server
            const workspaces = await preferencesAPI.getWorkspaces();
            
            // Transform server workspaces to local format
            const workspaceMap: Record<string, any> = {};
            let currentWorkspace = 'default';
            
            for (const workspace of workspaces) {
              // Load workspace-specific preferences
              const workspacePrefs = await preferencesAPI.getWorkspacePreferences(workspace.id);
              
              workspaceMap[workspace.id] = {
                ...workspace.configuration,
                ...workspacePrefs,
                label: workspace.label,
                source: workspace.source || 'user',
              };
              
              if (workspace.is_default) {
                currentWorkspace = workspace.id;
              }
            }
            
            // Also fetch global preferences (legacy support)
            let globalPreferences = {};
            try {
              const userPrefs = await preferencesAPI.getUserPreferences();
              globalPreferences = userPrefs.preferences || {};
            } catch (error) {
              console.warn('No global preferences found, using defaults');
            }
            
            // Merge server data with local state
            const mergedData = {
              ...JSON.parse(value),
              workspaces: workspaceMap,
              currentWorkspace,
              version: (globalPreferences as any).version || 1,
              ...globalPreferences,
            };
            
            // Update local state with server data
            setValue(JSON.stringify(mergedData));
            
            // Store in localStorage if offline support is enabled
            if (offlineSupport) {
              localStorage.setItem(localStorageKey, JSON.stringify(mergedData));
            }
          } catch (fetchError) {
            console.warn('Failed to fetch from server, using local data:', fetchError);
            // Continue with local data if fetch fails
          }
        }
        
        // Only upload local changes after initial sync is complete (not during app initialization)
        if (isInitialSyncComplete) {
          const data = JSON.parse(value);
          
          if (localStorageKey.includes('workspace') || localStorageKey.includes('settings')) {
            // Upload workspace changes using the new API
            if (data.workspaces && Object.keys(data.workspaces).length > 0) {
              try {
                const serverWorkspaces = await preferencesAPI.getWorkspaces();
                const serverWorkspaceMap = new Map(serverWorkspaces.map(w => [w.id, w]));
              
                // Sync each workspace
                for (const [workspaceName, workspaceData] of Object.entries(data.workspaces)) {
                  const workspace = workspaceData as any;
                  
                  // Skip predefined workspaces
                  if (workspace.source !== 'user') continue;
                  
                  const existingWorkspace = serverWorkspaceMap.get(workspaceName);
                  
                  if (existingWorkspace) {
                    // Update existing workspace
                    await preferencesAPI.updateWorkspace(existingWorkspace.id!, {
                      configuration: workspace,
                      label: workspace.label || workspaceName,
                    });
                    
                    // Update workspace-specific preferences
                    const workspaceId = existingWorkspace.id;
                    const sectionUpdates = [
                      { section: 'panels', preferences: workspace.panels },
                      { section: 'display', preferences: workspace.display },
                      { section: 'general', preferences: workspace.general },
                      { section: 'export', preferences: workspace.export },
                      { section: 'print', preferences: workspace.printPageOptions },
                    ];
                    
                    for (const { section, preferences } of sectionUpdates) {
                      if (preferences && Object.keys(preferences).length > 0) {
                        await preferencesAPI.updatePreferenceSection(section, preferences, workspaceId);
                      }
                    }
                  } else {
                    // Create new workspace
                    const newWorkspace = await preferencesAPI.createWorkspace({
                      name: workspaceName,
                      label: workspace.label || workspaceName,
                      source: 'user',
                      is_default: workspaceName === data.currentWorkspace,
                      configuration: workspace,
                    });
                    
                    // Add workspace-specific preferences
                    const workspaceId = newWorkspace.id;
                    const sectionUpdates = [
                      { section: 'panels', preferences: workspace.panels },
                      { section: 'display', preferences: workspace.display },
                      { section: 'general', preferences: workspace.general },
                      { section: 'export', preferences: workspace.export },
                      { section: 'print', preferences: workspace.printPageOptions },
                    ];
                    
                    for (const { section, preferences } of sectionUpdates) {
                      if (preferences && Object.keys(preferences).length > 0) {
                        await preferencesAPI.updatePreferenceSection(section, preferences, workspaceId);
                      }
                    }
                  }
                }
              } catch (uploadError) {
                console.warn('Failed to upload workspaces to server:', uploadError);
              }
            }
          }
        }
        
        // Mark initial sync as complete after first successful sync
        if (!isInitialSyncComplete) {
          setIsInitialSyncComplete(true);
        }
        
        lastSyncRef.current = Date.now();
      } catch (error_) {
        console.error('Failed to sync with server:', error_);
        setError(error_ as Error);
        
        // Fallback to localStorage if offline support is enabled
        if (offlineSupport) {
          const localData = localStorage.getItem(localStorageKey);
          if (localData) setValue(localData);
        }
      } finally {
        setLoading(false);
      }
    };

    // Initial sync
    syncWithServer();

    // Set up periodic sync
    // if (syncInterval > 0) {
    //   const interval = setInterval(() => {
    //     if (Date.now() - lastSyncRef.current >= syncInterval) {
    //       syncWithServer();
    //     }
    //   }, syncInterval);

    //   return () => clearInterval(interval);
    // }
  }, [localStorageKey, value, useServer, syncInterval, offlineSupport]);

  const setData = useCallback(
    (data: any, dataKey: string | null = null) => {
      let castData = JSON.parse(value);
      if (dataKey) {
        lodashSet(castData, dataKey, data);
      } else {
        castData = { ...castData, ...data };
      }
      const newValue = JSON.stringify(castData);
      setValue(newValue);

      // Debounced server sync (only after initial sync is complete)
      if (useServer && isInitialSyncComplete) {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        
        syncTimeoutRef.current = setTimeout(async () => {
          try {
            setLoading(true);
            
            // Determine what to sync based on the key
            if (dataKey && dataKey.includes('workspace')) {
              const workspaceMatch = dataKey.match(/workspaces\.(\w+)/);
              if (workspaceMatch) {
                const workspaceName = workspaceMatch[1];
                const workspaceData = dlv(castData, `workspaces.${workspaceName}`);
                
                // Skip predefined workspaces
                if (workspaceData.source !== 'user') return;
                
                // Create or update workspace using new API
                const workspaces = await preferencesAPI.getWorkspaces();
                const existing = workspaces.find(w => w.id === workspaceName);
                
                if (existing) {
                  // Update workspace configuration
                  await preferencesAPI.updateWorkspace(existing.id!, {
                    configuration: workspaceData,
                    label: workspaceData.label || workspaceName,
                  });
                  
                  // Update workspace-specific preferences
                  const workspaceId = existing.id;
                  const sectionUpdates = [
                    { section: 'panels', preferences: workspaceData.panels },
                    { section: 'display', preferences: workspaceData.display },
                    { section: 'general', preferences: workspaceData.general },
                    { section: 'export', preferences: workspaceData.export },
                    { section: 'print', preferences: workspaceData.printPageOptions },
                  ];
                  
                  for (const { section, preferences } of sectionUpdates) {
                    if (preferences && Object.keys(preferences).length > 0) {
                      await preferencesAPI.updatePreferenceSection(section, preferences, workspaceId);
                    }
                  }
                } else {
                  // Create new workspace
                  const newWorkspace = await preferencesAPI.createWorkspace({
                    name: workspaceName,
                    label: workspaceData.label || workspaceName,
                    source: 'user',
                    is_default: false,
                    configuration: workspaceData,
                  });
                  
                  // Add workspace-specific preferences
                  const workspaceId = newWorkspace.id;
                  const sectionUpdates = [
                    { section: 'panels', preferences: workspaceData.panels },
                    { section: 'display', preferences: workspaceData.display },
                    { section: 'general', preferences: workspaceData.general },
                    { section: 'export', preferences: workspaceData.export },
                    { section: 'print', preferences: workspaceData.printPageOptions },
                  ];
                  
                  for (const { section, preferences } of sectionUpdates) {
                    if (preferences && Object.keys(preferences).length > 0) {
                      await preferencesAPI.updatePreferenceSection(section, preferences, workspaceId);
                    }
                  }
                }
              }
            }
            
            lastSyncRef.current = Date.now();
          } catch (error_) {
            console.error('Failed to sync data change with server:', error_);
            setError(error_ as Error);
          } finally {
            setLoading(false);
          }
        }, 1000); // Debounce for 1 second
      }
    },
    [value, useServer],
  );

  return useMemo(() => {
    const parsedValue = key ? dlv(JSON.parse(value), key, {}) : JSON.parse(value);
    return [parsedValue, setData, { loading, error }] as const;
  }, [key, setData, value, loading, error]);
}

// Hook for migrating localStorage to server
export function useLocalStorageMigration() {
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [migrationError, setMigrationError] = useState<Error | null>(null);

  const migrateToServer = useCallback(async () => {
    try {
      setMigrating(true);
      setMigrationError(null);
      
      // Gather all localStorage data
      const localData: MigrationData = {
        workspaces: {},
        preferences: {},
        exercises: {},
      };
      
      // Get preferences data
      const settingsKey = 'nmr-general-settings';
      const settings = localStorage.getItem(settingsKey);
      if (settings) {
        const parsed = JSON.parse(settings);
        localData.workspaces = parsed.workspaces || {};
        localData.current_workspace = parsed.currentWorkspace;
        localData.preferences = parsed;
      }
      
      // Get exercises data (if any)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('exercise')) {
          const exerciseId = key.replace(/^.*exercise-/, '');
          localData.exercises![exerciseId] = JSON.parse(localStorage.getItem(key) || '{}');
        }
      }
      
      // Migrate to server
      const result = await preferencesAPI.migrateData(localData);
      setMigrationResult(result);
      
      // Mark migration as complete
      localStorage.setItem('nmrium_migration_complete', 'true');
      
      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationError(error as Error);
      throw error;
    } finally {
      setMigrating(false);
    }
  }, []);

  const isMigrationComplete = useCallback(() => {
    return localStorage.getItem('nmrium_migration_complete') === 'true';
  }, []);

  return {
    migrateToServer,
    migrating,
    migrationResult,
    migrationError,
    isMigrationComplete,
  };
}
