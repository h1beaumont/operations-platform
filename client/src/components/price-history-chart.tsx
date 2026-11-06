import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceHistoryDataPoint {
  id: string;
  productId: string;
  supplier: string;
  supplierId: string | null;
  price: number;
  priceDate: string;
  invoiceId: string | null;
  orderId: string | null;
  priceChangePercent: number | null;
  notes: string | null;
  createdAt: string;
  supplierName: string | null;
  invoiceNumber: string | null;
}

interface PriceHistoryChartProps {
  data: PriceHistoryDataPoint[];
  productName: string;
}

export function PriceHistoryChart({ data, productName }: PriceHistoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>No price history available for {productName}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">
            Price history will appear here once invoices are uploaded
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [...data]
    .sort((a, b) => new Date(a.priceDate).getTime() - new Date(b.priceDate).getTime())
    .map(point => ({
      date: point.priceDate,
      price: point.price,
      supplier: point.supplierName || point.supplier,
      invoiceNumber: point.invoiceNumber,
      changePercent: point.priceChangePercent,
    }));

  const latestPrice = data[0]?.price || 0;
  const oldestPrice = data[data.length - 1]?.price || 0;
  const overallChange = oldestPrice > 0 ? ((latestPrice - oldestPrice) / oldestPrice) * 100 : 0;

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-md p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">
            {format(parseISO(data.date), "MMM dd, yyyy")}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Price: </span>
            <span className="font-semibold">£{data.price.toFixed(2)}</span>
          </p>
          {data.supplier && (
            <p className="text-sm">
              <span className="text-muted-foreground">Supplier: </span>
              <span>{data.supplier}</span>
            </p>
          )}
          {data.invoiceNumber && (
            <p className="text-sm">
              <span className="text-muted-foreground">Invoice: </span>
              <span>{data.invoiceNumber}</span>
            </p>
          )}
          {data.changePercent !== null && data.changePercent !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {data.changePercent > 0 ? (
                <TrendingUp className="w-3 h-3 text-red-500" />
              ) : data.changePercent < 0 ? (
                <TrendingDown className="w-3 h-3 text-green-500" />
              ) : (
                <Minus className="w-3 h-3 text-muted-foreground" />
              )}
              <span className={`text-xs font-medium ${
                data.changePercent > 0 ? "text-red-500" : 
                data.changePercent < 0 ? "text-green-500" : 
                "text-muted-foreground"
              }`}>
                {data.changePercent > 0 ? "+" : ""}{data.changePercent.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Price History - {productName}</CardTitle>
            <CardDescription>
              {data.length} price {data.length === 1 ? 'record' : 'records'} tracked
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-2xl font-bold">£{latestPrice.toFixed(2)}</div>
            <div className="flex items-center gap-1">
              {overallChange > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <Badge className="bg-red-500 text-white">
                    +{overallChange.toFixed(1)}%
                  </Badge>
                </>
              ) : overallChange < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  <Badge className="bg-green-500 text-white">
                    {overallChange.toFixed(1)}%
                  </Badge>
                </>
              ) : (
                <Badge variant="secondary">No change</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(parseISO(date), "MMM dd")}
              className="text-xs"
            />
            <YAxis
              domain={[minPrice * 0.95, maxPrice * 1.05]}
              tickFormatter={(value) => `£${value.toFixed(2)}`}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6 }}
              name="Price (£)"
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-lg font-semibold">£{latestPrice.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Lowest Price</p>
            <p className="text-lg font-semibold">£{minPrice.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Highest Price</p>
            <p className="text-lg font-semibold">£{maxPrice.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
