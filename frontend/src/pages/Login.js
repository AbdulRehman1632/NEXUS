import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Paper, TextField, Button, Typography, Alert, Stack } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
      <Paper elevation={0} sx={{ p: 5, width: 400, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
          Nexus
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to your workspace
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
            <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </Stack>
        </form>
        <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
          Don't have an account? <Link to="/signup">Create one</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
