import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, QrCode, Database } from "lucide-react";
import LinenPackingLists from "./linen-packing-lists";
import CleaningAssistantQR from "./cleaning-assistant-qr";
import CleaningAssistantKnowledge from "./cleaning-assistant-knowledge";

export default function CleaningStaffResources() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cleaning Staff Resources</h1>
        <p className="text-muted-foreground">
          Manage linen packing lists, QR code access, and knowledge base for cleaning staff
        </p>
      </div>

      <Tabs defaultValue="packing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="packing" className="gap-2" data-testid="tab-packing">
            <Package className="h-4 w-4" />
            Linen Packing Lists
          </TabsTrigger>
          <TabsTrigger value="qr" className="gap-2" data-testid="tab-qr">
            <QrCode className="h-4 w-4" />
            Cleaners QR Code
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2" data-testid="tab-knowledge">
            <Database className="h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packing" className="space-y-6">
          <LinenPackingLists />
        </TabsContent>

        <TabsContent value="qr" className="space-y-6">
          <CleaningAssistantQR />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <CleaningAssistantKnowledge />
        </TabsContent>
      </Tabs>
    </div>
  );
}
