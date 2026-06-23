import { useEffect, useState } from "react";
import { getAnalyticsPosts, getAnalyticsHistory } from "@/api/analytics.api";
import { toast } from "sonner";
import AnalyticsModal from "@/components/analytics/AnalyticsModal";

export default function Analytics() {
  const [posts, setPosts] = useState([]);
  const totals = posts.reduce(
    (acc, post) => {

      acc.posts += 1;
      acc.likes += post.likes || 0;
      acc.comments += post.comments || 0;
      acc.reposts += post.reposts || 0;
      acc.impressions += post.impressions || 0;

      return acc;

    },
    {
      posts: 0,
      likes: 0,
      comments: 0,
      reposts: 0,
      impressions: 0,
    }
  );

  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [history, setHistory] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function openPost(
    post
  ) {

    try {

      const response =
        await getAnalyticsHistory(
          post.linkedinPostUrn
        );

      setHistory(
        response.data || []
      );

      setSelectedPost(post);

      setModalOpen(true);

    } catch (error) {

      console.error(error);

    }
  }

  async function loadAnalytics() {
    try {
      const res = await getAnalyticsPosts();

      setPosts(res.data || []);
    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to load analytics"
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">

      <div>
        <h1 className="text-3xl font-bold">
          LinkedIn Analytics
        </h1>

        <p className="text-muted-foreground">
          Latest performance of all published posts
        </p>
      </div>

      <div
        className="
    grid
    grid-cols-1
    md:grid-cols-5
    gap-4
  "
      >

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Total Posts
          </p>

          <h2 className="text-3xl font-bold">
            {totals.posts}
          </h2>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Total Likes
          </p>

          <h2 className="text-3xl font-bold">
            {totals.likes}
          </h2>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Total Comments
          </p>

          <h2 className="text-3xl font-bold">
            {totals.comments}
          </h2>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Total Reposts
          </p>

          <h2 className="text-3xl font-bold">
            {totals.reposts}
          </h2>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Total Impressions
          </p>

          <h2 className="text-3xl font-bold">
            {totals.impressions}
          </h2>
        </div>

      </div>

      <div className="overflow-x-auto border rounded-lg">

        <table className="w-full">

          <thead>

            <tr className="border-b">

              <th className="text-left p-3">
                Title
              </th>

              <th className="text-left p-3">
                Likes
              </th>

              <th className="text-left p-3">
                Impressions
              </th>

              <th className="text-left p-3">
                Comments
              </th>

              <th className="text-left p-3">
                Reposts
              </th>

            </tr>

          </thead>

          <tbody>

            {posts.map((post) => (

              <tr
                key={post.linkedinPostUrn}
                onClick={() => openPost(post)}
                className="cursor-pointer hover:bg-muted border-b"
              >

                <td className="p-3">

                  <div className="flex flex-col">

                    <span className="font-medium">
                      {post.title}
                    </span>

                    <a
                      href={post.linkedinPostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="
        text-xs
        text-blue-500
      "
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      Open LinkedIn Post
                    </a>

                  </div>

                </td>

                <td className="p-3">
                  {post.likes}
                </td>

                <td className="p-3">
                  {post.impressions}
                </td>

                <td className="p-3">
                  {post.comments}
                </td>

                <td className="p-3">
                  {post.reposts}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>


      <AnalyticsModal
        open={modalOpen}
        onClose={() =>
          setModalOpen(false)
        }
        post={selectedPost}
        history={history}
      />


    </div>

  );

}