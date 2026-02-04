import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateAIPost } from "@/api/aiPosts.api";
import { postToLinkedIn } from "@/api/publisher.api";
import { toast } from "sonner";

export default function PostModal({ post, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [text, setText] = useState(post.text);
  const [loading, setLoading] = useState(false);

  const canEdit = !["posted", "queued"].includes(post.status);
  const canPost = post.status === "draft";

  async function save() {
    try {
      setLoading(true);
      const updated = await updateAIPost(post._id, { title, text });
      onUpdate({ ...post, ...updated });
      setEditing(false);
      toast.success("Updated");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    try {
      setLoading(true);
      await postToLinkedIn(post._id);
      onUpdate({ ...post, status: "queued" });
      toast.success("Queued");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-6">
      <div className="min-h-full flex items-center justify-center">
        {/* Modal */}
        <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          {/* header */}
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-lg">Post Details</h2>
            <button onClick={onClose}>✕</button>
          </div>

          {/* body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {editing ? (
              <>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-lg p-3 text-sm"
                />

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="
                    w-full
                    min-h-[200px]
                    resize-y
                    border
                    rounded-lg
                    p-3
                    text-sm
                  "
                />

                {/* small info message */}
                <p className="text-xs text-muted-foreground">
                  Source link is locked and cannot be edited
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold">{post.title}</h3>

                <p className="whitespace-pre-line text-sm">{post.text}</p>

                {post.url && (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline hover:no-underline"
                  >
                    View source article →
                  </a>
                )}
              </>
            )}
          </div>

          {/* footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>

            {canEdit && !editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}

            {editing && (
              <Button onClick={save} disabled={loading}>
                Save
              </Button>
            )}

            {canPost && !editing && (
              <Button onClick={publish} disabled={loading}>
                Post
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
