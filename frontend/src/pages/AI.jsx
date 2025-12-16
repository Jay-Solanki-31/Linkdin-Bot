import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostSkeleton } from "@/components/PostSkeleton";

export default function AIPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    setLoading(true);

    fetch(`/api/ai-posts?page=${page}&limit=5`)
      .then((res) => res.json())
      .then((data) => {
        setPosts(data.data);
        setMeta(data.pagination);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Generated Posts</h1>
        <p className="text-slate-500">Review and manage AI content</p>
      </div>

      <div className="space-y-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <PostSkeleton />
                </CardContent>
              </Card>
            ))
          : posts.map((post) => (
              <Card key={post._id} className="hover:shadow-md transition">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <Badge
                      className={
                        post.status === "generated"
                          ? "bg-green-500"
                          : post.status === "processing"
                          ? "bg-blue-500"
                          : post.status === "queued"
                          ? "bg-yellow-500"
                          : post.status === "failed"
                          ? "bg-red-500"
                          : "bg-slate-400"
                      }
                    >
                      {post.status.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-slate-600 line-clamp-3">
                    {post.description || "No AI content generated yet"}
                  </p>

                  <p className="text-xs text-slate-400">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Pagination */}
      {meta && (
        <div className="flex justify-center gap-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          <span className="text-sm text-slate-600">
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
    </div>
  );
}
