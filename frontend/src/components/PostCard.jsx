import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function removeUrls(text = "") {
  return text.replace(/https?:\/\/\S+/g, "").trim();
}

export default function PostCard({ post, onView }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">

        {/* header */}
        <div className="flex justify-between gap-3">
          <h3 className="text-sm font-semibold line-clamp-2 flex-1">
            {post.title}
          </h3>

          <Badge className="text-xs">
            {post.status.toUpperCase()}
          </Badge>
        </div>

        {/* preview */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {removeUrls(post.text)}
        </p>

        {/* footer */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-muted-foreground">
            {new Date(post.createdAt).toLocaleDateString()}
          </span>

          <Button size="sm" variant="outline" onClick={onView}>
            View
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
