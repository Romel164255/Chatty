import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function Chat({ onLogout }) {
  const [activeConversation, setActiveConversation] = useState(null);
  const [activeTitle, setActiveTitle] = useState("");

  function handleSelect(id, title) {
    setActiveConversation(id);
    setActiveTitle(title);
  }

  return (
    <div style={s.app}>
      <Sidebar
        activeConversationId={activeConversation}
        onSelect={handleSelect}
        onLogout={onLogout}
      />
      <ChatWindow conversationId={activeConversation} title={activeTitle} />
    </div>
  );
}

const s = {
  app: { display:"flex", height:"100vh", overflow:"hidden", background:"var(--bg-app)" },
};
