const { useState, useEffect, useCallback, useRef } = React;

console.log('🚀 App.js loaded');

// Main App Component
function App() {
    console.log('📱 App component rendering');
    
    const [config, setConfig] = useState(loadConfig());
    const [items, setItems] = useState([]);
    const [currentItem, setCurrentItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const tokenClientRef = useRef(null);
    const accessTokenRef = useRef(null);
    const confirmationTimeoutRef = useRef(null);

    console.log('📊 State:', {
        isSignedIn,
        loading,
        itemsCount: items.length,
        hasCurrentItem: !!currentItem,
        hasError: !!error
    });

    // Load saved token on mount
    useEffect(() => {
        console.log('🔍 Checking for saved token...');
        const savedToken = localStorage.getItem('googleAccessToken');
        const savedExpiry = localStorage.getItem('googleTokenExpiry');
        
        if (savedToken && savedExpiry) {
            const expiryTime = parseInt(savedExpiry);
            const now = Date.now();
            
            // Check if token is still valid (not expired)
            if (now < expiryTime) {
                console.log('✅ Found valid saved token, auto-signing in');
                accessTokenRef.current = savedToken;
                setIsSignedIn(true);
                // Don't set loading here, let fetchData handle it
            } else {
                console.log('⏰ Saved token expired, clearing');
                localStorage.removeItem('googleAccessToken');
                localStorage.removeItem('googleTokenExpiry');
                setLoading(false);
            }
        } else {
            console.log('❌ No saved token found');
            setLoading(false);
        }
    }, []);

    // Initialize Google API
    useEffect(() => {
        console.log('🔧 Initialize Google API effect');
        const initializeGoogleAPI = () => {
            if (!config.clientId) {
                console.log('❌ No client ID configured');
                return;
            }

            console.log('✅ Initializing token client...');
            tokenClientRef.current = google.accounts.oauth2.initTokenClient({
                client_id: config.clientId,
                scope: SCOPES,
                ux_mode: 'popup',
                callback: (tokenResponse) => {
                    console.log('🎫 Token response received:', tokenResponse);
                    if (tokenResponse.access_token) {
                        console.log('✅ Access token received');
                        accessTokenRef.current = tokenResponse.access_token;
                        
                        // Save token to localStorage with expiry time
                        // Google tokens typically expire in 3600 seconds (1 hour)
                        const expiryTime = Date.now() + (tokenResponse.expires_in || 3600) * 1000;
                        localStorage.setItem('googleAccessToken', tokenResponse.access_token);
                        localStorage.setItem('googleTokenExpiry', expiryTime.toString());
                        console.log('💾 Token saved to localStorage, expires at:', new Date(expiryTime));
                        
                        setIsSignedIn(true);
                        fetchData();
                    } else if (tokenResponse.error) {
                        console.error('❌ Token error:', tokenResponse.error);
                        setError(`Authentication failed: ${tokenResponse.error}`);
                    }
                },
                error_callback: (error) => {
                    console.error('❌ Auth error callback:', error);
                    setError(`Authentication error: ${error.message || 'Unknown error'}`);
                }
            });
            console.log('✅ Token client initialized');
        };

        if (window.google && config.clientId) {
            initializeGoogleAPI();
        }
    }, [config.clientId]);

    // Handle sign in
    const handleSignIn = () => {
        console.log('🔐 Sign in clicked');
        if (!config.clientId) {
            console.log('❌ No client ID');
            setError('Please configure Client ID in settings');
            setShowSettings(true);
            return;
        }

        if (!config.spreadsheetId) {
            console.log('❌ No spreadsheet ID');
            setError('Please configure Spreadsheet ID in settings');
            setShowSettings(true);
            return;
        }

        if (tokenClientRef.current) {
            try {
                console.log('🔑 Requesting access token...');
                tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
            } catch (err) {
                console.error('❌ Sign in error:', err);
                setError(`Sign in failed: ${err.message}`);
            }
        }
    };

    // Handle sign out
    const handleSignOut = () => {
        console.log('🚪 Signing out');
        
        // Clear token from localStorage
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleTokenExpiry');
        console.log('🗑️ Cleared saved token');
        
        accessTokenRef.current = null;
        setIsSignedIn(false);
        setItems([]);
        setCurrentItem(null);
        setUserEmail('');
        
        if (accessTokenRef.current) {
            google.accounts.oauth2.revoke(accessTokenRef.current);
        }
    };

    // Fetch data from Google Sheets
    const fetchData = useCallback(async () => {
        console.log('📥 Fetching data...');
        console.log('📊 Access token exists:', !!accessTokenRef.current);
        console.log('📊 Spreadsheet ID:', config.spreadsheetId);
        console.log('📊 Sheet name:', config.sheetName);
        
        if (!accessTokenRef.current || !config.spreadsheetId) {
            console.log('❌ Missing access token or spreadsheet ID');
            setLoading(false);
            return;
        }

        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.sheetName}`;
            console.log('🌐 Fetching from:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessTokenRef.current}`
                }
            });
            
            console.log('📡 Response status:', response.status);
            
            // If 401 (unauthorized), token may be expired - clear it and require re-login
            if (response.status === 401) {
                console.log('🔑 Token expired, clearing saved token');
                localStorage.removeItem('googleAccessToken');
                localStorage.removeItem('googleTokenExpiry');
                accessTokenRef.current = null;
                setIsSignedIn(false);
                setLoading(false);
                throw new Error('Session expired. Please sign in again.');
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                setLoading(false);
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 Data received:', data);
            const rows = data.values;

            if (!rows || rows.length === 0) {
                console.log('❌ No rows found');
                throw new Error('No data found in spreadsheet');
            }

            console.log('📝 Total rows:', rows.length);
            console.log('📝 First row (headers):', rows[0]);

            const parsedItems = rows.slice(1).map((row, index) => ({
                category: row[0] || '',
                itemName: row[1] || '',
                size: row[2] || '',
                quantityStorage: parseInt(row[3]) || 0,
                quantityKitchen: parseInt(row[4]) || 0,
                expiryDate: parseDate(row[5]),
                lastUpdate: row[6] || '',
                rowIndex: index + 2
            })).filter(item => item.itemName);

            console.log('✅ Parsed items:', parsedItems.length);
            console.log('📦 Sample item:', parsedItems[0]);

            setItems(parsedItems);
            
            if (parsedItems.length > 0) {
                const selected = weightedRandomSelect(parsedItems, config.weights);
                console.log('🎯 Selected item:', selected);
                setCurrentItem(selected);
            }
            
            setError(null);
            setLoading(false);
            console.log('✅ Data fetch complete');
        } catch (err) {
            console.error('❌ Fetch error:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [config.spreadsheetId, config.sheetName, config.weights]);

    // Update quantity in Google Sheets
    const updateQuantity = async (location, delta) => {
        console.log(`🔄 Updating ${location} by ${delta}`);
        if (!currentItem || !accessTokenRef.current) {
            console.log('❌ No current item or access token');
            return;
        }

        const newItem = { ...currentItem };
        const today = formatDate(new Date());

        if (location === 'storage') {
            newItem.quantityStorage = Math.max(0, newItem.quantityStorage + delta);
        } else {
            newItem.quantityKitchen = Math.max(0, newItem.quantityKitchen + delta);
        }
        newItem.lastUpdate = today;

        setCurrentItem(newItem);
        setItems(items.map(item => 
            item.rowIndex === newItem.rowIndex ? newItem : item
        ));

        try {
            const range = `${config.sheetName}!D${newItem.rowIndex}:G${newItem.rowIndex}`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}?valueInputOption=RAW`;
            
            const values = [[
                newItem.quantityStorage.toString(),
                newItem.quantityKitchen.toString(),
                formatDate(newItem.expiryDate),
                today
            ]];

            console.log('📤 Updating sheet:', { range, values });

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessTokenRef.current}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values })
            });

            if (!response.ok) {
                throw new Error('Failed to update sheet');
            }

            console.log('✅ Sheet updated successfully');
            setShowConfirmation(true);
            setTimeout(() => setShowConfirmation(false), 3000);
        } catch (err) {
            console.error('❌ Update error:', err);
            setError('Failed to update. Please try again.');
        }
    };

    // Rotation effect
    useEffect(() => {
        console.log('🔄 Rotation effect');
        if (items.length === 0 || !isSignedIn) {
            console.log('⏸️ Rotation paused - no items or not signed in');
            return;
        }

        console.log('⏰ Starting rotation timer');
        const interval = setInterval(() => {
            const selected = weightedRandomSelect(items, config.weights);
            console.log('🔄 Rotating to:', selected.itemName);
            setCurrentItem(selected);
            setProgress(0);
        }, config.rotationInterval * 1000);

        return () => {
            console.log('🛑 Clearing rotation timer');
            clearInterval(interval);
        };
    }, [items, config.rotationInterval, config.weights, isSignedIn]);

    // Progress bar effect
    useEffect(() => {
        if (!isSignedIn || items.length === 0) return;

        const interval = setInterval(() => {
            setProgress(prev => {
                const increment = 100 / (config.rotationInterval * 10);
                const newProgress = prev + increment;
                return newProgress >= 100 ? 0 : newProgress;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [config.rotationInterval, isSignedIn, items.length]);

    // Initial data fetch
    useEffect(() => {
        console.log('🎬 Initial fetch effect', { isSignedIn, hasToken: !!accessTokenRef.current });
        if (isSignedIn && accessTokenRef.current) {
            console.log('📥 Triggering initial fetch');
            fetchData();
            
            const refreshInterval = setInterval(() => {
                console.log('🔄 Auto-refresh triggered');
                fetchData();
            }, 5 * 60 * 1000);
            
            return () => {
                console.log('🛑 Clearing refresh interval');
                clearInterval(refreshInterval);
            };
        }
    }, [isSignedIn]);

    // Handle settings save
    const handleSaveSettings = (newConfig) => {
        console.log('💾 Saving settings:', newConfig);
        setConfig(newConfig);
        saveConfig(newConfig);
        setShowSettings(false);
        if (isSignedIn) {
            setLoading(true);
            setError(null);
            fetchData();
        }
    };

    // Update body background color
    useEffect(() => {
        if (currentItem && isSignedIn) {
            const daysUntilExpiry = getDaysUntilExpiry(currentItem.expiryDate);
            const expiryInfo = getExpiryStatus(daysUntilExpiry);
            console.log('🎨 Setting background:', expiryInfo.status);
            document.body.className = `bg-${expiryInfo.status}`;
        } else {
            document.body.className = '';
        }
        return () => {
            document.body.className = '';
        };
    }, [currentItem, isSignedIn]);

    console.log('🎬 Rendering decision - isSignedIn:', isSignedIn, 'currentItem:', !!currentItem, 'loading:', loading);

    // Always show something - debug view
    if (!isSignedIn || !currentItem) {
        console.log('🐛 Showing debug/login view');
        return (
            <div className="dashboard-container">
                <button className="settings-button" onClick={() => setShowSettings(true)}>
                    ⚙️
                </button>
                <div className="inventory-card debug-card">
                    {!isSignedIn ? (
                        <div className="login-screen">
                            <div className="login-title">Home Inventory Dashboard</div>
                            <div className="login-description">
                                Sign in with your Google account to access and manage your inventory.
                                <br/>
                                You'll need to grant access to your Google Sheets.
                            </div>
                            <button className="google-signin-button" onClick={handleSignIn}>
                                <svg width="18" height="18" viewBox="0 0 18 18">
                                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                                    <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                                </svg>
                                Sign in with Google
                            </button>
                            {error && (
                                <div className="error-message" style={{marginTop: '20px'}}>
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{padding: '20px', textAlign: 'center'}}>
                            <h1 style={{marginBottom: '30px', color: '#DD6E67', fontSize: '32px'}}>🔍 DEBUG MODE</h1>
                            <div style={{
                                textAlign: 'left', 
                                fontSize: '18px', 
                                lineHeight: '2',
                                background: '#f5f5f5',
                                padding: '30px',
                                borderRadius: '10px',
                                border: '2px solid #ddd'
                            }}>
                                <div style={{marginBottom: '20px'}}>
                                    <strong style={{fontSize: '20px', color: '#194A52'}}>📊 Status:</strong><br/>
                                    • Signed in: {isSignedIn ? '✅ YES' : '❌ NO'}<br/>
                                    • Loading: {loading ? '⏳ YES' : '✅ NO'}<br/>
                                    • Items loaded: <strong>{items.length}</strong><br/>
                                    • Current item exists: {currentItem ? '✅ YES' : '❌ NO'}<br/>
                                    • Has error: {error ? '🔴 YES' : '✅ NO'}<br/>
                                </div>
                                <div style={{marginBottom: '20px'}}>
                                    <strong style={{fontSize: '20px', color: '#194A52'}}>⚙️ Config:</strong><br/>
                                    • Client ID: {config.clientId ? '✅ Set (' + config.clientId.substring(0, 20) + '...)' : '❌ Not set'}<br/>
                                    • Spreadsheet ID: {config.spreadsheetId ? '✅ Set' : '❌ Not set'}<br/>
                                    • Sheet Name: <strong>{config.sheetName}</strong><br/>
                                </div>
                                {error && (
                                    <div style={{marginBottom: '20px', padding: '15px', background: '#FEE2E2', borderRadius: '8px'}}>
                                        <strong style={{color: '#991B1B', fontSize: '20px'}}>❌ Error:</strong><br/>
                                        <span style={{color: '#991B1B'}}>{error}</span>
                                    </div>
                                )}
                            </div>
                            <div style={{marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap'}}>
                                <button 
                                    onClick={() => {
                                        console.log('🔄 Manual retry clicked');
                                        setLoading(true);
                                        setError(null);
                                        fetchData();
                                    }}
                                    style={{
                                        padding: '15px 30px',
                                        background: '#88B0A4',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    🔄 Retry Loading Data
                                </button>
                                <button 
                                    onClick={handleSignOut}
                                    style={{
                                        padding: '15px 30px',
                                        background: '#DD6E67',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    🚪 Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {showSettings && (
                    <SettingsModal 
                        config={config}
                        onSave={handleSaveSettings}
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </div>
        );
    }

    if (loading) {
        console.log('⏳ Showing loading screen');
        return (
            <div className="dashboard-container">
                <div className="inventory-card" style={{background: 'white'}}>
                    <div className="loading-screen" style={{color: '#333'}}>
                        <div className="loading-spinner"></div>
                        <div>Loading inventory...</div>
                        <div style={{marginTop: '20px', fontSize: '14px', opacity: 0.8}}>
                            Signed in: {isSignedIn ? 'Yes' : 'No'}<br/>
                            Items loaded: {items.length}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        console.log('❌ Showing error screen');
        return (
            <div className="dashboard-container">
                <button className="settings-button" onClick={() => setShowSettings(true)}>
                    ⚙️
                </button>
                <div className="inventory-card">
                    <div className="error-message">
                        <h2>Error</h2>
                        <p style={{marginTop: '10px'}}>{error}</p>
                        <div style={{marginTop: '15px', fontSize: '12px', opacity: 0.8}}>
                            Items loaded: {items.length}<br/>
                            Signed in: {isSignedIn ? 'Yes' : 'No'}
                        </div>
                        <button 
                            onClick={() => {
                                setError(null);
                                setLoading(true);
                                fetchData();
                            }}
                            style={{
                                marginTop: '15px',
                                padding: '10px 20px',
                                background: '#88B0A4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                </div>
                {showSettings && (
                    <SettingsModal 
                        config={config}
                        onSave={handleSaveSettings}
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </div>
        );
    }

    console.log('✅ Showing main dashboard');
    const daysUntilExpiry = getDaysUntilExpiry(currentItem.expiryDate);
    const expiryInfo = getExpiryStatus(daysUntilExpiry);

    return (
        <div className="dashboard-container">
            {userEmail && (
                <div className="user-info">
                    <span>{userEmail}</span>
                    <button className="signout-button" onClick={handleSignOut}>
                        Sign Out
                    </button>
                </div>
            )}
            
            <button className="settings-button" onClick={() => setShowSettings(true)}>
                ⚙️
            </button>

            <div className="inventory-card">
                <div className="item-header">
                    <div className="item-name">{currentItem.itemName}</div>
                    <div className="item-category">{currentItem.category}</div>
                    {currentItem.size && <div className="item-size">{currentItem.size}</div>}
                </div>

                <div className={`expiry-section ${expiryInfo.status}`}>
                    <div className="expiry-label">{expiryInfo.label}</div>
                    <div className="expiry-date">
                        {currentItem.expiryDate ? formatDate(currentItem.expiryDate) : 'No expiry date'}
                    </div>
                    {currentItem.expiryDate && (
                        <div style={{marginTop: '5px', fontSize: '14px'}}>
                            ({daysUntilExpiry} days {daysUntilExpiry >= 0 ? 'remaining' : 'overdue'})
                        </div>
                    )}
                </div>

                <div className="quantities-section">
                    <div className="quantity-box">
                        <div className="quantity-label">Storage</div>
                        <div className="quantity-display">{currentItem.quantityStorage}</div>
                        <div className="quantity-buttons">
                            <button 
                                className="quantity-button"
                                onClick={() => updateQuantity('storage', -1)}
                            >
                                -1
                            </button>
                            <button 
                                className="quantity-button"
                                onClick={() => updateQuantity('storage', 1)}
                            >
                                +1
                            </button>
                        </div>
                    </div>

                    <div className="quantity-box">
                        <div className="quantity-label">Kitchen</div>
                        <div className="quantity-display">{currentItem.quantityKitchen}</div>
                        <div className="quantity-buttons">
                            <button 
                                className="quantity-button"
                                onClick={() => updateQuantity('kitchen', -1)}
                            >
                                -1
                            </button>
                            <button 
                                className="quantity-button"
                                onClick={() => updateQuantity('kitchen', 1)}
                            >
                                +1
                            </button>
                        </div>
                    </div>
                </div>

                <div className="last-update">
                    Last updated: {currentItem.lastUpdate || 'Never'}
                </div>

                <div className="progress-bar" style={{width: `${progress}%`}}></div>
            </div>

            {showConfirmation && (
                <div className="update-confirmation">
                    ✓ Updated successfully!
                </div>
            )}

            {showSettings && (
                <SettingsModal 
                    config={config}
                    onSave={handleSaveSettings}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}

// Settings Modal Component
function SettingsModal({ config, onSave, onClose }) {
    const [localConfig, setLocalConfig] = useState(config);

    const handleSave = () => {
        const totalWeight = Object.values(localConfig.weights).reduce((a, b) => a + b, 0);
        if (totalWeight !== 100) {
            alert('Warning: Weights should add up to 100 for accurate distribution');
        }
        onSave(localConfig);
    };

    return (
        <div className="settings-modal" onClick={onClose}>
            <div className="settings-content" onClick={e => e.stopPropagation()}>
                <div className="settings-header">Dashboard Settings</div>

                <div className="settings-section">
                    <label className="settings-label">Google OAuth Client ID</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={localConfig.clientId}
                        onChange={e => setLocalConfig({...localConfig, clientId: e.target.value})}
                        placeholder="Enter your OAuth Client ID"
                    />
                    <div className="help-text">Get this from Google Cloud Console - OAuth 2.0 Client IDs</div>
                </div>

                <div className="settings-section">
                    <label className="settings-label">Spreadsheet ID</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={localConfig.spreadsheetId}
                        onChange={e => setLocalConfig({...localConfig, spreadsheetId: e.target.value})}
                        placeholder="Found in your Google Sheets URL"
                    />
                    <div className="help-text">From the URL: docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit</div>
                </div>

                <div className="settings-section">
                    <label className="settings-label">Sheet Name</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={localConfig.sheetName}
                        onChange={e => setLocalConfig({...localConfig, sheetName: e.target.value})}
                        placeholder="e.g., Master"
                    />
                </div>

                <div className="settings-section">
                    <label className="settings-label">Rotation Interval (seconds)</label>
                    <input
                        type="number"
                        className="settings-input"
                        value={localConfig.rotationInterval}
                        onChange={e => setLocalConfig({...localConfig, rotationInterval: parseInt(e.target.value) || 60})}
                        min="5"
                        max="300"
                    />
                </div>

                <div className="settings-section">
                    <label className="settings-label">Display Frequency Weights (%)</label>
                    <div className="help-text" style={{marginBottom: '10px'}}>Should add up to 100</div>
                    <div className="weight-grid">
                        <div className="weight-item">
                            <span className="weight-label">Expired (≤7 days)</span>
                            <input
                                type="number"
                                className="weight-input"
                                value={localConfig.weights.expired}
                                onChange={e => setLocalConfig({
                                    ...localConfig, 
                                    weights: {...localConfig.weights, expired: parseInt(e.target.value) || 0}
                                })}
                                min="0"
                                max="100"
                            />
                        </div>
                        <div className="weight-item">
                            <span className="weight-label">Soon (≤30 days)</span>
                            <input
                                type="number"
                                className="weight-input"
                                value={localConfig.weights.soon}
                                onChange={e => setLocalConfig({
                                    ...localConfig, 
                                    weights: {...localConfig.weights, soon: parseInt(e.target.value) || 0}
                                })}
                                min="0"
                                max="100"
                            />
                        </div>
                        <div className="weight-item">
                            <span className="weight-label">Medium (≤90 days)</span>
                            <input
                                type="number"
                                className="weight-input"
                                value={localConfig.weights.medium}
                                onChange={e => setLocalConfig({
                                    ...localConfig, 
                                    weights: {...localConfig.weights, medium: parseInt(e.target.value) || 0}
                                })}
                                min="0"
                                max="100"
                            />
                        </div>
                        <div className="weight-item">
                            <span className="weight-label">Later (≤180 days)</span>
                            <input
                                type="number"
                                className="weight-input"
                                value={localConfig.weights.later}
                                onChange={e => setLocalConfig({
                                    ...localConfig, 
                                    weights: {...localConfig.weights, later: parseInt(e.target.value) || 0}
                                })}
                                min="0"
                                max="100"
                            />
                        </div>
                        <div className="weight-item">
                            <span className="weight-label">Fresh (>180 days)</span>
                            <input
                                type="number"
                                className="weight-input"
                                value={localConfig.weights.fresh}
                                onChange={e => setLocalConfig({
                                    ...localConfig, 
                                    weights: {...localConfig.weights, fresh: parseInt(e.target.value) || 0}
                                })}
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>
                </div>

                <div className="settings-buttons">
                    <button className="settings-button-action cancel-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="settings-button-action save-button" onClick={handleSave}>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

// Render App
console.log('🎬 Rendering app to DOM');
ReactDOM.render(<App />, document.getElementById('root'));
