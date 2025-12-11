import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      <Card>
        <CardHeader>
          <CardTitle>Total Fetched Articles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">124</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Generated Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">32</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">Running</p>
        </CardContent>
      </Card>

    </div>
  );
}
