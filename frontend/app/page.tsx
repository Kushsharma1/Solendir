"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const notionIcon = (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#fff" stroke="#000" strokeWidth="2"/>
    <text x="7" y="20" fontSize="14" fontWeight="bold" fill="#000">N</text>
  </svg>
);
const gmailIcon = (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#fff" stroke="#000" strokeWidth="2"/>
    <polyline points="4,8 14,18 24,8" fill="none" stroke="#EA4335" strokeWidth="2"/>
    <rect x="4" y="8" width="20" height="12" rx="2" fill="none" stroke="#000" strokeWidth="2"/>
  </svg>
);
const trelloIcon = (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="6" fill="#fff" stroke="#000" strokeWidth="2"/>
    <rect x="7" y="7" width="5" height="14" rx="2" fill="#0079BF"/>
    <rect x="16" y="7" width="5" height="9" rx="2" fill="#0079BF"/>
  </svg>
);

const appList = [
  { name: "Notion", icon: notionIcon, key: "notion" },
  { name: "Gmail", icon: gmailIcon, key: "gmail" },
  { name: "Trello", icon: trelloIcon, key: "trello" },
];

const defaultChat = () => ([
  { role: "assistant", content: "Hi! I'm Solendir, your company AI assistant." },
]);

// Helper to get a chat title from LLM
async function getLLMChatTitle(messages: { role: string, content: string }[]) {
  const prompt = `Given the following conversation, generate a short, relevant chat title (max 6 words):\n\n${messages.map(m => m.role + ': ' + m.content).join('\n')}\n\nTitle:`;
  const res = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: prompt }),
  });
  const data = await res.json();
  return (data.response || "New Chat").replace(/\n/g, "").slice(0, 40);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  // Chat state
  const [chats, setChats] = useState([{ id: 1, name: "New Chat", messages: defaultChat() }]);
  const [activeChat, setActiveChat] = useState(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [connections, setConnections] = useState<{ [key: string]: string }>({});
  const [connectSuccess, setConnectSuccess] = useState(false);

  // Chat input
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatAreaRef = useRef<HTMLDivElement>(null);

  // On mount, load chats from localStorage (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("solendir_chats");
      if (saved) setChats(JSON.parse(saved));
    }
  }, []);

  // Persist Notion token in localStorage and auto-reconnect
  useEffect(() => {
    const savedToken = localStorage.getItem("notion_token");
    if (savedToken && !connections["notion"]) {
      setConnections(prev => ({ ...prev, notion: savedToken }));
      fetch("http://localhost:8000/notion/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: savedToken }),
      });
    }
  }, []);

  // Persist chats in localStorage
  useEffect(() => {
    localStorage.setItem("solendir_chats", JSON.stringify(chats));
  }, [chats]);

  // Handle sending a message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date();
    const userMessage = { role: "user", content: chatInput, time: now.toISOString() };
    const updatedChats = [...chats];
    updatedChats[activeChat].messages = [
      ...updatedChats[activeChat].messages,
      userMessage,
    ];
    // If this is the first user message, set it as the chat name (summary)
    if (updatedChats[activeChat].messages.length === 2) {
      updatedChats[activeChat].name = chatInput.slice(0, 30) + (chatInput.length > 30 ? "..." : "");
    }
    setChats(updatedChats);
    setChatInput("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });
      const data = await res.json();
      const aiMessage = { role: "assistant", content: data.response, time: new Date().toISOString() };
      updatedChats[activeChat].messages = [
        ...updatedChats[activeChat].messages,
        aiMessage,
      ];
      // After first user/assistant exchange, get LLM-generated title
      if (updatedChats[activeChat].messages.length === 3) {
        getLLMChatTitle(updatedChats[activeChat].messages.slice(0, 3)).then(title => {
          updatedChats[activeChat].name = title;
          setChats([...updatedChats]);
        });
      }
      setChats([...updatedChats]);
    } catch (err) {
      updatedChats[activeChat].messages = [
        ...updatedChats[activeChat].messages,
        { role: "assistant", content: "Sorry, there was an error connecting to the backend.", time: new Date().toISOString() },
      ];
      setChats([...updatedChats]);
    } finally {
      setLoading(false);
    }
  };

  // Sidebar chat actions
  const addNewChat = () => {
    setChats([{ id: Date.now(), name: "New Chat", messages: defaultChat() }, ...chats]);
    setActiveChat(0);
  };
  const deleteChat = (idx: number) => {
    if (chats.length === 1) return;
    const newChats = chats.filter((_, i) => i !== idx);
    setChats(newChats);
    setActiveChat(0);
  };
  const selectChat = (idx: number) => setActiveChat(idx);

  // Modal logic (unchanged)
  const handleAppClick = (key: string) => {
    setSelectedApp(key);
    setApiKey("");
    setConnectSuccess(false);
  };
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setConnections((prev) => ({ ...prev, [selectedApp!]: apiKey }));
    setConnectSuccess(true);
    if (selectedApp === "notion") {
      localStorage.setItem("notion_token", apiKey);
      await fetch("http://localhost:8000/notion/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: apiKey }),
      });
    }
    setTimeout(() => {
      setIsModalOpen(false);
      setSelectedApp(null);
      setApiKey("");
      setConnectSuccess(false);
    }, 1200);
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chats, activeChat, loading]);

  return (
    <div className="flex h-screen bg-black text-white font-sans dark">
      {/* Sidebar */}
      <aside className="w-80 bg-[#111] border-r border-[#222] flex flex-col p-4 shadow-xl">
        <button
          className="mb-4 w-full py-2 px-4 rounded-lg font-semibold text-lg bg-black border border-[#333] transition rainbow-hover"
          onClick={addNewChat}
        >
          + New Chat
        </button>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat, idx) => (
            <div
              key={chat.id}
              className={`flex items-center justify-between px-3 py-2 mb-2 rounded-lg cursor-pointer transition-all ${activeChat === idx ? "bg-[#222] text-white" : "bg-[#18181b] text-gray-300 hover:bg-[#222]"}`}
              onClick={() => selectChat(idx)}
            >
              <span className="truncate max-w-[160px] font-semibold" title={chat.name}>{chat.name}</span>
              {chats.length > 1 && (
                <button
                  className="ml-2 text-gray-500 hover:text-red-400 text-lg"
                  onClick={e => { e.stopPropagation(); deleteChat(idx); }}
                  title="Delete chat"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          className="mt-4 w-full py-2 px-4 rounded-lg font-semibold text-lg bg-black border border-[#333] transition rainbow-hover"
          onClick={() => setIsModalOpen(true)}
        >
          + Add App
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col items-center justify-between px-0 py-0 relative bg-black">
        {/* Header */}
        <div className="w-full max-w-2xl mx-auto px-8 pt-10 pb-4 flex items-center gap-3">
          <span className="text-3xl font-extrabold tracking-tight">Solendir</span>
          <span className="rounded-full bg-gradient-to-r from-pink-500 via-yellow-400 to-blue-500 w-3 h-3 animate-pulse"></span>
        </div>
        {/* Chat messages */}
        <div ref={chatAreaRef} className="w-full max-w-2xl flex-1 flex flex-col px-8 overflow-y-auto" style={{scrollBehavior:'smooth'}}>
          <div className="flex flex-col gap-6 pb-8">
            {chats[activeChat].messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user"
                    ? "flex flex-row-reverse items-end gap-2 self-end max-w-[75%]"
                    : "flex items-end gap-2 self-start max-w-[75%]"
                }
              >
                {/* Avatar */}
                <div className={msg.role === "user" ? "ml-2" : "mr-2"}>
                  {msg.role === "user" ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">U</div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-black font-bold text-lg">S</div>
                  )}
                </div>
                {/* Bubble */}
                <div
                  className={
                    msg.role === "user"
                      ? "bg-gradient-to-br from-black to-gray-900 text-white px-6 py-4 rounded-2xl shadow font-medium text-lg break-words whitespace-pre-wrap"
                      : "bg-gradient-to-br from-white to-gray-200 text-black px-6 py-4 rounded-2xl shadow font-medium text-lg break-words whitespace-pre-wrap"
                  }
                  style={{ flex: 1 }}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: props => <a {...props} className="text-blue-600 underline break-all" target="_blank" rel="noopener noreferrer" />,
                        li: props => <li {...props} className="ml-4 list-disc" />,
                        strong: props => <strong {...props} className="font-bold" />,
                        p: props => <p {...props} className="mb-2" />,
                        text: ({ children }) => {
                          const urlRegex = /(https?:\/\/[^\s)]+)/g;
                          const parts = String(children).split(urlRegex);
                          return <>{parts.map((part, i) => {
                            if (urlRegex.test(part)) {
                              return <a key={i} href={part} className="text-blue-600 underline break-all" target="_blank" rel="noopener noreferrer">Link</a>;
                            }
                            return part;
                          })}</>;
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                  {/* Timestamp */}
                  <div className="text-xs text-gray-400 mt-2 text-right select-none">
                    {msg.time ? formatTime(new Date(msg.time)) : ""}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="self-start bg-gradient-to-br from-white to-gray-200 text-black px-6 py-4 rounded-2xl shadow max-w-[75%] font-medium text-lg opacity-70 animate-pulse">
                Solendir is thinking...
              </div>
            )}
          </div>
        </div>
        {/* Chat input */}
        <form className="w-full max-w-2xl flex gap-3 px-8 pb-8 sticky bottom-0 bg-black" onSubmit={sendMessage}>
          <input
            type="text"
            className="flex-1 p-4 rounded-xl border border-[#222] bg-[#18181b] text-white focus:outline-none focus:ring-2 focus:ring-white/40 placeholder:text-gray-400 text-lg"
            placeholder="Type your message..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="px-8 py-4 rounded-xl font-bold text-lg bg-black border border-[#333] transition rainbow-hover"
            disabled={loading || !chatInput.trim()}
          >
            {loading ? "..." : "Send"}
          </button>
        </form>
        {/* Modal for Add App */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-[#18181b] rounded-2xl shadow-2xl p-10 w-full max-w-md relative border border-[#333]">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedApp(null);
                  setApiKey("");
                  setConnectSuccess(false);
                }}
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="text-2xl font-bold mb-8 text-white">Connect an App</h3>
              {!selectedApp ? (
                <div className="space-y-5">
                  {appList.map(app => (
                    <button
                      key={app.key}
                      className="w-full flex items-center gap-4 p-4 border border-[#222] rounded-xl bg-black hover:bg-white/5 transition rainbow-hover"
                      onClick={() => handleAppClick(app.key)}
                    >
                      {app.icon}
                      <span className="text-lg font-semibold">{app.name}</span>
                      {connections[app.key] && (
                        <span className="ml-auto text-green-400 text-sm font-bold">Connected</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                connections[selectedApp] ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      {selectedApp === "notion" && notionIcon}
                      {selectedApp === "gmail" && gmailIcon}
                      {selectedApp === "trello" && trelloIcon}
                      <span className="text-lg font-semibold">
                        {appList.find(a => a.key === selectedApp)?.name} Connected
                      </span>
                    </div>
                    <div className="bg-[#222] text-white rounded p-3 break-all select-all">
                      API Key: {connections[selectedApp]}
                    </div>
                    <button
                      className="w-full py-3 rounded-xl font-bold text-lg bg-red-600 border border-[#333] transition hover:bg-red-700 text-white"
                      onClick={() => {
                        const newConnections = { ...connections };
                        delete newConnections[selectedApp];
                        setConnections(newConnections);
                        if (selectedApp === "notion") {
                          localStorage.removeItem("notion_token");
                        }
                        setIsModalOpen(false);
                        setSelectedApp(null);
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <form className="space-y-6" onSubmit={handleConnect}>
                    <div className="flex items-center gap-3 mb-2">
                      {selectedApp === "notion" && notionIcon}
                      {selectedApp === "gmail" && gmailIcon}
                      {selectedApp === "trello" && trelloIcon}
                      <span className="text-lg font-semibold">
                        Connect {selectedApp.charAt(0).toUpperCase() + selectedApp.slice(1)}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="w-full p-4 rounded-xl border border-[#222] bg-black text-white focus:outline-none focus:ring-2 focus:ring-white/40 placeholder:text-gray-400 text-lg"
                      placeholder={`Paste your ${selectedApp.charAt(0).toUpperCase() + selectedApp.slice(1)} API key/token here...`}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl font-bold text-lg bg-black border border-[#333] transition rainbow-hover"
                      disabled={!apiKey.trim()}
                    >
                      Connect
                    </button>
                    {connectSuccess && (
                      <div className="text-green-400 text-center font-semibold mt-2">Connected!</div>
                    )}
                  </form>
                )
              )}
            </div>
            <style jsx global>{`
              .rainbow-hover {
                background-image: linear-gradient(90deg, #ff80b5, #f9d423, #40c9ff, #ff80b5);
                background-size: 200% 200%;
                background-position: 100% 0;
                transition: background-position 0.5s, color 0.2s;
              }
              .rainbow-hover:hover {
                background-position: 0 100%;
                color: #fff !important;
                border-color: #fff !important;
              }
            `}</style>
          </div>
        )}
      </main>
    </div>
  );
}
