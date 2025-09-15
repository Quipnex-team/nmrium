import type { WorkspaceWithSource } from '../preferencesReducer.js';

/**
 * Filters workspaces to only include user-created workspaces.
 * Excludes predefined workspaces that should not be synced to the server.
 */
export function filterUserWorkspaces(
  workspaces: Record<string, WorkspaceWithSource>
): Record<string, WorkspaceWithSource> {
  const userWorkspaces: Record<string, WorkspaceWithSource> = {};
  
  for (const [key, workspace] of Object.entries(workspaces)) {
    if (workspace.source === 'user') {
      userWorkspaces[key] = workspace;
    }
  }
  
  return userWorkspaces;
}