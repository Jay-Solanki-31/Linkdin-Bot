import { useEffect, useState } from "react"
import { fetchAIPosts, deleteAIPost, updateAIPost } from "@/api/aiPosts.api"
import { toast } from "sonner"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { AnimatedNumber } from "@/components/ui/animated-number"

function ImagePreview({ src, className = "", label = "No Image" }) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div className={"flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border bg-muted text-center text-[11px] text-muted-foreground " + className}>
        {label}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="Generated"
      className={"h-20 w-20 rounded-md object-cover " + className}
      onError={() => setHasError(true)}
    />
  )
}

export default function AIPosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [selected, setSelected] = useState(null)
  const [modalInitialEditing, setModalInitialEditing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setLoading(true)

    fetchAIPosts({ page, limit: 10 })
      .then((res) => {
        const body = res?.data ?? res
        setPosts(body?.data ?? [])
        setMeta(body?.pagination ?? null)
      })
      .catch(() => toast.error("Failed to load posts"))
      .finally(() => setLoading(false))
  }, [page])

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteAIPost(deleteTarget._id)

      setPosts((prev) =>
        prev.filter((p) => p._id !== deleteTarget._id)
      )

      setMeta((prev) =>
        prev ? { ...prev, total: prev.total - 1 } : prev
      )

      toast.success("Post deleted successfully")
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to delete post"
      )
    } finally {
      setDeleteTarget(null)
    }
  }

  const handlePostUpdated = (updatedPost) => {
    if (!updatedPost?._id) return

    setPosts((prev) =>
      prev.map((post) =>
        post._id === updatedPost._id ? { ...post, ...updatedPost } : post
      )
    )

    setSelected((prev) =>
      prev && prev._id === updatedPost._id ? { ...prev, ...updatedPost } : prev
    )
  }

  const statusCounts = {
    posted: posts.filter(p => p.status === "posted").length,
    queued: posts.filter(p => p.status === "queued").length,
    failed: posts.filter(p => p.status === "failed").length,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Generated Posts</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold"><AnimatedNumber value={statusCounts.posted} /></div>
            <p className="text-xs text-muted-foreground">Posted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold"><AnimatedNumber value={statusCounts.queued} /></div>
            <p className="text-xs text-muted-foreground">Queued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600"><AnimatedNumber value={statusCounts.failed} /></div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      <div>
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
                      <TableHead>Image</TableHead>
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
                      <tr
                        key={post._id}
                        className="hover:bg-muted/40 border-b transition-colors"
                      >
                        <TableCell className="max-w-xs truncate font-medium">
                          {post.title}
                        </TableCell>

                        <TableCell className="py-3">
                          <ImagePreview src={post.imageUrl || post.imagePath} />
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            variant={post.status === "posted" ? "success" : post.status === "queued" ? "warning" : "error"}
                          >
                            {post.status}
                          </StatusBadge>
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
                            onClick={() => {
                              setSelected(post)
                              setModalInitialEditing(false)
                            }}
                          >
                            View
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={post.status !== "queued"}
                            onClick={() => {
                              if (post.status !== "queued") {
                                toast.error("Only queued posts can be edited")
                                return
                              }

                              setSelected(post)
                              setModalInitialEditing(true)
                            }}
                          >
                            Edit
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
                      </tr>
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
      </div>

      {selected && (
        <AIPostModal
          post={selected}
          initialEditing={modalInitialEditing}
          onClose={() => {
            setSelected(null)
            setModalInitialEditing(false)
          }}
          onUpdated={handlePostUpdated}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

function DeleteConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-background w-full max-w-md rounded-xl shadow-xl p-6 space-y-4 animate-fade-in">
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
  )
}

function AIPostModal({ post, initialEditing = false, onClose, onUpdated }) {
  const [isEditing, setIsEditing] = useState(initialEditing)
  const [title, setTitle] = useState(post.title || "")
  const [text, setText] = useState(post.text || "")
  const [saving, setSaving] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setTitle(post.title || "")
    setText(post.text || "")
    setIsEditing(initialEditing)
    setImageError(false)
  }, [post._id, post.title, post.text, post.imageUrl, post.imagePath, initialEditing])

  const handleSave = async () => {
    if (!title.trim() || !text.trim()) {
      toast.error("Title and description are required")
      return
    }

    setSaving(true)

    try {
      const response = await updateAIPost(post._id, {
        title: title.trim(),
        text: text.trim(),
      })

      const updatedPost = response?.data?.data ?? response?.data ?? null

      if (updatedPost) {
        onUpdated(updatedPost)
      }

      // setIsEditing(false)
      toast.success("Post updated successfully")
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update post")
    } finally {
      setSaving(false)
    }
  }

  const canEdit = post.status === "queued"

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-background h-full shadow-xl flex flex-col transition-transform duration-300">
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <h2 className="font-semibold">Post Details</h2>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {(post.imageUrl || post.imagePath) && !imageError ? (
            <div className="overflow-hidden rounded-xl border border-border bg-muted">
              <img
                src={post.imageUrl || post.imagePath}
                alt="Generated preview"
                className="w-full max-h-80 object-contain"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
              No Image
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Post title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Text Description</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Post description"
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTitle(post.title || "")
                    setText(post.text || "")
                    setIsEditing(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-lg">
                {post.title}
              </h3>

              <StatusBadge
                variant={post.status === "posted" ? "success" : post.status === "queued" ? "warning" : "error"}
              >
                {post.status}
              </StatusBadge>

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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
