import type { Workspace } from '@zakodium/nmrium-core';
import lodashMerge from 'lodash/merge.js';

import { usePreferences } from '../context/PreferencesContext.js';
import type { Settings } from '../reducer/preferences/preferencesReducer.js';
import {
  readSettings,
  updateSettings,
} from '../reducer/preferences/preferencesReducer.js';
import { workspaceDefaultProperties } from '../workspaces/workspaceDefaultProperties.js';
import { preferencesAPI } from '../api/preferenceAPIService.ts';

export function useWorkspaceAction() {
  const { dispatch, current, workspace } = usePreferences();

  function setActiveWorkspace(workspace: string) {
    const settings = readSettings() || {
      currentWorkspace: null,
      version: 0,
      workspaces: {},
    };
    settings.currentWorkspace = workspace;
    updateSettings(settings);

    // Use workspace API to set default on server (only for user workspaces)
    const workspaceData = settings?.workspaces?.[workspace];
    if (workspaceData?.source === 'user' && workspace !== 'default') {
      preferencesAPI.setDefaultWorkspace(workspace).catch(error => {
        console.error('Failed to set default workspace on server:', error);
      });
    }

    // Load workspace-specific preferences from server
    const workspaceId = workspace === 'default' ? undefined : workspace;
    preferencesAPI.getWorkspacePreferences(workspaceId).then(preferences => {
      if (preferences && Object.keys(preferences).length > 0) {
        // Merge server preferences with local workspace
        const updatedSettings = readSettings();
        if (updatedSettings?.workspaces[workspace]) {
          updatedSettings.workspaces[workspace] = {
            ...updatedSettings.workspaces[workspace],
            ...preferences,
          };
          updateSettings(updatedSettings);
        }
      }
    }).catch(error => {
      console.warn('Failed to load workspace preferences from server:', error);
    });

    dispatch({
      type: 'SET_ACTIVE_WORKSPACE',
      payload: {
        workspace,
      },
    });
  }

  function addNewWorkspace(
    workspaceName: string,
    data?: Omit<Workspace, 'version' | 'label'>,
  ) {
    const workSpaceData = data ?? current;
    const newWorkSpace = lodashMerge(
      {},
      workspaceDefaultProperties,
      workSpaceData,
      {
        version: 1,
        label: workspaceName,
        source: 'user',
      },
    );
    const workspaceKey = crypto.randomUUID();

    // Create workspace on server first, fall back to local if it fails
    preferencesAPI.createWorkspace({
      name: workspaceKey,
      label: workspaceName,
      source: 'user',
      is_default: false,
      configuration: newWorkSpace,
    }).then(serverWorkspace => {
      // Use server workspace ID if successful
      const actualWorkspaceKey = serverWorkspace.id || workspaceKey;
      const localData = readSettings() || { workspaces: {} };
      const settings = {
        ...localData,
        currentWorkspace: actualWorkspaceKey,
        workspaces: { ...localData?.workspaces, [actualWorkspaceKey]: newWorkSpace },
      };
      updateSettings(settings as Settings);

      dispatch({
        type: 'ADD_WORKSPACE',
        payload: {
          workspaceKey: actualWorkspaceKey,
          data: newWorkSpace,
        },
      });
    }).catch(error => {
      console.error('Failed to create workspace on server, using local only:', error);
      // Fallback to local creation
      const localData = readSettings() || { workspaces: {} };
      const settings = {
        ...localData,
        currentWorkspace: workspaceKey,
        workspaces: { ...localData?.workspaces, [workspaceKey]: newWorkSpace },
      };
      updateSettings(settings as Settings);

      dispatch({
        type: 'ADD_WORKSPACE',
        payload: {
          workspaceKey,
          data: newWorkSpace,
        },
      });
    });
  }

  function removeWorkspace(key: string) {
    // Delete on server first
    preferencesAPI.deleteWorkspace?.(key).catch(error => {
      console.error('Failed to delete workspace on server:', error);
    });

    const settings = readSettings();
    if (settings) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete settings.workspaces[key];
      if (key === settings.currentWorkspace) {
        settings.currentWorkspace = 'default';
      }

      updateSettings(settings);
    }
    dispatch({
      type: 'REMOVE_WORKSPACE',
      payload: {
        workspace: key,
      },
    });
  }

  function saveWorkspace(data?: Partial<Workspace>) {
    const settings = readSettings() || {
      version: 0,
      currentWorkspace: null,
      workspaces: {},
    };
    
    // Get existing workspace to preserve metadata (label, source, etc.)
    const existingWorkspace = settings.workspaces[workspace.current];
    const updatedWorkspace = data ? { ...existingWorkspace, ...data } : current;
    
    // Update workspace configuration on server
    preferencesAPI.updateWorkspace(workspace.current, {
      configuration: updatedWorkspace
    }).catch(error => {
      console.error('Failed to update workspace on server:', error);
    });
    
    // Update workspace preferences as sections (always update to keep in sync)
    const actualData = data || current;
    const workspaceId = workspace.current === 'default' ? undefined : workspace.current;

    // Update preference sections for this workspace
    const sectionUpdates = [
      { section: 'panels', preferences: actualData.panels },
      { section: 'display', preferences: actualData.display },
      { section: 'general', preferences: actualData.general },
      { section: 'export', preferences: actualData.export },
      { section: 'print', preferences: actualData.printPageOptions },
    ];

    sectionUpdates.forEach(({ section, preferences }) => {
      if (preferences && Object.keys(preferences).length > 0) {
        preferencesAPI.updatePreferenceSection(section, preferences, workspaceId).catch(error => {
          console.error(`Failed to update ${section} section for workspace:`, error);
        });
      }
    });
    
    updateSettings({
      ...settings,
      workspaces: {
        ...settings.workspaces,
        [workspace.current]: updatedWorkspace,
      },
    } as Settings);

    dispatch({
      type: 'APPLY_General_PREFERENCES',
      payload: { data: updatedWorkspace },
    });
  }

  return {
    addNewWorkspace,
    removeWorkspace,
    saveWorkspace,
    setActiveWorkspace,
  };
}
