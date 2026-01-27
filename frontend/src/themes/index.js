import { createTheme } from '@mui/material/styles';

// Темная тема (черно-красная)
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff1744', // Яркий красный
      light: '#ff616f',
      dark: '#c4001d',
    },
    secondary: {
      main: '#212121', // Темно-серый
      light: '#484848',
      dark: '#000000',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          backgroundImage: 'none',
          boxShadow: '0 2px 10px rgba(255, 23, 68, 0.3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #ff1744 30%, #ff616f 90%)',
          boxShadow: '0 3px 5px 2px rgba(255, 23, 68, .3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #c4001d 30%, #ff1744 90%)',
          },
        },
      },
    },
  },
});

// Светлая тема (приятные светлые тона)
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2e7d32', // Приятный зеленый
      light: '#4caf50',
      dark: '#1b5e20',
    },
    secondary: {
      main: '#ff6d00', // Теплый оранжевый
      light: '#ffab40',
      dark: '#e65100',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2e3440',
      secondary: '#4c566a',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: '#0288d1',
    },
    success: {
      main: '#2e7d32',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: '#2e3440',
    },
    h2: {
      fontWeight: 600,
      color: '#2e3440',
    },
    h3: {
      fontWeight: 600,
      color: '#2e3440',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#2e3440',
          boxShadow: '0 2px 10px rgba(46, 52, 64, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
          boxShadow: '0 3px 5px 2px rgba(46, 125, 50, .2)',
          '&:hover': {
            background: 'linear-gradient(45deg, #1b5e20 30%, #2e7d32 90%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(45deg, #ff6d00 30%, #ffab40 90%)',
          boxShadow: '0 3px 5px 2px rgba(255, 109, 0, .2)',
          '&:hover': {
            background: 'linear-gradient(45deg, #e65100 30%, #ff6d00 90%)',
          },
        },
      },
    },
  },
});