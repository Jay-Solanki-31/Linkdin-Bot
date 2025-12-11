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

  // pagination states
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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fetched Records</CardTitle>
        </CardHeader>

        <CardContent>
          <Input
            placeholder="Search by title or source..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // reset page when searching
            }}
            className="mb-4"
          />

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
                    <TableHead>Source</TableHead>
                    <TableHead>AI Generated</TableHead>
                    <TableHead>Queued</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {currentPageData.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.title}</TableCell>

                      <TableCell>
                        <Badge>{item.source}</Badge>
                      </TableCell>

                      <TableCell>
                        {item.aiGenerated ? (
                          <Badge className="bg-green-600">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.isQueued ? (
                          <Badge className="bg-yellow-600">Queued</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {new Date(item.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={prevPage}
                  disabled={page === 1}
                  variant="outline"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <Button
                      key={i}
                      variant={page === i + 1 ? "default" : "outline"}
                      className="px-4"
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={nextPage}
                  disabled={page === totalPages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
