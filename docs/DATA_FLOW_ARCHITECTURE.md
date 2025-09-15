# NMRium Data Flow Architecture Documentation

## Overview
NMRium is a React-based NMR spectra visualization and processing library with a sophisticated data flow architecture that handles multiple data sources, state management, and real-time processing.

## Architecture Layers

### 1. **Entry Points & Demo Layer**
- **`src/index.tsx`**: Main entry point with React Router setup
- **`src/demo/layouts/Main.tsx`**: Demo layout manager that handles different view modes
- **Data Sources**: 
  - URL parameters (`sampleURL`) for remote JSON/JCAMP files
  - Local sample data from `samples.json`
  - Direct file paths for single spectrum display

### 2. **Core NMRium Component Layer**
- **`src/component/main/NMRium.tsx`**: Main React component interface
- **`src/component/main/InnerNMRium.tsx`**: Core wrapper with context providers
- **Props Interface**: 
  - `data`: NMRiumData (spectra, molecules, correlations)
  - `preferences`: UI/processing preferences  
  - `workspace`: Defines which panels/tools are visible
  - `apiConfig`: Server sync configuration
  - `onChange`: Callback for data changes

### 3. **State Management Architecture**

#### Core State (Spectrum Data)
- **`src/component/main/NMRiumStateProvider.tsx`**: Central state provider
- **`src/component/reducer/Reducer.ts`**: Main spectrum data reducer
- **State Structure**:
  ```typescript
  {
    data: Spectrum[],        // Actual spectral data
    molecules: Molecule[],   // Chemical structures
    correlations: {},        // Peak assignments
    view: ViewState,         // UI state (zoom, selections)
    source: WebSource        // File origins
  }
  ```

#### Preferences State (UI Configuration)
- **`src/component/reducer/preferences/preferencesReducer.ts`**: UI preferences
- **State Structure**:
  ```typescript
  {
    workspaces: {},         // Available workspace configurations
    workspace: {            // Current active workspace
      current: string,
      base: string
    },
    version: number
  }
  ```

### 4. **Data Loading & Processing Pipeline**

#### Data Sources
1. **File Import**: JCAMP-DX, JSON, ZIP files
2. **Local Storage**: Browser persistence
3. **Server API**: Backend preferences/workspace sync
4. **URL Parameters**: Remote file loading

#### Processing Flow
1. **Input Parsing**: `@zakodium/nmrium-core-plugins`
2. **Data Transformation**: `src/data/SpectraManager.ts`
3. **State Initialization**: Load actions in `src/component/reducer/actions/LoadActions.ts`
4. **Real-time Updates**: Reducer pattern with Immer

### 5. **Data Persistence Mechanisms**

#### Local Storage
- **Key**: `'nmr-general-settings'`
- **Content**: Workspaces, current workspace, user preferences
- **Management**: `src/component/utility/LocalStorage.ts`

#### Server Sync (Optional)
- **API Endpoints**: 
  - `/nmrium/workspaces/` - Workspace CRUD
  - `/nmrium/preferences/` - User preferences
  - `/nmrium/migrate/enhanced/` - Data migration
- **Sync Strategy**: Bidirectional (fetch-first, then upload changes)
- **Offline Support**: Falls back to localStorage

### 6. **Context System**
Multiple React contexts provide data access:
- **ChartDataProvider**: Spectrum data access
- **PreferencesProvider**: UI configuration
- **DispatchProvider**: Action dispatching
- **CoreProvider**: NMRium core engine
- **LoggerProvider**: Debug/telemetry

### 7. **Workspace System**
Workspaces define UI configuration:
- **Predefined**: `src/component/workspaces/` (basic, prediction, simulation, etc.)
- **Custom**: User-defined via API
- **Structure**: Panel visibility, toolbar buttons, processing options

## Key Data Flow Patterns

### 1. **Initialization Flow**
```
URL/Props → Main Layout → NMRium Component → 
Core Processing → State Initialization → 
Context Providers → UI Rendering
```

### 2. **User Interaction Flow**
```
User Action → Dispatch Action → Reducer → 
State Update → Context Notification → 
UI Re-render → onChange Callback
```

### 3. **Data Persistence Flow**
```
State Change → LocalStorage Update → 
[Optional] Server Sync → Background Upload → 
Error Handling/Retry Logic
```

### 4. **Preference Loading Flow**
```
App Start → Check Server Sync → 
[If enabled] Fetch Server Data → 
Merge with Local → Initialize Preferences → 
Apply to UI Components
```

## Critical Data Structures

### NMRiumData
```typescript
{
  spectra: Spectrum[],           // Raw spectrum data
  molecules?: Molecule[],        // Chemical structures  
  correlations?: CorrelationData // Peak assignments
}
```

