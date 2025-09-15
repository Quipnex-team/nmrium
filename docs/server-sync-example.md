# NMRium Server Sync Usage Example

## How to Use NMRium with Server-Side Preferences

### Basic Setup

```typescript
import { NMRium } from 'nmrium';

// Get auth token from your authentication system
const authToken = localStorage.getItem('jwt_token');

function App() {
  return (
    <NMRium
      data={nmrData}
      apiConfig={{
        baseURL: 'http://tenant1.localhost:8000/qxcore',
        token: authToken,
        enableSync: true,
        syncInterval: 30000, // sync every 30 seconds
      }}
      onChange={(data) => {
        console.log('NMRium data changed:', data);
      }}
    />
  );
}
```

### Configuration Options

- `baseURL`: Your qxcore backend URL (use tenant-specific URL for multi-tenant setup)
- `token`: JWT authentication token
- `enableSync`: Enable/disable server synchronization
- `syncInterval`: How often to sync with server (in milliseconds)
- `headers`: Additional headers for API requests (optional)

### Features

1. **Automatic Server Load**: On component mount, preferences are loaded from server
2. **Local Storage Migration**: Existing localStorage data is automatically migrated to server
3. **Offline Support**: Works offline with local cache, syncs when online
4. **Periodic Sync**: Changes are synced to server at specified intervals
5. **Multi-Tenant Support**: Use tenant-specific URLs (e.g., `tenant1.localhost:8000`)

### Testing

1. Open browser DevTools Network tab
2. Look for these API calls:
   - `GET /qxcore/nmrium/preferences/` - Initial preferences load
   - `GET /qxcore/nmrium/workspaces/` - Workspace list
   - `POST /qxcore/nmrium/migrate/enhanced/` - Migration (first time only)
   - `PUT /qxcore/nmrium/preferences/` - Preference updates

### Troubleshooting

If preferences aren't loading from server:

1. Check that you're using the correct tenant URL
2. Verify JWT token is valid
3. Ensure backend nmrium tables exist (run migrations)
4. Check browser console for error messages
5. Verify CORS settings allow your frontend domain