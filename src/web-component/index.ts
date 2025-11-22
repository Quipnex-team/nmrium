/**
 * Web Component entry point for NMRium
 * This module exports the web component version of NMRium for use in any framework
 */

import { NMRiumWebComponent, registerNMRiumElement } from './NMRiumWebComponent.js';

// Re-export component styles for external use if needed
export { componentStyles } from './styles.js';

// Auto-register the element when this module is imported
registerNMRiumElement('nmrium-viewer');

// Export for manual registration with custom tag name if needed
export { NMRiumWebComponent, registerNMRiumElement };

// Export types for TypeScript consumers
export type { NMRiumWebComponentProps } from './NMRiumWebComponent.js';

// Re-export core types that consumers might need
export type {
  NMRiumData,
} from '../component/main/index.js';

// Provide a default export for convenience
export default NMRiumWebComponent;