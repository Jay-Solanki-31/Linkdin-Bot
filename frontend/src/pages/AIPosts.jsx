// pages/AIPosts.jsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PostSkeleton } from "@/components/ui/PostSkeleton";
import { fetchAIPosts } from "@/api/aiPosts.api";
import { toast } from "sonner";
import PostCard from "@/components/PostCard";
import PostModal from "@/components/PostModal";

export default function AIPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchAIPosts({ page, limit: 5 })
      .then((res) => {
        const body = res?.data ?? res;
        const items = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body)
          ? body
          : [];

        setPosts(items);
        setMeta(body?.pagination ?? null);
      })
      .catch((err) => {
        console.error("Error fetching posts:", err);
        toast.error("Failed to load posts");
      })
      .finally(() => setLoading(false));
  }, [page]);
  
  function updatePost(updated) {
    setPosts((prev) =>
      prev.map((p) => (p._id === updated._id ? updated : p))
    );
    setSelected(updated);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Generated Posts</h1>

      <div className="space-y-3">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <PostSkeleton />
              </CardContent>
            </Card>
          ))}

        {!loading &&
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onView={() => setSelected(post)}
            />
          ))}
      </div>

      {meta?.totalPages > 1 && (
        <div className="flex justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Prev
          </button>
          <span className="text-xs">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            disabled={page === meta.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {selected && (
        <PostModal
          post={selected}
          onClose={() => setSelected(null)}
          onUpdate={updatePost}
        />
      )}
    </div>
  );
}
