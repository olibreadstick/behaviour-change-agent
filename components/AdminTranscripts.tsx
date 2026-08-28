import React, { useState } from "react";

interface Account {
  id: string;
  createdAt: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
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

interface AdminTranscriptsProps {
  accounts: Account[];
}

const AdminTranscripts: React.FC<AdminTranscriptsProps> = ({
  accounts,
}) => {
  const [selectedUserId, setSelectedUserId] =
    useState<string | null>(null);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const loadUserConversations = (userId: string) => {
    const storageKey = `behaviour_change_chat_${userId}`;
    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      setConversations([]);
      setSelectedConversationId(null);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as SavedChatState;

      if (Array.isArray(parsed.conversations)) {
        const sortedConversations = [
          ...parsed.conversations,
        ].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime()
        );

        setConversations(sortedConversations);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error(
        "Unable to load conversations:",
        error
      );

      setConversations([]);
    }

    setSelectedConversationId(null);
  };

  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
    loadUserConversations(userId);
  };

  const selectedUser =
    accounts.find(
      (account) => account.id === selectedUserId
    ) ?? null;

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id === selectedConversationId
    ) ?? null;

  return (
    <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-6 border-b border-sky-100 bg-sky-50">
        <h2 className="text-xl font-bold text-sky-950">
          Chat Transcripts
        </h2>

        <p className="text-sm text-sky-700 mt-1">
          View Daily Coach conversations by participant.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_280px_1fr] min-h-[600px]">

        {/* Participants */}
        <div className="border-b lg:border-b-0 lg:border-r border-sky-100 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Participants
          </p>

          {accounts.length === 0 ? (
            <p className="text-sm text-slate-400">
              No participants found.
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => selectUser(account.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition ${
                    selectedUserId === account.id
                      ? "bg-sky-100 text-sky-950"
                      : "text-slate-600 hover:bg-sky-50"
                  }`}
                >
                  <p className="font-semibold truncate">
                    {account.id}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversations */}
        <div className="border-b lg:border-b-0 lg:border-r border-sky-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Conversations
            </p>

            {selectedUserId && (
              <button
                type="button"
                onClick={() =>
                  loadUserConversations(selectedUserId)
                }
                className="text-xs font-semibold text-sky-600 hover:text-sky-800"
              >
                Refresh
              </button>
            )}
          </div>

          {!selectedUser ? (
            <p className="text-sm text-slate-400">
              Select a participant.
            </p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-slate-400">
              No conversations found for this participant.
            </p>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() =>
                    setSelectedConversationId(
                      conversation.id
                    )
                  }
                  className={`w-full text-left px-4 py-3 rounded-xl transition ${
                    selectedConversationId ===
                    conversation.id
                      ? "bg-sky-100 text-sky-950"
                      : "bg-slate-50 text-slate-700 hover:bg-sky-50"
                  }`}
                >
                  <p className="font-semibold truncate">
                    {conversation.title}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(
                      conversation.updatedAt
                    ).toLocaleString()}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    {conversation.messages.length} messages
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="p-4 md:p-6 min-w-0">
          {!selectedConversation ? (
            <div className="h-full min-h-[300px] flex items-center justify-center">
              <div className="text-center">
                <p className="font-semibold text-slate-500">
                  Select a conversation
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  The transcript will appear here.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="pb-4 border-b border-sky-100 mb-5">
                <h3 className="text-lg font-bold text-sky-950">
                  {selectedConversation.title}
                </h3>

                <p className="text-sm text-sky-700 mt-1">
                  Participant ID: {selectedUser?.id}
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Last updated{" "}
                  {new Date(
                    selectedConversation.updatedAt
                  ).toLocaleString()}
                </p>
              </div>

              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                {selectedConversation.messages.map(
                  (message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-sky-500 text-white"
                            : "bg-sky-50 text-sky-950 border border-sky-100"
                        }`}
                      >
                        <p
                          className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${
                            message.role === "user"
                              ? "text-sky-100"
                              : "text-sky-600"
                          }`}
                        >
                          {message.role === "user"
                            ? "Participant"
                            : "Daily Coach"}
                        </p>

                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminTranscripts;