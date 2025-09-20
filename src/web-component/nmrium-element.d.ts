/**
 * TypeScript definitions for NMRium Web Component
 * These definitions allow TypeScript users to have full type safety when using the web component
 */

import type { NMRiumData, NMRiumPreferences, NMRiumWorkspace } from '../component/main/index';

declare global {
  // Define the custom element in the HTML element tag name map
  interface HTMLElementTagNameMap {
    'nmrium-viewer': NMRiumElement;
  }

  // Define custom events
  interface NMRiumEventMap {
    'nmrium-change': CustomEvent<{ data: NMRiumData }>;
    'data-change': CustomEvent<{ data: NMRiumData }>;
    'preferences-change': CustomEvent<{ preferences: NMRiumPreferences }>;
    'workspace-change': CustomEvent<{ workspace: NMRiumWorkspace }>;
    'nmrium-error': CustomEvent<{ error: Error; errorInfo?: { componentStack: string } }>;
  }

  // Define the custom element interface
  interface NMRiumElement extends HTMLElement {
    // Properties
    data?: NMRiumData;
    preferences?: NMRiumPreferences;
    workspace?: NMRiumWorkspace;
    apiConfig?: {
      baseURL: string;
      token: string;
      headers?: Record<string, string>;
      enableSync?: boolean;
      syncInterval?: number;
    };
    emptyText?: string;
    noErrorBoundary?: boolean;

    // Methods
    getState(): {
      data?: NMRiumData;
      preferences?: NMRiumPreferences;
      workspace?: NMRiumWorkspace;
      apiConfig?: any;
      emptyText?: string;
      noErrorBoundary?: boolean;
    };

    updateProps(props: {
      data?: NMRiumData;
      preferences?: NMRiumPreferences;
      workspace?: NMRiumWorkspace;
      apiConfig?: any;
      emptyText?: string;
      noErrorBoundary?: boolean;
    }): void;

    exportAs(format: 'json' | 'jcamp' | 'nmredata' | 'svg' | 'png'): Promise<any>;

    // Event listeners
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

// Export types for module imports
export interface NMRiumWebComponentAttributes {
  'data'?: string; // JSON string
  'preferences'?: string; // JSON string
  'workspace'?: string;
  'api-config'?: string; // JSON string
  'empty-text'?: string;
  'no-error-boundary'?: 'true' | 'false';
}

// Type for Angular integration
export interface NMRiumWebComponentProps {
  data?: NMRiumData;
  preferences?: NMRiumPreferences;
  workspace?: NMRiumWorkspace;
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

// Event detail types
export interface NMRiumChangeEvent extends CustomEvent {
  detail: {
    data: NMRiumData;
  };
}

export interface NMRiumPreferencesChangeEvent extends CustomEvent {
  detail: {
    preferences: NMRiumPreferences;
  };
}

export interface NMRiumWorkspaceChangeEvent extends CustomEvent {
  detail: {
    workspace: NMRiumWorkspace;
  };
}

export interface NMRiumErrorEvent extends CustomEvent {
  detail: {
    error: Error;
    errorInfo?: {
      componentStack: string;
    };
  };
}

// Declare module for Angular's CUSTOM_ELEMENTS_SCHEMA
declare module '@angular/core' {
  interface SchemaMetadata {
    name: 'CUSTOM_ELEMENTS_SCHEMA';
  }
}

export {};