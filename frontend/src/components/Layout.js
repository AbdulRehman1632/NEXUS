import { useState } from "react";
import { Outlet, useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, AppBar,
  Typography, Avatar, IconButton, Menu, MenuItem, Divider, Chip, Badge,
} from "@mui/material";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const DRAWER_WIDTH = 240;

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const nav = [
    { label: "Boards", icon: <SpaceDashboardIcon />, path: "/" },
    { label: "Messages", icon: <ChatBubbleOutlineIcon />, path: "/chat" },
  ];
  if (user?.role === "admin") nav.push({ label: "Admin", icon: <AdminPanelSettingsIcon />, path: "/admin" });

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box", bgcolor: "#161A2E", color: "#fff", border: "none" },
        }}
      >
        <Toolbar sx={{ px: 3 }}>
          <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: 0.5 }}>
            ⬡ Nexus
          </Typography>
        </Toolbar>
        <List sx={{ px: 1.5, mt: 1 }}>
          {nav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                component={RouterLink}
                to={item.path}
                selected={active}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  color: active ? "#fff" : "rgba(255,255,255,0.65)",
                  "&.Mui-selected": { bgcolor: "primary.main", "&:hover": { bgcolor: "primary.main" } },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>{item.icon}</ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
        <Box sx={{ mt: "auto", p: 2 }}>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 2 }} />
          <Chip
            size="small"
            label={connected ? "Connected" : "Offline"}
            color={connected ? "success" : "default"}
            sx={{ color: "#fff", bgcolor: connected ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)" }}
          />
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar position="static" color="transparent" sx={{ bgcolor: "background.paper" }}>
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            <Chip
              size="small"
              label={user?.role === "admin" ? "Admin" : "Member"}
              color={user?.role === "admin" ? "primary" : "default"}
              sx={{ mr: 2 }}
            />
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Badge overlap="circular" anchorOrigin={{ vertical: "bottom", horizontal: "right" }} badgeContent=" " color="success" sx={{ "& .MuiBadge-badge": { boxShadow: "0 0 0 2px #fff" } }}>
                <Avatar src={user?.avatar} sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>{user?.name?.[0]}</Avatar>
              </Badge>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>{user?.name}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { logout(); navigate("/login"); }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Log out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, p: 3, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
