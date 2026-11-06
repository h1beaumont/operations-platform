import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/Northstay logo black-01 (8)_1761129570743.png";
import { CommandPalette } from "@/components/command-palette";
import { DualClocks } from "@/components/dual-clocks";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/lib/animations";
import Landing from "@/pages/landing";
import Overview from "@/pages/overview";
import Dashboard from "@/pages/dashboard";
import Meetings from "@/pages/meetings";
import Settings from "@/pages/settings";
import CurrentStaff from "@/pages/current-staff";
import StaffProfile from "@/pages/staff-profile";
import SubmitCompliance from "@/pages/submit-compliance";
import ComplianceHistory from "@/pages/compliance-history";
import Compliance from "@/pages/compliance";
import Availability from "@/pages/availability";
import AvailabilitySubmit from "@/pages/availability-submit";
import AdminAvailability from "@/pages/admin-availability";
import AdminAvailabilitySubmit from "@/pages/admin-availability-submit";
import Schedules from "@/pages/schedules";
import Properties from "@/pages/properties";
import PropertiesManagement from "@/pages/properties-management";
import PropertyProfile from "@/pages/property-profile";
import LeaderboardTV from "@/pages/leaderboard-tv";
import LeaderboardPublic from "@/pages/leaderboard-public";
import Screening from "@/pages/screening";
import Onboarding from "@/pages/onboarding";
import PipelineAnalytics from "@/pages/pipeline-analytics";
import ComplianceAnalytics from "@/pages/compliance-analytics";
import CalendarPublic from "@/pages/calendar-public";
import MaintenanceDashboard from "@/pages/maintenance-dashboard";
import InspectionReports from "@/pages/inspection-reports";
import ReviewsComplaints from "@/pages/reviews-complaints";
import OrderingSystem from "@/pages/ordering-system";
import WageReports from "@/pages/wage-reports";
import BusinessAnalytics from "@/pages/business-analytics";
import ASTProperties from "@/pages/ast-properties";
import ASTRentCalendar from "@/pages/ast-rent-calendar";
import ASTMaintenance from "@/pages/ast-maintenance";
import TenantCommunication from "@/pages/tenant-communication";
import Landlords from "@/pages/landlords";
import LandlordStatementsAI from "@/pages/landlord-statements-ai";
import WasteClearance from "@/pages/waste-clearance";
import CarpetCleaning from "@/pages/carpet-cleaning";
import OvenCleaning from "@/pages/oven-cleaning";
import EquipmentTracking from "@/pages/equipment-tracking";
import EquipmentQRCodes from "@/pages/equipment-qr-codes";
import EquipmentScanPublic from "@/pages/equipment-scan-public";
import DwellLinen from "@/pages/dwell-linen";
import CleaningOrderAdmin from "@/pages/cleaning-order-admin";
import CleaningOrderSubmit from "@/pages/cleaning-order-submit";
import LinenOrderSubmit from "@/pages/linen-order-submit";
import CleaningOrderTracking from "@/pages/cleaning-order-tracking";
import CriticalInfo from "@/pages/critical-info";
import ComplaintForm from "@/pages/complaint-form";
import Contractors from "@/pages/contractors";
import ProperlyAllocation from "@/pages/properly-allocation";
import CleaningRota from "@/pages/cleaning-rota";
import LinenPacking from "@/pages/linen-packing";
import LinenAdmin from "@/pages/linen-admin";
import Helpdesk from "@/pages/helpdesk";
import CleaningStaffAssistant from "@/pages/cleaning-staff-assistant";
import CleaningAssistantPublic from "@/pages/cleaning-assistant-public";
import CleaningAssistantQR from "@/pages/cleaning-assistant-qr";
import LinenPackingLists from "@/pages/linen-packing-lists";
import TrainingVideos from "@/pages/training-videos";
import KnowledgeBase from "@/pages/knowledge-base";
import CleaningAssistantKnowledge from "@/pages/cleaning-assistant-knowledge";
import HelpdeskKnowledge from "@/pages/helpdesk-knowledge";
import CleaningStaffResources from "@/pages/cleaning-staff-resources";
import Clients from "@/pages/clients";
import ClientsPipeline from "@/pages/clients-pipeline";
import PropertyOnboarding from "@/pages/property-onboarding";
import ContractsManagement from "@/pages/contracts-management";
import WeeklyRota from "@/pages/weekly-rota";
import RentCheckInspectionDetail from "@/pages/rentcheck-inspection-detail";
import LandlordLogin from "@/pages/landlord-login";
import LandlordSetup from "@/pages/landlord-setup";
import LandlordPortal from "@/pages/landlord-portal";
import CleanerSchedulePage from "@/pages/cleaner-schedule";
import MasterAnalytics from "@/pages/master-analytics";
import StaffOnboarding from "@/pages/staff-onboarding";
import StaffDirectory from "@/pages/staff-directory";
import Head OfficeStock from "@/pages/head-office-stock";
import MeetingConfirm from "@/pages/meeting-confirm";
import TaskConfirmation from "@/pages/task-confirmation";
import NotFound from "@/pages/not-found";

