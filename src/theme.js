import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#38bdf8', light: '#7dd3fc', dark: '#0284c7' },
    secondary: { main: '#f59e0b', light: '#fbbf24', dark: '#b45309' },
    success: { main: '#34d399' },
    warning: { main: '#fbbf24' },
    error: { main: '#f87171' },
    background: {
      default: '#0b1120',
      paper: '#111a2e',
    },
    divider: 'rgba(148, 163, 184, 0.14)',
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`,
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          backgroundImage: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            boxShadow: '0 12px 40px -12px rgba(14, 165, 233, 0.25)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: { borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.6)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: 'rgba(148,163,184,0.12)' },
      },
    },
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: 'rgba(11,17,32,0.82)', backdropFilter: 'blur(12px)' } },
    },
  },
})