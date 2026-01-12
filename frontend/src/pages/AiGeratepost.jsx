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

  const statusColors = {
    draft: "bg-slate-500",
    queued: "bg-yellow-500",
    posted: "bg-green-600",
    failed: "bg-red-500",
  };

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
    setEditText(post.text || "");
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
      <div>
        <h1 className="text-3xl font-bold">AI Generated Posts</h1>
        <p className="text-muted-foreground">
          Review, edit and manage AI content
        </p>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <PostSkeleton />
              </CardContent>
            </Card>
          ))}

        {!loading && posts.length === 0 && (
          <div className="text-center bg-muted py-20">
            No AI posts generated yet.
          </div>
        )}

        {!loading &&
          posts.map((post) => (
            <Card
              key={post._id}
              onClick={() => openPost(post)}
              className="cursor-pointer hover:shadow-lg transition"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                  <Badge className={statusColors[post.status]}>
                    {post.status.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-muted-foreground line-clamp-3">
                  {post.text}
                </p>

                <p className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* PAGINATION */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>

          <button
            disabled={page === meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-2xl w-full shadow-xl relative">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3"
            >
              ✕
            </button>

            <div className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border p-2 rounded"
                  />

                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={6}
                    className="w-full border p-2 rounded"
                  />

                <p className="text-xs text-muted-foreground">
                  Source link is locked and cannot be edited
                </p>

                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{selectedPost.title}</h2>

                  <p className="whitespace-pre-line bg-muted p-3 rounded">
                    {selectedPost.text}
                  </p>

                  {!isEditing && selectedPost.url && (
                  <a
                    href={selectedPost.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline"
                  >
                    View source article
                  </a>
                )}

                </>
              )}

              <Badge className="w-fit">
                {selectedPost.status.toUpperCase()}
              </Badge>

              {/* ACTIONS */}
              {canEdit && (
                <div className="flex gap-3">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border rounded"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={saving}
                        onClick={handleSave}
                        className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border rounded"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