// Simple redirect component using wouter
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to, { replace: true });
  }, [to, setLocation]);
  return null;
}

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/master-analytics" component={MasterAnalytics} />
      <Route path="/hiring" component={Dashboard} />
      <Route path="/pipeline" component={Dashboard} />
      <Route path="/meetings" component={Meetings} />
      <Route path="/analytics" component={PipelineAnalytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/staff/:id" component={StaffProfile} />
      <Route path="/staff" component={StaffDirectory} />
      <Route path="/current-staff" component={CurrentStaff} />
      <Route path="/leaderboard" component={CurrentStaff} />
      <Route path="/staff/leaderboard" component={CurrentStaff} />
      <Route path="/compliance" component={Compliance} />
      {/* Legacy compliance routes - redirect to unified page */}
      <Route path="/submit-compliance" component={Compliance} />
      <Route path="/compliance-analytics" component={Compliance} />
      <Route path="/compliance-history" component={Compliance} />
      <Route path="/availability" component={Availability} />
      <Route path="/admin-availability" component={AdminAvailability} />
      <Route path="/schedules" component={Schedules} />
      <Route path="/properties/manage" component={PropertiesManagement} />
      <Route path="/properties/:id" component={PropertyProfile} />
      <Route path="/properties" component={Properties} />
      {/* Redirect /daily-tasks to unified Task Management page */}
      <Route path="/daily-tasks">
        {() => <Redirect to="/operations/weekly-rota" />}
      </Route>
      <Route path="/maintenance" component={MaintenanceDashboard} />
      <Route path="/maintenance/plumbing" component={MaintenanceDashboard} />
      <Route path="/maintenance/electrical" component={MaintenanceDashboard} />
      <Route path="/inspection-reports" component={InspectionReports} />
      <Route path="/reviews-complaints" component={ReviewsComplaints} />
      <Route path="/ordering-system" component={OrderingSystem} />
      <Route path="/wage-reports" component={WageReports} />
      <Route path="/business-analytics" component={BusinessAnalytics} />
      <Route path="/landlords" component={Landlords} />
      <Route path="/clients/pipeline" component={ClientsPipeline} />
      <Route path="/clients" component={Clients} />
      <Route path="/client-statements" component={LandlordStatementsAI} />
      <Route path="/ast/properties" component={ASTProperties} />
      <Route path="/ast/rent-calendar" component={ASTRentCalendar} />
      <Route path="/ast/maintenance" component={ASTMaintenance} />
      <Route path="/ast/tenant-communication" component={TenantCommunication} />
      <Route path="/specialized-services/waste-clearance" component={WasteClearance} />
      <Route path="/specialized-services/carpet-cleaning" component={CarpetCleaning} />
      <Route path="/specialized-services/oven-cleaning" component={OvenCleaning} />
      <Route path="/specialized-services/gardening" component={MaintenanceDashboard} />
      <Route path="/specialized-services/locksmith" component={MaintenanceDashboard} />
      <Route path="/specialized-services/gutter-window" component={MaintenanceDashboard} />
      {/* Redirect old equipment tracking route to compliance with equipment tab */}
      <Route path="/specialized-services/equipment-tracking">
        {() => {
          const [, navigate] = useLocation();
          useEffect(() => {
            navigate('/compliance?tab=equipment', { replace: true });
          }, [navigate]);
          return null;
        }}
      </Route>
      <Route path="/equipment/qr-codes" component={EquipmentQRCodes} />
      <Route path="/specialized-services/dwell-linen" component={DwellLinen} />
      <Route path="/operations/cleaning-supplies" component={CleaningOrderAdmin} />
      <Route path="/operations/cleaning-order-tracking" component={CleaningOrderTracking} />
      <Route path="/operations/critical-info" component={CriticalInfo} />
      <Route path="/operations/contractors" component={Contractors} />
      <Route path="/operations/properly-allocation" component={ProperlyAllocation} />
      {/* Redirect /cleaning-rota to unified Daily Tasks page */}
      <Route path="/cleaning-rota">
        {() => <Redirect to="/operations/weekly-rota" />}
      </Route>
      <Route path="/operations/linen-packing" component={LinenPacking} />
      <Route path="/operations/linen-admin" component={LinenAdmin} />
      <Route path="/operations/linen-stock" component={Head OfficeStock} />
      <Route path="/helpdesk" component={Helpdesk} />
      {/* Redirect /helpdesk/knowledge to unified /helpdesk with tabs */}
      <Route path="/helpdesk/knowledge">
        {() => <Redirect to="/helpdesk" />}
      </Route>
      <Route path="/cleaning-assistant" component={CleaningStaffAssistant} />
      <Route path="/cleaning-staff-resources" component={CleaningStaffResources} />
      {/* Redirect old cleaning staff resource routes to unified page */}
      <Route path="/cleaning-assistant-qr">
        {() => <Redirect to="/cleaning-staff-resources" />}
      </Route>
      <Route path="/cleaning-assistant/linen-lists">
        {() => <Redirect to="/cleaning-staff-resources" />}
      </Route>
      <Route path="/cleaning-assistant/knowledge">
        {() => <Redirect to="/cleaning-staff-resources" />}
      </Route>
      <Route path="/training-videos" component={TrainingVideos} />
      <Route path="/operations/knowledge-base" component={KnowledgeBase} />
      <Route path="/operations/property-onboarding" component={PropertyOnboarding} />
      <Route path="/operations/contracts-management" component={ContractsManagement} />
      <Route path="/operations/renewal-calendar" component={ContractsManagement} />
      <Route path="/operations/weekly-rota" component={WeeklyRota} />
      <Route path="/rentcheck-inspections/:id" component={RentCheckInspectionDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/tv" component={LeaderboardTV} />
      <Route path="/availability-submit/:token" component={AvailabilitySubmit} />
      <Route path="/admin-availability-submit/:token" component={AdminAvailabilitySubmit} />
      <Route path="/" component={Landing} />
      <Route component={Landing} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Type guard to check if user has email
  const userEmail = user && typeof user === 'object' && 'email' in user ? (user as any).email : undefined;
  const [commandOpen, setCommandOpen] = useState(false);
  const style = {
    "--sidebar-width": "16rem",
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      setLocation('/');
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        {/* Check for public routes first (token-based access) */}
        <Switch>
          <Route path="/tv" component={LeaderboardTV} />
          <Route path="/leaderboard/public" component={LeaderboardPublic} />
          <Route path="/calendar/:token" component={CalendarPublic} />
          <Route path="/availability-submit/:token" component={AvailabilitySubmit} />
          <Route path="/admin-availability-submit/:token" component={AdminAvailabilitySubmit} />
          <Route path="/screening/:token" component={Screening} />
          <Route path="/onboarding/:token" component={Onboarding} />
          <Route path="/staff-onboarding/:token" component={StaffOnboarding} />
          <Route path="/cleaning-order/:token" component={CleaningOrderSubmit} />
          <Route path="/linen-order/:token" component={LinenOrderSubmit} />
          <Route path="/meeting-confirm/:token" component={MeetingConfirm} />
          <Route path="/complaint/:token" component={ComplaintForm} />
          <Route path="/confirm/:token" component={TaskConfirmation} />
          <Route path="/cleaner-schedule/:token" component={CleanerSchedulePage} />
          <Route path="/cleaning-assistant-public" component={CleaningAssistantPublic} />
          <Route path="/equipment/scan/:type/:number" component={EquipmentScanPublic} />
          <Route path="/landlord-login" component={LandlordLogin} />
          <Route path="/landlord-setup/:token" component={LandlordSetup} />
          <Route path="/landlord-portal" component={LandlordPortal} />
          <Route>
            {/* Public routes - no sidebar/header */}
            {isLoading || !isAuthenticated ? (
              <div className="h-screen w-full">
                <PublicRouter />
              </div>
            ) : (
              /* Authenticated routes - with sidebar/header */
              <SidebarProvider style={style as React.CSSProperties}>
                <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
                <div className="flex h-screen w-full">
                  <AppSidebar />
                  <div className="flex flex-col flex-1">
                    <header className="flex items-center justify-between p-2 sm:p-4 border-b gap-2 flex-wrap">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <SidebarTrigger data-testid="button-sidebar-toggle" />
                      </div>
                      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCommandOpen(true)}
                          data-testid="button-search"
                          className="gap-2"
                        >
                          <Search className="h-4 w-4" />
                          <span className="hidden sm:inline-flex">Search</span>
                          <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
                            <span className="text-xs">⌘</span>K
                          </kbd>
                        </Button>
                        {userEmail && (
                          <span className="hidden lg:inline-flex text-sm text-muted-foreground whitespace-nowrap" data-testid="user-email">
                            {userEmail}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleLogout}
                          data-testid="button-logout"
                          title="Log out"
                        >
                          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </header>
                    <main className="flex-1 overflow-auto">
                      <AuthenticatedRouter />
                    </main>
                  </div>
                </div>
              </SidebarProvider>
            )}
          </Route>
        </Switch>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
