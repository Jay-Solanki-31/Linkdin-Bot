import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostSkeleton } from "@/components/ui/PostSkeleton";
import { fetchAIPosts, updateAIPost } from "@/api/aiPosts.api";
import { toast } from "sonner";

export default function AIPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const [selectedPost, setSelectedPost] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);


  function removeUrls(text) {
    return text.replace(/https?:\/\/\S+/g, "").trim();
  }

  // -------- FETCH POSTS ----------
  useEffect(() => {
    setLoading(true);

    fetchAIPosts(page, 5)
      .then((data) => {
        setPosts(data.data || []);
        setMeta(data.pagination);
      })
      .catch(() => toast.error("Failed to load AI posts"))
      .finally(() => setLoading(false));
  }, [page]);

  // -------- OPEN MODAL ----------
  function openPost(post) {
    setSelectedPost(post);
    setIsEditing(false);
    setEditTitle(post.title || "");
    setEditText(removeUrls(post.text || ""));
  }

  // -------- SAVE EDIT ----------
  async function handleSave() {
    try {
      setSaving(true);

      const cleanedText = removeUrls(editText);

      if (cleanedText !== editText) {
        toast.warning("Source URL is locked and was removed from content");
      }

      const updated = await updateAIPost(selectedPost._id, {
        title: editTitle,
        text: cleanedText,
      });

      const mergedPost = {
        ...selectedPost,
        ...updated,
        url: selectedPost.url,
      };

      setPosts((prev) =>
        prev.map((p) => (p._id === mergedPost._id ? mergedPost : p))
      );

      setSelectedPost(mergedPost);
      setIsEditing(false);

      toast.success("Post updated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to update post");
    } finally {
      setSaving(false);
    }
  }

  const canEdit =
    selectedPost && !["posted", "queued"].includes(selectedPost.status);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          AI Generated Posts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review, edit and manage AI content
        </p>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <PostSkeleton />
              </CardContent>
            </Card>
          ))}

        {!loading && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No AI posts generated yet.
            </p>
          </div>
        )}

        {!loading &&
          posts.map((post) => (
            <Card
              key={post._id}
              onClick={() => openPost(post)}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-semibold text-sm flex-1">{post.title}</h3>
                  <Badge
                    className={`flex-shrink-0 text-xs ${
                      post.status === "draft"
                        ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        : post.status === "posted"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : post.status === "queued"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {post.status.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {removeUrls(post.text || "")}
                </p>

                <p className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* PAGINATION */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-xs border border-border/40 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>

          <span className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>

          <button
            disabled={page === meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs border border-border/40 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full relative">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>

            <div className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border border-border/40 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                  />

                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={6}
                    className="w-full border border-border/40 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                  />

                  <p className="text-xs text-muted-foreground">
                    Source link is locked and cannot be edited
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold pr-6">
                    {selectedPost.title}
                  </h2>

                  <p className="whitespace-pre-line bg-muted/40 p-3 rounded-lg text-sm">
                    {selectedPost.text}
                  </p>

                  {!isEditing && selectedPost.url && (
                    <a
                      href={selectedPost.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline"
                    >
                      View source article →
                    </a>
                  )}
                </>
              )}

              <Badge variant="default" className="w-fit text-xs">
                {selectedPost.status.toUpperCase()}
              </Badge>

              {/* ACTIONS */}
              {canEdit && (
                <div className="flex gap-2 pt-2">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 text-xs border border-border/40 rounded-lg hover:bg-muted transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={saving}
                        onClick={handleSave}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 text-xs border border-border/40 rounded-lg hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
