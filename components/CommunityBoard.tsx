import React, { useEffect, useState } from "react";

interface CommunityBoardProps {
  userId: string;
}


interface CommunityPost {
  id: string;
  authorId: string;
  topics: string[];
  text: string;
  createdAt: string;
  updatedAt?: string;
  helpfulBy: string[];
}

const COMMUNITY_FILTERS = [
  "Goal Setting",
  "Action Planning & Problem Solving",
  "Self-Monitoring",
  "Prompts & Cues",
  "Self-Talk",
  "Social Support",
];

const STORAGE_KEY = "behaviour_change_community_posts";

const CommunityBoard: React.FC<CommunityBoardProps> = ({
  userId,
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    try {
        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map((post) => ({
            ...post,

            topics: Array.isArray(post.topics)
            ? post.topics
            : post.category
                ? [post.category]
                : [],
        }));
        } catch {
        return [];
        }
  });

 const [selectedFilters, setSelectedFilters] =
  useState<string[]>([]);

const [newPostTopics, setNewPostTopics] =
  useState<string[]>([]);

const [editingPostId, setEditingPostId] =
  useState<string | null>(null);

const [postToDelete, setPostToDelete] =
  useState<CommunityPost | null>(null);

const toggleFilter = (filter: string) => {
  setSelectedFilters((previous) =>
    previous.includes(filter)
      ? previous.filter(
          (item) => item !== filter
        )
      : [...previous, filter]
  );
};

const toggleNewPostTopic = (topic: string) => {
  setNewPostTopics((previous) =>
    previous.includes(topic)
      ? previous.filter(
          (item) => item !== topic
        )
      : [...previous, topic]
  );
};

  const [newPostText, setNewPostText] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [showPostForm, setShowPostForm] =
    useState(false);

  useEffect(() => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(posts)
  );

  window.dispatchEvent(
    new Event(
      "behaviour-change-community-updated"
    )
  );
}, [posts]);

