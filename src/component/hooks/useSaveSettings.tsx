import { Dialog, DialogBody, DialogFooter } from '@blueprintjs/core';
import styled from '@emotion/styled';
import { yupResolver } from '@hookform/resolvers/yup';
import type { Workspace } from '@zakodium/nmrium-core';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useOnOff } from 'react-science/ui';
import * as Yup from 'yup';

import { toJSON } from '../../data/SpectraManager.js';
import { spectraAPI } from '../api/spectraAPIService.js';
import { useChartData } from '../context/ChartContext.js';
import { useCore } from '../context/CoreContext.js';
import { usePreferences } from '../context/PreferencesContext.js';
import { useToaster } from '../context/ToasterContext.js';
import ActionButtons from '../elements/ActionButtons.js';
import { Input2Controller } from '../elements/Input2Controller.js';

import { useWorkspaceAction } from './useWorkspaceAction.js';

function convertFloat64ArraysToArrays(spectra: any[]) {
  return spectra.map(spectrum => ({
    ...spectrum,
    data: {
      ...spectrum.data,
      x: Array.from(spectrum.data.x),
      re: Array.from(spectrum.data.re),
      ...(spectrum.data.im && { im: Array.from(spectrum.data.im) })
    }
  }));
}

const schema = Yup.object().shape({
  workspaceName: Yup.string().required(),
});

function keyDownCheck(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter') {
    return true;
  } else if (event.key === 'Escape') {
    return false;
  }
}

function WorkspaceAddForm(props) {
  const { className, message, control, onEnter } = props;

  return (
    <div className={className}>
      <p style={{ paddingBottom: '10px' }}>{message}</p>
      <Input2Controller
        control={control}
        name="workspaceName"
        placeholder="Enter workspace Name"
        style={{
          width: '90%',
          borderRadius: '5px',
        }}
        autoFocus
        size="large"
        onKeyDown={(event) => {
          if (keyDownCheck(event)) {
            onEnter();
          }
        }}
      />
    </div>
  );
}

export function useSaveSettings() {
  const toaster = useToaster();
  const [isOpenDialog, openDialog, closeDialog] = useOnOff(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [spectrumId, setSpectrumId] = useState<string | null>(null);
  const settingsRef = useRef<Workspace>();
  const { current, workspace } = usePreferences();
  const state = useChartData();
  const core = useCore();
  const { handleSubmit, control, reset } = useForm({
    defaultValues: { workspaceName: '' },
    resolver: yupResolver(schema),
  });
  const { saveWorkspace, addNewWorkspace } = useWorkspaceAction();
  function handleAddNewWorkspace({ workspaceName }) {
    addNewWorkspace(workspaceName, settingsRef.current);

    closeDialog();
    toaster.show({
      message: 'Preferences saved successfully',
      intent: 'success',
    });
  }

  async function saveSettings(values?: Partial<Workspace>) {
    settingsRef.current = (values ?? current) as Workspace;
    
    try {
      // Save workspace (existing logic)
      if (current.source !== 'user') {
        reset({ workspaceName: '' });
        openDialog();
      } else {
        saveWorkspace(values);
      }

      // Save spectra data alongside workspace
      if (state.data && state.data.length > 0) {
        console.log('=== SAVE SPECTRA DEBUG ===');
        console.log('state.data:', state.data);
        console.log('state.data type:', typeof state.data);
        console.log('state.data.length:', state.data.length);
        console.log('state.data[0]:', state.data[0]);
        
        // Get the full NMRium state structure without serialization
        const fullNMRiumState = toJSON(core, state, { current }, {
          dataType: 'ROW_DATA',
          view: true,
          settings: false, // Settings saved separately above
          serialize: false // Don't serialize, we need the object structure
        });

        console.log('fullNMRiumState:', fullNMRiumState);
        console.log('fullNMRiumState.data:', fullNMRiumState.data);

        // Structure data to match backend expectations - 'spectra' field at top level
        const rawSpectra = fullNMRiumState.data?.spectra || [];
        const convertedSpectra = convertFloat64ArraysToArrays(rawSpectra);
        
        const spectraData = {
          spectra: convertedSpectra, // Convert Float64Arrays to regular arrays for JSON serialization
          molecules: fullNMRiumState.data?.molecules || [],
          correlations: fullNMRiumState.data?.correlations || {},
          version: fullNMRiumState.version,
          view: fullNMRiumState.view
        };

        console.log('rawSpectra before conversion:', rawSpectra);
        console.log('convertedSpectra after conversion:', convertedSpectra);
        console.log('spectraData being sent to backend:', spectraData);
        console.log('spectraData.spectra:', spectraData.spectra);
        console.log('spectraData.spectra type:', typeof spectraData.spectra);
        console.log('spectraData.spectra[0]?.data:', spectraData.spectra[0]?.data);
        console.log('spectraData.spectra[0]?.data.x type:', spectraData.spectra[0]?.data.x?.constructor?.name);
        console.log('spectraData.spectra[0]?.data.re type:', spectraData.spectra[0]?.data.re?.constructor?.name);

        const spectrumName = state.data[0]?.info?.name || 'Untitled Spectrum';
        const metadata = {
          timestamp: new Date().toISOString(),
          workspaceName: current.label || current.source,
          spectraCount: state.data.length
        };

        // Get the current workspace ID to associate spectrum with workspace
        const currentWorkspaceId = workspace.current;

        if (spectrumId) {
          await spectraAPI.updateSpectrum(spectrumId, spectraData, metadata, currentWorkspaceId);
        } else {
          const response = await spectraAPI.saveSpectrum(spectrumName, spectraData, metadata, currentWorkspaceId);
          setSpectrumId(response.id?.toString() || null);
        }

        setLastSavedAt(new Date());
        // Clear dirty flag
        localStorage.setItem('nmrium_data_dirty', 'false');
        
        toaster.show({
          message: 'Workspace and spectra saved successfully',
          intent: 'success',
        });
      } else {
        toaster.show({
          message: 'Workspace saved successfully',
          intent: 'success',
        });
      }

      closeDialog();
    } catch (error) {
      console.error('Failed to save data:', error);
      toaster.show({
        message: 'Failed to save data to server',
        intent: 'danger',
      });
    }
  }
  return {
    saveSettings,
    lastSavedAt,
    spectrumId,
    SaveSettingsModal: () => {
      return (
        <Dialog
          onClose={closeDialog}
          isOpen={isOpenDialog}
          title="Save workspace"
          role="dialog"
        >
          <DialogContent>
            <Title>
              Please enter a new user workspace name in order to save your
              changes locally
            </Title>
            <WorkspaceAddForm
              onEnter={() => {
                void handleSubmit(handleAddNewWorkspace)();
              }}
              control={control}
            />
          </DialogContent>
          <DialogFooter>
            <ActionButtons
              style={{ flexDirection: 'row-reverse', margin: 0 }}
              onCancel={closeDialog}
              doneLabel="Save workspace"
              onDone={() => void handleSubmit(handleAddNewWorkspace)()}
            />
          </DialogFooter>
        </Dialog>
      );
    },
  };
}

const DialogContent = styled(DialogBody)`
  background-color: white;
  text-align: center;
`;

const Title = styled.p`
  padding: 0 30px;
  font-weight: bold;
  text-align: left;
  font-size: 1em;
`;
