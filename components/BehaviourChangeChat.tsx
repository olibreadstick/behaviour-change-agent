import React, { useEffect, useRef, useState } from "react";
import { logUsageEvent } from "../utils/usageTracking";

import { sendBehaviourChangeMessage } from "../services/behaviourChange";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface N8nResponse {
  chat_response: string;
  quick_reply_options?: string[];
}

interface BehaviourChangeChatProps {
  userId: string;
}

interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  quickReplies: string[];
  started: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SavedChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
}

type PenguinBodyColour =
  | "blue"
  | "pink"
  | "purple"
  | "green"
  | "red";

type GlassesColour =
  | "none"
  | "sky"
  | "pink"
  | "purple"
  | "green"
  | "red";

interface PenguinCustomization {
  bodyColour: PenguinBodyColour;
  glassesColour: GlassesColour;
}

const PENGUIN_IMAGES: Record<PenguinBodyColour, string> = {
  blue: "/behaviour-logo.png",
  pink: "/penguin-pink.png",
  purple: "/penguin-purple.png",
  green: "/penguin-green.png",
  red: "/penguin-red.png",
};

const GLASSES_COLOURS = [
  { id: "sky", value: "#38bdf8" },
  { id: "pink", value: "#f472b6" },
  { id: "purple", value: "#a78bfa" },
  { id: "green", value: "#4ade80" },
  { id: "red", value: "#ef4444" },
] as const;



const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  text: "Hi! I'm Tie, your Daily Coach!",
};

const MENU_MESSAGES = new Set([
  "Hi!",
  "Goal Setting",
  "Action Planning & Problem Solving",
  "Self-Monitoring",
  "I need support with something else",
]);

const BCT_RESOURCE_LINKS: Record<string, string> = {
  "Goal Setting": "/resources/goal-setting.pdf",

  "Action Planning & Problem Solving":
    "/resources/action-planning-problem-solving.pdf",

  "Self-Monitoring": "/resources/self-monitoring.pdf",

  "Talking to Yourself About Physical Activity":
    "/resources/talking-to-yourself-about-physical-activity.pdf",
};

const createConversation = (): Conversation => {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    title: "New conversation",
    messages: [INITIAL_GREETING],
    quickReplies: [],
    started: false,
    createdAt: now,
    updatedAt: now,
  };
};

const makeConversationTitle = (message: string) => {
  const cleaned = message.replace(/\s+/g, " ").trim();

  if (!cleaned || MENU_MESSAGES.has(cleaned)) {
    return null;
  }

  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
};


const PenguinLogo = ({
  customization,
  size = "desktop",
}: {
  customization: PenguinCustomization;
  size?: "desktop" | "mobile";
}) => {
  const glassesColour =
    customization.glassesColour === "none"
      ? undefined
      : GLASSES_COLOURS.find(
          (colour) =>
            colour.id === customization.glassesColour
        )?.value;

  const sizeClasses =
    size === "mobile"
      ? "w-24 h-24"
      : "w-20 h-20";

  return (
    <div className={`relative ${sizeClasses} shrink-0`}>
      <img
        src={
          PENGUIN_IMAGES[
            customization.bodyColour
          ]
        }
        alt="Daily Coach"
        className="absolute inset-0 w-full h-full object-contain"
      />

      {customization.glassesColour !== "none" && (
        <div className="absolute top-[25%] left-1/2 -translate-x-1/2 flex items-center">
          <div
            className="w-4 h-3 rounded-full border-2 bg-white/20"
            style={{
              borderColor: glassesColour,
            }}
          />

          <div
            className="w-2 h-[2px]"
            style={{
              backgroundColor: glassesColour,
            }}
          />

          <div
            className="w-4 h-3 rounded-full border-2 bg-white/20"
            style={{
              borderColor: glassesColour,
            }}
          />
        </div>
      )}
    </div>
  );
};


