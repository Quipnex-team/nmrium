import type { Draft } from 'immer';

import { preferencesAPI } from '../../../utility/LocalStorage.js';
import type {
  AddWorkspaceAction,
  PreferencesState,
  WorkspaceWithSource,
} from '../preferencesReducer.js';
import { filterUserWorkspaces } from '../utilities/filterUserWorkspaces.js';

export function addWorkspace(
  draft: Draft<PreferencesState>,
  action: AddWorkspaceAction,
) {
  const { workspaceKey, data } = action.payload;
  if (data) {
    draft.workspaces[workspaceKey] = data as WorkspaceWithSource;
    draft.originalWorkspaces[workspaceKey] = data as WorkspaceWithSource;
    draft.workspace.current = workspaceKey as any;
    
    // Server sync is now handled in useWorkspaceAction via workspace API
    // No API call needed here
  }
}
