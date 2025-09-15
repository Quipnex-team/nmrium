import type {
  CustomWorkspaces,
  NMRiumCore,
  WorkspacePreferences as NMRiumPreferences,
} from '@zakodium/nmrium-core';
import type { ReactElement, ReactNode } from 'react';
import { forwardRef, memo } from 'react';
import type { ErrorBoundaryPropsWithComponent } from 'react-error-boundary';
import { ErrorBoundary } from 'react-error-boundary';
import { RootLayout } from 'react-science/ui';

import ErrorOverlay from './ErrorOverlay.js';
import { InnerNMRium } from './InnerNMRium.js';
import type { NMRiumRefAPI } from './NMRiumRefAPI.js';
import type { NMRiumChangeCb, NMRiumData, NMRiumWorkspace } from './types.js';

export interface NMRiumProps {
  data?: NMRiumData;
  onChange?: NMRiumChangeCb;
  noErrorBoundary?: boolean;
  onError?: ErrorBoundaryPropsWithComponent['onError'];
  workspace?: NMRiumWorkspace;
  customWorkspaces?: CustomWorkspaces;
  preferences?: NMRiumPreferences;
  emptyText?: ReactNode;
  /**
   * Returns a custom spinner that will be rendered while loading data.
   */
  getSpinner?: () => ReactElement;
  core?: NMRiumCore;
  /**
   * API configuration for server-side preferences sync
   */
  apiConfig?: {
    baseURL: string;
    token: string;
    headers?: Record<string, string>;
    enableSync?: boolean;
    syncInterval?: number;
  };
}

const NMRiumBase = forwardRef<NMRiumRefAPI, NMRiumProps>(function NMRium(
  props: NMRiumProps,
  ref,
) {
  const { noErrorBoundary = false, onError, apiConfig, ...otherProps } = props;

  const innerNmrium = <InnerNMRium {...otherProps} apiConfig={apiConfig} apiRef={ref} />;

  const children = noErrorBoundary ? (
    innerNmrium
  ) : (
    <ErrorBoundary FallbackComponent={ErrorOverlay} onError={onError}>
      {innerNmrium}
    </ErrorBoundary>
  );

  return <RootLayout style={{ width: '100%' }}>{children}</RootLayout>;
});

export const NMRium = memo(NMRiumBase);
