import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BoardsList from "./pages/BoardsList";
import BoardDetail from "./pages/BoardDetail";
import Chat from "./pages/Chat";
import AdminPanel from "./pages/AdminPanel";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<BoardsList />} />
                <Route path="boards/:id" element={<BoardDetail />} />
                <Route path="chat" element={<Chat />} />
                <Route
                  path="admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