const BehaviourChangeChat: React.FC<BehaviourChangeChatProps> = ({
  userId,
}) => {
  const chatStorageKey = `behaviour_change_chat_${userId}`;

  const [penguinCustomization, setPenguinCustomization] =
  useState<PenguinCustomization>({
    bodyColour: "blue",
    glassesColour: "none",
  });

  const [chatState, setChatState] = useState<SavedChatState>(() => {
    const saved = localStorage.getItem(chatStorageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // New multi-conversation format
        if (Array.isArray(parsed.conversations)) {
          return {
            conversations: parsed.conversations,
            activeConversationId:
              parsed.activeConversationId ??
              parsed.conversations[0]?.id ??
              null,
          };
        }

        // Migrate the old single-conversation format if it exists
        if (Array.isArray(parsed.messages)) {
          const now = new Date().toISOString();
          const oldSessionId =
            localStorage.getItem(
              `behaviour_change_session_${userId}`
            ) ?? crypto.randomUUID();

          const migratedConversation: Conversation = {
            id: crypto.randomUUID(),
            sessionId: oldSessionId,
            title: "Previous conversation",
            messages:
              parsed.messages.length > 0
                ? parsed.messages
                : [INITIAL_GREETING],
            quickReplies: parsed.quickReplies ?? [],
            started: parsed.started ?? false,
            createdAt: now,
            updatedAt: now,
          };

          return {
            conversations: [migratedConversation],
            activeConversationId: migratedConversation.id,
          };
        }
      } catch {
        // Fall through and create a new conversation
      }
    }

    const firstConversation = createConversation();

    return {
      conversations: [firstConversation],
      activeConversationId: firstConversation.id,
    };
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation =
    chatState.conversations.find(
      (conversation) =>
        conversation.id === chatState.activeConversationId
    ) ?? null;

    useEffect(() => {
  const saved = localStorage.getItem(
    `behaviour_change_penguin_${userId}`
  );

  if (!saved) {
    setPenguinCustomization({
      bodyColour: "blue",
      glassesColour: "none",
    });

    return;
  }

  try {
    const parsed = JSON.parse(saved);

    setPenguinCustomization({
      bodyColour: parsed.bodyColour || "blue",
      glassesColour: parsed.glassesColour || "none",
    });
  } catch {
    setPenguinCustomization({
      bodyColour: "blue",
      glassesColour: "none",
    });
  }
}, [userId]);

  const messages = activeConversation?.messages ?? [];
  const quickReplies = [
      ...(activeConversation?.quickReplies ?? []),
    ].sort((a, b) => {
      const aIsLearn = a.toLowerCase().includes("learn");
      const bIsLearn = b.toLowerCase().includes("learn");

      if (aIsLearn && !bIsLearn) return -1;
      if (!aIsLearn && bIsLearn) return 1;

      return 0;
    });
  const started = activeConversation?.started ?? false;

  const updateConversationById = (
    conversationId: string,
    updater: (conversation: Conversation) => Conversation
  ) => {
    setChatState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) =>
        conversation.id === conversationId
          ? updater(conversation)
          : conversation
      ),
    }));
  };

  const updateActiveConversation = (
    updater: (conversation: Conversation) => Conversation
  ) => {
    if (!chatState.activeConversationId) {
      return;
    }

    updateConversationById(
      chatState.activeConversationId,
      updater
    );
  };

  // =========================
  // VOICE TO TEXT
  // =========================

  const recognitionRef = useRef<any>(null);
  const spokenBaseRef = useRef("");
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-CA";

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed") {
        setError(
          "Microphone access was blocked. Please allow microphone access in your browser."
        );
      } else if (event.error === "no-speech") {
        setError("No speech was detected. Please try again.");
      } else {
        setError(
          "Voice input could not be started. Please try again."
        );
      }
    };

    recognition.onresult = (event: any) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      const existingText = spokenBaseRef.current.trim();

      setInput(
        `${existingText}${existingText ? " " : ""}${transcript}`.trim()
      );
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const toggleVoiceInput = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    spokenBaseRef.current = input;

    try {
      recognition.start();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // END VOICE TO TEXT
  // =========================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem(
      chatStorageKey,
      JSON.stringify(chatState)
    );
  }, [chatState, chatStorageKey]);

  useEffect(() => {
  const textarea = messageInputRef.current;

  if (!textarea) return;

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}, [input]);

  const createNewConversation = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    const newConversation = createConversation();

    setChatState((previous) => ({
      conversations: [
        newConversation,
        ...previous.conversations,
      ],
      activeConversationId: newConversation.id,
    }));

    setInput("");
    setError("");
  };

  const openConversation = (conversationId: string) => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    setChatState((previous) => ({
      ...previous,
      activeConversationId: conversationId,
    }));

    setInput("");
    setError("");
  };

  const handleLearnBct = () => {
  const selectedBctMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "user" &&
        BCT_RESOURCE_LINKS[message.text]
    );

  if (!selectedBctMessage) {
    setError(
      "I couldn't determine which BCT resource to open."
    );
    return;
  }

  const resourceUrl =
    BCT_RESOURCE_LINKS[selectedBctMessage.text];

   logUsageEvent(
  userId,
  "resource_opened",
  {
    resource: selectedBctMessage.text,
    source: "ai_coach",
  }
); 

  window.open(
    resourceUrl,
    "_blank",
    "noopener,noreferrer"
  );
};

