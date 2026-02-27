// pages/AIPosts.jsx
import { useEffect, useState } from "react";
import { fetchAIPosts, deleteAIPost } from "@/api/aiPosts.api";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    setLoading(true);

    fetchAIPosts({ page, limit: 10 })
      .then((res) => {
        const body = res?.data ?? res;
        setPosts(body?.data ?? []);
        setMeta(body?.pagination ?? null);
      })
      .catch(() => toast.error("Failed to load posts"))
      .finally(() => setLoading(false));
  }, [page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteAIPost(deleteTarget._id);

      setPosts((prev) =>
        prev.filter((p) => p._id !== deleteTarget._id)
      );

      setMeta((prev) =>
        prev ? { ...prev, total: prev.total - 1 } : prev
      );

      toast.success("Post deleted successfully");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to delete post"
      );
    } finally {
      setDeleteTarget(null);
    }
  };

  const statusStyles = {
    posted: "bg-green-100 text-green-700 border-green-200",
    queued: "bg-yellow-100 text-yellow-700 border-yellow-200",
    failed: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Generated Posts</h1>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Publish At</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post._id}>
                      <TableCell className="max-w-xs truncate font-medium">
                        {post.title}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            statusStyles[post.status] ||
                            "bg-gray-100 text-gray-700 border-gray-200"
                          }
                        >
                          {post.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm">
                        {post.publishAt
                          ? new Date(post.publishAt).toLocaleString()
                          : "-"}
                      </TableCell>

                      <TableCell className="text-sm">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(post)}
                        >
                          View
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={post.status === "posted"}
                          onClick={() => setDeleteTarget(post)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta?.totalPages > 1 && (
                <div className="flex justify-between mt-6">
                  <Button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    size="sm"
                    variant="outline"
                  >
                    Prev
                  </Button>

                  <span className="text-xs text-muted-foreground">
                    Page {meta.page} of {meta.totalPages}
                  </span>

                  <Button
                    disabled={page === meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selected && (
        <AIPostModal
          post={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-background w-full max-w-md rounded-xl shadow-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Delete Post
        </h2>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this post?
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <Button variant="destructive" onClick={onConfirm}>
            Delete Post
          </Button>
        </div>
      </div>
    </div>
  );
}

function AIPostModal({ post, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-background h-full shadow-xl flex flex-col">
        <div className="p-4 border-b flex justify-between">
          <h2 className="font-semibold">Post Details</h2>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <h3 className="font-semibold text-lg">
            {post.title}
          </h3>

          <Badge variant="outline">{post.status}</Badge>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Publish At:</strong>{" "}
              {post.publishAt
                ? new Date(post.publishAt).toLocaleString()
                : "-"}
            </p>
            <p>
              <strong>Created:</strong>{" "}
              {new Date(post.createdAt).toLocaleString()}
            </p>
            <p>
              <strong>Attempts:</strong> {post.attempts ?? 0}
            </p>
          </div>

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-sm"
            >
              Open URL →
            </a>
          )}

          <div className="whitespace-pre-line text-sm leading-relaxed">
            {post.text}
          </div>
        </div>
      </div>
    </div>
  );
}
