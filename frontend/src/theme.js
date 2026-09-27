import { createTheme } from "@mui/material/styles";

// Design tokens
// Primary: deep indigo (#4F46E5) — confident, professional, distinct from generic blue
// Background: cool neutral (#F5F6FA), Surface: white
// Accent for success/warn/danger follow standard semantic mapping
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#4F46E5", light: "#6366F1", dark: "#3730A3", contrastText: "#fff" },
    secondary: { main: "#0EA5A4" },
    success: { main: "#22C55E" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    background: { default: "#F5F6FA", paper: "#FFFFFF" },
    text: { primary: "#1A1D26", secondary: "#5B6172" },
    divider: "#E6E8F0",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: ['"Inter"', "-apple-system", "BlinkMacSystemFont", "sans-serif"].join(","),
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingLeft: 16, paddingRight: 16 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: "none", borderBottom: "1px solid #E6E8F0" },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { scrollbarColor: "#C7CBDA transparent" },
      },
    },
  },
});

export default theme;
