import React, { useEffect, useRef, useState } from "react";

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

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  text: "Hi! I'm your Behaviour Change Agent.",
};

const MENU_MESSAGES = new Set([
  "Hi!",
  "Goal Setting",
  "Action Planning & Problem Solving",
  "Self-Monitoring",
  "I need support with something else",
]);

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

const BehaviourChangeChat: React.FC<BehaviourChangeChatProps> = ({
  userId,
}) => {
  const chatStorageKey = `behaviour_change_chat_${userId}`;

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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation =
    chatState.conversations.find(
      (conversation) =>
        conversation.id === chatState.activeConversationId
    ) ?? null;

  const messages = activeConversation?.messages ?? [];
  const quickReplies = activeConversation?.quickReplies ?? [];
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

  const sendMessage = async (message: string) => {
    const trimmedMessage = message.trim();

    if (
      !trimmedMessage ||
      loading ||
      !activeConversation
    ) {
      return;
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
          <div className="border-b border-sky-200 p-6 bg-sky-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-sky-950">
                  Behaviour Change Agent
                </h1>

                <p className="text-sky-700 mt-1">
                  Support for setting goals and building practical
                  behaviour change plans.
                </p>
              </div>

              {/* Mobile new conversation button */}
              <button
                onClick={createNewConversation}
                disabled={loading}
                className="md:hidden bg-white text-sky-700 border border-sky-300 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                + New
              </button>
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

            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {quickReplies.length > 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {quickReplies.map((option) => (
                <button
                  key={option}
                  onClick={() => sendMessage(option)}
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
                className="p-4 flex gap-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  placeholder={
                    isListening
                      ? "Listening..."
                      : "Type your message..."
                  }
                  disabled={
                    loading || quickReplies.length > 0
                  }
                  className="flex-1 border border-sky-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-300 disabled:bg-sky-50"
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
                    className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all disabled:opacity-50 ${
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
                  className="bg-sky-500 text-white px-5 py-3 rounded-xl font-semibold hover:bg-sky-600 disabled:opacity-50"
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