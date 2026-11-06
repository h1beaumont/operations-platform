import { Users, Calendar, Settings, Trophy, CalendarDays, ClipboardCheck, CalendarClock, Building2, BookOpen, UserCog, BarChart3, GraduationCap, Wrench, DollarSign, MessageSquare, ShoppingCart, Calculator, TrendingUp, ChevronDown, Home, FileText, CalendarCheck, CheckSquare, ListChecks, Briefcase, Trash2, ClipboardList, Package, KeyRound, Droplet, Zap, HardHat, MessageCircle, HelpCircle, PlusCircle, Sparkles, Flame, QrCode, Database, Mail, FileCheck, Bot } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import { DualClocks } from "@/components/dual-clocks";
import logoImage from "@assets/Northstay logo black-01 (8)_1761129570743.png";

const overviewItem = { title: "Overview & Guide", url: "/", icon: BookOpen };

// Top priority items - always visible at the top
const quickAccessItems = [
  { title: "Master Analytics", url: "/master-analytics", icon: BarChart3 },
  { title: "Daily Tasks", url: "/operations/weekly-rota", icon: ListChecks },
  { title: "Critical Info", url: "/operations/critical-info", icon: KeyRound },
  { title: "Management Chatbot", url: "/helpdesk", icon: Bot },
];

