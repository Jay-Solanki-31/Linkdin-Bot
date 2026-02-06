// pages/FetchedContent.jsx
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  fetchFetchedContent,
  triggerAIGeneration,
} from "../api/fetchedContent.api";

export default function FetchedContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchFetchedContent();
      const data = res.data?.data ?? res.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading content:", err);
      toast.error("Failed to load fetched content");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateAI = async (id) => {
    try {
      setLoadingId(id);
      await triggerAIGeneration(id);
      await load();
      toast.success("AI generation triggered");
    } catch (err) {
      console.error("Error generating AI:", err);
      toast.error("Failed to generate AI post");
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = items.filter((item) => {
    const title = item.title?.toLowerCase() || "";
    return title.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fetched Content</h1>
        <p className="text-sm text-muted-foreground">
          View and manage fetched articles for AI generation
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4 border-b">
          <CardTitle className="text-base">Content Items</CardTitle>
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Generated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item._id} className="hover:bg-muted/40">
                      <TableCell className="max-w-xs truncate text-sm font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {item.slot ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.aiGenerated ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            ✅ Done
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!item.aiGenerated && (
                          <Button
                            size="sm"
                            onClick={() => handleGenerateAI(item._id)}
                            disabled={loadingId === item._id}
                            variant="default"
                          >
                            {loadingId === item._id
                              ? "Generating..."
                              : "Generate AI"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No content found
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <ContentViewer
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ContentViewer({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="w-full max-w-2xl bg-background h-full flex flex-col shadow-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Content Preview</h2>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <div className="flex gap-2">
            {item.slot && <Badge>{`Slot: ${item.slot}`}</Badge>}
            {item.aiGenerated && <Badge className="bg-green-100 text-green-700">AI Generated</Badge>}
            {item.status && <Badge variant="secondary">{item.status}</Badge>}
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {item.description || item.text || "No content available"}
          </p>
        </div>
      </div>
    </div>
  );
}
