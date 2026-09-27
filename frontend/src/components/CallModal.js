import { useEffect, useRef, useState } from "react";
import { Dialog, Box, Avatar, Typography, IconButton, Stack, Slide } from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallIcon from "@mui/icons-material/Call";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const Transition = (props) => <Slide direction="up" {...props} />;

// Handles both outgoing calls (open=true, peerUser passed in) and incoming
// calls (driven by SocketContext's `incomingCall`). One component, one peer connection.
export default function CallModal({ open, onClose, peerUser, callType, callId, isIncoming, conversationId }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [status, setStatus] = useState(isIncoming ? "ringing-incoming" : "ringing-outgoing");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(callType !== "video");
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function setup() {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc:ice-candidate", { toUserId: peerUser._id, callId, candidate: e.candidate });
        }
      };
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("connected");
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) handleEnd(false);
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      if (cancelled) return;
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (!isIncoming) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { toUserId: peerUser._id, callId, sdp: offer });
        socket.emit("call:invite", { toUserId: peerUser._id, callId, callType, conversationId });
      }
    }
    setup();

    const onOffer = async ({ callId: cid, sdp, from }) => {
      if (cid !== callId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("webrtc:answer", { toUserId: from, callId, sdp: answer });
    };
    const onAnswer = async ({ callId: cid, sdp }) => {
      if (cid !== callId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    };
    const onIce = async ({ callId: cid, candidate }) => {
      if (cid !== callId || !pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (e) {}
    };
    const onAccepted = () => setStatus("connected");
    const onDeclined = () => handleEnd(false);
    const onEnded = () => handleEnd(false);

    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice-candidate", onIce);
    socket.on("call:accepted", onAccepted);
    socket.on("call:declined", onDeclined);
    socket.on("call:ended", onEnded);

    return () => {
      cancelled = true;
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice-candidate", onIce);
      socket.off("call:accepted", onAccepted);
      socket.off("call:declined", onDeclined);
      socket.off("call:ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (status === "connected") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  function cleanupMedia() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    clearInterval(timerRef.current);
  }

  function handleAccept() {
    setStatus("connecting");
    socket.emit("call:accept", { toUserId: peerUser._id, callId });
  }

  function handleDecline() {
    socket.emit("call:decline", { toUserId: peerUser._id, callId });
    cleanupMedia();
    onClose({ status: "declined", duration: 0 });
  }

  function handleEnd(notify = true) {
    if (notify) socket.emit("call:end", { toUserId: peerUser._id, callId });
    const finalDuration = duration;
    cleanupMedia();
    onClose({ status: finalDuration > 0 ? "completed" : "missed", duration: finalDuration });
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }

  function toggleVideo() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoOff(!track.enabled);
    }
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Dialog fullScreen open={open} TransitionComponent={Transition} PaperProps={{ sx: { bgcolor: "#14162A" } }}>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", color: "#fff" }}>
        {callType === "video" && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#0B0C1A" }}
          />
        )}

        {callType === "video" && (
          <Box sx={{ position: "absolute", top: 24, right: 24, width: 160, height: 120, borderRadius: 2, overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)" }}>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>
        )}

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          {(callType !== "video" || status !== "connected") && (
            <>
              <Avatar src={peerUser?.avatar} sx={{ width: 120, height: 120, fontSize: 44, mb: 3, bgcolor: "primary.main" }}>
                {peerUser?.name?.[0]}
              </Avatar>
              <Typography variant="h5" fontWeight={700}>{peerUser?.name}</Typography>
            </>
          )}
          <Typography sx={{ mt: 1, opacity: 0.7 }}>
            {status === "ringing-outgoing" && "Calling…"}
            {status === "ringing-incoming" && `Incoming ${callType} call…`}
            {status === "connecting" && "Connecting…"}
            {status === "connected" && fmt(duration)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={3} justifyContent="center" sx={{ pb: 6, zIndex: 1 }}>
          {status === "ringing-incoming" ? (
            <>
              <IconButton onClick={handleDecline} sx={{ bgcolor: "error.main", color: "#fff", width: 64, height: 64, "&:hover": { bgcolor: "error.dark" } }}>
                <CallEndIcon />
              </IconButton>
              <IconButton onClick={handleAccept} sx={{ bgcolor: "success.main", color: "#fff", width: 64, height: 64, "&:hover": { bgcolor: "success.dark" } }}>
                <CallIcon />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton onClick={toggleMute} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", width: 56, height: 56 }}>
                {muted ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
              {callType === "video" && (
                <IconButton onClick={toggleVideo} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", width: 56, height: 56 }}>
                  {videoOff ? <VideocamOffIcon /> : <VideocamIcon />}
                </IconButton>
              )}
              <IconButton onClick={() => handleEnd(true)} sx={{ bgcolor: "error.main", color: "#fff", width: 64, height: 64, "&:hover": { bgcolor: "error.dark" } }}>
                <CallEndIcon />
              </IconButton>
            </>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}
