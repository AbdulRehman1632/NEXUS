import { useEffect, useRef, useState } from "react";
import {
  Box, Stack, Avatar, Typography, TextField, IconButton, List, ListItemButton,
  ListItemAvatar, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Checkbox, Badge, Paper, Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CallIcon from "@mui/icons-material/Call";
import VideocamIcon from "@mui/icons-material/Videocam";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import GroupsIcon from "@mui/icons-material/Groups";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import CallModal from "../components/CallModal";

export default function Chat() {
  const { user } = useAuth();
  const { socket, incomingCall, setIncomingCall } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeCall, setActiveCall] = useState(null); // { peerUser, callType, callId, isIncoming }
  const scrollRef = useRef(null);

  const loadConversations = () => api.get("/conversations").then((res) => setConversations(res.data));

  useEffect(() => {
    loadConversations();
    api.get("/users").then((res) => setAllUsers(res.data));
  }, []);

  useEffect(() => {
    if (!active || !socket) return;
    socket.emit("conversation:join", active._id);
    api.get(`/messages/${active._id}`).then((res) => setMessages(res.data));
    return () => socket.emit("conversation:leave", active._id);
  }, [active, socket]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (msg) => {
      if (active && msg.conversation === active._id) setMessages((prev) => [...prev, msg]);
      loadConversations();
    };
    socket.on("message:new", onNew);
    return () => socket.off("message:new", onNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const otherUser = (convo) => convo.members.find((m) => m._id !== user._id);

  const send = async () => {
    if (!text.trim() || !active) return;
    const res = await api.post("/messages", { conversation: active._id, content: text, type: "text" });
    setMessages((prev) => [...prev, res.data]);
    socket.emit("message:send", { conversationId: active._id, message: res.data });
    setText("");
    loadConversations();
  };

  const openDirect = async (u) => {
    const res = await api.post("/conversations/direct", { userId: u._id });
    setActive(res.data);
    loadConversations();
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    const res = await api.post("/conversations/group", { name: groupName, memberIds: selectedIds });
    setGroupDialog(false);
    setGroupName("");
    setSelectedIds([]);
    setActive(res.data);
    loadConversations();
  };

  const startCall = (callType) => {
    if (active.isGroup) return; // MVP: 1:1 calling; group calls would fan out call:invite per member
    const peer = otherUser(active);
    const callId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setActiveCall({ peerUser: peer, callType, callId, isIncoming: false, conversationId: active._id });
  };

  const onCallClose = async ({ status, duration }) => {
    if (active) {
      const res = await api.post("/messages", {
        conversation: active._id,
        type: "call_log",
        callType: activeCall?.callType || incomingCall?.callType,
        callStatus: status,
        callDurationSec: duration,
      });
      setMessages((prev) => [...prev, res.data]);
    }
    setActiveCall(null);
    setIncomingCall(null);
  };

  // When an incoming call arrives, resolve which conversation/user it belongs to
  useEffect(() => {
    if (!incomingCall) return;
    setActiveCall({
      peerUser: incomingCall.from,
      callType: incomingCall.callType,
      callId: incomingCall.callId,
      isIncoming: true,
      conversationId: incomingCall.conversationId,
    });
  }, [incomingCall]);

  return (
    <Box sx={{ height: "calc(100vh - 130px)", display: "flex", border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" }}>
      {/* Sidebar: conversations + directory */}
      <Box sx={{ width: 320, borderRight: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800}>Messages</Typography>
          <Tooltip title="New group">
            <IconButton onClick={() => setGroupDialog(true)}><GroupAddIcon /></IconButton>
          </Tooltip>
        </Stack>
        <Divider />
        <List sx={{ overflow: "auto", flex: 1 }}>
          {conversations.map((c) => {
            const other = c.isGroup ? null : otherUser(c);
            return (
              <ListItemButton key={c._id} selected={active?._id === c._id} onClick={() => setActive(c)}>
                <ListItemAvatar>
                  <Badge overlap="circular" variant={!c.isGroup && other?.isOnline ? "dot" : undefined} color="success" anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                    <Avatar sx={{ bgcolor: c.isGroup ? "secondary.main" : "primary.main" }}>
                      {c.isGroup ? <GroupsIcon /> : other?.name?.[0]}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <MuiListItemTextSafe primary={c.isGroup ? c.name : other?.name} secondary={c.lastMessage?.content || (c.lastMessage?.type === "call_log" ? "Call" : "Say hello 👋")} />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <Typography variant="caption" sx={{ px: 2, pt: 1, color: "text.secondary" }}>Team directory</Typography>
        <List sx={{ maxHeight: 200, overflow: "auto" }}>
          {allUsers.map((u) => (
            <ListItemButton key={u._id} onClick={() => openDirect(u)} dense>
              <ListItemAvatar><Avatar sx={{ width: 28, height: 28, fontSize: 12 }} src={u.avatar}>{u.name?.[0]}</Avatar></ListItemAvatar>
              <MuiListItemTextSafe primary={u.name} secondary={u.role} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Active conversation */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {active ? (
          <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: active.isGroup ? "secondary.main" : "primary.main" }}>
                  {active.isGroup ? <GroupsIcon /> : otherUser(active)?.name?.[0]}
                </Avatar>
                <Typography fontWeight={700}>{active.isGroup ? active.name : otherUser(active)?.name}</Typography>
              </Stack>
              {!active.isGroup && (
                <Stack direction="row" spacing={1}>
                  <IconButton color="primary" onClick={() => startCall("voice")}><CallIcon /></IconButton>
                  <IconButton color="primary" onClick={() => startCall("video")}><VideocamIcon /></IconButton>
                </Stack>
              )}
            </Stack>

            <Box ref={scrollRef} sx={{ flex: 1, overflow: "auto", p: 2, bgcolor: "#FAFBFD" }}>
              {messages.map((m) => {
                const mine = m.sender._id === user._id;
                return (
                  <Stack key={m._id} direction="row" justifyContent={mine ? "flex-end" : "flex-start"} sx={{ mb: 1.5 }}>
                    {m.type === "call_log" ? (
                      <Paper variant="outlined" sx={{ px: 2, py: 1, borderRadius: 3, bgcolor: "#FFF7ED", display: "flex", alignItems: "center", gap: 1 }}>
                        {m.callType === "video" ? <VideocamIcon fontSize="small" /> : <CallIcon fontSize="small" />}
                        <Typography variant="body2">
                          {m.callStatus === "missed" ? "Missed call" : `${m.callType === "video" ? "Video" : "Voice"} call · ${Math.floor(m.callDurationSec / 60)}m ${m.callDurationSec % 60}s`}
                        </Typography>
                      </Paper>
                    ) : (
                      <Paper elevation={0} sx={{ px: 2, py: 1, borderRadius: 3, maxWidth: "60%", bgcolor: mine ? "primary.main" : "#EEF0F6", color: mine ? "#fff" : "text.primary" }}>
                        <Typography variant="body2">{m.content}</Typography>
                      </Paper>
                    )}
                  </Stack>
                );
              })}
            </Box>

            <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <TextField
                fullWidth size="small" placeholder="Type a message…" value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <IconButton color="primary" onClick={send}><SendIcon /></IconButton>
            </Stack>
          </>
        ) : (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography color="text.secondary">Select a conversation to start messaging</Typography>
          </Box>
        )}
      </Box>

      {/* New group dialog */}
      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create a group</DialogTitle>
        <DialogContent>
          <TextField label="Group name" fullWidth value={groupName} onChange={(e) => setGroupName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <Typography variant="caption" color="text.secondary">Add members</Typography>
          <List dense sx={{ maxHeight: 260, overflow: "auto" }}>
            {allUsers.map((u) => (
              <ListItemButton key={u._id} onClick={() => setSelectedIds((prev) => prev.includes(u._id) ? prev.filter((id) => id !== u._id) : [...prev, u._id])}>
                <Checkbox edge="start" checked={selectedIds.includes(u._id)} />
                <ListItemAvatar><Avatar sx={{ width: 28, height: 28 }} src={u.avatar}>{u.name?.[0]}</Avatar></ListItemAvatar>
                <MuiListItemTextSafe primary={u.name} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={createGroup}>Create Group</Button>
        </DialogActions>
      </Dialog>

      {activeCall && (
        <CallModal
          open={Boolean(activeCall)}
          peerUser={activeCall.peerUser}
          callType={activeCall.callType}
          callId={activeCall.callId}
          isIncoming={activeCall.isIncoming}
          conversationId={activeCall.conversationId}
          onClose={onCallClose}
        />
      )}
    </Box>
  );
}

// Small wrapper so a missing secondary string doesn't crash MUI's typography
function MuiListItemTextSafe({ primary, secondary }) {
  return <ListItemText primary={primary} secondary={secondary} />;
}