const filteredPosts = posts.filter((post) => {
  const normalizedSearch =
    searchQuery.trim().toLowerCase();

  const matchesSearch =
    normalizedSearch === "" ||
    post.text
      .toLowerCase()
      .includes(normalizedSearch);

  const matchesFilters =
    selectedFilters.length === 0 ||
    selectedFilters.some((filter) =>
      post.topics.includes(filter)
    );

  return matchesSearch && matchesFilters;
});

  const sortedPosts = [...filteredPosts].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

    const handleSavePost = () => {
    const trimmedText = newPostText.trim();

    if (!trimmedText) {
        return;
    }

    // EDIT EXISTING POST
    if (editingPostId) {
        setPosts((previous) =>
        previous.map((post) => {
            if (
            post.id !== editingPostId ||
            post.authorId !== userId
            ) {
            return post;
            }

            return {
            ...post,
            text: trimmedText,
            topics: newPostTopics,
            updatedAt: new Date().toISOString(),
            };
        })
        );

        setEditingPostId(null);
        setNewPostText("");
        setNewPostTopics([]);
        setShowPostForm(false);

        return;
    }

    // CREATE NEW POST
    const post: CommunityPost = {
        id: crypto.randomUUID(),
        authorId: userId,
        topics: newPostTopics,
        text: trimmedText,
        createdAt: new Date().toISOString(),
        helpfulBy: [],
    };

    setPosts((previous) => [
        post,
        ...previous,
    ]);

    setNewPostText("");
    setNewPostTopics([]);
    setShowPostForm(false);
    };

    const handleEditPost = (
        post: CommunityPost
    ) => {
        if (post.authorId !== userId) {
            return;
        }

        setEditingPostId(post.id);
        setNewPostText(post.text);
        setNewPostTopics(post.topics);
        setShowPostForm(true);
    };

    const handleCancelPostForm = () => {
        setShowPostForm(false);
        setEditingPostId(null);
        setNewPostText("");
        setNewPostTopics([]);
    };

  const handleHelpful = (postId: string) => {
    setPosts((previous) =>
      previous.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const alreadyHelpful =
          post.helpfulBy.includes(userId);

        return {
          ...post,
          helpfulBy: alreadyHelpful
            ? post.helpfulBy.filter(
                (id) => id !== userId
              )
            : [...post.helpfulBy, userId],
        };
      })
    );
  };

  const handleDeletePost = (
    postId: string
    ) => {
    setPosts((previous) =>
        previous.filter(
        (post) =>
            !(
            post.id === postId &&
            post.authorId === userId
            )
        )
    );

    setPostToDelete(null);
    };





  return (
    <div className="min-h-screen bg-sky-50 p-4 md:p-8">

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-sky-200 rounded-3xl p-6 md:p-8 mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Community
          </p>

          <h1 className="text-3xl font-bold text-sky-950 mt-2">
            Community Tips
          </h1>

          <p className="text-sky-700 mt-2 max-w-2xl">
            Share strategies that have helped you with
            physical activity and learn from what has
            worked for others.
          </p>

          <p className="text-xs text-sky-700 mt-3">
            Posts are shown anonymously to other
            participants.
          </p>
        </div>


        {/* Search */}
        <div className="bg-white border border-sky-100 rounded-2xl p-4 mb-4 shadow-sm">
        <label
            htmlFor="community-search"
            className="block text-sm font-bold text-sky-950 mb-2"
        >
            Search community tips
        </label>

        <div className="relative">
            <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            </svg>

            <input
            id="community-search"
            type="text"
            value={searchQuery}
            onChange={(event) =>
                setSearchQuery(event.target.value)
            }
            placeholder="Search by keyword..."
            className="
                w-full
                border
                border-sky-200
                rounded-xl
                pl-12
                pr-10
                py-3
                outline-none
                focus:ring-2
                focus:ring-sky-300
            "
            />

            {searchQuery && (
            <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                w-8
                h-8
                rounded-lg
                text-slate-400
                hover:text-slate-700
                hover:bg-slate-100
                "
            >
                ×
            </button>
            )}
        </div>
        </div>



        {/* Community Filters */}
<div className="bg-white border border-sky-100 rounded-2xl p-5 mb-6 shadow-sm">

  <div className="flex items-start justify-between gap-4 mb-4">
    <div>
      <p className="font-bold text-sky-950">
        Filter tips
      </p>

      <p className="text-sm text-slate-500 mt-1">
        Select all that apply.
      </p>
    </div>

    {selectedFilters.length > 0 && (
      <button
        type="button"
        onClick={() => setSelectedFilters([])}
        className="text-sm font-semibold text-sky-600 hover:text-sky-800"
      >
        Clear
      </button>
    )}
  </div>

  <div className="flex flex-wrap gap-2">
    {COMMUNITY_FILTERS.map((filter) => {
      const selected =
        selectedFilters.includes(filter);

      return (
        <button
          key={filter}
          type="button"
          onClick={() => toggleFilter(filter)}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
            selected
              ? "bg-sky-500 border-sky-500 text-white"
              : "bg-white border-sky-200 text-sky-700 hover:bg-sky-50"
          }`}
        >
          {filter}
        </button>
      );
    })}
  </div>
</div>

        {/* Share Tip */}
        <div className="mb-6">
          {!showPostForm ? (
            <button
              type="button"
              onClick={() => {
                setEditingPostId(null);
                setNewPostText("");
                setNewPostTopics([]);
                setShowPostForm(true);
                }}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5 py-3 rounded-xl"
            >
              + Share a Tip
            </button>
          ) : (
            <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">

              <h2 className="font-bold text-sky-950 mb-4">
                {editingPostId
                    ? "Edit your tip"
                    : "Share something that has helped you"}
                </h2>

              <div className="space-y-4">

                <div>
  <label className="block text-sm font-semibold text-slate-700 mb-1">
    What does your tip relate to?
  </label>

  <p className="text-xs text-slate-400 mb-3">
    Select all that apply.
  </p>

  <div className="flex flex-wrap gap-2">
    {COMMUNITY_FILTERS.map((topic) => {
      const selected =
        newPostTopics.includes(topic);

      return (
        <button
          key={topic}
          type="button"
          onClick={() =>
            toggleNewPostTopic(topic)
          }
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
            selected
              ? "bg-sky-500 border-sky-500 text-white"
              : "bg-white border-sky-200 text-sky-700 hover:bg-sky-50"
          }`}
        >
          {topic}
        </button>
      );
    })}
  </div>
