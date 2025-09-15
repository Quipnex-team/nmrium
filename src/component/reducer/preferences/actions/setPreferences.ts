import type { Draft } from 'immer';
import cloneDeep from 'lodash/cloneDeep.js';

import type { PreferencesState } from '../preferencesReducer.js';
import { getActiveWorkspace } from '../utilities/getActiveWorkspace.js';
import { preferencesAPI } from '../../../api/preferenceAPIService.ts';

export function setPreferences(draft: Draft<PreferencesState>, action) {
  const currentWorkspacePreferences = getActiveWorkspace(draft);

  if (action.payload) {
    const preferences = action.payload;

    draft.workspaces[draft.workspace.current] = {
      ...currentWorkspacePreferences,
      ...preferences,
    };
  }

  draft.originalWorkspaces[draft.workspace.current] = cloneDeep(
    draft.workspaces[draft.workspace.current],
  );
  
  // Sync with server if enabled - use workspace-specific preference sections
  if (draft.serverSyncEnabled) {
    const currentWorkspace = draft.workspaces[draft.workspace.current];
    const workspaceId = draft.workspace.current === 'default' ? undefined : draft.workspace.current;
    
    // Update each preference section separately with workspace association
    const sectionUpdates = [
      { section: 'panels', preferences: currentWorkspace?.panels || {} },
      { section: 'display', preferences: currentWorkspace?.display || {} },
      { section: 'general', preferences: currentWorkspace?.general || {} },
      { section: 'export', preferences: currentWorkspace?.export || {} },
      { section: 'print', preferences: currentWorkspace?.printPageOptions || {} },
    ];
    
    // Update each section with workspace association
    sectionUpdates.forEach(({ section, preferences }) => {
      if (preferences && Object.keys(preferences).length > 0) {
        preferencesAPI.updatePreferenceSection(section, preferences, workspaceId).catch(error => {
          console.error(`Failed to sync ${section} preferences with server:`, error);
        });
      }
    });
    
    // Update other workspace-specific data as sections
    const additionalSections = [
      { section: 'nuclei', preferences: currentWorkspace?.nuclei || [] },
      { section: 'databases', preferences: currentWorkspace?.databases || {} },
      { section: 'infoBlock', preferences: currentWorkspace?.infoBlock || {} },
      { section: 'peaksLabel', preferences: currentWorkspace?.peaksLabel || {} },
      { section: 'spectraColors', preferences: currentWorkspace?.spectraColors || {} },
      { section: 'externalAPIs', preferences: currentWorkspace?.externalAPIs || [] },
      { section: 'nmrLoaders', preferences: currentWorkspace?.nmrLoaders || {} },
      { section: 'onLoadProcessing', preferences: currentWorkspace?.onLoadProcessing || {} },
    ];
    
    additionalSections.forEach(({ section, preferences }) => {
      if (preferences && (Array.isArray(preferences) ? preferences.length > 0 : Object.keys(preferences).length > 0)) {
        preferencesAPI.updatePreferenceSection(section, preferences, workspaceId).catch(error => {
          console.error(`Failed to sync ${section} preferences with server:`, error);
        });
      }
    });
  }
}
