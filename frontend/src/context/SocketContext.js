import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); // { callId, callType, from, conversationId }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) return;

    const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("call:incoming", (payload) => setIncomingCall(payload));
    socket.on("call:declined", () => setIncomingCall(null));
    socket.on("call:ended", () => setIncomingCall(null));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, connected, incomingCall, setIncomingCall }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
