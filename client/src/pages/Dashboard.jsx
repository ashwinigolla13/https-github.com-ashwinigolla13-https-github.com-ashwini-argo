import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

const Dashboard = () => {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 5;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/history`);
        const data = await response.json();
        const sortedData = data.sort((a, b) => a.id - b.id);
        setHistory(sortedData);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((entry) =>
    entry.predicted_crop.toLowerCase().includes(search.toLowerCase())
  );

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const lastIndex = currentPage * entriesPerPage;
  const firstIndex = lastIndex - entriesPerPage;
  const currentEntries = sortedHistory.slice(firstIndex, lastIndex);

  const nextPage = () => setCurrentPage(currentPage + 1);
  const prevPage = () => setCurrentPage(currentPage - 1);

  const handleSort = (field) => {
    const order =
      sortField === field && sortOrder === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortOrder(order);
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/delete-history/${id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      } else {
        console.error("Error:", data.error);
      }
    } catch (error) {
      console.error("Error deleting history:", error);
    }
  };

  const cropCounts = history.reduce((acc, entry) => {
    acc[entry.predicted_crop] = (acc[entry.predicted_crop] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(cropCounts).map((crop) => ({
    name: crop,
    count: cropCounts[crop],
  }));

  const cropTrends = history.map((entry) => ({
    date: entry.timestamp.split("T")[0],
    crop: entry.predicted_crop,
  }));

  const outliers = history.filter(
    (entry) =>
      entry.N > 150 ||
      entry.P > 150 ||
      entry.K > 150 ||
      entry.temperature > 45 ||
      entry.ph > 9 ||
      entry.ph < 4
  );

  const nutrientAvg = {
    N: history.reduce((sum, e) => sum + e.N, 0) / history.length || 0,
    P: history.reduce((sum, e) => sum + e.P, 0) / history.length || 0,
    K: history.reduce((sum, e) => sum + e.K, 0) / history.length || 0,
  };

  const envAvg = {
    temperature: history.reduce((sum, e) => sum + e.temperature, 0) / history.length || 0,
    humidity: history.reduce((sum, e) => sum + e.humidity, 0) / history.length || 0,
    ph: history.reduce((sum, e) => sum + e.ph, 0) / history.length || 0,
    rainfall: history.reduce((sum, e) => sum + e.rainfall, 0) / history.length || 0,
  };

  const topCropsThisMonth = Object.entries(cropCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, value]) => ({ name, value }));

  // Most frequently predicted crop (highlight card)
  const mostFrequentCropEntry = Object.entries(cropCounts).reduce(
    (maxEntry, currentEntry) =>
      currentEntry[1] > (maxEntry?.[1] || 0) ? currentEntry : maxEntry,
    null
  );

  return (
    <div className="p-4 space-y-8 max-w-screen-xl mx-auto">
      {/* Prediction History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by crop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead
                  onClick={() => handleSort("predicted_crop")}
                  className="cursor-pointer"
                >
                  Crop
                </TableHead>
                <TableHead onClick={() => handleSort("N")} className="cursor-pointer">N</TableHead>
                <TableHead onClick={() => handleSort("P")} className="cursor-pointer">P</TableHead>
                <TableHead onClick={() => handleSort("K")} className="cursor-pointer">K</TableHead>
                <TableHead onClick={() => handleSort("temperature")} className="cursor-pointer">Temp (°C)</TableHead>
                <TableHead onClick={() => handleSort("humidity")} className="cursor-pointer">Humidity (%)</TableHead>
                <TableHead onClick={() => handleSort("ph")} className="cursor-pointer">pH</TableHead>
                <TableHead onClick={() => handleSort("rainfall")} className="cursor-pointer">Rainfall (mm)</TableHead>
                <TableHead onClick={() => handleSort("timestamp")} className="cursor-pointer">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id}</TableCell>
                  <TableCell>{entry.predicted_crop}</TableCell>
                  <TableCell>{entry.N}</TableCell>
                  <TableCell>{entry.P}</TableCell>
                  <TableCell>{entry.K}</TableCell>
                  <TableCell>{entry.temperature}</TableCell>
                  <TableCell>{entry.humidity}</TableCell>
                  <TableCell>{entry.ph}</TableCell>
                  <TableCell>{entry.rainfall}</TableCell>
                  <TableCell>{entry.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <Button
              onClick={prevPage}
              disabled={currentPage === 1}
              variant="outline"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <span className="text-sm">Page {currentPage}</span>
            <Button
              onClick={nextPage}
              disabled={lastIndex >= sortedHistory.length}
              variant="outline"
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Crop Frequency Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Predicted Crop Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Crop Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cropTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="crop" stroke="#10b981" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart for Top 3 Crops */}
      <Card>
        <CardHeader>
          <CardTitle>Top 3 Predicted Crops This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={topCropsThisMonth}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {topCropsThisMonth.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Outlier Report */}
      <Card>
        <CardHeader>
          <CardTitle>Outlier Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm">
            {outliers.length > 0 ? (
              outliers.map((entry) => (
                <li key={entry.id}>
                  ID {entry.id}: Crop = {entry.predicted_crop}, N = {entry.N}, P = {entry.P}, K = {entry.K}, pH = {entry.ph}
                </li>
              ))
            ) : (
              <li>No outlier predictions found.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Nutrient Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Soil-Nutrient Balance Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>Nitrogen (N) average: {nutrientAvg.N.toFixed(2)}</p>
          <p>Phosphorus (P) average: {nutrientAvg.P.toFixed(2)}</p>
          <p>Potassium (K) average: {nutrientAvg.K.toFixed(2)}</p>
        </CardContent>
      </Card>

      {/* New: Most Frequently Predicted Crop */}
      <Card className="bg-green-50 border-green-400">
        <CardHeader>
          <CardTitle>Most Frequently Predicted Crop</CardTitle>
        </CardHeader>
        <CardContent>
          {mostFrequentCropEntry ? (
            <div className="text-lg font-semibold text-green-700">
              {mostFrequentCropEntry[0]} ({mostFrequentCropEntry[1]} times)
            </div>
          ) : (
            <div>No predictions available</div>
          )}
        </CardContent>
      </Card>

      {/* New: Environmental Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Environmental Summary (Averages)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Temperature: {envAvg.temperature.toFixed(1)} °C</p>
          <p>Humidity: {envAvg.humidity.toFixed(1)} %</p>
          <p>pH Level: {envAvg.ph.toFixed(2)}</p>
          <p>Rainfall: {envAvg.rainfall.toFixed(1)} mm</p>
        </CardContent>
      </Card>

      {/* AI Recommendation Summary */}
      <Card>
  <CardHeader>
    <CardTitle>AI Recommendation Summary</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3 text-sm">
    {/* Top Crop Recommendation */}
    {mostFrequentCropEntry ? (
      <p>
        <strong>Top Recommended Crop:</strong> {mostFrequentCropEntry[0]} (predicted {mostFrequentCropEntry[1]} times)
      </p>
    ) : (
      <p>No crop prediction data available.</p>
    )}

    {/* Fertilizer Suggestion */}
    <p>
      <strong>Fertilizer Suggestion:</strong>{" "}
      {(() => {
        const { N, P, K } = nutrientAvg;
        if (N < 50) return "Apply Nitrogen-rich fertilizer.";
        if (P < 30) return "Apply Phosphorus-rich fertilizer.";
        if (K < 40) return "Apply Potassium-rich fertilizer.";
        return "Nutrient levels are balanced.";
      })()}
    </p>

    {/* Soil pH Advice */}
    <p>
      <strong>Soil pH Advice:</strong>{" "}
      {(() => {
        const pH = envAvg.ph;
        if (pH < 5.5) return "Soil is acidic. Consider adding lime to raise pH.";
        if (pH > 7.5) return "Soil is alkaline. Consider adding sulfur to lower pH.";
        return "Soil pH is optimal.";
      })()}
    </p>

    {/* Environmental Note */}
    <p>
      <strong>Environmental Conditions:</strong> The average temperature is {envAvg.temperature.toFixed(1)}°C, humidity is {envAvg.humidity.toFixed(1)}%, and average rainfall is {envAvg.rainfall.toFixed(1)} mm.
    </p>

    {/* General Recommendation */}
    <p>
      <strong>General Recommendation:</strong> Maintain balanced soil nutrients and monitor environmental conditions regularly to optimize crop yield.
    </p>
  </CardContent>
</Card>


    </div>
  );
};

export default Dashboard;
