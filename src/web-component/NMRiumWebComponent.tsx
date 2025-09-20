import React from 'react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { NMRiumData, NMRiumPreferences, NMRiumWorkspace } from '../component/main/index.js';
import { NMRium } from '../component/main/index.js';

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

/**
 * NMRium Web Component
 * Wraps the React NMRium component as a custom element for use in any framework
 */
export class NMRiumWebComponent extends HTMLElement {
  private root: Root | null = null;
  private props: NMRiumWebComponentProps = {};
  private isConnectedToDOM = false;

  // Define observed attributes for the web component
  static get observedAttributes(): string[] {
    return ['data', 'preferences', 'workspace', 'api-config', 'empty-text', 'no-error-boundary'];
  }

  constructor() {
    super();
    // Bind methods
    this.handleChange = this.handleChange.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  connectedCallback(): void {
    this.isConnectedToDOM = true;
    this.render();
  }

  disconnectedCallback(): void {
    this.isConnectedToDOM = false;
    if (this.root) {
      // Cleanup React
      this.root.unmount();
      this.root = null;
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    // Parse attribute and update props
    switch (name) {
      case 'data':
        this.props.data = this.parseJSON(newValue);
        break;
      case 'preferences':
        this.props.preferences = this.parseJSON(newValue);
        break;
      case 'workspace':
        this.props.workspace = newValue as NMRiumWorkspace || undefined;
        break;
      case 'api-config':
        this.props.apiConfig = this.parseJSON(newValue);
        break;
      case 'empty-text':
        this.props.emptyText = newValue || undefined;
        break;
      case 'no-error-boundary':
        this.props.noErrorBoundary = newValue === 'true';
        break;
    }

    // Re-render if connected
    if (this.isConnectedToDOM) {
      this.render();
    }
  }

  // Public methods for programmatic access
  set data(value: NMRiumData | undefined) {
    this.props.data = value;
    this.render();
  }

  get data(): NMRiumData | undefined {
    return this.props.data;
  }

  set preferences(value: NMRiumPreferences | undefined) {
    this.props.preferences = value;
    this.render();
  }

  get preferences(): NMRiumPreferences | undefined {
    return this.props.preferences;
  }

  set workspace(value: NMRiumWorkspace | undefined) {
    this.props.workspace = value;
    this.render();
  }

  get workspace(): NMRiumWorkspace | undefined {
    return this.props.workspace;
  }

  set apiConfig(value: NMRiumWebComponentProps['apiConfig']) {
    this.props.apiConfig = value;
    this.render();
  }

  get apiConfig(): NMRiumWebComponentProps['apiConfig'] {
    return this.props.apiConfig;
  }

  private parseJSON(value: string | null): any {
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return undefined;
    }
  }

  private handleChange(data: NMRiumData): void {
    // Store the new data
    this.props.data = data;

    // Dispatch custom event for framework integration
    const event = new CustomEvent('nmrium-change', {
      detail: { data },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);

    // Also dispatch individual events for specific changes
    const dataChangeEvent = new CustomEvent('data-change', {
      detail: { data },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(dataChangeEvent);
  }

  private handleError(error: Error, errorInfo?: { componentStack: string }): void {
    // Dispatch error event
    const event = new CustomEvent('nmrium-error', {
      detail: { error, errorInfo },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private handlePreferencesChange = (preferences: NMRiumPreferences): void => {
    this.props.preferences = preferences;

    const event = new CustomEvent('preferences-change', {
      detail: { preferences },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  };

  private handleWorkspaceChange = (workspace: NMRiumWorkspace): void => {
    this.props.workspace = workspace;

    const event = new CustomEvent('workspace-change', {
      detail: { workspace },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  };

  private render(): void {
    if (!this.isConnectedToDOM) return;

    // Create root if it doesn't exist
    if (!this.root) {
      // Clear any existing content
      this.innerHTML = '';

      // Create a container div
      const container = document.createElement('div');
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      this.appendChild(container);

      // Create React root
      this.root = createRoot(container);
    }

    // Create the React element with all props
    const element = createElement(NMRium, {
      ...this.props,
      onChange: this.handleChange,
      onError: this.handleError,
      // Add additional handlers if they become available in NMRium
      // onPreferencesChange: this.handlePreferencesChange,
      // onWorkspaceChange: this.handleWorkspaceChange,
    } as any);

    // Render the React component
    this.root.render(element);
  }

  // Expose a method to get the current state
  public getState(): NMRiumWebComponentProps {
    return { ...this.props };
  }

  // Expose a method to update multiple props at once
  public updateProps(props: Partial<NMRiumWebComponentProps>): void {
    this.props = { ...this.props, ...props };
    this.render();
  }

  // Method to export data in various formats
  public async exportAs(format: 'json' | 'jcamp' | 'nmredata' | 'svg' | 'png'): Promise<any> {
    // This would need to be implemented based on NMRium's export capabilities
    // For now, return the current data
    if (format === 'json') {
      return this.props.data;
    }
    throw new Error(`Export format ${format} not yet implemented`);
  }
}

// Register the custom element
export function registerNMRiumElement(tagName = 'nmrium-viewer'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, NMRiumWebComponent);
  }
}