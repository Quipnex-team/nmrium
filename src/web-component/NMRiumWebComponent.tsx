import React from 'react';
import { createRef, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { NMRiumData } from '../component/main/index.js';
import { NMRium } from '../component/main/index.js';
import type { NMRiumRefAPI } from '../component/main/index.js';
import { componentStyles } from './styles.js';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';

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
 * NMRium Web Component
 * Wraps the React NMRium component as a custom element for use in any framework
 */
export class NMRiumWebComponent extends HTMLElement {
  private root: Root | null = null;
  private props: NMRiumWebComponentProps = {};
  private isConnectedToDOM = false;
  private nmriumRef = createRef<NMRiumRefAPI>();
  private emotionCache: ReturnType<typeof createCache> | null = null;

  // Define observed attributes for the web component
  static get observedAttributes(): string[] {
    return ['api-config', 'empty-text', 'no-error-boundary'];
  }

  constructor() {
    super();
    // Attach Shadow DOM for style encapsulation
    this.attachShadow({ mode: 'open' });

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
    // Dispatch custom event for framework integration
    const event = new CustomEvent('nmrium-change', {
      detail: { data },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
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

  private render(): void {
    if (!this.isConnectedToDOM) return;

    // Get shadow root reference
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) {
      console.error('Shadow root not available');
      return;
    }

    // Create root if it doesn't exist
    if (!this.root) {
      // Clear any existing content in shadow root
      shadowRoot.innerHTML = '';

      // Add :host styles to make the custom element take full space
      const hostStyles = document.createElement('style');
      hostStyles.textContent = `
        :host {
          display: block;
          width: 100%;
          height: 100%;
          contain: layout style paint;
        }
      `;
      shadowRoot.appendChild(hostStyles);

      // CSS Cascade Layers for proper precedence:
      // Layer 0 (react_science) < Layer 1 (blueprint) < Layer 2 (implicit/unlayered - Emotion)

      // Add modern-normalize (unlayered - base reset)
      const normalizeStyle = document.createElement('style');
      normalizeStyle.setAttribute('data-style', 'modern-normalize');
      normalizeStyle.textContent = componentStyles.modernNormalize;
      shadowRoot.appendChild(normalizeStyle);

      // Add react-science preflight in @layer react_science
      const preflightStyle = document.createElement('style');
      preflightStyle.setAttribute('data-style', 'react-science-preflight');
      preflightStyle.textContent = `@layer react_science {\n${componentStyles.reactSciencePreflight}\n}`;
      shadowRoot.appendChild(preflightStyle);

      // Add BlueprintJS styles in @layer blueprint
      const blueprintStyles = [
        { name: 'blueprintjs-core', css: componentStyles.blueprintCSS },
        { name: 'blueprintjs-icons', css: componentStyles.blueprintIconsCSS },
        { name: 'blueprintjs-select', css: componentStyles.blueprintSelectCSS },
      ];

      blueprintStyles.forEach(({ name, css }) => {
        const styleElement = document.createElement('style');
        styleElement.setAttribute('data-style', name);
        styleElement.textContent = `@layer blueprint {\n${css}\n}`;
        shadowRoot.appendChild(styleElement);
      });

      // Add cheminfo-font (unlayered)
      const cheminfoStyle = document.createElement('style');
      cheminfoStyle.setAttribute('data-style', 'cheminfo-font');
      cheminfoStyle.textContent = componentStyles.cheminfoFontCSS;
      shadowRoot.appendChild(cheminfoStyle);

      // Create Emotion cache with shadowRoot as container for CSS-in-JS styles
      // Emotion styles are appended directly to shadowRoot (unlayered)
      // giving them highest precedence in the cascade layer hierarchy
      this.emotionCache = createCache({
        key: 'nmrium-shadow',
        container: shadowRoot,
      });

      // Create a container div for React content
      const container = document.createElement('div');
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      shadowRoot.appendChild(container);

      // Create React root on the container
      this.root = createRoot(container);
    }

    // Create the React element with all props and ref, wrapped with CacheProvider
    const nmriumElement = createElement(NMRium, {
      ...this.props,
      onChange: this.handleChange,
      onError: this.handleError,
      ref: this.nmriumRef,
      // Add additional handlers if they become available in NMRium
      // onPreferencesChange: this.handlePreferencesChange,
      // onWorkspaceChange: this.handleWorkspaceChange,
    } as any);

    const element = createElement(
      CacheProvider,
      { value: this.emotionCache },
      nmriumElement,
    );

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

  // Export as .nmrium File Blob (matching Save button behavior)
  public async exportAsBlob(options?: {
    includeView?: boolean;
    includeSettings?: boolean;
    compressed?: boolean;
  }): Promise<Blob> {
    if (!this.nmriumRef.current?.exportData) {
      throw new Error('NMRium export not available');
    }

    const {
      includeView = true,
      includeSettings = false,
      compressed = true,
    } = options || {};

    const data = this.nmriumRef.current.exportData({
      exportTarget: 'nmrium',
      view: includeView,
      settings: includeSettings,
      dataType: 'ROW_DATA',
      serialize: true,
    });

    const json = JSON.stringify(data, (key, value) =>
      ArrayBuffer.isView(value) ? Array.from(value as any) : value
    );

    if (!compressed) {
      return new Blob([json], { type: 'text/plain' });
    }

    // Compressed ZIP (same as Save button)
    const { ZipWriter, BlobWriter, TextReader } = await import('@zip.js/zip.js');
    const zip = new ZipWriter(new BlobWriter('application/zip'));
    await zip.add('data.nmrium', new TextReader(json));
    return await zip.close();
  }

  // Method to load files programmatically
  public loadFiles(files: File[]): void {
    if (this.nmriumRef.current) {
      this.nmriumRef.current.loadFiles(files);
    } else {
      console.warn('NMRium ref not available yet. Cannot load files.');
    }
  }
}

// Register the custom element
export function registerNMRiumElement(tagName = 'nmrium-viewer'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, NMRiumWebComponent);
  }
}