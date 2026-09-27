import { useEffect, useState } from "react";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Avatar, Stack,
  Chip, Select, MenuItem, IconButton, Paper, Tooltip,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function AdminPanel() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);

  const load = () => api.get("/users").then((res) => setUsers(res.data));
  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    await api.patch(`/users/${id}/role`, { role });
    load();
  };

  const removeUser = async (id) => {
    if (!window.confirm("Remove this user? This cannot be undone.")) return;
    await api.delete(`/users/${id}`);
    load();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Admin · Team</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage roles. Admins can create boards and grant board access to any user; go to a board's "Access" button to assign it.
      </Typography>
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u._id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={u.avatar} sx={{ width: 32, height: 32 }}>{u.name?.[0]}</Avatar>
                    <Typography fontWeight={600}>{u.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip size="small" label={u.isOnline ? "Online" : "Offline"} color={u.isOnline ? "success" : "default"} />
                </TableCell>
                <TableCell>
                  <Select size="small" value={u.role} onChange={(e) => changeRole(u._id, e.target.value)}>
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Remove user">
                    <IconButton onClick={() => removeUser(u._id)}><DeleteOutlineIcon /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
