import { useEffect } from "react";

export default function useRealtime({ userId, onEvent }) {
  useEffect(() => {
    if (!userId) return undefined;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.addEventListener("open", () => socket.send(JSON.stringify({ type: "subscribe" })));
    socket.addEventListener("message", (event) => {
      try {
        onEvent(JSON.parse(event.data));
      } catch {
        // Ignore malformed realtime messages.
      }
    });

    return () => socket.close();
  }, [userId, onEvent]);
}
