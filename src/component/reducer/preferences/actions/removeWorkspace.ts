import type { Draft } from 'immer';

import type {
  PreferencesState,
  WorkspaceAction,
} from '../preferencesReducer.js';

export function removeWorkspace(
  draft: Draft<PreferencesState>,
  action: WorkspaceAction,
) {
  const { workspace } = action.payload;

  if (workspace === draft.workspace.current) {
    draft.workspace.current = 'default';
  }

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete draft.workspaces[workspace];

  // Server sync is now handled in useWorkspaceAction via workspace API
  // No API call needed here
}
