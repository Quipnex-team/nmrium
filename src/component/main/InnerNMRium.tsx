import init from '@zakodium/nmrium-core-plugins';
import type { ForwardedRef } from 'react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useFullscreen } from 'react-science/ui';

import { spectraAPI } from '../api/spectraAPIService.js';

import { AssignmentProvider } from '../assignment/AssignmentProvider.js';
import { CoreProvider } from '../context/CoreContext.js';
import { GlobalProvider } from '../context/GlobalContext.js';
import { KeyModifiersProvider } from '../context/KeyModifierContext.js';
import { LoggerProvider } from '../context/LoggerContext.js';
import { PreferencesProvider } from '../context/PreferencesContext.js';
import { SortSpectraProvider } from '../context/SortSpectraContext.js';
import { ToasterProvider } from '../context/ToasterContext.js';
import { TopicMoleculeProvider } from '../context/TopicMoleculeContext.js';
import { AlertProvider } from '../elements/Alert.js';
import { DialogProvider } from '../elements/DialogManager.js';
import { ExportManagerProvider } from '../elements/export/ExportManager.js';
import { HighlightProvider } from '../highlight/index.js';
import {
  SpinnerProvider,
  defaultGetSpinner,
} from '../loader/SpinnerContext.js';
import preferencesReducer, {
  initPreferencesState,
  preferencesInitialState,
  readSettings,
} from '../reducer/preferences/preferencesReducer.js';
import {
  setAPIConfig,
  useLocalStorageMigration,
  useStateWithServerStorage,
} from '../utility/LocalStorage.js';

import { InnerNMRiumContents } from './InnerNMRiumContents.js';
import type { NMRiumProps } from './NMRium.js';
import type { NMRiumRefAPI } from './NMRiumRefAPI.js';
import NMRiumStateProvider from './NMRiumStateProvider.js';

type InnerNMRiumProps = Omit<NMRiumProps, 'onError'> & {
  apiRef: ForwardedRef<NMRiumRefAPI>;
};