const handleQuickReply = (option: string) => {
  const normalizedOption = option.trim().toLowerCase();

  if (normalizedOption.includes("learn")) {
    handleLearnBct();
    return;
  }

  sendMessage(option);
};


  const sendMessage = async (message: string) => {
    const trimmedMessage = message.trim();

    if (
      !trimmedMessage ||
      loading ||
      !activeConversation
    ) {
      return;
    }

    if (trimmedMessage.toLowerCase() !== "hi!") {
      logUsageEvent(
        userId,
        "coach_interaction",
        {
          conversationId: activeConversation.id,
        }
      );
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    const conversationId = activeConversation.id;
    const conversationSessionId = activeConversation.sessionId;

    try {
      setLoading(true);
      setError("");

      updateConversationById(
        conversationId,
        (conversation) => {
          const nextTitle =
            conversation.title === "New conversation"
              ? makeConversationTitle(trimmedMessage) ??
                conversation.title
              : conversation.title;

          return {
            ...conversation,
            title: nextTitle,
            quickReplies: [],
            messages: [
              ...conversation.messages,
              {
                role: "user",
                text: trimmedMessage,
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        }
      );

      const result = (await sendBehaviourChangeMessage(
        conversationSessionId,
        trimmedMessage
      )) as N8nResponse;

      updateConversationById(
        conversationId,
        (conversation) => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              role: "assistant",
              text: result.chat_response,
            },
          ],
          quickReplies: result.quick_reply_options ?? [],
          updatedAt: new Date().toISOString(),
        })
      );

      setInput("");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async () => {
    if (!activeConversation) {
      return;
    }

    const conversationId = activeConversation.id;

    updateConversationById(
      conversationId,
      (conversation) => ({
        ...conversation,
        started: true,
        updatedAt: new Date().toISOString(),
      })
    );

    await sendMessage("Hi!");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };
  

  return (
    <div className="h-full p-6 bg-sky-50">
      {/* Mobile conversation overlay */}
{historyOpen && (
  <div
    className="md:hidden fixed inset-0 bg-black/30 z-[70]"
    onClick={() => setHistoryOpen(false)}
  />
)}

{/* Mobile conversation history */}
<div
  className={`md:hidden fixed top-0 left-0 h-full w-[85%] max-w-sm bg-white z-[80] shadow-2xl transition-transform duration-300 ${
    historyOpen ? "translate-x-0" : "-translate-x-full"
  }`}
>
  <div className="h-full flex flex-col p-5">

    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-lg font-black text-slate-900">
          Conversations
        </h2>

        <p className="text-xs text-slate-400">
          Your previous AI Coach chats
        </p>
      </div>

      <button
        onClick={() => setHistoryOpen(false)}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
        aria-label="Close conversations"
      >
        ×
      </button>
    </div>

    {/* New Conversation */}
    <button
      onClick={() => {
        createNewConversation();
        setHistoryOpen(false);
      }}
      disabled={loading}
      className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm py-3 rounded-xl mb-5 disabled:opacity-50"
    >
      + New conversation
    </button>

    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">
      Past conversations
    </p>

    {/* Conversation List */}
    <div className="flex-1 overflow-y-auto space-y-2">
      {chatState.conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => {
            openConversation(conversation.id);
            setHistoryOpen(false);
          }}
          className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
            chatState.activeConversationId === conversation.id
              ? "bg-sky-100 text-sky-800"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <p className="text-sm font-bold truncate">
            {conversation.title}
          </p>

          <p className="text-xs text-slate-400 mt-1">
            {new Date(conversation.updatedAt).toLocaleDateString()}
          </p>
        </button>
      ))}
    </div>

  </div>
