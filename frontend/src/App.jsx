import { useEffect, useState } from "react";
import { socket } from "./socket";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.connect(); // manually connect

    socket.emit("join_room", "room1");

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
      socket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (!message) return;

    socket.emit("send_message", {
      roomId: "room1",
      content: message,
    });

    setMessage("");
  };

  return (
  <div className="chat-container">
    <div className="chat-header">PERN Chat</div>

    <div className="messages">
      {messages.map((msg, index) => (
        <div key={index} className="message">
          {msg.content}
        </div>
      ))}
    </div>

    <div className="input-area">
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  </div>
);
}

export default App;