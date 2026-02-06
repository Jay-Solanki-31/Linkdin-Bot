import { useEffect, useState } from "react";
import { getFetchedContent } from "@/api/fetcher.api";

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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function FetcherList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

 
  const [selected, setSelected] = useState(null);

  const loadData = async () => {
    try {
      const res = await getFetchedContent();
      setRecords(res.data?.data || res.data || []);
    } catch (err) {
      toast.error("Failed to load fetched records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // refresh every 15s (reasonable for admin)
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);


  const filtered = records.filter((r) => {
    const title = r.title?.toLowerCase() || "";
    const source = r.source?.toLowerCase() || "";
    return (
      title.includes(search.toLowerCase()) ||
      source.includes(search.toLowerCase())
    );
  });


  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentPageData = filtered.slice(startIndex, startIndex + pageSize);

  const nextPage = () => page < totalPages && setPage((p) => p + 1);
  const prevPage = () => page > 1 && setPage((p) => p - 1);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fetched Records</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all collected articles
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4 border-b">
          <CardTitle className="text-base">All Records</CardTitle>

          <Input
            placeholder="Search by title or source..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : currentPageData.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>AI</TableHead>
                      <TableHead>Queued</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {currentPageData.map((item) => (
                      <TableRow key={item._id} className="hover:bg-muted/40">
                        <TableCell className="max-w-xs truncate text-sm font-medium">
                          {item.title}
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {item.source}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {item.aiGenerated ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {item.isQueued ? (
                            <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                              Queued
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelected(item)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={prevPage}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  Prev
                </Button>

                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>

                <Button
                  onClick={nextPage}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No records found
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <RecordViewer
          record={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}


function RecordViewer({ record, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="w-full max-w-2xl bg-background h-full flex flex-col shadow-xl">

        {/* header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Article Preview</h2>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          <h3 className="text-lg font-semibold">
            {record.title}
          </h3>

          <div className="flex gap-2">
            <Badge>{record.source}</Badge>
            {record.aiGenerated && <Badge>AI</Badge>}
            {record.isQueued && <Badge>Queued</Badge>}
          </div>

          {record.url && (
            <a
              href={record.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Open source →
            </a>
          )}

          <p className="whitespace-pre-line text-sm leading-relaxed">
            {record.description || record.text || "No content available"}
          </p>
        </div>
      </div>
    </div>
  );
}
