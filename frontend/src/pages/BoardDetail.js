import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Stack, Typography, Button, Chip, IconButton, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, FormControl, InputLabel, Avatar,
  AvatarGroup, Tooltip, Checkbox, ListItemText as MuiListItemText,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const FIELD_TYPES = ["text", "number", "date", "select", "checkbox", "url", "email", "currency"];

export default function BoardDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [cards, setCards] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [fieldDialog, setFieldDialog] = useState(false);
  const [memberDialog, setMemberDialog] = useState(false);
  const [newField, setNewField] = useState({ key: "", label: "", type: "text", options: "" });

  const canEdit = useMemo(() => {
    if (!board || !user) return false;
    if (user.role === "admin") return true;
    const m = board.members.find((m) => m.user._id === user._id);
    return m?.accessLevel === "editor";
  }, [board, user]);

  const load = useCallback(async () => {
    const [b, c] = await Promise.all([api.get(`/boards/${id}`), api.get(`/cards/board/${id}`)]);
    setBoard(b.data);
    setCards(c.data);
  }, [id]);

  useEffect(() => {
    load();
    if (user?.role === "admin") api.get("/users").then((res) => setAllUsers(res.data));
  }, [load, user]);

  const addRow = async () => {
    const res = await api.post("/cards", { board: id, title: "New item", status: board.statuses[0]?.name || "To Do" });
    setCards((prev) => [...prev, res.data]);
  };

  const updateCard = async (idRow, patch) => {
    setCards((prev) => prev.map((c) => (c._id === idRow ? { ...c, ...patch } : c)));
    await api.patch(`/cards/${idRow}`, patch);
  };

  const deleteCard = async (idRow) => {
    setCards((prev) => prev.filter((c) => c._id !== idRow));
    await api.delete(`/cards/${idRow}`);
  };

  const addField = async () => {
    if (!newField.label.trim()) return;
    const key = newField.key.trim() || newField.label.trim().toLowerCase().replace(/\s+/g, "_");
    const options =
      newField.type === "select"
        ? newField.options.split(",").map((o) => ({ label: o.trim(), value: o.trim() })).filter((o) => o.value)
        : [];
    const res = await api.post(`/boards/${id}/fields`, { key, label: newField.label, type: newField.type, options });
    setBoard(res.data);
    setNewField({ key: "", label: "", type: "text", options: "" });
    setFieldDialog(false);
  };

  const removeField = async (fieldId) => {
    const res = await api.delete(`/boards/${id}/fields/${fieldId}`);
    setBoard(res.data);
  };

  const grantAccess = async (userId, accessLevel) => {
    const res = await api.post(`/boards/${id}/members`, { userId, accessLevel });
    setBoard((prev) => ({ ...prev, members: res.data.members }));
  };

  const revokeAccess = async (userId) => {
    const res = await api.delete(`/boards/${id}/members/${userId}`);
    setBoard((prev) => ({ ...prev, members: res.data.members }));
  };

  if (!board) return null;

  const columns = [
    {
      field: "title", headerName: "Name", flex: 1.4, editable: canEdit,
    },
    {
      field: "status", headerName: "Status", width: 150, editable: canEdit,
      renderCell: (params) => {
        const s = board.statuses.find((s) => s.name === params.value);
        return <Chip size="small" label={params.value} sx={{ bgcolor: `${s?.color || "#999"}22`, color: s?.color || "#666", fontWeight: 700 }} />;
      },
      type: "singleSelect",
      valueOptions: board.statuses.map((s) => s.name),
    },
    {
      field: "priority", headerName: "Priority", width: 130, editable: canEdit, type: "singleSelect",
      valueOptions: ["low", "normal", "high", "urgent"],
      renderCell: (params) => {
        const colors = { low: "#94A3B8", normal: "#3B82F6", high: "#F59E0B", urgent: "#EF4444" };
        return <Chip size="small" label={params.value} sx={{ bgcolor: `${colors[params.value]}22`, color: colors[params.value], fontWeight: 700, textTransform: "capitalize" }} />;
      },
    },
    {
      field: "assignees", headerName: "Assignees", width: 140, sortable: false,
      renderCell: (params) => (
        <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 11 } }}>
          {(params.value || []).map((a) => <Avatar key={a._id || a} src={a.avatar}>{a.name?.[0]}</Avatar>)}
        </AvatarGroup>
      ),
    },
    {
      field: "dueDate", headerName: "Due Date", width: 130, editable: canEdit, type: "date",
      valueGetter: (params) => (params.value ? new Date(params.value) : null),
    },
    ...board.customFields
      .sort((a, b) => a.order - b.order)
      .map((f) => ({
        field: `cf_${f.key}`,
        headerName: f.label,
        width: 150,
        editable: canEdit,
        type: f.type === "number" || f.type === "currency" ? "number" : f.type === "checkbox" ? "boolean" : f.type === "select" ? "singleSelect" : "string",
        valueOptions: f.type === "select" ? f.options.map((o) => o.value) : undefined,
        valueGetter: (params) => params.row.fieldValues?.[f.key],
        renderHeader: () => (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" fontWeight={700}>{f.label}</Typography>
            {canEdit && (
              <IconButton size="small" onClick={() => removeField(f._id)}>
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Stack>
        ),
      })),
  ];

  const rows = cards.map((c) => ({ id: c._id, ...c }));

  const processRowUpdate = async (newRow, oldRow) => {
    const patch = {};
    const builtIns = ["title", "status", "priority", "dueDate"];
    const changedField = Object.keys(newRow).find((k) => newRow[k] !== oldRow[k]);
    if (builtIns.includes(changedField)) {
      patch[changedField] = newRow[changedField];
    } else if (changedField?.startsWith("cf_")) {
      const key = changedField.replace("cf_", "");
      patch.fieldValues = { [key]: newRow[changedField] };
    }
    if (Object.keys(patch).length) await updateCard(newRow.id, patch);
    return newRow;
  };

  return (
    <Box sx={{ height: "calc(100vh - 130px)", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>{board.icon} {board.name}</Typography>
          <Typography variant="body2" color="text.secondary">{board.description}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <AvatarGroup max={5} sx={{ "& .MuiAvatar-root": { width: 30, height: 30, fontSize: 13 } }}>
            {board.members.map((m) => (
              <Tooltip key={m.user._id} title={`${m.user.name} (${m.accessLevel})`}>
                <Avatar src={m.user.avatar}>{m.user.name?.[0]}</Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          {user.role === "admin" && (
            <Button startIcon={<GroupAddIcon />} onClick={() => setMemberDialog(true)}>Access</Button>
          )}
          {canEdit && (
            <Button startIcon={<ViewColumnIcon />} onClick={() => setFieldDialog(true)}>Add Field</Button>
          )}
          {canEdit && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={addRow}>Add Item</Button>
          )}
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          processRowUpdate={processRowUpdate}
          disableRowSelectionOnClick
          density="comfortable"
          sx={{ border: "none", "& .MuiDataGrid-columnHeaders": { bgcolor: "#F8F9FC", fontWeight: 700 } }}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

      {/* Add custom field dialog */}
      <Dialog open={fieldDialog} onClose={() => setFieldDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add custom field</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Field label" value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} autoFocus fullWidth />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value })}>
                {FIELD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            {newField.type === "select" && (
              <TextField label="Options (comma separated)" value={newField.options} onChange={(e) => setNewField({ ...newField, options: e.target.value })} fullWidth placeholder="Hot, Warm, Cold" />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={addField}>Add Field</Button>
        </DialogActions>
      </Dialog>

      {/* Manage board access dialog (admin only) */}
      <Dialog open={memberDialog} onClose={() => setMemberDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Manage board access</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {allUsers.map((u) => {
              const member = board.members.find((m) => m.user._id === u._id);
              return (
                <Stack key={u._id} direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                  <Avatar src={u.avatar} sx={{ width: 32, height: 32 }}>{u.name?.[0]}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <Select
                      value={member?.accessLevel || "none"}
                      onChange={(e) => {
                        if (e.target.value === "none") revokeAccess(u._id);
                        else grantAccess(u._id, e.target.value);
                      }}
                    >
                      <MenuItem value="none">No access</MenuItem>
                      <MenuItem value="viewer">Viewer</MenuItem>
                      <MenuItem value="editor">Editor</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialog(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