</div>
      <div className="h-full max-w-6xl mx-auto flex gap-4">
        {/* Conversation history */}
        <aside className="w-72 shrink-0 bg-white rounded-3xl shadow-lg overflow-hidden hidden md:flex md:flex-col">
          <div className="p-4 border-b border-sky-100">
            <button
              onClick={createNewConversation}
              disabled={loading}
              className="w-full bg-sky-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-sky-600 disabled:opacity-50"
            >
              + New conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 px-2 pb-2">
              Past conversations
            </p>

            <div className="space-y-2">
              {chatState.conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() =>
                    openConversation(conversation.id)
                  }
                  className={`w-full text-left px-3 py-3 rounded-xl transition ${
                    conversation.id ===
                    chatState.activeConversationId
                      ? "bg-sky-100 text-sky-950"
                      : "text-slate-700 hover:bg-sky-50"
                  }`}
                >
                  <div className="font-medium truncate">
                    {conversation.title}
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(
                      conversation.updatedAt
                    ).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Active chat */}
        <div className="bg-white rounded-3xl shadow-lg flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Daily Coach Header */}
      <div className="border-b border-sky-200 bg-sky-200">

        {/* ========================= */}
        {/* DESKTOP HEADER */}
        {/* ========================= */}
        <div className="hidden md:flex items-center gap-4 p-6">

        

          <div>
            <h1 className="text-2xl font-bold text-sky-950">
              Daily Coach
            </h1>

            <p className="text-sky-700 mt-1">
              Get support with your physical activity goals whenever you need it.
            </p>
          </div>
          <PenguinLogo
            customization={penguinCustomization}
            size="desktop"
          />

        </div>


        {/* ========================= */}
        {/* MOBILE HEADER */}
        {/* ========================= */}
        <div className="md:hidden p-4">

            {/* Mobile Header */}
        <div className="md:hidden p-4">

          {/* Title + Penguin */}
          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-sky-950">
                Daily Coach
              </h1>

              <p className="text-sky-700 mt-1 text-sm leading-relaxed">
                Get support with your physical activity
                <br />
                goals whenever you need it.
              </p>
            </div>

            <PenguinLogo
              customization={penguinCustomization}
              size="mobile"
            />

          </div>

          {/* Mobile Buttons */}
          <div className="flex gap-3 mt-4">

            <button
              onClick={() => setHistoryOpen(true)}
              className="flex-1 bg-white text-sky-700 border border-sky-300 px-3 py-3 rounded-xl text-sm font-semibold"
            >
              ☰ Chats
            </button>

            <button
              onClick={createNewConversation}
              disabled={loading}
              className="flex-1 bg-white text-sky-700 border border-sky-300 px-3 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              + New
            </button>

          </div>

        </div>

        </div>

      </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-sky-500 text-white"
                      : "bg-sky-50 text-sky-950 border border-sky-100"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-sky-50 text-sky-600 border border-sky-100 rounded-2xl px-4 py-3">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {quickReplies.length > 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {quickReplies.map((option) => (
                <button
                  key={option}
                  onClick={() => handleQuickReply(option)}
                  disabled={loading}
                  className="border border-sky-400 text-sky-700 px-4 py-2 rounded-full hover:bg-sky-100 disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {!started ? (
            <div className="border-t border-slate-200 p-6">
              <button
                onClick={startConversation}
                disabled={loading}
                className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl hover:bg-sky-600 disabled:opacity-50"
              >
                Start conversation
              </button>
            </div>
          ) : (
            <div className="border-t border-slate-200">
              {isListening && (
                <div className="px-4 pt-3 flex items-center gap-2 text-sm font-medium text-sky-600">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Listening...
                </div>
              )}

              <form
                  onSubmit={handleSubmit}
                  className="p-3 md:p-4 flex items-end gap-2 md:gap-3"
                >
                  <textarea
                    ref={messageInputRef}
                    value={input}
                    rows={1}
                    onChange={(event) =>
                      setInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();

                        if (
                          input.trim() &&
                          !loading &&
                          quickReplies.length === 0
                        ) {
                          event.currentTarget.form?.requestSubmit();
                        }
                      }
                    }}
                    placeholder={
                      isListening
                        ? "Listening..."
                        : "Type your message..."
                    }
                    disabled={
                      loading || quickReplies.length > 0
                    }
                    className="
                      flex-1
                      min-w-0
                      min-h-[48px]
                      max-h-32
                      md:max-h-40
                      resize-none
                      overflow-y-auto
                      border
                      border-sky-200
                      rounded-xl
                      px-3
                      md:px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-sky-300
                      disabled:bg-sky-50
                    "
                  />

                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    disabled={
                      loading ||
                      quickReplies.length > 0
                    }
                    aria-label={
                      isListening
                        ? "Stop voice input"
                        : "Start voice input"
                    }
                    title={
                      isListening
                        ? "Stop listening"
                        : "Use voice input"
                    }
                    className={`w-11 h-11 md:w-12 md:h-12 shrink-0 flex items-center justify-center rounded-xl border transition-all disabled:opacity-50 ${
                      isListening
                        ? "bg-red-50 border-red-300 text-red-600"
                        : "bg-sky-50 border-sky-200 text-sky-600 hover:bg-sky-100"
                    }`}
                  >
                    {isListening ? (
                      <span className="text-lg">■</span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line
                          x1="12"
                          x2="12"
                          y1="19"
                          y2="22"
                        />
                      </svg>
                    )}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    quickReplies.length > 0 ||
                    !input.trim()
                  }
                  className="shrink-0 bg-sky-500 text-white px-3 md:px-5 py-3 rounded-xl font-semibold text-sm md:text-base hover:bg-sky-600 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BehaviourChangeChat;