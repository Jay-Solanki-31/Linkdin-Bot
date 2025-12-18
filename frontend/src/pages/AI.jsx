import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostSkeleton } from "@/components/PostSkeleton";

export default function AIPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const statusColors = {
    generated: "bg-green-500",
    processing: "bg-blue-500",
    queued: "bg-yellow-500",
    failed: "bg-red-500",
  };

  useEffect(() => {
    setLoading(true);

    fetch(`/api/ai-posts?page=${page}&limit=5`)
      .then((res) => res.json())
      .then((data) => {
        setPosts(data.data || []);
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
        {/* Loading state */}
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <PostSkeleton />
              </CardContent>
            </Card>
          ))}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div className="text-center text-slate-500 py-20">
            No AI posts generated yet.
          </div>
        )}

        {/* Data state */}
        {!loading &&
          posts.length > 0 &&
          posts.map((post) => (
            <Card
              key={post._id}
              onClick={() => setSelectedPost(post)}
              className="cursor-pointer hover:shadow-lg transition"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                  <Badge
                    className={statusColors[post.status] || "bg-slate-400"}
                  >
                    {post.status.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-slate-600 line-clamp-3">
                  {post.text || "No AI content generated yet"}
                </p>

                <p className="text-xs text-slate-400">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
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

      {/* Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl relative">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-800"
            >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>

            <div className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">{selectedPost.title}</h2>

              <Badge className="w-fit">
                {selectedPost.status.toUpperCase()}
              </Badge>

              <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                {selectedPost.text}
              </p>

              <p className="text-xs text-slate-400">
                Generated at{" "}
                {new Date(selectedPost.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