</div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Your tip
                  </label>

                  <textarea
                    value={newPostText}
                    onChange={(event) =>
                      setNewPostText(
                        event.target.value
                      )
                    }
                    maxLength={400}
                    rows={4}
                    placeholder="What has helped you?"
                    className="w-full border border-sky-200 rounded-xl px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-sky-300"
                  />

                  <p className="text-xs text-slate-400 text-right mt-1">
                    {newPostText.length}/400
                  </p>
                </div>

                <div className="flex gap-3">

                  <button
                    type="button"
                    onClick={handleSavePost}
                    disabled={!newPostText.trim()}
                    className="bg-sky-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-sky-600 disabled:opacity-50"
                  >
                    {editingPostId
                        ? "Save Changes"
                        : "Post Tip"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPostForm}
                    className="bg-slate-100 text-slate-600 font-semibold px-5 py-3 rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>

                </div>

              </div>
            </div>
          )}
        </div>

        {/* Posts */}
        {sortedPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sky-100 p-10 text-center">
            {searchQuery.trim() ||
            selectedFilters.length > 0 ? (
            <>
                <p className="font-semibold text-slate-500">
                No matching tips found.
                </p>

                <p className="text-sm text-slate-400 mt-1">
                Try changing your search or filters.
                </p>

                <button
                type="button"
                onClick={() => {
                    setSearchQuery("");
                    setSelectedFilters([]);
                }}
                className="mt-4 text-sm font-semibold text-sky-600 hover:text-sky-800"
                >
                Clear search and filters
                </button>
            </>
            ) : (
            <>
                <p className="font-semibold text-slate-500">
                No tips here yet.
                </p>

                <p className="text-sm text-slate-400 mt-1">
                Be the first participant to share one.
                </p>
            </>
            )}
        </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4">

            {sortedPosts.map((post) => {
              const userFoundHelpful =
                post.helpfulBy.includes(userId);

              const isOwnPost =
                post.authorId === userId;

              return (
                <div
                  key={post.id}
                  className="break-inside-avoid bg-white border border-sky-100 rounded-2xl p-5 mb-4 shadow-sm"
                >
                  {/* Post heading */}
                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <div className="flex flex-wrap gap-2">
                        {post.topics.map((topic) => (
                            <span
                            key={topic}
                            className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full"
                            >
                            {topic}
                            </span>
                        ))}
                        </div>

                      <p className="text-xs text-slate-400 mt-1">
                        {isOwnPost
                          ? "Your tip"
                          : "Participant"}
                      </p>
                    </div>

                    {isOwnPost && (
                        <div className="flex items-center gap-2">
                            <button
                            type="button"
                            onClick={() =>
                                handleEditPost(post)
                            }
                            className="
                                px-3
                                py-1.5
                                rounded-lg
                                bg-white
                                border
                                border-sky-200
                                text-sky-700
                                text-sm
                                font-semibold
                                hover:bg-sky-50
                            "
                            >
                            Edit
                            </button>

                            <button
                            type="button"
                            onClick={() =>
                                setPostToDelete(post)
                            }
                            className="
                                px-3
                                py-1.5
                                rounded-lg
                                border
                                border-red-200
                                text-red-500
                                text-sm
                                font-semibold
                                hover:bg-red-50
                            "
                            >
                            Delete
                            </button>
                        </div>
                        )}

                  </div>

                  {/* Tip */}
                  <p className="text-slate-700 mt-4 whitespace-pre-wrap break-words">
                    {post.text}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100">

                    <button
                      type="button"
                      onClick={() =>
                        handleHelpful(post.id)
                      }
                      className={`text-sm font-semibold px-3 py-2 rounded-xl transition ${
                        userFoundHelpful
                          ? "bg-sky-100 text-sky-700"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {userFoundHelpful
                        ? "♥ Helpful"
                        : "♡ Helpful"}{" "}
                      {post.helpfulBy.length}
                    </button>

                    <div className="text-right">
                        <p className="text-xs text-slate-400">
                            {new Date(
                            post.createdAt
                            ).toLocaleDateString()}
                        </p>

                        {post.updatedAt && (
                            <p className="text-[10px] text-slate-400 mt-1">
                            Edited
                            </p>
                        )}
                        </div>

                  </div>
                </div>
              );
            })}

          </div>
        )}

      </div>

{/* Delete Post Confirmation */}
{postToDelete && (
  <div className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

      <h2 className="text-xl font-bold text-sky-950">
        Delete this tip?
      </h2>

      <p className="text-sm text-slate-500 mt-2">
        Are you sure you want to permanently
        delete this community tip?
      </p>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-4">
        <p className="text-sm text-slate-700 line-clamp-4">
          {postToDelete.text}
        </p>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={() =>
            setPostToDelete(null)
          }
          className="
            bg-slate-100
            text-slate-600
            font-semibold
            px-5
            py-3
            rounded-xl
            hover:bg-slate-200
          "
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() =>
            handleDeletePost(
              postToDelete.id
            )
          }
          className="
            bg-red-500
            text-white
            font-semibold
            px-5
            py-3
            rounded-xl
            hover:bg-red-600
          "
        >
          Yes, Delete Tip
        </button>
      </div>

    </div>
  </div>
)}

    </div>
  );
};

export default CommunityBoard;