/**
 * TypeScript definitions for NMRium Web Component
 * Public API for @quipnex-team/nmrium/web-component
 *
 * Side-effect import (auto-registers custom element):
 *   import '@quipnex-team/nmrium/web-component';
 *
 * Named imports:
 *   import { NMRiumWebComponent, registerNMRiumElement } from '@quipnex-team/nmrium/web-component';
 */

import type { NMRiumData } from '../component/main/index.js';

// This export ensures the file is treated as a module, allowing side-effect imports
export {};

/**
 * Configuration for NMRium API backend integration
 */
export interface NMRiumWebComponentProps {
  apiConfig?: {
    baseURL: string;
    token: string;
    headers?: Record<string, string>;
    enableSync?: boolean;
    syncInterval?: number;
  };
  emptyText?: string;
  noErrorBoundary?: boolean;
}

/**
 * NMRium Web Component Custom Element
 * Use as <nmrium-viewer> in HTML or programmatically
 */
export declare class NMRiumWebComponent extends HTMLElement {
  // Properties
  apiConfig?: NMRiumWebComponentProps['apiConfig'];
  emptyText?: string;
  noErrorBoundary?: boolean;

  // Methods
  getState(): NMRiumWebComponentProps;
  updateProps(props: Partial<NMRiumWebComponentProps>): void;
  exportAsBlob(options?: {
    includeView?: boolean;
    includeSettings?: boolean;
    compressed?: boolean;
  }): Promise<Blob>;
  loadFiles(files: File[]): void;
}

/**
 * Register the NMRium custom element
 * @param tagName - Custom element tag name (default: 'nmrium-viewer')
 */
export declare function registerNMRiumElement(tagName?: string): void;

/**
 * Component styles bundle for web component
 */
export declare const componentStyles: {
  modernNormalize: string;
  reactSciencePreflight: string;
  blueprintCSS: string;
  blueprintIconsCSS: string;
  blueprintSelectCSS: string;
  cheminfoFontCSS: string;
};

// Re-export core types
export type { NMRiumData };

// Default export
export default NMRiumWebComponent;

// Global type augmentation for HTML
declare global {
  interface HTMLElementTagNameMap {
    'nmrium-viewer': NMRiumWebComponent;
  }

  interface NMRiumEventMap {
    'nmrium-change': CustomEvent<{ data: NMRiumData }>;
    'nmrium-error': CustomEvent<{
      error: Error;
      errorInfo?: { componentStack: string }
    }>;
  }

  interface NMRiumElement extends HTMLElement {
    addEventListener<K extends keyof NMRiumEventMap>(
      type: K,
      listener: (this: NMRiumElement, ev: NMRiumEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions
    ): void;

    removeEventListener<K extends keyof NMRiumEventMap>(
      type: K,
      listener: (this: NMRiumElement, ev: NMRiumEventMap[K]) => void,
      options?: boolean | EventListenerOptions
    ): void;
  }
}
