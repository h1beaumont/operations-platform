import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, BarChart3, History, Package } from "lucide-react";
import SubmitCompliance from "./submit-compliance";
import ComplianceAnalytics from "./compliance-analytics";
import ComplianceHistory from "./compliance-history";
import EquipmentTracking from "./equipment-tracking";

export default function Compliance() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "submit");

  useEffect(() => {
    navigate(`/compliance?tab=${activeTab}`, { replace: true });
  }, [activeTab, navigate]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Staff Compliance</h1>
        <p className="text-muted-foreground">
          Submit compliance records, view analytics, review history, and track equipment
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4" data-testid="compliance-tabs">
          <TabsTrigger value="submit" className="flex items-center gap-2" data-testid="tab-submit">
            <ClipboardCheck className="h-4 w-4" />
            <span>Submit</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
            <History className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2" data-testid="tab-equipment">
            <Package className="h-4 w-4" />
            <span>Equipment</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="mt-6">
          <SubmitCompliance />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <ComplianceAnalytics />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ComplianceHistory />
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <EquipmentTracking />
        </TabsContent>
      </Tabs>
    </div>
  );
}
