import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function FetcherList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // pagination 
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/fetch");
      setRecords(res.data.data);
    } catch (err) {
      console.log("Error loading records:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // search filter 
  const filtered = records.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.source.toLowerCase().includes(search.toLowerCase())
  );

  // pagination calculation
  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentPageData = filtered.slice(startIndex, startIndex + pageSize);

  const nextPage = () => page < totalPages && setPage(page + 1);
  const prevPage = () => page > 1 && setPage(page - 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl font-bold text-foreground">Fetched Records</h1>
        <p className="text-slate-500">View and manage all collected articles</p>
      </div>
      <Card className="border-0 shadow-lg bg-background">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-foreground">All Records</CardTitle>
          <Input
            placeholder="🔍 Search by title or source..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="mt-4 border-slate-300"
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
                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-border hover:bg-slate-100">
                      <TableHead className="font-semibold text-foreground">Title</TableHead>
                      <TableHead className="font-semibold text-foreground">Source</TableHead>
                      <TableHead className="font-semibold text-foreground">AI Generated</TableHead>
                      <TableHead className="font-semibold text-foreground">Queued</TableHead>
                      <TableHead className="font-semibold text-foreground">Date</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {currentPageData.map((item, idx) => (
                      <TableRow key={item._id} className={`border-b border-slate-100 hover:bg-muted transition ${idx % 2 === 0 ? "bg-background" : "bg-muted/50"}`}>
                        <TableCell className="font-semibold text-foreground max-w-sm truncate">{item.title}</TableCell>

                        <TableCell>
                          <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">{item.source}</Badge>
                        </TableCell>

                        <TableCell>
                          {item.aiGenerated ? (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">✓ Yes</Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-700">○ No</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {item.isQueued ? (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">⏳ Queued</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700">-</Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-slate-600 text-sm">
                          {new Date(item.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <Button
                  onClick={prevPage}
                  disabled={page === 1}
                  variant="outline"
                  className="border-slate-300 hover:bg-slate-100"
                >
                  ← Previous
                </Button>

                <div className="flex items-center gap-2">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNum = page > 3 ? page - 2 + i : i + 1;
                    if (pageNum > totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        className={`px-4 ${page === pageNum ? "bg-gradient-to-r from-blue-500 to-blue-600" : "border-slate-300 hover:bg-slate-100"}`}
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
                  className="border-slate-300 hover:bg-slate-100"
                >
                  Next →
                </Button>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg border border-border text-sm text-slate-600">
                📊 Showing {currentPageData.length} of {filtered.length} records (Page {page} of {totalPages})
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-slate-500">No records found</p>
              <p className="text-sm text-slate-400 mt-2">Try adjusting your search filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
