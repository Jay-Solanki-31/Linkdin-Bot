import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PostCard({ post, onView }) {
  return (
    <Card
      className="cursor-pointer hover:bg-muted/40 transition"
      onClick={onView}
    >
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">{post.title}</h3>

        <p className="text-xs text-muted-foreground line-clamp-2">
          {post.text}
        </p>

        <Badge variant="outline" className="text-xs">
          {post.status}
        </Badge>
      </CardContent>
    </Card>
  );
}
