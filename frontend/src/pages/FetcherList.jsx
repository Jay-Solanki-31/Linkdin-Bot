import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

  const loadData = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/fetch");
      setRecords(res.data.data);
    } catch (err) {
      console.log("Error loading records:", err);
      toast.error("Failed to load fetched records");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = records.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.source.toLowerCase().includes(search.toLowerCase())
  );

  
  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentPageData = filtered.slice(startIndex, startIndex + pageSize);

  const nextPage = () => page < totalPages && setPage(page + 1);
  const prevPage = () => page > 1 && setPage(page - 1);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Fetched Records</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage all collected articles</p>
      </div>
      <Card>
        <CardHeader className="border-b border-border/40">
          <CardTitle className="text-base mb-4">All Records</CardTitle>
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
                    <TableRow className="border-b border-border/40 hover:bg-transparent">
                      <TableHead className="font-semibold text-foreground">Title</TableHead>
                      <TableHead className="font-semibold text-foreground">Source</TableHead>
                      <TableHead className="font-semibold text-foreground">AI Generated</TableHead>
                      <TableHead className="font-semibold text-foreground">Queued</TableHead>
                      <TableHead className="font-semibold text-foreground">Date</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {currentPageData.map((item) => (
                      <TableRow key={item._id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium text-foreground max-w-sm truncate text-sm">
                          {item.title}
                        </TableCell>

                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            {item.source}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {item.aiGenerated ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                              ✓ Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              ○ No
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {item.isQueued ? (
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">
                              ⏳ Queued
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              -
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/40">
                <Button
                  onClick={prevPage}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  ← Previous
                </Button>

                <div className="flex items-center gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNum = page > 3 ? page - 2 + i : i + 1;
                    if (pageNum > totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        className="px-3"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={nextPage}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next →
                </Button>
              </div>

              <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border/40 text-xs text-muted-foreground">
                Showing {currentPageData.length} of {filtered.length} records (Page {page} of {totalPages})
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-muted-foreground">No records found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
