import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Grid, Card, CardActionArea, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, AvatarGroup, Avatar, Chip, IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const ICONS = ["📋", "🚀", "💼", "📈", "🎯", "🛠️", "📞", "🗂️"];
const COLORS = ["#4F46E5", "#0EA5A4", "#F59E0B", "#EF4444", "#8B5CF6", "#22C55E"];

export default function BoardsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "📋", color: "#4F46E5" });
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/boards").then((res) => setBoards(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const createBoard = async () => {
    if (!form.name.trim()) return;
    await api.post("/boards", form);
    setOpen(false);
    setForm({ name: "", description: "", icon: "📋", color: "#4F46E5" });
    load();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Boards</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.role === "admin" ? "Create boards and grant your team access." : "Boards you've been granted access to."}
          </Typography>
        </Box>
        {user?.role === "admin" && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Board</Button>
        )}
      </Stack>

      {!loading && boards.length === 0 && (
        <Box sx={{ textAlign: "center", py: 10 }}>
          <Typography variant="h6" color="text.secondary">No boards yet</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.role === "admin" ? "Create your first board to get started." : "Ask an admin to grant you access to a board."}
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {boards.map((board) => (
          <Grid item xs={12} sm={6} md={4} key={board._id}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardActionArea onClick={() => navigate(`/boards/${board._id}`)} sx={{ height: "100%", p: 0.5 }}>
                <CardContent>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: `${board.color}1A`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, mb: 1.5 }}>
                    {board.icon}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>{board.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 20 }} noWrap>
                    {board.description || "No description"}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 26, height: 26, fontSize: 12 } }}>
                      {board.members.map((m) => (
                        <Avatar key={m.user._id} src={m.user.avatar}>{m.user.name?.[0]}</Avatar>
                      ))}
                    </AvatarGroup>
                    <Chip size="small" icon={<GroupIcon sx={{ fontSize: 14 }} />} label={`${board.members.length}`} />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create a new board</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Board name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={2} />
            <Box>
              <Typography variant="caption" color="text.secondary">Icon</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {ICONS.map((i) => (
                  <IconButton key={i} onClick={() => setForm({ ...form, icon: i })} sx={{ border: form.icon === i ? "2px solid" : "1px solid", borderColor: form.icon === i ? "primary.main" : "divider" }}>
                    {i}
                  </IconButton>
                ))}
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Color</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {COLORS.map((c) => (
                  <Box key={c} onClick={() => setForm({ ...form, color: c })} sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: c, cursor: "pointer", border: form.color === c ? "3px solid #1A1D26" : "none" }} />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createBoard}>Create Board</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
