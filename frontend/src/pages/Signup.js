import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Paper, TextField, Button, Typography, Alert, Stack } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
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
          Create your workspace account. The first person to sign up becomes the workspace admin.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required fullWidth />
            <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required fullWidth helperText="At least 6 characters" />
            <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </Stack>
        </form>
        <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
