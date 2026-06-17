import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

export function createAppTheme(mode: 'light' | 'dark'): Theme {
    return createTheme({
        palette: {
            mode,
            ...(mode === 'light'
                ? {
                      background: { default: '#f6f8fa', paper: '#ffffff' },
                      primary: { main: '#0969da', dark: '#0550ae' },
                      text: { primary: '#1f2328', secondary: '#57606a', disabled: '#8c959f' },
                      divider: '#d0d7de',
                      error: { main: '#cf222e' },
                  }
                : {
                      background: { default: '#0d1117', paper: '#161b22' },
                      primary: { main: '#58a6ff', dark: '#388bfd' },
                      text: { primary: '#e6edf3', secondary: '#8b949e', disabled: '#6e7681' },
                      divider: '#30363d',
                      error: { main: '#ff7b72' },
                  }),
        },
    });
}
