import { Button, Switch, Tag } from '@blueprintjs/core';
import { useCallback, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { LOGGER_LEVELS } from '../../../context/LoggerContext.js';
import { GroupPane } from '../../../elements/GroupPane.js';
import Label from '../../../elements/Label.js';
import { NumberInput2Controller } from '../../../elements/NumberInput2Controller.js';
import { Select2 } from '../../../elements/Select2.js';
import type { WorkspaceWithSource } from '../../../reducer/preferences/preferencesReducer.js';
import { setAPIConfig, useLocalStorageMigration } from '../../../utility/LocalStorage.js';
import { settingLabelStyle } from '../GeneralSettings.js';

interface SelectItem {
  label: string;
  value: string;
}

const SHAPE_RENDERING: SelectItem[] = [
  {
    label: 'Auto',
    value: 'auto',
  },
  {
    label: 'Optimize speed',
    value: 'optimizeSpeed',
  },
  {
    label: 'Crisp edges',
    value: 'crispEdges',
  },
  {
    label: 'Geometric precision',
    value: 'geometricPrecision',
  },
];

const LOGS_LEVELS = Object.keys(LOGGER_LEVELS).map((level) => ({
  label: level.replace(/^\w/, (c) => c.toUpperCase()),
  value: level,
}));

function GeneralTabContent() {
  const { register, control, setValue, watch } = useFormContext<WorkspaceWithSource>();
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('nmrium_api_url') || 'http://localhost:8000/qxcore'
  );
  const [apiToken, setApiToken] = useState(
    localStorage.getItem('nmrium_api_token') || ''
  );
  const [serverSyncEnabled, setServerSyncEnabled] = useState(
    localStorage.getItem('nmrium_server_sync') === 'true'
  );
  const { migrateToServer, migrating, migrationResult, migrationError, isMigrationComplete } = useLocalStorageMigration();
  
  const handleServerSyncToggle = useCallback((enabled: boolean) => {
    setServerSyncEnabled(enabled);
    localStorage.setItem('nmrium_server_sync', enabled ? 'true' : 'false');
    if (enabled) {
      // Configure API when enabling
      setAPIConfig({
        baseURL: apiUrl,
        token: apiToken || undefined,
      });
      
      // Save API configuration
      localStorage.setItem('nmrium_api_url', apiUrl);
      if (apiToken) {
        localStorage.setItem('nmrium_api_token', apiToken);
      }
    }
  }, [apiUrl, apiToken]);
  
  const handleMigration = useCallback(async () => {
    try {
      // Configure API before migration
      setAPIConfig({
        baseURL: apiUrl,
        token: apiToken || undefined,
      });
      
      await migrateToServer();
      alert('Migration completed successfully!');
    } catch (error) {
      alert(`Migration failed: ${error}`);
    }
  }, [apiUrl, apiToken, migrateToServer]);

  return (
    <>
      <GroupPane text="General">
        <Label
          title="Opacity of dimmed spectra [0 - 1]"
          style={settingLabelStyle}
        >
          <NumberInput2Controller
            control={control}
            name="general.dimmedSpectraOpacity"
            min={0}
            max={1}
            stepSize={0.1}
            style={{ width: 60 }}
          />
        </Label>
        <Label title="Invert actions" style={settingLabelStyle}>
          <Switch style={{ margin: 0 }} {...register(`general.invert`)} />
        </Label>
        <Label title="Invert scroll" style={settingLabelStyle}>
          <Switch style={{ margin: 0 }} {...register(`general.invertScroll`)} />
        </Label>
      </GroupPane>
      <GroupPane text="Server Synchronization">
        <Label title="Enable server sync" style={settingLabelStyle}>
          <Switch 
            style={{ margin: 0 }} 
            checked={serverSyncEnabled || false}
            onChange={(e) => {
              const enabled = (e.target as HTMLInputElement).checked;
              handleServerSyncToggle(enabled);
            }}
          />
        </Label>
        {serverSyncEnabled && (
          <>
            <Label title="API URL" style={settingLabelStyle}>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                style={{ width: '250px', padding: '4px' }}
                placeholder="http://localhost:8000/qxcore"
              />
            </Label>
            <Label title="API Token (optional)" style={settingLabelStyle}>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                style={{ width: '250px', padding: '4px' }}
                placeholder="JWT token for authentication"
              />
            </Label>
            <Label title="Data Migration" style={settingLabelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button
                  intent="primary"
                  onClick={handleMigration}
                  disabled={migrating || isMigrationComplete()}
                  loading={migrating}
                >
                  {isMigrationComplete() ? 'Migration Complete' : 'Migrate Local Data to Server'}
                </Button>
                {migrationResult && (
                  <Tag intent="success">
                    Migrated: {migrationResult.migrated?.workspaces || 0} workspaces,
                    {' '}{migrationResult.migrated?.preferences || 0} preferences,
                    {' '}{migrationResult.migrated?.exercises || 0} exercises
                  </Tag>
                )}
                {migrationError && (
                  <Tag intent="danger">Migration failed</Tag>
                )}
              </div>
            </Label>
          </>
        )}
      </GroupPane>
      <GroupPane text="Experimental features">
        <Label title="Enable experimental features" style={settingLabelStyle}>
          <Switch
            style={{ margin: 0 }}
            {...register(`display.general.experimentalFeatures.display`)}
          />
        </Label>
      </GroupPane>
      <GroupPane text="Rendering">
        <Label title="Spectra rendering" style={settingLabelStyle}>
          <Controller
            control={control}
            name="general.spectraRendering"
            render={({ field }) => {
              const { value, onChange } = field;

              return (
                <Select2<SelectItem>
                  items={SHAPE_RENDERING}
                  itemTextKey="label"
                  itemValueKey="value"
                  selectedItemValue={value}
                  onItemSelect={(item) => onChange(item.value)}
                />
              );
            }}
          />
        </Label>
      </GroupPane>
      <GroupPane text="Logging settings">
        <Label title="Level" style={settingLabelStyle}>
          <Controller
            control={control}
            name="general.loggingLevel"
            render={({ field }) => {
              const { value, onChange } = field;

              return (
                <Select2<SelectItem>
                  items={LOGS_LEVELS}
                  itemTextKey="label"
                  itemValueKey="value"
                  selectedItemValue={value}
                  onItemSelect={(item) => onChange(item.value)}
                />
              );
            }}
          />
        </Label>
        <Label title="Popup logging level" style={settingLabelStyle}>
          <Controller
            control={control}
            name="general.popupLoggingLevel"
            render={({ field }) => {
              const { value, onChange } = field;
              return (
                <Select2<SelectItem>
                  items={LOGS_LEVELS}
                  itemTextKey="label"
                  itemValueKey="value"
                  selectedItemValue={value}
                  onItemSelect={(item) => onChange(item.value)}
                />
              );
            }}
          />
        </Label>
      </GroupPane>
      <GroupPane text="Peaks label">
        <Label title="Margin top" style={settingLabelStyle}>
          <NumberInput2Controller
            control={control}
            name="peaksLabel.marginTop"
            min={0}
            max={1}
            stepSize={0.1}
            style={{ width: 70 }}
            rightElement={<Tag>px</Tag>}
          />
        </Label>
      </GroupPane>
    </>
  );
}

export default GeneralTabContent;
