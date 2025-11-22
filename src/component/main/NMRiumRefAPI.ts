import type { ForwardedRef, RefObject } from 'react';
import { useImperativeHandle } from 'react';

import { toJSON } from '../../data/SpectraManager.js';
import { useLoadFiles } from '../loader/useLoadFiles.js';
import type { BlobObject } from '../utility/export.js';
import { getBlob } from '../utility/export.js';
import { useChartData } from '../context/ChartContext.js';
import { useCore } from '../context/CoreContext.js';
import { usePreferences } from '../context/PreferencesContext.js';

export interface NMRiumRefAPI {
  getSpectraViewerAsBlob: () => BlobObject | null;
  loadFiles: (files: File[]) => void;
  exportData: (options?: {
    exportTarget?: 'nmrium' | 'onChange';
    view?: boolean;
    settings?: boolean;
    dataType?: 'ROW_DATA' | 'DATA_SOURCE' | 'NO_DATA';
    serialize?: boolean;
  }) => any;
}

export function useNMRiumRefAPI(
  ref: ForwardedRef<NMRiumRefAPI>,
  rootRef: RefObject<HTMLDivElement>,
) {
  const loadFiles = useLoadFiles();
  const core = useCore();
  const state = useChartData();
  const preferencesState = usePreferences();

  useImperativeHandle(
    ref,
    () => ({
      getSpectraViewerAsBlob: () => {
        return rootRef.current
          ? getBlob('nmrSVG', { rootElement: rootRef.current })
          : null;
      },
      loadFiles,
      exportData: (options) => {
        return toJSON(core, state, preferencesState, {
          exportTarget: 'nmrium',
          view: true,
          serialize: true,
          ...options,
        });
      },
    }),
    [rootRef, loadFiles, core, state, preferencesState],
  );
}