export function InnerNMRium(props: InnerNMRiumProps) {
  const {
    data: nmriumData,
    workspace,
    customWorkspaces,
    preferences,
    getSpinner = defaultGetSpinner,
    onChange,
    emptyText,
    apiRef,
    core,
    apiConfig,
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const elementsWrapperRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const mainDivRef = useRef<HTMLDivElement>(null);
  const { isFullScreen } = useFullscreen();
  const [loadedNMRiumData, setLoadedNMRiumData] = useState(nmriumData);

  const finalCore = useMemo(() => {
    if (!core) return init();

    return core;
  }, [core]);

  // Configure API for server sync
  useEffect(() => {
    if (apiConfig) {
      setAPIConfig({
        baseURL: apiConfig.baseURL,
        token: apiConfig.token,
        headers: apiConfig.headers,
      });
      
      // Enable server sync
      if (apiConfig.enableSync) {
        localStorage.setItem('nmrium_server_sync', 'true');
        // Set global config for window access
        (window as any).NMRIUM_CONFIG = {
          enableServerSync: true,
          syncInterval: apiConfig.syncInterval,
        };
      }
    }
  }, [apiConfig]);

  const [preferencesState, dispatchPreferences] = useReducer(
    preferencesReducer,
    preferencesInitialState,
    initPreferencesState,
  );

  // Auto-load user's most recent spectrum for the current workspace on startup if no data provided
  useEffect(() => {
    async function loadLastSpectrum() {
      try {
        if (apiConfig?.enableSync && preferencesState.workspace?.current) {
          // Get spectra for the current workspace only
          const currentWorkspaceId = preferencesState.workspace.current;
          const spectraList = await spectraAPI.getSpectraList(currentWorkspaceId);
          if (spectraList.length > 0) {
            const lastSpectrum = spectraList[0]; // Already sorted by -updated
            const spectrumData = await spectraAPI.loadSpectrum(lastSpectrum.id?.toString() || '');
            
            if (spectrumData && spectrumData.data) {
              // Transform data back to NMRium format (backend saves with spectra at top level)
              const nmriumFormat = {
                data: {
                  spectra: spectrumData.data.spectra || [],
                  molecules: spectrumData.data.molecules || [],
                  correlations: spectrumData.data.correlations || {}
                },
                version: spectrumData.data.version,
                view: spectrumData.data.view
              };
              setLoadedNMRiumData(nmriumFormat);
              console.log(`Loaded spectrum "${lastSpectrum.name}" for workspace "${currentWorkspaceId}"`);
            }
          } else {
            console.log(`No saved spectra found for workspace "${currentWorkspaceId}"`);
          }
        }
      } catch (error) {
        console.error('Failed to load saved spectrum:', error);
        // Don't show user error for auto-load failure, just continue with empty state
      }
    }
    
    // Only auto-load if no data provided and server sync is enabled
    if (!nmriumData && apiConfig?.enableSync) {
      loadLastSpectrum();
    }
  }, [apiConfig?.enableSync, nmriumData, preferencesState.workspace?.current]);

  // Use server storage for preferences if enabled
  const [serverPrefs, setServerPrefs, { loading: serverLoading }] = useStateWithServerStorage(
    'nmr-general-settings',
    undefined,
    {
      useServer: apiConfig?.enableSync ?? false,
      syncInterval: apiConfig?.syncInterval ?? 30000,
      offlineSupport: true,
    }
  );

  // Sync server preferences to local state
  useEffect(() => {
    if (apiConfig?.enableSync && serverPrefs && !serverLoading) {
      dispatchPreferences({
        type: 'INIT_PREFERENCES',
        payload: {
          preferences: serverPrefs.preferences,
          workspace: serverPrefs.workspace?.current || serverPrefs.currentWorkspace,
          customWorkspaces: serverPrefs.workspaces || customWorkspaces,
          currentWorkspace: serverPrefs.currentWorkspace,
          serverPreferences: serverPrefs, // Pass the complete server data
          dispatch: dispatchPreferences,
        },
      });
    }
  }, [apiConfig?.enableSync, serverPrefs, serverLoading, customWorkspaces]);

  useEffect(() => {
    rootRef.current?.focus();
  }, [isFullScreen]);

  useEffect(() => {
    const settings = readSettings();
    dispatchPreferences({
      type: 'INIT_PREFERENCES',
      payload: {
        preferences,
        workspace,
        customWorkspaces,
        currentWorkspace: settings?.currentWorkspace,
        dispatch: dispatchPreferences,
      },
    });
  }, [customWorkspaces, preferences, workspace]);

  return (
    <div
      ref={mainDivRef}
      style={{ height: '100%', position: 'relative' }}
      translate="no"
    >
      <CoreProvider value={finalCore}>
        <ExportManagerProvider>
          <GlobalProvider
            value={{
              rootRef: rootRef.current,
              elementsWrapperRef: elementsWrapperRef.current,
              viewerRef: viewerRef.current,
            }}
          >
            <PreferencesProvider value={preferencesState}>
              <LoggerProvider>
                <KeyModifiersProvider>
                  <ToasterProvider>
                    <SortSpectraProvider>
                      <NMRiumStateProvider
                        onChange={onChange}
                        nmriumData={loadedNMRiumData}
                      >
                        <TopicMoleculeProvider>
                          <DialogProvider>
                            <AlertProvider>
                              <HighlightProvider>
                                <AssignmentProvider>
                                  <SpinnerProvider value={getSpinner}>
                                    <InnerNMRiumContents
                                      emptyText={emptyText}
                                      mainDivRef={mainDivRef}
                                      elementsWrapperRef={elementsWrapperRef}
                                      rootRef={rootRef}
                                      viewerRef={viewerRef}
                                      apiRef={apiRef}
                                    />
                                  </SpinnerProvider>
                                </AssignmentProvider>
                              </HighlightProvider>
                            </AlertProvider>
                          </DialogProvider>
                        </TopicMoleculeProvider>
                      </NMRiumStateProvider>
                    </SortSpectraProvider>
                  </ToasterProvider>
                </KeyModifiersProvider>
              </LoggerProvider>
            </PreferencesProvider>
          </GlobalProvider>
        </ExportManagerProvider>
      </CoreProvider>
    </div>
  );
}