const hiringPipelineItems = [
  { title: "Pipeline", url: "/pipeline", icon: Users },
  { title: "Meetings", url: "/meetings", icon: Calendar },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

const staffManagementItems = [
  { title: "Staff Directory", url: "/staff", icon: Users },
  { title: "Compliance Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Availability", url: "/availability", icon: CalendarDays },
  { title: "Contractors", url: "/operations/contractors", icon: HardHat },
];

const cleaningAssistantItems = [
  { title: "Cleaning Assistant", url: "/cleaning-assistant", icon: Sparkles },
  { title: "Staff Resources", url: "/cleaning-staff-resources", icon: Package },
];

const maintenanceItems = [
  { title: "General Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Plumbing", url: "/maintenance/plumbing", icon: Droplet },
  { title: "Electrical", url: "/maintenance/electrical", icon: Zap },
];

const qualityControlItems = [
  { title: "Inspections", url: "/inspection-reports", icon: ClipboardCheck },
  { title: "Reviews & Complaints", url: "/reviews-complaints", icon: MessageSquare },
];

const financeItems = [
  { title: "Wage Reports", url: "/wage-reports", icon: Calculator },
  { title: "Business Analytics", url: "/business-analytics", icon: TrendingUp },
];

const operationsHubItems = [
  { title: "Admin Availability", url: "/admin-availability", icon: UserCog },
  { title: "Schedules", url: "/schedules", icon: CalendarClock },
  { title: "Staff Compliance", url: "/compliance", icon: ClipboardCheck },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Training Videos", url: "/training-videos", icon: GraduationCap },
];

const managementItems = [
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Client Pipeline", url: "/clients/pipeline", icon: TrendingUp },
  { title: "Client Statements", url: "/client-statements", icon: FileText },
  { title: "Management Contracts", url: "/operations/contracts-management", icon: FileCheck },
];

const specialisedServicesItems = [
  { title: "Waste Clearance", url: "/specialized-services/waste-clearance", icon: Trash2 },
  { title: "Carpet Cleaning", url: "/specialized-services/carpet-cleaning", icon: Sparkles },
  { title: "Oven Cleaning", url: "/specialized-services/oven-cleaning", icon: Flame },
  { title: "Gardener", url: "/specialized-services/gardening", icon: Briefcase },
  { title: "Locksmith", url: "/specialized-services/locksmith", icon: KeyRound },
  { title: "Gutter & Window Cleaning", url: "/specialized-services/gutter-window", icon: Droplet },
];

const orderingItems = [
  { title: "Ordering System", url: "/ordering-system", icon: ShoppingCart },
  { title: "Cleaning Supplies", url: "/operations/cleaning-supplies", icon: Package },
  { title: "Order Tracking", url: "/operations/cleaning-order-tracking", icon: ClipboardCheck },
];

const linenManagementItems = [
  { title: "Linen Admin", url: "/operations/linen-admin", icon: ClipboardList },
  { title: "Linen Packing", url: "/operations/linen-packing", icon: Package },
  { title: "Hotel Linen Ordering", url: "/specialized-services/dwell-linen", icon: Package },
];

const astLettingsItems = [
  { title: "Landlords", url: "/landlords", icon: Users },
  { title: "Properties", url: "/ast/properties", icon: Home },
  { title: "Rent Calendar", url: "/ast/rent-calendar", icon: CalendarCheck },
  { title: "Maintenance", url: "/ast/maintenance", icon: Wrench },
  { title: "Tenant Communication", url: "/ast/tenant-communication", icon: Mail },
];

const propertyManagementItems = [
  { title: "Property Onboarding", url: "/operations/property-onboarding", icon: PlusCircle },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [openSections, setOpenSections] = useState({
    staff: true,
    staffHiring: true,
    staffManagement: true,
    cleaningAssistant: true,
    operations: true,
    propertyManagement: true,
    maintenance: true,
    qualityControl: true,
    finance: true,
    management: true,
    specialized: true,
    ordering: true,
    linenManagement: true,
    ast: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={logoImage} alt="Northstay" className="h-24 w-auto object-contain dark:invert" />
          <div>
            <h2 className="text-lg font-bold">Operations Hub</h2>
            <p className="text-xs text-muted-foreground">Northstay</p>
          </div>
          <div className="mt-2">
            <DualClocks size="small" />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={location === overviewItem.url} data-testid="sidebar-link-overview">
                  <Link href={overviewItem.url}>
                    <overviewItem.icon />
                    <span>{overviewItem.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Access - Top Priority Items */}
        <SidebarGroup className="border-b pb-4">
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider opacity-70">
            Quick Access
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickAccessItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible open={openSections.operations} onOpenChange={() => toggleSection('operations')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-operations">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Operations Hub</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.operations ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {operationsHubItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.staff} onOpenChange={() => toggleSection('staff')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-staff">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Staff</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.staff ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <Collapsible open={openSections.staffHiring} onOpenChange={() => toggleSection('staffHiring')}>
                  <div className="ml-2">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-sidebar-accent cursor-pointer group" data-testid="sidebar-subsection-hiring">
                        <span className="text-xs font-medium opacity-70 group-hover:opacity-100 transition-opacity">Hiring Pipeline</span>
                        <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.staffHiring ? '' : '-rotate-90'}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu className="ml-2">
                        {hiringPipelineItems.map((item) => (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase()}`}>
                              <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <Collapsible open={openSections.staffManagement} onOpenChange={() => toggleSection('staffManagement')}>
                  <div className="ml-2">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-sidebar-accent cursor-pointer group" data-testid="sidebar-subsection-staff-management">
                        <span className="text-xs font-medium opacity-70 group-hover:opacity-100 transition-opacity">Staff Management</span>
                        <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.staffManagement ? '' : '-rotate-90'}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu className="ml-2">
                        {staffManagementItems.map((item) => (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <SidebarMenu>
                  {cleaningAssistantItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.propertyManagement} onOpenChange={() => toggleSection('propertyManagement')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-property-management">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Property Management</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.propertyManagement ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {propertyManagementItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.maintenance} onOpenChange={() => toggleSection('maintenance')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-maintenance">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Maintenance</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.maintenance ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {maintenanceItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  
                  {/* Specialised Services Subsection */}
                  <Collapsible open={openSections.specialized} onOpenChange={() => toggleSection('specialized')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="cursor-pointer" data-testid="sidebar-subsection-specialized">
                          <Briefcase className="h-4 w-4" />
                          <span>Specialised Services</span>
                          <ChevronDown className={`ml-auto h-3 w-3 transition-all ${openSections.specialized ? '' : '-rotate-90'}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent>
                      <SidebarMenu className="ml-4 border-l border-sidebar-border">
                        {specialisedServicesItems.map((item) => (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.qualityControl} onOpenChange={() => toggleSection('qualityControl')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-quality-control">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Quality Control</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.qualityControl ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {qualityControlItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.finance} onOpenChange={() => toggleSection('finance')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-finance">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Finance</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.finance ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {financeItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.management} onOpenChange={() => toggleSection('management')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-management">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Management</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.management ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managementItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.ordering} onOpenChange={() => toggleSection('ordering')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-ordering">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Ordering</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.ordering ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {orderingItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.linenManagement} onOpenChange={() => toggleSection('linenManagement')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-linen-management">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">Linen Management</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.linenManagement ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {linenManagementItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={openSections.ast} onOpenChange={() => toggleSection('ast')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between group" data-testid="sidebar-section-ast-lettings">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">AST Lettings</span>
                <ChevronDown className={`h-3 w-3 opacity-50 group-hover:opacity-100 transition-all ${openSections.ast ? '' : '-rotate-90'}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {astLettingsItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url} data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}