### Workspace
```typescript
{
  label: string,
  display: {
    panels: {...},              // Panel visibility config
    toolBarButtons: {...},      // Toolbar config
    general: {...}              // General UI settings
  },
  source: 'predefined' | 'user' | 'custom'
}
```

## Data Loading Scenarios

### Scenario 1: File Drop/Import
```
File Drop → 
useLoadFiles() → 
Core.readNMRiumObject() → 
INITIATE Action → 
State Update → 
UI Refresh
```

### Scenario 2: URL Parameter Loading
```
URL Parse → 
loadData() → 
JSON/JCAMP Processing → 
Component Props Update → 
NMRium Re-render
```

### Scenario 3: Server Sync
```
App Start → 
Check apiConfig.enableSync → 
useStateWithServerStorage() → 
Fetch Server Data → 
INIT_PREFERENCES Action → 
Workspace Merge → 
UI Update
```

## Key Data Transformations

### Input Processing
- **JCAMP-DX → Spectrum Objects**: Via core plugins
- **JSON → NMRiumState**: Direct deserialization
- **Server Data → Local Format**: Workspace mapping and merging

### Output Generation
- **State → JSON Export**: Via `toJSON()` in SpectraManager
- **State → JCAMP Export**: Via spectrum conversion utilities
- **State → onChange Events**: For external component integration

## Error Handling & Resilience

### Fallback Mechanisms
- Server sync failures → Local storage
- Invalid data → Default state initialization
- Missing workspaces → Default workspace
- Corrupt preferences → Factory reset

### Data Validation
- Schema migration for version compatibility
- Type checking via TypeScript
- Runtime validation in reducers

## Implementation Details

### Server Sync Implementation (Recent Fix)
The server sync feature was recently fixed to enable bidirectional data flow:

1. **Issue**: The `syncWithServer` function in `LocalStorage.ts` was only uploading data but never fetching from the server
2. **Solution**: Modified to fetch workspaces and preferences first, then upload local changes
3. **Files Modified**:
   - `src/component/utility/LocalStorage.ts`: Added fetch logic to `syncWithServer`
   - `src/component/main/InnerNMRium.tsx`: Enhanced server preference handling
   - `src/component/reducer/preferences/actions/initPreferences.ts`: Improved workspace merging

### API Service Architecture
```typescript
class PreferencesAPIService {
  // Workspace Management
  getWorkspaces(): Promise<WorkspaceData[]>
  createWorkspace(workspace): Promise<WorkspaceData>
  updateWorkspace(id, workspace): Promise<WorkspaceData>
  
  // Preference Management
  getUserPreferences(): Promise<any>
  updateUserPreferences(preferences): Promise<any>
  
  // Data Migration
  migrateData(migrationData): Promise<any>
}
```

## Best Practices

### 1. Data Loading
- Always check for existing data before loading new
- Use proper error handling for network requests
- Implement fallback mechanisms for offline usage

### 2. State Management
- Use Immer for immutable state updates
- Dispatch actions through the context system
- Keep state normalized and avoid duplication

### 3. Performance Optimization
- Use React.memo for expensive components
- Implement virtualization for large datasets
- Cache API responses with appropriate timeouts

### 4. Data Persistence
- Always validate data before saving
- Implement versioning for backward compatibility
- Use debouncing for frequent save operations

## Troubleshooting Guide

### Common Issues

1. **Workspaces not loading from server**
   - Check if `apiConfig.enableSync` is true
   - Verify API token and baseURL are correct
   - Check network tab for API request failures

2. **Data not persisting**
   - Verify localStorage is not disabled
   - Check browser storage quota
   - Ensure proper serialization of complex objects

3. **State updates not reflecting in UI**
   - Verify context providers are properly nested
   - Check if components are using correct hooks
   - Ensure proper key props for list items

## Future Considerations

### Planned Improvements
1. **WebSocket Support**: Real-time collaboration features
2. **IndexedDB Integration**: Better handling of large datasets
3. **Service Worker Caching**: Improved offline capabilities
4. **GraphQL Integration**: More efficient data fetching

### Architecture Evolution
The architecture is designed to be extensible with:
- Plugin system for custom data processors
- Modular workspace components
- Extensible action system for custom behaviors
- Flexible context system for additional state management

## Resources

### Internal Documentation
- `README.md`: Project overview and setup
- `CLAUDE.md`: Development guidelines and commands
- `src/component/workspaces/workspaceDefaultProperties.ts`: Workspace structure reference

### External Dependencies
- `@zakodium/nmrium-core`: Core processing engine
- `@zakodium/nmrium-core-plugins`: Data parsing plugins
- `immer`: Immutable state management
- `react-science/ui`: Scientific UI components

This architecture provides a robust, scalable system for handling complex NMR data with real-time processing, flexible UI configuration, and reliable persistence across local and server storage systems.