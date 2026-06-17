import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import ExplorerPage from './explorer/ExplorerPage';
import { ColorModeContext } from './ColorModeContext';
import { createAppTheme } from './theme';
import './index.css';

function App() {
    const [mode, setMode] = useState<'light' | 'dark'>('light');
    const colorMode = useMemo(() => ({ toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')) }), []);
    const theme = useMemo(() => createAppTheme(mode), [mode]);
    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <ExplorerPage />
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
