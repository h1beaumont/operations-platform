// Reference: javascript_database blueprint
import {
  candidates,
  groupMeetings,
  meetingConfirmations,
  trialShifts,
  candidateStageHistory,
  hiringSettings,
  staff,
  complianceEvents,
  prizeSettings,
  systemSettings,
  availability,
  availabilityRequests,
  availabilityResponses,
  adminStaff,
  adminAvailabilityRequests,
  adminAvailabilityResponses,
  adminShiftTemplates,
  adminScheduledShifts,
  locationGroups,
  properties,
  propertyAliases,
  importBatches,
  cleaningJobs,
  cleaningAssignments,
  matchingIssues,
  assignmentNotifications,
  users,
  screeningLinks,
  screeningResponses,
  onboardingSubmissions,
  photoIdUploads,
  meetingAttendance,
  communicationLogs,
  onboardingChecklistTemplates,
  onboardingChecklistItems,
  badges,
  staffBadges,
  scheduleConversations,
  scheduleDrafts,
  scheduleTimetables,
  cleanerScheduleAcceptances,
  maintenanceRequests,
  contractors,
  maintenanceAssignments,
  type Candidate,
  type InsertCandidate,
  type GroupMeeting,
  type InsertGroupMeeting,
  type MeetingConfirmation,
  type InsertMeetingConfirmation,
  type TrialShift,
  type InsertTrialShift,
  type CandidateStageHistory,
  type InsertCandidateStageHistory,
  type HiringSettings,
  type InsertHiringSettings,
  type Staff,
  type InsertStaff,
  type ComplianceEvent,
  type InsertComplianceEvent,
  type PrizeSettings,
  type InsertPrizeSettings,
  type SystemSettings,
  type InsertSystemSettings,
  type Availability,
  type InsertAvailability,
  type AvailabilityRequest,
  type InsertAvailabilityRequest,
  type AvailabilityResponse,
  type InsertAvailabilityResponse,
  type AdminStaff,
  type InsertAdminStaff,
  type AdminAvailabilityRequest,
  type InsertAdminAvailabilityRequest,
  type AdminAvailabilityResponse,
  type InsertAdminAvailabilityResponse,
  type AdminShiftTemplate,
  type InsertAdminShiftTemplate,
  type AdminScheduledShift,
  type InsertAdminScheduledShift,
  type LocationGroup,
  type InsertLocationGroup,
  type Property,
  type InsertProperty,
  type PropertyAlias,
  type InsertPropertyAlias,
  type ImportBatch,
  type InsertImportBatch,
  type CleaningJob,
  type InsertCleaningJob,
  type CleaningAssignment,
  type InsertCleaningAssignment,
  type MatchingIssue,
  type InsertMatchingIssue,
  type AssignmentNotification,
  type InsertAssignmentNotification,
  type User,
  type UpsertUser,
  type ScreeningLink,
  type InsertScreeningLink,
  type ScreeningResponse,
  type InsertScreeningResponse,
  type OnboardingSubmission,
  type InsertOnboardingSubmission,
  type PhotoIdUpload,
  type InsertPhotoIdUpload,
  type MeetingAttendance,
  type InsertMeetingAttendance,
  type CommunicationLog,
  type InsertCommunicationLog,
  type OnboardingChecklistTemplate,
  type InsertOnboardingChecklistTemplate,
  type OnboardingChecklistItem,
  type InsertOnboardingChecklistItem,
  type Badge,
  type InsertBadge,
  type StaffBadge,
  type InsertStaffBadge,
  type ScheduleConversation,
  type ScheduleDraft,
  type ScheduleTimetable,
  type InsertScheduleTimetable,
  type CleanerScheduleAcceptance,
  type InsertCleanerScheduleAcceptance,
  type MaintenanceRequest,
  type InsertMaintenanceRequest,
  type Contractor,
  type InsertContractor,
  type MaintenanceAssignment,
  type InsertMaintenanceAssignment,
  inspectionTemplates,
  inspectionReports,
  inspectionItems,
  inspectionIssues,
  inspectionNotificationSettings,
  type InspectionTemplate,
  type InsertInspectionTemplate,
  type InspectionReport,
  type InsertInspectionReport,
  type InspectionItem,
  type InsertInspectionItem,
  type InspectionIssue,
  type InsertInspectionIssue,
  type InspectionNotificationSettings,
  type InsertInspectionNotificationSettings,
  reviewsComplaints,
  reviewCategories,
  actionItems,
  reviewThemes,
  complaintSubmissionTokens,
  type ReviewComplaint,
  type InsertReviewComplaint,
  type ReviewCategory,
  type InsertReviewCategory,
  type ActionItem,
  type InsertActionItem,
  type ReviewTheme,
  type InsertReviewTheme,
  type ComplaintSubmissionToken,
  type InsertComplaintSubmissionToken,
  orderingSuppliers,
  orderingProducts,
  orderingOrders,
  orderingOrderItems,
  orderingStockMovements,
  type OrderingSupplier,
  type InsertOrderingSupplier,
  type OrderingProduct,
  type InsertOrderingProduct,
  type OrderingOrder,
  type InsertOrderingOrder,
  type OrderingOrderItem,
  type InsertOrderingOrderItem,
  type OrderingStockMovement,
  type InsertOrderingStockMovement,
  stockCounts,
  type StockCount,
  type InsertStockCount,
  supplierInvoices,
  productPriceHistory,
  type SupplierInvoice,
  type InsertSupplierInvoice,
  type ProductPriceHistory,
  type InsertProductPriceHistory,
  wageReports,
  wageSettings,
  timesheets,
  type WageReport,
  type InsertWageReport,
  type WageSettings,
  type InsertWageSettings,
  type Timesheet,
  type InsertTimesheet,
  landlords,
  monthlyStatements,
  astBuildings,
  astApartments,
  astProperties,
  astTenancies,
  astContracts,
  astRentPayments,
  astInventoryReports,
  astDeposits,
  type Landlord,
  type InsertLandlord,
  type MonthlyStatement,
  type InsertMonthlyStatement,
  type AstBuilding,
  type InsertAstBuilding,
  type AstApartment,
  type InsertAstApartment,
  type AstProperty,
  type InsertAstProperty,
  type AstTenancy,
  type InsertAstTenancy,
  type AstContract,
  type InsertAstContract,
  type AstRentPayment,
  type InsertAstRentPayment,
  type AstInventoryReport,
  type InsertAstInventoryReport,
  type AstDeposit,
  type InsertAstDeposit,
  taskTemplates,
  dailyTaskInstances,
  type TaskTemplate,
  type InsertTaskTemplate,
  type DailyTaskInstance,
  type InsertDailyTaskInstance,
  specializedServiceRequests,
  equipmentMovements,
  dwellLinenOrders,
  type SpecializedServiceRequest,
  type InsertSpecializedServiceRequest,
  type EquipmentMovement,
  type InsertEquipmentMovement,
  linenOrderSchedules,
  type LinenOrderSchedule,
  type InsertLinenOrderSchedule,
  type DwellLinenOrder,
  type InsertDwellLinenOrder,
  linenDeliveryNotes,
  type LinenDeliveryNote,
  type InsertLinenDeliveryNote,
  cleaningOrderSchedules,
  cleaningOrders,
  cleaningOrderReminderLogs,
  type CleaningOrderSchedule,
  type InsertCleaningOrderSchedule,
  type CleaningOrder,
  type InsertCleaningOrder,
  type CleaningOrderReminderLog,
  type InsertCleaningOrderReminderLog,
  criticalInfo,
  type CriticalInfo,
  type InsertCriticalInfo,
  cleaningRates,
  type CleaningRate,
  type InsertCleaningRate,
  wagePeriods,
  wageDocumentUploads,
  cleanerWages,
  wageTokens,
  type WagePeriod,
  type InsertWagePeriod,
  type WageDocumentUpload,
  type InsertWageDocumentUpload,
  type CleanerWage,
  type InsertCleanerWage,
  type WageToken,
  type InsertWageToken,
  uplistingBookingUploads,
  uplistingCheckoutSchedule,
  type UplistingBookingUpload,
  type InsertUplistingBookingUpload,
  type UplistingCheckoutSchedule,
  type InsertUplistingCheckoutSchedule,
  properlyUploads,
  properlyCleaningTasks,
  cleanerBuildingPreferences,
  properlyCleanerAllocations,
  allocationHistory,
  manualCleaningAdjustments,
  type ProperlyUpload,
  type InsertProperlyUpload,
  type ManualCleaningAdjustment,
  type InsertManualCleaningAdjustment,
  type ProperlyCleaningTask,
  type InsertProperlyCleaningTask,
  type CleanerBuildingPreference,
  type InsertCleanerBuildingPreference,
  type ProperlyCleanerAllocation,
  type InsertProperlyCleanerAllocation,
  type AllocationHistory,
  type InsertAllocationHistory,
  linenPackingItems,
  specialRequests,
  cleaningCosts,
  linenPackingSessions,
  guestSupportChatSessions,
  guestSupportChatMessages,
  type LinenPackingItem,
  type InsertLinenPackingItem,
  type SpecialRequest,
  type InsertSpecialRequest,
  type CleaningCost,
  type InsertCleaningCost,
  type LinenPackingSession,
  type InsertLinenPackingSession,
  type GuestSupportChatSession,
  type InsertGuestSupportChatSession,
  type GuestSupportChatMessage,
  type InsertGuestSupportChatMessage,
  trainingVideos,
  trainingCompletions,
  type TrainingVideo,
  type InsertTrainingVideo,
  type TrainingCompletion,
  helpdeskChatSessions,
  helpdeskChatMessages,
  type HelpdeskChatSession,
  type InsertHelpdeskChatSession,
  type HelpdeskChatMessage,
  type InsertHelpdeskChatMessage,
  tenantCommunicationChatSessions,
  tenantCommunicationChatMessages,
  type TenantCommunicationChatSession,
  type InsertTenantCommunicationChatSession,
  type TenantCommunicationChatMessage,
  type InsertTenantCommunicationChatMessage,
  knowledgeBaseEntries,
  type KnowledgeBaseEntry,
  type InsertKnowledgeBaseEntry,
  pendingKnowledgeUploads,
  type PendingKnowledgeUpload,
  type InsertPendingKnowledgeUpload,
  linenPackingLists,
  type LinenPackingList,
  type InsertLinenPackingList,
  weeklyRotaTasks,
  type WeeklyRotaTask,
  type InsertWeeklyRotaTask,
  propertyOnboardingSessions,
  propertyOnboardingResponses,
  managementContracts,
  type PropertyOnboardingSession,
  type InsertPropertyOnboardingSession,
  type PropertyOnboardingResponse,
  type InsertPropertyOnboardingResponse,
  type ManagementContract,
  type InsertManagementContract,
  type HiringPipelineMetrics,
  type SourcePerformance,
  type TimeToHireMetrics,
  bankStatements,
  financialTransactions,
  type BankStatement,
  type InsertBankStatement,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  rentCheckInspections,
  rentCheckRoomRatings,
  type RentCheckInspection,
  type InsertRentCheckInspection,
  type RentCheckRoomRating,
  type InsertRentCheckRoomRating,
  potentialClients,
  clientContacts,
  clientProperties,
  clientPipelineStages,
  clientStageHistory,
  clientMeetings,
  clientFollowUps,
  clientCommunications,
  activityLogs,
  type PotentialClient,
  type InsertPotentialClient,
  type ClientContact,
  type InsertClientContact,
  type ClientProperty,
  type InsertClientProperty,
  type ClientPipelineStage,
  type InsertClientPipelineStage,
  type ClientStageHistory,
  type InsertClientStageHistory,
  type ClientMeeting,
  type InsertClientMeeting,
  type UpdateClientMeetingOutcome,
  type ClientFollowUp,
  type InsertClientFollowUp,
  type ClientCommunication,
  type InsertClientCommunication,
  type ActivityLog,
  type InsertActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, gte, lte, between, asc, lt, ne } from "drizzle-orm";
import { randomUUID } from "crypto";

// Export db for use in services that need direct transaction access
export { db };

export interface IStorage {
  // User operations (Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Candidates
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  getCandidateByEmail(email: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  bulkCreateCandidates(candidates: InsertCandidate[]): Promise<Candidate[]>;
  updateCandidate(id: string, updates: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  getScreenedCandidatesByRoleType(roleType: string): Promise<Candidate[]>;
  deleteCandidate(id: string): Promise<void>;

  // Group Meetings
  getGroupMeetings(): Promise<GroupMeeting[]>;
  getGroupMeeting(id: string): Promise<GroupMeeting | undefined>;
  createGroupMeeting(meeting: InsertGroupMeeting): Promise<GroupMeeting>;
  updateGroupMeeting(id: string, updates: Partial<GroupMeeting>): Promise<GroupMeeting | undefined>;
  deleteGroupMeeting(id: string): Promise<void>;
  getCandidatesByMeeting(meetingId: string): Promise<Candidate[]>;
  getGroupMeetingByAttendanceToken(token: string): Promise<GroupMeeting | undefined>;
  generateAttendanceTokenForMeeting(meetingId: string): Promise<string>;

  // Meeting Confirmations
  createMeetingConfirmation(confirmation: InsertMeetingConfirmation): Promise<MeetingConfirmation>;
  getMeetingConfirmationByToken(token: string): Promise<MeetingConfirmation | undefined>;
  confirmMeetingByToken(token: string): Promise<MeetingConfirmation | undefined>;
  getMeetingConfirmationsByMeeting(meetingId: string): Promise<MeetingConfirmation[]>;

  // Trial Shifts
  getTrialShifts(): Promise<TrialShift[]>;
  getTrialShift(id: string): Promise<TrialShift | undefined>;
  createTrialShift(shift: InsertTrialShift): Promise<TrialShift>;
  updateTrialShift(id: string, updates: Partial<InsertTrialShift>): Promise<TrialShift | undefined>;

  // Candidate Stage History
  addCandidateStageHistory(data: InsertCandidateStageHistory): Promise<CandidateStageHistory>;
  getCandidateStageHistory(candidateId: string): Promise<CandidateStageHistory[]>;

  // Settings
  getSettings(): Promise<HiringSettings | undefined>;
  updateSettings(updates: Partial<InsertHiringSettings>): Promise<HiringSettings>;

  // Staff
  createStaff(data: InsertStaff): Promise<Staff>;
  getStaff(id: string): Promise<Staff | null>;
  getStaffByEmail(email: string): Promise<Staff | null>;
  getAllStaff(): Promise<Staff[]>;
  getActiveStaff(): Promise<Staff[]>;
  updateStaff(id: string, data: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;
  findStaffByName(fullName: string): Promise<Staff | null>;
  updateStaffProfile(id: string, data: Partial<InsertStaff>): Promise<Staff>;
  getStaffWithMetrics(id: string): Promise<any>;

  // Compliance Events
  createComplianceEvent(data: InsertComplianceEvent): Promise<ComplianceEvent>;
  getComplianceEvents(filters?: { staffId?: string; startDate?: string; endDate?: string }): Promise<ComplianceEvent[]>;
  getComplianceEventsByStaff(staffId: string): Promise<ComplianceEvent[]>;
  getComplianceEventById(eventId: string): Promise<ComplianceEvent | null>;
  getStaffComplianceStats(staffId: string): Promise<{averageScore: number, totalEvents: number, lastScore: number | null}>;
  getStaffLeaderboard(): Promise<Array<{ staff: Staff, avgScore: number, totalEvents: number }>>;
  hasAvailabilityComplianceEvent(staffId: string, requestId: string): Promise<boolean>;

  // Compliance Analytics
  getComplianceOverview(dateFrom?: Date, dateTo?: Date): Promise<{
    totalEvents: number;
    averageScore: number;
    totalStaff: number;
    perfectScoreCount: number;
    failedEvents: number;
    complianceRate: number;
  }>;
  getCommonComplianceIssues(dateFrom?: Date, dateTo?: Date): Promise<Array<{
    criterion: string;
    failureCount: number;
    failureRate: number;
    impactPoints: number;
  }>>;
  getWeeklyComplianceTrends(weeksBack?: number): Promise<Array<{
    weekStart: string;
    averageScore: number;
    totalEvents: number;
    complianceRate: number;
    perfectScoreCount: number;
  }>>;
  getPropertyComplianceStats(): Promise<Array<{
    property: string;
    totalEvents: number;
    averageScore: number;
    complianceRate: number;
  }>>;
  getTrainingNeeds(): Promise<Array<{
    criterion: string;
    weight: number;
    staffNeedingTraining: Array<{ staffId: string; staffName: string; failureRate: number }>;
  }>>;

  // Prize Settings
  getPrizeSettings(): Promise<PrizeSettings>;
  updatePrizeSettings(data: Partial<InsertPrizeSettings>): Promise<PrizeSettings>;

  // System Settings
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(data: Partial<InsertSystemSettings>): Promise<SystemSettings>;

  // Availability (legacy)
  getAvailability(startDate: string, endDate: string): Promise<Availability[]>;
  getAvailabilityByStaffAndDate(staffId: string, date: string): Promise<Availability | null>;
  createAvailability(data: InsertAvailability): Promise<Availability>;
  updateAvailability(id: string, data: Partial<InsertAvailability>): Promise<Availability>;
  upsertAvailability(staffId: string, date: string, available: boolean, notes?: string): Promise<Availability>;

  // Availability Requests (in-house SMS system)
  createAvailabilityRequest(data: InsertAvailabilityRequest): Promise<AvailabilityRequest>;
  getAvailabilityRequest(id: string): Promise<AvailabilityRequest | undefined>;
  getRecentAvailabilityRequests(limit?: number): Promise<AvailabilityRequest[]>;
  updateAvailabilityRequest(id: string, updates: Partial<InsertAvailabilityRequest>): Promise<AvailabilityRequest | undefined>;

  // Availability Responses (staff submissions)
  createAvailabilityResponse(data: InsertAvailabilityResponse): Promise<AvailabilityResponse>;
  getAvailabilityResponsesByToken(token: string): Promise<AvailabilityResponse[]>;
  getAvailabilityResponsesByRequest(requestId: string): Promise<AvailabilityResponse[]>;
  getAvailabilityResponsesByRequestAndStaff(requestId: string, staffId: string): Promise<AvailabilityResponse[]>;
  getAvailabilityResponsesByDateRange(startDate: string, endDate: string): Promise<AvailabilityResponse[]>;
  getAvailabilityResponsesByStaffAndDate(staffId: string, date: string): Promise<AvailabilityResponse[]>;
  upsertAvailabilityResponse(staffId: string, date: string, timeSlot: string, available: boolean, token: string): Promise<AvailabilityResponse>;
  bulkSubmitAvailability(token: string, responses: Array<{ staffId: string, date: string, timeSlot: string, available: boolean }>): Promise<AvailabilityResponse[]>;
  getAvailabilityFormData(token: string): Promise<{ staff: Staff, request: AvailabilityRequest, responses: AvailabilityResponse[] } | null>;
  getStaffSubmissionStatus(requestId: string): Promise<Array<{ staffId: string; staffName: string; phone: string | null; token: string; submitted: boolean }>>;

  // Admin Staff
  getAdminStaff(): Promise<AdminStaff[]>;
  getAdminStaffById(id: string): Promise<AdminStaff | null>;
  getAdminStaffByEmail(email: string): Promise<AdminStaff | null>;
  createAdminStaff(data: InsertAdminStaff): Promise<AdminStaff>;
  updateAdminStaff(id: string, data: Partial<InsertAdminStaff>): Promise<AdminStaff>;
  deleteAdminStaff(id: string): Promise<void>;

  // Admin Availability Requests
  createAdminAvailabilityRequest(data: InsertAdminAvailabilityRequest): Promise<AdminAvailabilityRequest>;
  getAdminAvailabilityRequest(id: string): Promise<AdminAvailabilityRequest | undefined>;
  updateAdminAvailabilityRequest(id: string, updates: Partial<InsertAdminAvailabilityRequest>): Promise<AdminAvailabilityRequest | undefined>;

  // Admin Availability Responses
  createAdminAvailabilityResponse(data: InsertAdminAvailabilityResponse): Promise<AdminAvailabilityResponse>;
  getAdminAvailabilityResponsesByToken(token: string): Promise<AdminAvailabilityResponse[]>;
  getAdminAvailabilityResponsesByDateRange(startDate: string, endDate: string): Promise<AdminAvailabilityResponse[]>;
  upsertAdminAvailabilityResponse(adminStaffId: string, date: string, timeSlot: string, available: boolean, token: string): Promise<AdminAvailabilityResponse>;

  // Admin Shift Templates
  createShiftTemplate(data: InsertAdminShiftTemplate): Promise<AdminShiftTemplate>;
  getShiftTemplates(staffId?: string): Promise<AdminShiftTemplate[]>;
  getShiftTemplate(id: string): Promise<AdminShiftTemplate | null>;
  updateShiftTemplate(id: string, data: Partial<InsertAdminShiftTemplate>): Promise<AdminShiftTemplate>;
  deleteShiftTemplate(id: string): Promise<void>;

  // Admin Scheduled Shifts
  createScheduledShift(data: InsertAdminScheduledShift): Promise<AdminScheduledShift>;
  getScheduledShifts(startDate: string, endDate: string, staffId?: string): Promise<AdminScheduledShift[]>;
  getScheduledShift(id: string): Promise<AdminScheduledShift | null>;
  updateScheduledShift(id: string, data: Partial<InsertAdminScheduledShift>): Promise<AdminScheduledShift>;
  deleteScheduledShift(id: string): Promise<void>;
  generateShiftsFromTemplates(startDate: string, endDate: string, staffId?: string): Promise<AdminScheduledShift[]>;
  getWeeklyHoursSummary(startDate: string, endDate: string): Promise<Array<{
    staffId: string;
    staffName: string;
    totalHours: number;
    byDay: Record<string, number>;
  }>>;

  // Location Groups
  createLocationGroup(data: InsertLocationGroup): Promise<LocationGroup>;
  getLocationGroups(): Promise<LocationGroup[]>;
  getLocationGroup(id: string): Promise<LocationGroup | null>;
  updateLocationGroup(id: string, data: Partial<InsertLocationGroup>): Promise<LocationGroup>;
  deleteLocationGroup(id: string): Promise<void>;

  // Properties
  createProperty(data: InsertProperty): Promise<Property>;
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | null>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  getPropertiesByLocationGroup(locationGroupId: string): Promise<Property[]>;
  findPropertyByUplistingId(uplistingId: string): Promise<Property | null>;
  findPropertyByName(name: string): Promise<Property | null>;
  getPropertyDetails(id: string): Promise<Property | null>;
  calculateTravelTimes(propertyId: string, limit?: number): Promise<Array<{
    property: Property;
    distanceKm: number;
    travelTimeMinutes: number;
  }>>;
  bulkImportProperties(properties: Array<{
    row: number;
    data: Partial<InsertProperty> & { locationGroup?: string };
  }>): Promise<{
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  }>;

  // Property Aliases
  createPropertyAlias(data: InsertPropertyAlias): Promise<PropertyAlias>;
  getPropertyAliases(propertyId: string): Promise<PropertyAlias[]>;

  // Import Batches
  createImportBatch(data: InsertImportBatch): Promise<ImportBatch>;
  getImportBatches(): Promise<ImportBatch[]>;
  getImportBatch(id: string): Promise<ImportBatch | null>;
  updateImportBatch(id: string, data: Partial<InsertImportBatch>): Promise<ImportBatch>;

  // Cleaning Jobs
  createCleaningJob(data: InsertCleaningJob): Promise<CleaningJob>;
  getCleaningJobs(filters?: { startDate?: string, endDate?: string, status?: string }): Promise<CleaningJob[]>;
  getCleaningJob(id: string): Promise<CleaningJob | null>;
  updateCleaningJob(id: string, data: Partial<InsertCleaningJob>): Promise<CleaningJob>;

  // Cleaning Assignments
  createCleaningAssignment(data: InsertCleaningAssignment): Promise<CleaningAssignment>;
  getCleaningAssignments(filters?: { startDate?: string, endDate?: string, staffId?: string }): Promise<CleaningAssignment[]>;
  getCleaningAssignment(id: string): Promise<CleaningAssignment | null>;
  updateCleaningAssignment(id: string, data: Partial<InsertCleaningAssignment>): Promise<CleaningAssignment>;
  getAssignmentsByWeek(startDate: string, endDate: string): Promise<CleaningAssignment[]>;

  // Matching Issues
  createMatchingIssue(data: InsertMatchingIssue): Promise<MatchingIssue>;
  getMatchingIssues(importBatchId?: string): Promise<MatchingIssue[]>;
  resolveMatchingIssue(id: string, propertyId: string): Promise<MatchingIssue>;

  // Assignment Notifications
  createAssignmentNotification(data: InsertAssignmentNotification): Promise<AssignmentNotification>;

  // Schedule Drafts
  getScheduleDrafts(weekStart?: string): Promise<ScheduleDraft[]>;

  // Schedule Timetables
  createScheduleTimetable(data: InsertScheduleTimetable): Promise<ScheduleTimetable>;
  getScheduleTimetables(weekStart?: string): Promise<ScheduleTimetable[]>;
  getScheduleTimetable(id: string): Promise<ScheduleTimetable | null>;
  getScheduleTimetableByToken(token: string): Promise<ScheduleTimetable | null>;
  updateScheduleTimetable(id: string, data: Partial<InsertScheduleTimetable>): Promise<ScheduleTimetable>;

  // Cleaner Schedule Acceptances
  createCleanerScheduleAcceptance(data: InsertCleanerScheduleAcceptance): Promise<CleanerScheduleAcceptance>;
  getCleanerScheduleAcceptances(timetableId: string): Promise<CleanerScheduleAcceptance[]>;
  getCleanerScheduleAcceptance(timetableId: string, cleanerId: string): Promise<CleanerScheduleAcceptance | null>;

  // Screening Links
  createScreeningLink(data: InsertScreeningLink): Promise<ScreeningLink>;
  getScreeningLink(id: string): Promise<ScreeningLink | null>;
  getScreeningLinkByToken(token: string): Promise<ScreeningLink | null>;
  getScreeningLinksByCandidate(candidateId: string): Promise<ScreeningLink[]>;
  updateScreeningLink(id: string, updates: Partial<InsertScreeningLink>): Promise<ScreeningLink | null>;

  // Screening Responses
  createScreeningResponse(data: InsertScreeningResponse): Promise<ScreeningResponse>;
  getScreeningResponsesByLink(screeningLinkId: string): Promise<ScreeningResponse[]>;
  getScreeningResponsesByCandidate(candidateId: string): Promise<ScreeningResponse[]>;

  // Onboarding Submissions
  createOnboardingSubmission(data: InsertOnboardingSubmission): Promise<OnboardingSubmission>;
  getOnboardingSubmission(id: string): Promise<OnboardingSubmission | null>;
  getOnboardingSubmissionByToken(token: string): Promise<OnboardingSubmission | null>;
  getOnboardingSubmissionByCandidate(candidateId: string): Promise<OnboardingSubmission | null>;
  updateOnboardingSubmission(id: string, updates: Partial<InsertOnboardingSubmission>): Promise<OnboardingSubmission | null>;

  // Photo ID Uploads
  createPhotoIdUpload(data: InsertPhotoIdUpload): Promise<PhotoIdUpload>;
  getPhotoIdUpload(id: string): Promise<PhotoIdUpload | null>;
  getPhotoIdUploadsByCandidate(candidateId: string): Promise<PhotoIdUpload[]>;
  updatePhotoIdUploadAccess(id: string, accessedBy: string): Promise<PhotoIdUpload | null>;
  deletePhotoIdUpload(id: string): Promise<void>;

  // Meeting Attendance
  createMeetingAttendance(data: InsertMeetingAttendance): Promise<MeetingAttendance>;
  getMeetingAttendance(id: string): Promise<MeetingAttendance | null>;
  getMeetingAttendanceByMeeting(meetingId: string): Promise<MeetingAttendance[]>;
  getMeetingAttendanceByCandidate(candidateId: string): Promise<MeetingAttendance[]>;
  updateMeetingAttendance(id: string, updates: Partial<InsertMeetingAttendance>): Promise<MeetingAttendance | null>;

  // Communication Logs
  createCommunicationLog(data: InsertCommunicationLog): Promise<CommunicationLog>;
  getCommunicationLogs(filters?: { candidateId?: string; status?: string; limit?: number; offset?: number }): Promise<CommunicationLog[]>;
  getCommunicationLogsByCandidate(candidateId: string): Promise<CommunicationLog[]>;

  // Onboarding Checklist Templates
  getOnboardingChecklistTemplates(): Promise<OnboardingChecklistTemplate[]>;
  createOnboardingChecklistTemplate(data: InsertOnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate>;
  initializeDefaultOnboardingTemplates(): Promise<void>;

  // Onboarding Checklist Items
  createOnboardingChecklistItem(data: InsertOnboardingChecklistItem): Promise<OnboardingChecklistItem>;
  getOnboardingChecklistItems(candidateId?: string, staffId?: string): Promise<OnboardingChecklistItem[]>;
  updateOnboardingChecklistItem(id: string, updates: Partial<InsertOnboardingChecklistItem>): Promise<OnboardingChecklistItem>;
  initializeOnboardingChecklist(candidateId: string): Promise<void>;
  getPendingOnboardingItems(): Promise<OnboardingChecklistItem[]>;

  // Badges
  getBadges(): Promise<Badge[]>;
  createBadge(data: InsertBadge): Promise<Badge>;
  initializeDefaultBadges(): Promise<void>;
  initializeLinenProducts(): Promise<void>;
  getStaffBadges(staffId: string): Promise<Array<StaffBadge & { badge: Badge }>>;
  awardBadge(staffId: string, badgeId: string): Promise<StaffBadge>;
  checkAndAwardBadges(staffId: string): Promise<StaffBadge[]>;
  getEnhancedLeaderboard(): Promise<Array<{
    staff: Staff;
    avgScore: number;
    totalEvents: number;
    badges: Array<StaffBadge & { badge: Badge }>;
    rank: number;
  }>>;

  // Pipeline Analytics
  getPipelineMetrics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalCandidates: number;
    byStage: Record<string, number>;
    bySource: Record<string, number>;
    byRoleType: Record<string, number>;
    conversionRates: {
      uploadedToScreened: number;
      screenedToScheduled: number;
      scheduledToAttended: number;
      attendedToHired: number;
      overallConversion: number;
    };
  }>;
  getTimeToHireMetrics(): Promise<{
    averageDays: number;
    byStage: {
      uploadedToScreened: number;
      screenedToScheduled: number;
      scheduledToAttended: number;
      attendedToHired: number;
    };
    fastest: number;
    slowest: number;
  }>;
  getCandidateFunnel(): Promise<Array<{ stage: string; count: number; percentage: number }>>;
  getBottleneckAnalysis(): Promise<Array<{
    stage: string;
    avgDaysStuck: number;
    candidatesStuck: number;
  }>>;
  getWeeklyActivity(): Promise<Array<{
    week: string;
    newCandidates: number;
    screened: number;
    hired: number;
  }>>;

  // Hiring Analytics (separate from general Pipeline Analytics)
  getHiringPipelineMetrics(): Promise<HiringPipelineMetrics>;
  getSourcePerformance(): Promise<SourcePerformance>;
  getTimeToHireAnalytics(): Promise<TimeToHireMetrics>;

  // Maintenance Requests
  createMaintenanceRequest(data: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  getMaintenanceRequests(filters?: { propertyId?: string; status?: string; priority?: string; serviceType?: string }): Promise<MaintenanceRequest[]>;
  getMaintenanceRequest(id: string): Promise<MaintenanceRequest | null>;
  updateMaintenanceRequest(id: string, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest>;
  deleteMaintenanceRequest(id: string): Promise<void>;
  assignMaintenanceRequest(requestId: string, contractorId: string, scheduledDate?: Date, estimatedCost?: number): Promise<MaintenanceAssignment>;
  completeMaintenanceRequest(requestId: string, actualCost?: number, notes?: string): Promise<MaintenanceRequest>;

  // Contractors
  createContractor(data: InsertContractor): Promise<Contractor>;
  getContractors(filters?: { isActive?: boolean; specialty?: string }): Promise<Contractor[]>;
  getContractor(id: string): Promise<Contractor | null>;
  updateContractor(id: string, data: Partial<InsertContractor>): Promise<Contractor>;
  deleteContractor(id: string): Promise<void>;

  // Maintenance Assignments
  getMaintenanceAssignmentsByRequest(requestId: string): Promise<MaintenanceAssignment[]>;
  updateMaintenanceAssignment(id: string, data: Partial<InsertMaintenanceAssignment>): Promise<MaintenanceAssignment>;

  // Maintenance Statistics
  getMaintenanceStatsByProperty(): Promise<Array<{
    property: Property;
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    totalCost: number;
    avgCompletionTime: number;
  }>>;
  getContractorPerformance(): Promise<Array<{
    contractor: Contractor;
    assignmentCount: number;
    completedCount: number;
    avgCompletionTime: number;
    avgCost: number;
    rating: number;
  }>>;
  getMaintenanceRequestsByStaff(staffId: string): Promise<MaintenanceRequest[]>;

  // Interview Scheduling
  getNextAvailableInterviewSlot(roleType?: string): Promise<Date | null>;
  checkSlotAvailability(datetime: Date): Promise<boolean>;
  autoScheduleCandidate(candidateId: string): Promise<{ success: boolean; meetingId?: string; scheduledAt?: Date; error?: string }>;
  getUpcomingInterviewSlots(limit?: number): Promise<Array<{ datetime: Date; booked: boolean; candidateCount: number; meetingId?: string }>>;

  // Inspection System
  createInspectionTemplate(data: InsertInspectionTemplate): Promise<InspectionTemplate>;
  getInspectionTemplates(): Promise<InspectionTemplate[]>;
  getInspectionTemplate(id: string): Promise<InspectionTemplate | null>;
  updateInspectionTemplate(id: string, data: Partial<InsertInspectionTemplate>): Promise<InspectionTemplate>;
  deleteInspectionTemplate(id: string): Promise<void>;
  initializeDefaultInspectionTemplates(): Promise<void>;

  createInspectionReport(data: InsertInspectionReport): Promise<InspectionReport>;
  getInspectionReports(): Promise<InspectionReport[]>;
  getInspectionReport(id: string): Promise<InspectionReport | null>;
  updateInspectionReport(id: string, data: Partial<InsertInspectionReport>): Promise<InspectionReport>;
  completeInspection(id: string, overallScore: number): Promise<InspectionReport>;

  createInspectionItem(data: InsertInspectionItem): Promise<InspectionItem>;
  getInspectionItems(reportId: string): Promise<InspectionItem[]>;
  updateInspectionItem(id: string, data: Partial<InsertInspectionItem>): Promise<InspectionItem>;

  // Notification Settings
  getNotificationSettings(): Promise<InspectionNotificationSettings[]>;
  createNotificationSetting(data: InsertInspectionNotificationSettings): Promise<InspectionNotificationSettings>;
  updateNotificationSetting(id: string, data: Partial<InsertInspectionNotificationSettings>): Promise<InspectionNotificationSettings>;
  deleteNotificationSetting(id: string): Promise<void>;
  bulkCreateInspectionItems(items: InsertInspectionItem[]): Promise<InspectionItem[]>;

  createInspectionIssue(data: InsertInspectionIssue): Promise<InspectionIssue>;
  getInspectionIssues(reportId?: string): Promise<InspectionIssue[]>;
  updateInspectionIssue(id: string, data: Partial<InsertInspectionIssue>): Promise<InspectionIssue>;
  linkIssueToMaintenanceRequest(issueId: string, maintenanceRequestId: string): Promise<InspectionIssue>;

  getPropertyInspectionHistory(propertyId: string): Promise<InspectionReport[]>;
  getInspectionAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalInspections: number;
    averageScore: number;
    completionRate: number;
    issuesFound: number;
    criticalIssues: number;
    propertyStats: Array<{
      propertyId: string;
      propertyName: string;
      inspectionCount: number;
      averageScore: number;
      lastInspectionDate: Date | null;
    }>;
    inspectorStats: Array<{
      inspectorId: string;
      inspectorName: string;
      inspectionCount: number;
      averageScore: number;
    }>;
  }>;

  // RentCheck PDF Inspection Management
  createPdfInspection(data: { pdfUrl: string; sourceType: string; propertyId: string; inspectorId: string; templateId: string; aiExtractedData?: any; date?: Date }): Promise<InspectionReport>;
  updateInspectionAiData(id: string, aiExtractedData: any): Promise<InspectionReport>;
  getInspectionReport(id: string): Promise<InspectionReport | null>;
  getInspectionWithDetails(id: string): Promise<InspectionReport & { items: InspectionItem[]; issues: InspectionIssue[] } | null>;
  getInspectionsByProperty(propertyId: string, dateFrom?: Date, dateTo?: Date): Promise<InspectionReport[]>;
  markInspectionClientNotified(id: string): Promise<InspectionReport>;


  // Reviews & Complaints
  createReview(data: InsertReviewComplaint): Promise<ReviewComplaint>;
  getReviews(filters?: {
    propertyId?: string;
    type?: string;
    status?: string;
    priority?: string;
    sentiment?: string;
    source?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ReviewComplaint[]>;
  getReview(id: string): Promise<ReviewComplaint | null>;
  updateReview(id: string, data: Partial<InsertReviewComplaint>): Promise<ReviewComplaint>;
  deleteReview(id: string): Promise<void>;
  respondToReview(id: string, responseText: string, respondedBy: string): Promise<ReviewComplaint>;

  // Review Categories
  addReviewCategories(reviewId: string, categories: InsertReviewCategory[]): Promise<ReviewCategory[]>;
  getReviewCategories(reviewId: string): Promise<ReviewCategory[]>;

  // Review Themes
  saveReviewThemes(reviewId: string, themes: InsertReviewTheme[]): Promise<ReviewTheme[]>;
  getReviewThemes(reviewId: string): Promise<ReviewTheme[]>;
  deleteReviewThemes(reviewId: string): Promise<void>;
  getThemesSummary(dateFrom?: Date, dateTo?: Date): Promise<Array<{
    theme: string;
    count: number;
    avgConfidence: number;
    sentiment: { positive: number; neutral: number; negative: number };
  }>>;

  // Action Items
  createActionItem(data: InsertActionItem): Promise<ActionItem>;
  getActionItems(filters?: { reviewId?: string; status?: string; assignedTo?: string }): Promise<ActionItem[]>;
  getActionItem(id: string): Promise<ActionItem | null>;
  updateActionItem(id: string, data: Partial<InsertActionItem>): Promise<ActionItem>;
  completeActionItem(id: string): Promise<ActionItem>;

  // Review Analytics
  analyzeReviewSentiment(content: string): Promise<{ sentiment: string; score: number; categories: string[] }>;
  getReviewAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalReviews: number;
    averageRating: number;
    sentimentDistribution: { positive: number; neutral: number; negative: number };
    responseRate: number;
    avgResponseTime: number;
    criticalComplaints: number;
  }>;
  getPropertyReviewTrends(propertyId: string, days?: number): Promise<Array<{
    date: string;
    reviews: number;
    avgRating: number;
    avgSentiment: number;
  }>>;
  getUnresolvedComplaints(): Promise<ReviewComplaint[]>;
  getCriticalAlerts(): Promise<ReviewComplaint[]>;
  getCommonComplaintThemes(limit?: number): Promise<Array<{
    theme: string;
    count: number;
    avgPriority: string;
  }>>;

  // Complaint Submission Tokens
  createComplaintToken(data: InsertComplaintSubmissionToken): Promise<ComplaintSubmissionToken>;
  getComplaintTokenById(id: string): Promise<ComplaintSubmissionToken | undefined>;
  getComplaintTokenByHash(hashedToken: string): Promise<ComplaintSubmissionToken | undefined>;
  updateTokenStatus(id: string, status: string, metadata: any): Promise<void>;
  validateAndUseToken(hashedToken: string): Promise<{valid: boolean, token?: ComplaintSubmissionToken, propertyId?: string}>;
  getAllComplaintTokens(): Promise<ComplaintSubmissionToken[]>;

  // Comprehensive Complaint Analytics for Improvement
  getComplaintAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    overview: {
      totalComplaints: number;
      resolvedComplaints: number;
      resolutionRate: number;
      avgResolutionTimeHours: number;
      criticalComplaints: number;
      unresolvedCritical: number;
    };
    categories: Array<{
      category: string;
      count: number;
      percentage: number;
      avgPriority: string;
      trend: 'up' | 'down' | 'stable';
      trendPercentage: number;
    }>;
    propertyPerformance: Array<{
      propertyId: string;
      propertyName: string;
      complaintCount: number;
      complaintRate: number;
      avgResolutionTimeHours: number;
      commonIssues: string[];
    }>;
    repeatComplaints: Array<{
      propertyId: string;
      propertyName: string;
      category: string;
      count: number;
      lastOccurrence: Date;
      status: string;
    }>;
    staffPerformance: Array<{
      staffId: string;
      staffName: string;
      complaintsResponded: number;
      avgResponseTimeHours: number;
      resolutionRate: number;
    }>;
    compensation: {
      totalCompensated: number;
      avgCompensation: number;
      compensationByReason: Array<{
        reason: string;
        count: number;
        totalAmount: number;
      }>;
    };
    trends: Array<{
      period: string;
      complaints: number;
      resolved: number;
      avgResolutionTime: number;
    }>;
    insights: Array<{
      type: 'warning' | 'success' | 'info';
      title: string;
      description: string;
      actionable: boolean;
      priority: 'high' | 'medium' | 'low';
    }>;
  }>;

  // ======== ORDERING SYSTEM METHODS ========
  // Supplier Management
  createSupplier(data: InsertOrderingSupplier): Promise<OrderingSupplier>;
  getSuppliers(filters?: { isActive?: boolean; type?: string }): Promise<OrderingSupplier[]>;
  getSupplier(id: string): Promise<OrderingSupplier | null>;
  updateSupplier(id: string, data: Partial<InsertOrderingSupplier>): Promise<OrderingSupplier>;
  deleteSupplier(id: string): Promise<void>;

  // Product Management
  createProduct(data: InsertOrderingProduct): Promise<OrderingProduct>;
  getProducts(filters?: {
    category?: string;
    supplier?: string;
    isActive?: boolean;
    lowStock?: boolean;
  }): Promise<OrderingProduct[]>;
  getProduct(id: string): Promise<OrderingProduct | null>;
  updateProduct(id: string, data: Partial<InsertOrderingProduct>): Promise<OrderingProduct>;
  deleteProduct(id: string): Promise<void>;
  getLowStockProducts(): Promise<Array<OrderingProduct & { percentageRemaining: number }>>;
  bulkImportProducts(products: InsertOrderingProduct[]): Promise<{ created: number; updated: number; failed: number }>;

  // Order Management
  createOrder(data: InsertOrderingOrder): Promise<OrderingOrder>;
  getOrders(filters?: {
    status?: string;
    supplier?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<OrderingOrder[]>;
  getOrder(id: string): Promise<OrderingOrder | null>;
  updateOrder(id: string, data: Partial<InsertOrderingOrder>): Promise<OrderingOrder>;
  deleteOrder(id: string): Promise<void>;
  generateOrderNumber(): Promise<string>;

  // Order Items
  addOrderItem(data: InsertOrderingOrderItem): Promise<OrderingOrderItem>;
  getOrderItems(orderId: string): Promise<Array<OrderingOrderItem & { product: OrderingProduct }>>;
  updateOrderItem(id: string, data: Partial<InsertOrderingOrderItem>): Promise<OrderingOrderItem>;
  removeOrderItem(id: string): Promise<void>;
  receiveOrderItems(orderId: string, items: Array<{ itemId: string; receivedQuantity: number }>): Promise<void>;

  // Stock Management
  adjustStock(productId: string, adjustment: number, reason: string, movedBy?: string): Promise<OrderingStockMovement>;
  getStockMovements(filters?: {
    productId?: string;
    movementType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Array<OrderingStockMovement & { product: OrderingProduct }>>;
  allocateStockToProperty(productId: string, propertyId: string, quantity: number, movedBy?: string): Promise<OrderingStockMovement>;
  getStockByProperty(propertyId: string): Promise<Array<{ product: OrderingProduct; quantity: number }>>;

  // Inventory Counting System
  createStockCount(data: InsertStockCount): Promise<StockCount>;
  getStockCounts(filters?: {
    productId?: string;
    locationCode?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Array<StockCount & { product: OrderingProduct; countedByStaff?: Staff }>>;
  getLatestStockCounts(locationCode?: string): Promise<Array<StockCount & { product: OrderingProduct }>>;
  getLatestStockCountByProduct(productId: string, locationCode?: string): Promise<StockCount | null>;
  updateProductTargetQuantity(productId: string, targetQuantity: number): Promise<OrderingProduct>;
  getProductsBelowTarget(locationCode?: string): Promise<Array<{
    product: OrderingProduct;
    latestCount: StockCount | null;
    targetQuantity: number;
    actualQuantity: number;
    orderQuantity: number;
  }>>;

  // Quick Order System
  quickReorder(productIds?: string[]): Promise<{ ordersCreated: OrderingOrder[]; errors: string[] }>;
  suggestReorderQuantities(productId: string): Promise<{ suggested: number; minOrder: number; economicOrder: number }>;

  // Analytics
  getOrderingAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalSpent: number;
    orderCount: number;
    productsPurchased: number;
    spendingByCategory: Array<{ category: string; total: number; percentage: number }>;
    spendingBySupplier: Array<{ supplier: string; total: number; orderCount: number }>;
    topProducts: Array<{ product: OrderingProduct; totalOrdered: number; totalSpent: number }>;
    monthlyTrend: Array<{ month: string; spent: number; orders: number }>;
    stockValue: number;
    lowStockCount: number;
  }>;
  getProductUsageHistory(productId: string, days?: number): Promise<Array<{
    date: string;
    quantityUsed: number;
    orders: number;
    averagePrice: number;
  }>>;
  getSupplierPerformanceMetrics(supplierId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageDeliveryTime: number;
    onTimeDeliveryRate: number;
    priceChanges: Array<{ productId: string; productName: string; oldPrice: number; newPrice: number; changePercent: number }>;
  }>;

  // Invoice Management
  createInvoice(data: InsertSupplierInvoice): Promise<SupplierInvoice>;
  updateInvoice(id: string, data: Partial<InsertSupplierInvoice>): Promise<SupplierInvoice>;
  getInvoices(filters?: { supplier?: string; startDate?: Date; endDate?: Date }): Promise<SupplierInvoice[]>;
  getInvoice(id: string): Promise<SupplierInvoice | null>;

  // Price History Management
  createPriceHistory(data: InsertProductPriceHistory): Promise<ProductPriceHistory>;
  getProductPriceHistory(productId: string): Promise<ProductPriceHistory[]>;
  getPriceAnalytics(): Promise<{
    priceIncreases: Array<{ productName: string; oldPrice: number; newPrice: number; changePercent: number }>;
    priceDecreases: Array<{ productName: string; oldPrice: number; newPrice: number; changePercent: number }>;
    totalImpact: number;
  }>;

  // Helper Methods
  getProductByNameAndSupplier(name: string, supplier: string): Promise<OrderingProduct | null>;
  getSupplierByName(name: string): Promise<OrderingSupplier | null>;

  // ======== WAGE REPORTING SYSTEM METHODS ========
  // Wage Reports
  createWageReport(data: InsertWageReport): Promise<WageReport>;
  getWageReports(filters?: {
    staffId?: string;
    month?: number;
    year?: number;
    status?: string;
  }): Promise<WageReport[]>;
  getWageReport(id: string): Promise<WageReport | null>;
  updateWageReport(id: string, data: Partial<InsertWageReport>): Promise<WageReport>;
  deleteWageReport(id: string): Promise<void>;
  calculateMonthlyWages(month: number, year: number): Promise<WageReport[]>;
  approveWageReport(id: string, approvedBy: string): Promise<WageReport>;
  markWageReportPaid(id: string, paidDate: Date, paymentMethod: string): Promise<WageReport>;
  getWageReportByStaffAndMonth(staffId: string, month: number, year: number): Promise<WageReport | null>;

  // Wage Settings
  createWageSettings(data: InsertWageSettings): Promise<WageSettings>;
  getWageSettings(staffId: string): Promise<WageSettings | null>;
  getActiveWageSettings(staffId: string, date?: Date): Promise<WageSettings | null>;
  getAllWageSettings(): Promise<WageSettings[]>;
  updateWageSettings(id: string, data: Partial<InsertWageSettings>): Promise<WageSettings>;
  deleteWageSettings(id: string): Promise<void>;

  // Timesheets
  createTimesheet(data: InsertTimesheet): Promise<Timesheet>;
  getTimesheets(filters?: {
    staffId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<Timesheet[]>;
  getTimesheet(id: string): Promise<Timesheet | null>;
  updateTimesheet(id: string, data: Partial<InsertTimesheet>): Promise<Timesheet>;
  deleteTimesheet(id: string): Promise<void>;
  clockIn(staffId: string, propertyId?: string, jobType?: string): Promise<Timesheet>;
  clockOut(timesheetId: string): Promise<Timesheet>;
  approveTimesheet(id: string, approvedBy: string): Promise<Timesheet>;
  getTimesheetsByStaffAndDateRange(staffId: string, startDate: Date, endDate: Date): Promise<Timesheet[]>;

  // Wage Analytics
  getWageAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalWagesPaid: number;
    totalHoursWorked: number;
    averageHourlyRate: number;
    overtimeHours: number;
    totalBonuses: number;
    totalDeductions: number;
    staffCount: number;
    laborCostPercentage: number;
    monthlyTrend: Array<{ month: string; totalWages: number; hoursWorked: number }>;
    staffWageBreakdown: Array<{ staffId: string; staffName: string; totalWages: number; hoursWorked: number }>;
  }>;
  getStaffWageHistory(staffId: string, months?: number): Promise<Array<{
    month: string;
    hoursWorked: number;
    regularHours: number;
    overtimeHours: number;
    totalWages: number;
    netPay: number;
  }>>;
  exportPayrollCSV(month: number, year: number): Promise<string>;

  // ======== WAGE DOCUMENT PROCESSING SYSTEM ========
  // Wage Periods
  createWagePeriod(data: InsertWagePeriod): Promise<WagePeriod>;
  getWagePeriods(): Promise<WagePeriod[]>;
  getWagePeriod(id: string): Promise<WagePeriod | null>;
  updateWagePeriod(id: string, data: Partial<InsertWagePeriod>): Promise<WagePeriod>;

  // Wage Document Uploads
  createWageDocumentUpload(data: InsertWageDocumentUpload): Promise<WageDocumentUpload>;
  getWageDocumentUploads(wagePeriodId: string): Promise<WageDocumentUpload[]>;
  getWageDocumentUpload(id: string): Promise<WageDocumentUpload | null>;
  updateWageDocumentUpload(id: string, data: Partial<InsertWageDocumentUpload>): Promise<WageDocumentUpload>;

  // Cleaner Wages
  createCleanerWage(data: InsertCleanerWage): Promise<CleanerWage>;
  bulkCreateCleanerWages(data: InsertCleanerWage[]): Promise<CleanerWage[]>;
  getCleanerWages(wagePeriodId: string): Promise<CleanerWage[]>;
  getCleanerWage(id: string): Promise<CleanerWage | null>;
  updateCleanerWage(id: string, data: Partial<InsertCleanerWage>): Promise<CleanerWage>;
  deleteCleanerWage(id: string): Promise<void>;

  // Wage Tokens
  createWageToken(data: InsertWageToken): Promise<WageToken>;
  getWageTokenByToken(token: string): Promise<WageToken | null>;
  markWageTokenViewed(id: string): Promise<void>;
  deleteExpiredWageTokens(): Promise<void>;

  // Wage Document Processing Analytics
  getWageDocumentAnalytics(wagePeriodId: string): Promise<{
    totalWageBill: number;
    totalCleaners: number;
    averageEarnings: number;
    highestEarner: { name: string; amount: number } | null;
    lowestEarner: { name: string; amount: number } | null;
    fixedCleaningTotal: number;
    hourlyWorkTotal: number;
    smsStats: { sent: number; pending: number; failed: number };
  }>;
  getWagePeriodComparison(month: number, year: number, previousMonths?: number): Promise<Array<{
    month: number;
    year: number;
    totalWageBill: number;
    totalCleaners: number;
    averageEarnings: number;
    changePercent: number;
  }>>;

  // ======== UPLISTING BOOKING REPORT PARSER ========
  createUplistingUpload(data: InsertUplistingBookingUpload): Promise<UplistingBookingUpload>;
  getUplistingUploads(): Promise<UplistingBookingUpload[]>;
  getUplistingUpload(id: string): Promise<UplistingBookingUpload | null>;
  createCheckoutScheduleItems(items: InsertUplistingCheckoutSchedule[]): Promise<void>;
  getCheckoutSchedule(uploadId: string): Promise<UplistingCheckoutSchedule[]>;
  getAllCheckoutSchedule(filters?: { startDate?: string; endDate?: string }): Promise<UplistingCheckoutSchedule[]>;
  deleteUplistingUpload(id: string): Promise<void>;

  // Business Performance Analytics
  getBusinessAnalyticsDashboard(dateFrom?: Date, dateTo?: Date): Promise<{
    revenue: {
      total: number;
      monthlyTrend: Array<{ month: string; amount: number }>;
      byProperty: Array<{ propertyName: string; revenue: number }>;
      occupancyRate: number;
      averageDailyRate: number;
    };
    operations: {
      maintenanceCosts: number;
      cleaningEfficiencyScore: number;
      guestSatisfactionScore: number;
      averageResponseTime: number;
      propertyUtilization: number;
    };
    staff: {
      laborCosts: number;
      productivityScore: number;
      complianceRate: number;
      staffRetentionRate: number;
      trainingCompletionRate: number;
    };
    properties: {
      topPerforming: Array<{ id: string; name: string; score: number }>;
      needingAttention: Array<{ id: string; name: string; issues: string[] }>;
      costBreakdown: Array<{ propertyName: string; costs: { maintenance: number; cleaning: number; supplies: number } }>;
    };
    inventory: {
      supplyCosts: number;
      stockTurnoverRate: number;
      topSuppliers: Array<{ name: string; spend: number; performance: number }>;
    };
  }>;

  // AST Lettings - Buildings
  createAstBuilding(data: InsertAstBuilding): Promise<AstBuilding>;
  updateAstBuilding(id: string, data: Partial<InsertAstBuilding>): Promise<AstBuilding>;
  getAstBuildings(): Promise<AstBuilding[]>;
  getAstBuilding(id: string): Promise<AstBuilding | null>;

  // AST Lettings - Apartments
  createAstApartment(data: InsertAstApartment): Promise<AstApartment>;
  updateAstApartment(id: string, data: Partial<InsertAstApartment>): Promise<AstApartment>;
  getAstApartmentsByBuilding(buildingId: string): Promise<AstApartment[]>;
  getAstApartment(id: string): Promise<AstApartment | null>;
  deleteAstApartment(apartmentId: string): Promise<void>;

  // AST Lettings - Properties
  createAstProperty(data: InsertAstProperty): Promise<AstProperty>;
  getAstProperties(): Promise<AstProperty[]>;
  getAstProperty(id: string): Promise<AstProperty | null>;
  updateAstProperty(id: string, data: Partial<InsertAstProperty>): Promise<AstProperty>;
  deleteAstProperty(id: string): Promise<void>;

  // AST Lettings - Tenancies
  createAstTenancy(data: InsertAstTenancy): Promise<AstTenancy>;
  getAstTenancies(filters?: { astPropertyId?: string; status?: string }): Promise<AstTenancy[]>;
  getAstTenancy(id: string): Promise<AstTenancy | null>;
  updateAstTenancy(id: string, data: Partial<InsertAstTenancy>): Promise<AstTenancy>;
  deleteAstTenancy(id: string): Promise<void>;
  getAstTenanciesWithProperties(): Promise<Array<AstTenancy & { property: AstProperty }>>;
  getAstTenanciesWithDetails(): Promise<Array<AstTenancy & { property?: AstProperty; building?: AstBuilding; apartment?: AstApartment }>>;

  // AST Lettings - Contracts
  createAstContract(data: InsertAstContract): Promise<AstContract>;
  getAstContractsByTenancy(tenancyId: string): Promise<AstContract[]>;
  getAstContract(id: string): Promise<AstContract | null>;
  deleteAstContract(id: string): Promise<void>;

  // AST Lettings - Rent Payments
  createAstRentPayment(data: InsertAstRentPayment): Promise<AstRentPayment>;
  getAstRentPayments(filters?: { tenancyId?: string; status?: string }): Promise<AstRentPayment[]>;
  getAstRentPayment(id: string): Promise<AstRentPayment | null>;
  updateAstRentPayment(id: string, data: Partial<InsertAstRentPayment>): Promise<AstRentPayment>;
  deleteAstRentPayment(id: string): Promise<void>;
  generateRentPaymentSchedule(tenancyId: string): Promise<AstRentPayment[]>;
  getUpcomingRentPayments(): Promise<Array<AstRentPayment & { tenancy: AstTenancy; property: AstProperty }>>;
  getOverdueRentPayments(): Promise<Array<AstRentPayment & { tenancy: AstTenancy; property: AstProperty }>>;

  // AST Inventory Reports - PDF document management
  createAstInventoryReport(data: InsertAstInventoryReport): Promise<AstInventoryReport>;
  getAstInventoryReports(filters?: { astPropertyId?: string; tenancyId?: string; reportType?: string }): Promise<AstInventoryReport[]>;
  getAstInventoryReport(id: string): Promise<AstInventoryReport | null>;
  updateAstInventoryReport(id: string, data: Partial<InsertAstInventoryReport>): Promise<AstInventoryReport>;
  deleteAstInventoryReport(id: string): Promise<void>;
  getAstInventoryReportsWithLinks(tenancyId: string): Promise<Array<AstInventoryReport & { property: AstProperty }>>;

  // AST Deposits - PDF document management
  createAstDeposit(data: InsertAstDeposit): Promise<AstDeposit>;
  getAstDeposits(filters?: { tenancyId?: string }): Promise<AstDeposit[]>;
  getAstDeposit(id: string): Promise<AstDeposit | null>;
  updateAstDeposit(id: string, data: Partial<InsertAstDeposit>): Promise<AstDeposit>;
  deleteAstDeposit(id: string): Promise<void>;
  getAstDepositsWithTenancyInfo(): Promise<Array<AstDeposit & { tenancy: AstTenancy; property: AstProperty }>>;

  // Landlord Management
  getLandlords(): Promise<Landlord[]>;
  getLandlordById(id: number): Promise<Landlord | undefined>;
  getLandlordByEmail(email: string): Promise<Landlord | undefined>;
  createLandlord(data: InsertLandlord): Promise<Landlord>;
  updateLandlord(id: number, data: Partial<InsertLandlord>): Promise<Landlord>;
  updateLandlordLastLogin(landlordId: number): Promise<void>;
  updateLandlordPassword(landlordId: number, hashedPassword: string): Promise<void>;
  updateLandlordResetToken(landlordId: number, token: string, expiry: Date): Promise<void>;
  getLandlordByResetToken(token: string): Promise<Landlord | undefined>;
  clearLandlordResetToken(landlordId: number): Promise<void>;
  deleteLandlord(id: number): Promise<void>;
  getPropertiesByLandlord(landlordId: number): Promise<AstProperty[]>;
  assignPropertyToLandlord(propertyId: string, landlordId: number): Promise<void>;
  getMaintenanceRequestsByLandlord(landlordId: number): Promise<MaintenanceRequest[]>;
  getLandlordStatements(landlordId: number): Promise<MonthlyStatement[]>;
  getManagementContractsByLandlord(landlordId: number): Promise<ManagementContract[]>;

  // Monthly Statements
  getStatements(landlordId?: number): Promise<MonthlyStatement[]>;
  getStatementById(id: number): Promise<MonthlyStatement | undefined>;
  createStatement(data: InsertMonthlyStatement): Promise<MonthlyStatement>;
  updateStatement(id: number, data: Partial<InsertMonthlyStatement>): Promise<MonthlyStatement>;
  deleteStatement(id: number): Promise<void>;
  getStatementsByMonth(year: number, month: number): Promise<MonthlyStatement[]>;
  getMaintenanceForLandlord(landlordId: number, startDate: Date, endDate: Date): Promise<MaintenanceRequest[]>;

  // Daily Task Management - Task Templates
  getTaskTemplates(): Promise<TaskTemplate[]>;
  getTaskTemplateById(id: string): Promise<TaskTemplate | null>;
  createTaskTemplate(data: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: string, data: Partial<InsertTaskTemplate>): Promise<TaskTemplate>;
  deleteTaskTemplate(id: string): Promise<void>;

  // Daily Task Management - Daily Task Instances
  getDailyTaskInstances(date: string, staffId?: string): Promise<DailyTaskInstance[]>;
  createDailyTaskInstance(data: InsertDailyTaskInstance): Promise<DailyTaskInstance>;
  updateDailyTaskInstance(id: string, data: Partial<InsertDailyTaskInstance>): Promise<DailyTaskInstance>;
  getTaskHistory(startDate: string, endDate: string, staffId?: string): Promise<DailyTaskInstance[]>;

  // Specialized Services - Waste Clearance
  createWasteClearanceRequest(data: InsertSpecializedServiceRequest): Promise<SpecializedServiceRequest>;
  listWasteClearanceRequests(filters?: { status?: string }): Promise<SpecializedServiceRequest[]>;
  updateWasteClearanceRequest(id: string, data: Partial<InsertSpecializedServiceRequest>): Promise<SpecializedServiceRequest>;

  // Specialized Services - Generic (supports all service types)
  createSpecializedServiceRequest(data: InsertSpecializedServiceRequest): Promise<SpecializedServiceRequest>;
  listSpecializedServiceRequests(serviceType: string, filters?: { status?: string }): Promise<SpecializedServiceRequest[]>;
  updateSpecializedServiceRequest(id: string, data: Partial<InsertSpecializedServiceRequest>): Promise<SpecializedServiceRequest>;

  // Specialized Services - Equipment Tracking
  logEquipmentMovement(data: InsertEquipmentMovement): Promise<EquipmentMovement>;
  listEquipmentMovements(filters?: { equipmentType?: string; staffId?: string; startDate?: string; endDate?: string }): Promise<EquipmentMovement[]>;
  getCurrentEquipmentStatus(equipmentType: string): Promise<Array<{ equipmentNumber: number; staffName?: string; signedOutAt?: Date } | { equipmentNumber: number; available: true }>>;
  getEquipmentMovementById(id: string): Promise<EquipmentMovement | undefined>;
  updateEquipmentMovementPhotos(id: string, photoUrls: string[]): Promise<EquipmentMovement>;

  // Specialized Services - Building A Linen Orders
  createDwellLinenOrder(data: InsertDwellLinenOrder): Promise<DwellLinenOrder>;
  listDwellLinenOrders(): Promise<DwellLinenOrder[]>;
  updateDwellLinenOrder(id: string, data: Partial<InsertDwellLinenOrder>): Promise<DwellLinenOrder>;

  // Hotel Linen Delivery Notes (Packing Lists from Imperial)
  createLinenDeliveryNote(data: InsertLinenDeliveryNote): Promise<LinenDeliveryNote>;
  listLinenDeliveryNotes(building?: string): Promise<LinenDeliveryNote[]>;
  getLinenDeliveryNote(id: string): Promise<LinenDeliveryNote | null>;
  getLinenDeliveryNotesByOrder(orderId: string): Promise<LinenDeliveryNote[]>;

  // Linen Order Schedules (Automated reminders for StaffC)
  createLinenOrderSchedule(data: InsertLinenOrderSchedule): Promise<LinenOrderSchedule>;
  getLinenOrderSchedules(): Promise<LinenOrderSchedule[]>;
  getLinenOrderSchedule(id: number): Promise<LinenOrderSchedule | null>;
  updateLinenOrderSchedule(id: number, data: Partial<InsertLinenOrderSchedule>): Promise<LinenOrderSchedule>;
  deleteLinenOrderSchedule(id: number): Promise<void>;
  getDwellLinenOrderByToken(token: string): Promise<DwellLinenOrder | null>;

  // Cleaning Supplies Ordering System - Schedules
  createCleaningOrderSchedule(data: InsertCleaningOrderSchedule): Promise<CleaningOrderSchedule>;
  getCleaningOrderSchedules(): Promise<CleaningOrderSchedule[]>;
  getCleaningOrderSchedule(id: number): Promise<CleaningOrderSchedule | null>;
  updateCleaningOrderSchedule(id: number, data: Partial<InsertCleaningOrderSchedule>): Promise<CleaningOrderSchedule>;
  deleteCleaningOrderSchedule(id: number): Promise<void>;

  // Cleaning Supplies Ordering System - Orders
  createCleaningOrder(data: InsertCleaningOrder): Promise<CleaningOrder>;
  getCleaningOrders(filters?: { propertyName?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<CleaningOrder[]>;
  getCleaningOrderByToken(token: string): Promise<CleaningOrder | null>;
  updateCleaningOrder(id: number, data: Partial<InsertCleaningOrder>): Promise<CleaningOrder>;

  // Cleaning Supplies Ordering System - Reminder Logs
  createCleaningOrderReminderLog(data: InsertCleaningOrderReminderLog): Promise<CleaningOrderReminderLog>;
  getCleaningOrderReminderLogs(filters?: { scheduleId?: number }): Promise<CleaningOrderReminderLog[]>;
  updateCleaningOrderReminderLog(id: number, data: Partial<InsertCleaningOrderReminderLog>): Promise<CleaningOrderReminderLog>;
  getScheduleWithLogs(scheduleId: number): Promise<{ schedule: CleaningOrderSchedule; logs: CleaningOrderReminderLog[] } | null>;

  // Critical Information Lists
  getAllCriticalInfo(searchTerm?: string): Promise<CriticalInfo[]>;
  getCriticalInfoById(id: string): Promise<CriticalInfo | null>;
  createCriticalInfo(data: InsertCriticalInfo): Promise<CriticalInfo>;
  createCriticalInfoBulk(items: InsertCriticalInfo[]): Promise<CriticalInfo[]>;
  updateCriticalInfo(id: string, data: Partial<InsertCriticalInfo>): Promise<CriticalInfo>;
  deleteCriticalInfo(id: string): Promise<void>;

  // Cleaning Rates
  getAllCleaningRates(): Promise<CleaningRate[]>;
  getCleaningRateById(id: string): Promise<CleaningRate | null>;
  createCleaningRate(data: InsertCleaningRate): Promise<CleaningRate>;
  updateCleaningRate(id: string, data: Partial<InsertCleaningRate>): Promise<CleaningRate>;
  deleteCleaningRate(id: string): Promise<void>;

  // Business Analytics - Financial Documents
  createFinancialDocument(data: InsertBankStatement): Promise<BankStatement>;
  getFinancialDocuments(): Promise<BankStatement[]>;
  getFinancialDocumentById(id: string): Promise<BankStatement | null>;
  updateFinancialDocument(id: string, data: Partial<InsertBankStatement>): Promise<BankStatement>;
  deleteFinancialDocument(id: string): Promise<void>;

  // Business Analytics - Transactions
  createTransaction(data: InsertFinancialTransaction): Promise<FinancialTransaction>;
  createTransactions(data: InsertFinancialTransaction[]): Promise<FinancialTransaction[]>;
  getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
    source?: string;
  }): Promise<FinancialTransaction[]>;
  getTransactionById(id: string): Promise<FinancialTransaction | null>;
  updateTransaction(id: string, data: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction>;
  deleteTransaction(id: string): Promise<void>;

  // Business Analytics - P&L Reports
  getPNLSummary(startDate: string, endDate: string): Promise<{
    income: Record<string, number>;
    expenses: Record<string, number>;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  }>;

  getFinancialMetrics(startDate: string, endDate: string): Promise<{
    totalRevenue: number;
    managementFees: number;
    maintenanceCosts: number;
    softwareCosts: number;
    otherExpenses: number;
    netProfit: number;
    profitMargin: number;
  }>;

  // ======== PROPERLY CLEANER ALLOCATION SYSTEM ========
  // Properly uploads
  createProperlyUpload(data: InsertProperlyUpload): Promise<ProperlyUpload>;
  getProperlyUploads(): Promise<ProperlyUpload[]>;
  getProperlyUpload(id: string): Promise<ProperlyUpload | null>;
  updateProperlyUploadStatus(id: string, status: string): Promise<void>;

  // Cleaning tasks
  createProperlyCleaningTasks(tasks: InsertProperlyCleaningTask[]): Promise<ProperlyCleaningTask[]>;
  getProperlyCleaningTasks(uploadId: string): Promise<ProperlyCleaningTask[]>;
  getProperlyCleaningTasksByDate(date: string): Promise<ProperlyCleaningTask[]>;
  getProperlyCleaningTask(id: string): Promise<ProperlyCleaningTask | null>;

  // Allocations
  createCleanerAllocations(allocations: InsertProperlyCleanerAllocation[]): Promise<ProperlyCleanerAllocation[]>;
  getCleanerAllocations(uploadId: string): Promise<ProperlyCleanerAllocation[]>;
  getCleanerAllocationsByDate(date: string): Promise<ProperlyCleanerAllocation[]>;
  getAllocationWithDetails(allocationId: string): Promise<any>;
  updateAllocationConfirmation(allocationId: string, confirmed: boolean): Promise<void>;
  updateAllocation(id: string, data: Partial<InsertProperlyCleanerAllocation>): Promise<ProperlyCleanerAllocation>;

  // Building preferences
  setCleanerBuildingPreference(data: InsertCleanerBuildingPreference): Promise<CleanerBuildingPreference>;
  getCleanerBuildingPreferences(building?: string): Promise<CleanerBuildingPreference[]>;
  getCleanerPreferencesForStaff(staffId: string): Promise<CleanerBuildingPreference[]>;
  updateCleanerBuildingPreference(staffId: string, building: string, preferenceLevel: number): Promise<CleanerBuildingPreference>;
  initializeCleanerBuildingPreferences(): Promise<void>;

  // History
  recordAllocationHistory(data: InsertAllocationHistory): Promise<AllocationHistory>;
  getAllocationHistory(filters?: { cleanerId?: string; building?: string; dateFrom?: string; dateTo?: string }): Promise<AllocationHistory[]>;

  // Helper methods for allocation
  checkCleanerAvailability(staffId: string, date: string): Promise<boolean>;
  getCleanerAllocation(allocationId: string): Promise<ProperlyCleanerAllocation | null>;
  updateAllocationStatus(allocationId: string, status: string): Promise<void>;
  getStaffMember(staffId: string): Promise<Staff | null>;

  // Manual cleaning adjustments
  createManualCleaningAdjustment(data: InsertManualCleaningAdjustment): Promise<ManualCleaningAdjustment>;
  getManualCleaningAdjustments(filters?: { adjustmentDate?: string; status?: string }): Promise<ManualCleaningAdjustment[]>;
  updateManualCleaningAdjustment(id: string, data: Partial<InsertManualCleaningAdjustment>): Promise<ManualCleaningAdjustment>;
  deleteManualCleaningAdjustment(id: string): Promise<void>;

  // ======== LINEN PACKING ASSISTANT ========
  // Linen packing items
  createLinenPackingItems(items: InsertLinenPackingItem[]): Promise<LinenPackingItem[]>;
  getLinenPackingItems(propertyAddress: string): Promise<LinenPackingItem[]>;
  getAllLinenPackingProperties(): Promise<string[]>;
  deleteAllLinenPackingItems(): Promise<void>;

  // Special requests
  createSpecialRequest(data: InsertSpecialRequest): Promise<SpecialRequest>;
  getSpecialRequests(propertyName?: string): Promise<SpecialRequest[]>;
  getActiveSpecialRequests(propertyName: string): Promise<SpecialRequest[]>;
  updateSpecialRequest(id: string, data: Partial<InsertSpecialRequest>): Promise<SpecialRequest>;
  markSpecialRequestCompleted(id: string, completedBy: string): Promise<void>;
  deleteSpecialRequest(id: string): Promise<void>;

  // Cleaning costs
  createCleaningCosts(costs: InsertCleaningCost[]): Promise<CleaningCost[]>;
  getCleaningCost(propertyName: string): Promise<CleaningCost | null>;
  getAllCleaningCosts(): Promise<CleaningCost[]>;
  updateCleaningCost(propertyName: string, data: Partial<InsertCleaningCost>): Promise<CleaningCost>;
  deleteAllCleaningCosts(): Promise<void>;

  // ======== LINEN PACKING SESSIONS (COMPLIANCE AUTOMATION) ========
  createLinenPackingSession(data: InsertLinenPackingSession): Promise<LinenPackingSession>;
  getComplianceAutomationData(staffId: string, date: Date): Promise<{
    trolleySignedInOut: boolean;
    caddySignedInOut: boolean;
    usedChatbot: boolean;
    viewedSpecialRequests: boolean;
  }>;

  // ======== GUEST SUPPORT CHATBOT ========
  // Chat sessions
  createGuestSupportChatSession(data: InsertGuestSupportChatSession): Promise<GuestSupportChatSession>;
  getGuestSupportChatSession(sessionId: string): Promise<GuestSupportChatSession | null>;
  getGuestSupportChatSessions(userId: string): Promise<GuestSupportChatSession[]>;
  updateGuestSupportChatSession(sessionId: string, data: Partial<InsertGuestSupportChatSession>): Promise<GuestSupportChatSession>;

  // Chat messages
  createGuestSupportChatMessage(data: InsertGuestSupportChatMessage): Promise<GuestSupportChatMessage>;
  getGuestSupportChatMessages(sessionId: string): Promise<GuestSupportChatMessage[]>;

  // ========STAFF HELPDESK ========
  createHelpdeskChatSession(userId: string, staffName: string | null): Promise<HelpdeskChatSession>;
  getHelpdeskChatSession(sessionId: string): Promise<HelpdeskChatSession | null>;
  getHelpdeskChatHistory(sessionId: string): Promise<HelpdeskChatMessage[]>;
  saveHelpdeskChatMessage(message: InsertHelpdeskChatMessage): Promise<HelpdeskChatMessage>;

  // ======== TENANT COMMUNICATION ========
  createTenantCommunicationChatSession(userId: string, staffName: string | null): Promise<TenantCommunicationChatSession>;
  getTenantCommunicationChatSession(sessionId: string): Promise<TenantCommunicationChatSession | null>;
  getTenantCommunicationChatHistory(sessionId: string): Promise<TenantCommunicationChatMessage[]>;
  saveTenantCommunicationChatMessage(message: InsertTenantCommunicationChatMessage): Promise<TenantCommunicationChatMessage>;
  markEmailAsSent(messageId: string): Promise<TenantCommunicationChatMessage>;
  markSmsAsSent(messageId: string): Promise<TenantCommunicationChatMessage>;

  // ======== KNOWLEDGE BASE ========
  getAllKnowledgeBaseEntries(chatbotType?: string): Promise<KnowledgeBaseEntry[]>;
  getActiveKnowledgeBaseEntries(chatbotType?: string): Promise<KnowledgeBaseEntry[]>;
  getKnowledgeBaseEntry(id: string): Promise<KnowledgeBaseEntry | null>;
  createKnowledgeBaseEntry(data: InsertKnowledgeBaseEntry): Promise<KnowledgeBaseEntry>;
  updateKnowledgeBaseEntry(id: string, data: Partial<InsertKnowledgeBaseEntry>): Promise<KnowledgeBaseEntry>;
  deleteKnowledgeBaseEntry(id: string): Promise<void>;
  generateKnowledgeFromPortalData(chatbotType: string): Promise<{ created: number; updated: number }>;

  // Pending Knowledge Uploads
  getPendingKnowledgeUploads(chatbotType?: string): Promise<PendingKnowledgeUpload[]>;
  getPendingKnowledgeUpload(id: string): Promise<PendingKnowledgeUpload | null>;
  createPendingKnowledgeUpload(data: InsertPendingKnowledgeUpload): Promise<PendingKnowledgeUpload>;
  updatePendingKnowledgeUpload(id: string, updates: Partial<InsertPendingKnowledgeUpload>): Promise<PendingKnowledgeUpload>;
  deletePendingKnowledgeUpload(id: string): Promise<void>;
  approvePendingUpload(id: string, finalData: { title: string; category: string; tags: string[] }): Promise<KnowledgeBaseEntry>;

  // ======== LINEN PACKING LISTS ========
  getLinenPackingLists(): Promise<LinenPackingList[]>;
  getLinenPackingList(id: string): Promise<LinenPackingList | null>;
  getLinenPackingListByPropertyId(propertyId: string): Promise<LinenPackingList | null>;
  createLinenPackingList(data: InsertLinenPackingList): Promise<LinenPackingList>;
  updateLinenPackingList(id: string, data: Partial<InsertLinenPackingList>): Promise<LinenPackingList>;
  deleteLinenPackingList(id: string): Promise<void>;

  // ======== WEEKLY ROTA TASKS ========
  getWeeklyRotaTasks(): Promise<WeeklyRotaTask[]>;
  getWeeklyRotaTask(id: string): Promise<WeeklyRotaTask | null>;
  getWeeklyRotaTasksByDay(day: string): Promise<WeeklyRotaTask[]>;
  createWeeklyRotaTask(data: InsertWeeklyRotaTask): Promise<WeeklyRotaTask>;
  bulkCreateWeeklyRotaTasks(tasks: InsertWeeklyRotaTask[]): Promise<WeeklyRotaTask[]>;
  updateWeeklyRotaTask(id: string, data: Partial<InsertWeeklyRotaTask>): Promise<WeeklyRotaTask>;
  deleteWeeklyRotaTask(id: string): Promise<void>;
  deleteAllWeeklyRotaTasks(): Promise<void>;

  // ======== TRAINING VIDEOS ========
  // Training Videos
  getTrainingVideos(): Promise<TrainingVideo[]>;
  getTrainingVideo(id: string): Promise<TrainingVideo | null>;
  createTrainingVideo(data: InsertTrainingVideo): Promise<TrainingVideo>;
  updateTrainingVideo(id: string, data: Partial<InsertTrainingVideo>): Promise<TrainingVideo>;
  deleteTrainingVideo(id: string): Promise<void>;
  getTrainingVideosByCategory(category: string): Promise<TrainingVideo[]>;

  // Training Completions
  logTrainingCompletion(videoId: string, staffId: string, staffName: string): Promise<TrainingCompletion>;
  getTrainingCompletions(videoId: string): Promise<TrainingCompletion[]>;
  getStaffTrainingHistory(staffId: string): Promise<TrainingCompletion[]>;
  getTrainingAnalytics(): Promise<{
    totalVideos: number;
    totalCompletions: number;
    videoStats: Array<{
      video: TrainingVideo;
      completionCount: number;
      completionRate: number;
    }>;
  }>;

  // ======== PROPERTY ONBOARDING ========
  // Onboarding Sessions
  createPropertyOnboardingSession(data: InsertPropertyOnboardingSession): Promise<PropertyOnboardingSession>;
  getPropertyOnboardingSession(id: string): Promise<PropertyOnboardingSession | null>;
  getAllPropertyOnboardingSessions(): Promise<PropertyOnboardingSession[]>;
  updatePropertyOnboardingSession(id: string, data: Partial<InsertPropertyOnboardingSession>): Promise<PropertyOnboardingSession>;
  completePropertyOnboardingSession(sessionId: string, propertyId: string): Promise<PropertyOnboardingSession>;

  // Onboarding Responses
  savePropertyOnboardingResponse(data: InsertPropertyOnboardingResponse): Promise<PropertyOnboardingResponse>;
  getPropertyOnboardingResponses(sessionId: string): Promise<PropertyOnboardingResponse[]>;
  getPropertyOnboardingResponsesByStep(sessionId: string, step: number): Promise<PropertyOnboardingResponse[]>;
  updatePropertyOnboardingResponse(id: string, answer: string): Promise<PropertyOnboardingResponse>;

  // ======== MANAGEMENT CONTRACTS ========
  createManagementContract(data: InsertManagementContract): Promise<ManagementContract>;
  getManagementContract(id: string): Promise<ManagementContract | null>;
  getAllManagementContracts(): Promise<ManagementContract[]>;
  getManagementContractsByProperty(propertyId: string): Promise<ManagementContract[]>;
  getActiveManagementContracts(): Promise<ManagementContract[]>;
  getExpiringContracts(daysAhead: number): Promise<ManagementContract[]>;
  updateManagementContract(id: string, data: Partial<InsertManagementContract>): Promise<ManagementContract>;
  updateContractAnalysis(id: string, analysisData: {
    analysisCompleted: boolean;
    isLegallyValid?: boolean;
    legalAnalysisNotes?: string;
    aiAnalysisSummary?: string;
    renewalDate?: Date;
    startDate?: Date;
    endDate?: Date;
    managementFeePercentage?: string;
    managementFeeFixed?: string;
    specialTerms?: string;
  }): Promise<ManagementContract>;
  markContractRenewalNotificationSent(id: string): Promise<ManagementContract>;
  deleteManagementContract(id: string): Promise<void>;

  // ======== COMPLIANCE AUTOMATION ========
  getComplianceAutomationSnapshot(params: {
    staffId: string;
    date: Date;
    property?: string;
  }): Promise<{
    trolleySignedInOut: { compliant: boolean; points: number; evidence: string[] };
    caddySignedInOut: { compliant: boolean; points: number; evidence: string[] };
    usedChatbot: { compliant: boolean; points: number; evidence: string[] };
    missedSpecialRequests: { compliant: boolean; points: number; evidence: string[] };
  }>;

  // ======== RENTCHECK INSPECTIONS ========
  createRentCheckInspection(inspection: InsertRentCheckInspection): Promise<RentCheckInspection>;
  createRentCheckRoomRating(rating: InsertRentCheckRoomRating): Promise<RentCheckRoomRating>;
  getRentCheckInspections(filters?: { propertyId?: string; startDate?: string; endDate?: string }): Promise<RentCheckInspection[]>;
  getRentCheckInspectionById(id: string): Promise<RentCheckInspection | undefined>;
  getRentCheckRoomRatings(inspectionId: string): Promise<RentCheckRoomRating[]>;
  findLastCleanerForProperty(propertyAddress: string, inspectionDate: string): Promise<{ staffId: string; cleaningDate: string; daysSince: number } | null>;

  // ======== ACTIVITY LOGS ========
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(filters?: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]>;
  getActivityLogCount(filters?: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<number>;

  // ======== POTENTIAL CLIENTS PIPELINE ========
  // Potential Clients
  getPotentialClients(): Promise<PotentialClient[]>;
  getAllPotentialClients(): Promise<PotentialClient[]>;
  getPotentialClientById(id: string): Promise<PotentialClient | null>;
  createPotentialClient(data: InsertPotentialClient): Promise<PotentialClient>;
  updatePotentialClient(id: string, data: Partial<InsertPotentialClient>): Promise<PotentialClient>;
  deletePotentialClient(id: string): Promise<void>;

  // Client Contacts
  getClientContacts(potentialClientId: string): Promise<ClientContact[]>;
  createClientContact(data: InsertClientContact): Promise<ClientContact>;
  updateClientContact(id: string, data: Partial<InsertClientContact>): Promise<ClientContact>;
  deleteClientContact(id: string): Promise<void>;

  // Client Properties
  getClientProperties(potentialClientId: string): Promise<ClientProperty[]>;
  createClientProperty(data: InsertClientProperty): Promise<ClientProperty>;
  updateClientProperty(id: string, data: Partial<InsertClientProperty>): Promise<ClientProperty>;
  deleteClientProperty(id: string): Promise<void>;

  // Client Pipeline Stages
  getClientPipelineStage(potentialClientId: string): Promise<ClientPipelineStage | null>;
  createClientPipelineStage(data: InsertClientPipelineStage): Promise<ClientPipelineStage>;
  updateClientPipelineStage(id: string, data: Partial<InsertClientPipelineStage>): Promise<ClientPipelineStage>;

  // Client Stage History
  getClientStageHistory(potentialClientId: string): Promise<ClientStageHistory[]>;
  createClientStageHistory(data: InsertClientStageHistory): Promise<ClientStageHistory>;

  // Client Meetings
  getClientMeetings(potentialClientId: string): Promise<ClientMeeting[]>;
  getClientMeetingById(id: string): Promise<ClientMeeting | null>;
  createClientMeeting(data: InsertClientMeeting): Promise<ClientMeeting>;
  updateClientMeeting(id: string, data: Partial<InsertClientMeeting>): Promise<ClientMeeting>;
  updateMeetingOutcome(id: string, data: UpdateClientMeetingOutcome): Promise<ClientMeeting>;
  listUpcomingMeetings(potentialClientId: string): Promise<ClientMeeting[]>;
  deleteClientMeeting(id: string): Promise<void>;

  // Client Follow-ups
  getClientFollowUps(potentialClientId: string): Promise<ClientFollowUp[]>;
  getOverdueFollowUps(): Promise<ClientFollowUp[]>;
  createClientFollowUp(data: InsertClientFollowUp): Promise<ClientFollowUp>;
  updateClientFollowUp(id: string, data: Partial<InsertClientFollowUp>): Promise<ClientFollowUp>;
  deleteClientFollowUp(id: string): Promise<void>;

  // Client Communications
  getClientCommunications(potentialClientId: string): Promise<ClientCommunication[]>;
  createClientCommunication(data: InsertClientCommunication): Promise<ClientCommunication>;
}

// DatabaseStorage class implementation
class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const [upserted] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upserted;
  }

  // Candidates
  async getCandidates(): Promise<Candidate[]> {
    return db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
    return candidate;
  }

  async getCandidateByEmail(email: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.email, email)).limit(1);
    return candidate;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [created] = await db.insert(candidates).values(candidate).returning();
    return created;
  }

  async bulkCreateCandidates(candidateList: InsertCandidate[]): Promise<Candidate[]> {
    return db.insert(candidates).values(candidateList).returning();
  }

  async updateCandidate(id: string, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [updated] = await db
      .update(candidates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    return updated;
  }

  async getScreenedCandidatesByRoleType(roleType: string): Promise<Candidate[]> {
    return db
      .select()
      .from(candidates)
      .where(and(eq(candidates.roleType, roleType), eq(candidates.status, "screened")));
  }

  async deleteCandidate(id: string): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  // Group Meetings
  async getGroupMeetings(): Promise<GroupMeeting[]> {
    return db.select().from(groupMeetings).orderBy(desc(groupMeetings.createdAt));
  }
  async getGroupMeeting(id: string): Promise<GroupMeeting | undefined> {
    const [meeting] = await db.select().from(groupMeetings).where(eq(groupMeetings.id, id)).limit(1);
    return meeting;
  }
  async createGroupMeeting(meeting: InsertGroupMeeting): Promise<GroupMeeting> {
    const [created] = await db.insert(groupMeetings).values(meeting).returning();
    return created;
  }
  async updateGroupMeeting(id: string, updates: Partial<GroupMeeting>): Promise<GroupMeeting | undefined> {
    const [updated] = await db
      .update(groupMeetings)
      .set(updates)
      .where(eq(groupMeetings.id, id))
      .returning();
    return updated;
  }
  async deleteGroupMeeting(id: string): Promise<void> {
    await db.delete(groupMeetings).where(eq(groupMeetings.id, id));
  }
  async getCandidatesByMeeting(meetingId: string): Promise<Candidate[]> {
    const [meeting] = await db.select().from(groupMeetings).where(eq(groupMeetings.id, meetingId)).limit(1);
    if (!meeting || !meeting.candidateIds || meeting.candidateIds.length === 0) return [];
    return db.select().from(candidates).where(sql`${candidates.id} = ANY(${meeting.candidateIds})`);
  }
  async getGroupMeetingByAttendanceToken(token: string): Promise<GroupMeeting | undefined> {
    const [meeting] = await db.select().from(groupMeetings).where(eq(groupMeetings.attendanceToken, token)).limit(1);
    return meeting;
  }
  async generateAttendanceTokenForMeeting(meetingId: string): Promise<string> {
    const token = randomUUID();
    await db.update(groupMeetings).set({ attendanceToken: token }).where(eq(groupMeetings.id, meetingId));
    return token;
  }

  // Meeting Confirmations
  async createMeetingConfirmation(confirmation: InsertMeetingConfirmation): Promise<MeetingConfirmation> {
    const [created] = await db.insert(meetingConfirmations).values(confirmation).returning();
    return created;
  }
  async getMeetingConfirmationByToken(token: string): Promise<MeetingConfirmation | undefined> {
    const [confirmation] = await db.select().from(meetingConfirmations).where(eq(meetingConfirmations.token, token)).limit(1);
    return confirmation;
  }
  async confirmMeetingByToken(token: string): Promise<MeetingConfirmation | undefined> {
    const [confirmed] = await db
      .update(meetingConfirmations)
      .set({ confirmed: true, confirmedAt: new Date() })
      .where(eq(meetingConfirmations.token, token))
      .returning();
    return confirmed;
  }
  async getMeetingConfirmationsByMeeting(meetingId: string): Promise<MeetingConfirmation[]> {
    return db.select().from(meetingConfirmations).where(eq(meetingConfirmations.meetingId, meetingId));
  }

  // Trial Shifts
  async getTrialShifts(): Promise<TrialShift[]> {
    return db.select().from(trialShifts).orderBy(desc(trialShifts.createdAt));
  }
  async getTrialShift(id: string): Promise<TrialShift | undefined> {
    const [shift] = await db.select().from(trialShifts).where(eq(trialShifts.id, id)).limit(1);
    return shift;
  }
  async createTrialShift(shift: InsertTrialShift): Promise<TrialShift> {
    const [created] = await db.insert(trialShifts).values(shift).returning();
    return created;
  }
  async updateTrialShift(id: string, updates: Partial<InsertTrialShift>): Promise<TrialShift | undefined> {
    const [updated] = await db
      .update(trialShifts)
      .set(updates)
      .where(eq(trialShifts.id, id))
      .returning();
    return updated;
  }

  // Candidate Stage History
  async addCandidateStageHistory(data: InsertCandidateStageHistory): Promise<CandidateStageHistory> {
    const [created] = await db.insert(candidateStageHistory).values(data).returning();
    return created;
  }
  async getCandidateStageHistory(candidateId: string): Promise<CandidateStageHistory[]> {
    return db.select().from(candidateStageHistory).where(eq(candidateStageHistory.candidateId, candidateId)).orderBy(asc(candidateStageHistory.changedAt));
  }

  // Settings
  async getSettings(): Promise<HiringSettings | undefined> {
    const [settings] = await db.select().from(hiringSettings).limit(1);
    return settings;
  }
  async updateSettings(updates: Partial<InsertHiringSettings>): Promise<HiringSettings> {
    const [updated] = await db
      .update(hiringSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(hiringSettings.id, "default")) // Assuming a single settings record
      .returning();
    return updated;
  }

  // Staff
  async createStaff(data: InsertStaff): Promise<Staff> {
    const [created] = await db.insert(staff).values(data).returning();
    return created;
  }
  async getStaff(id: string): Promise<Staff | null> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
    return staffMember || null;
  }
  async getStaffByEmail(email: string): Promise<Staff | null> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
    return staffMember || null;
  }
  async getAllStaff(): Promise<Staff[]> {
    return db.select().from(staff).orderBy(asc(staff.fullName));
  }
  async getActiveStaff(): Promise<Staff[]> {
    return db.select().from(staff).where(eq(staff.status, "active")).orderBy(asc(staff.fullName));
  }
  async updateStaff(id: string, data: Partial<InsertStaff>): Promise<Staff> {
    const [updated] = await db
      .update(staff)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updated;
  }
  async deleteStaff(id: string): Promise<void> {
    await db.delete(staff).where(eq(staff.id, id));
  }
  async findStaffByName(fullName: string): Promise<Staff | null> {
    const [staffMember] = await db
      .select()
      .from(staff)
      .where(eq(staff.fullName, fullName))
      .limit(1);
    return staffMember || null;
  }
  async updateStaffProfile(id: string, data: Partial<InsertStaff>): Promise<Staff> {
    return this.updateStaff(id, data);
  }
  async getStaffWithMetrics(id: string): Promise<any> {
    // Placeholder for fetching staff with metrics
    throw new Error("Not implemented");
  }

  // Compliance Events
  async createComplianceEvent(data: InsertComplianceEvent): Promise<ComplianceEvent> {
    const [created] = await db.insert(complianceEvents).values(data).returning();
    return created;
  }
  async getComplianceEvents(filters?: { staffId?: string; startDate?: string; endDate?: string }): Promise<ComplianceEvent[]> {
    let query = db.select().from(complianceEvents);
    const conditions = [];
    if (filters?.staffId) conditions.push(eq(complianceEvents.staffId, filters.staffId));
    if (filters?.startDate) conditions.push(gte(complianceEvents.eventDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(complianceEvents.eventDate, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(complianceEvents.eventDate));
  }
  async getComplianceEventsByStaff(staffId: string): Promise<ComplianceEvent[]> {
    return this.getComplianceEvents({ staffId });
  }
  async getComplianceEventById(eventId: string): Promise<ComplianceEvent | null> {
    const [event] = await db.select().from(complianceEvents).where(eq(complianceEvents.eventId, eventId)).limit(1);
    return event || null;
  }
  async getStaffComplianceStats(staffId: string): Promise<{ averageScore: number; totalEvents: number; lastScore: number | null }> {
    // Get start and end of current month for cumulative monthly scoring
    // Build date strings directly to avoid timezone conversion issues
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() is 0-indexed

    // Start date: first day of current month (YYYY-MM-01)
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;

    // End date: last day of current month (YYYY-MM-DD)
    const lastDay = new Date(year, month, 0).getDate(); // Gets last day of current month
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    // Get events for current month only
    const events = await this.getComplianceEvents({ 
      staffId, 
      startDate, 
      endDate 
    });

    const totalEvents = events.length;
    if (totalEvents === 0) return { averageScore: 0, totalEvents: 0, lastScore: null };

    // Calculate CUMULATIVE total for the month (not average)
    const cumulativeScore = events.reduce((sum, event) => sum + event.points, 0);
    const lastScore = events.length > 0 ? events[0].points : null;

    // Note: Field is called 'averageScore' for API compatibility, but it's actually cumulative monthly total
    return { averageScore: cumulativeScore, totalEvents, lastScore };
  }
  async getStaffLeaderboard(): Promise<Array<{ staff: Staff; avgScore: number; totalEvents: number }>> {
    // Get ALL staff members, not just those with compliance events
    const allStaff = await this.getAllStaff();
    const leaderboard = [];

    for (const staff of allStaff) {
      const stats = await this.getStaffComplianceStats(staff.id);
      leaderboard.push({ staff, avgScore: stats.averageScore, totalEvents: stats.totalEvents });
    }

    return leaderboard.sort((a, b) => b.avgScore - a.avgScore);
  }
  async hasAvailabilityComplianceEvent(staffId: string, requestId: string): Promise<boolean> {
    // TODO: relatedRequestId field doesn't exist in complianceEvents schema
    // This query cannot filter by requestId - only by staffId
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(complianceEvents)
      .where(eq(complianceEvents.staffId, staffId))
      .limit(1);
    return result?.count > 0;
  }

  // Compliance Analytics
  async getComplianceOverview(dateFrom?: Date, dateTo?: Date): Promise<{
    totalEvents: number;
    averageScore: number;
    totalStaff: number;
    perfectScoreCount: number;
    failedEvents: number;
    complianceRate: number;
  }> {
    let query = db.select().from(complianceEvents);

    if (dateFrom && dateTo) {
      query = query.where(
        and(
          gte(complianceEvents.eventDate, dateFrom.toISOString().split('T')[0]),
          lte(complianceEvents.eventDate, dateTo.toISOString().split('T')[0])
        )
      ) as any;
    }

    const events = await query;

    const totalEvents = events.length;
    const averageScore = totalEvents > 0 
      ? events.reduce((sum, e) => sum + e.points, 0) / totalEvents 
      : 0;

    const uniqueStaffIds = new Set(events.map(e => e.staffId));
    const totalStaff = uniqueStaffIds.size;

    const perfectScoreCount = events.filter(e => e.points >= 15).length;
    const failedEvents = events.filter(e => e.points < 10).length;
    const complianceRate = totalEvents > 0 
      ? (events.filter(e => e.points >= 10).length / totalEvents) * 100 
      : 0;

    return {
      totalEvents,
      averageScore,
      totalStaff,
      perfectScoreCount,
      failedEvents,
      complianceRate,
    };
  }
  async getCommonComplianceIssues(dateFrom?: Date, dateTo?: Date): Promise<Array<{
    criterion: string;
    failureCount: number;
    failureRate: number;
    impactPoints: number;
  }>> {
    let query = db.select().from(complianceEvents);

    if (dateFrom && dateTo) {
      query = query.where(
        and(
          gte(complianceEvents.eventDate, dateFrom.toISOString().split('T')[0]),
          lte(complianceEvents.eventDate, dateTo.toISOString().split('T')[0])
        )
      ) as any;
    }

    const events = await query;
    const issuesMap = new Map<string, { count: number; totalEvents: number; totalPoints: number }>();

    for (const event of events) {
      if (event.rawPayload?.checks) {
        const checks = event.rawPayload.checks;
        const weights = event.rawPayload.weights || {};

        for (const [criterion, value] of Object.entries(checks)) {
          if (value === false || value === "no") {
            const existing = issuesMap.get(criterion) || { count: 0, totalEvents: 0, totalPoints: 0 };
            existing.count++;
            existing.totalPoints += weights[criterion] || 0;
            issuesMap.set(criterion, existing);
          }
        }
      }
    }

    // Count total events for failure rate calculation
    for (const event of events) {
      if (event.rawPayload?.checks) {
        for (const criterion of Object.keys(event.rawPayload.checks)) {
          const existing = issuesMap.get(criterion);
          if (existing) {
            existing.totalEvents++;
          }
        }
      }
    }

    return Array.from(issuesMap.entries())
      .map(([criterion, data]) => ({
        criterion,
        failureCount: data.count,
        failureRate: (data.count / data.totalEvents) * 100,
        impactPoints: data.totalPoints,
      }))
      .sort((a, b) => b.failureCount - a.failureCount);
  }
  async getWeeklyComplianceTrends(weeksBack: number = 12): Promise<Array<{
    weekStart: string;
    averageScore: number;
    totalEvents: number;
    complianceRate: number;
    perfectScoreCount: number;
  }>> {
    const events = await db.select().from(complianceEvents);

    const weeklyData = new Map<string, any[]>();

    for (const event of events) {
      const weekStart = event.weekStart;
      if (!weeklyData.has(weekStart)) {
        weeklyData.set(weekStart, []);
      }
      weeklyData.get(weekStart)!.push(event);
    }

    const trends = Array.from(weeklyData.entries())
      .map(([weekStart, weekEvents]) => {
        const totalEvents = weekEvents.length;
        const averageScore = weekEvents.reduce((sum, e) => sum + e.points, 0) / totalEvents;
        const perfectScoreCount = weekEvents.filter(e => e.points >= 15).length;
        const complianceRate = (weekEvents.filter(e => e.points >= 10).length / totalEvents) * 100;

        return {
          weekStart,
          averageScore,
          totalEvents,
          complianceRate,
          perfectScoreCount,
        };
      })
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .slice(-weeksBack);

    return trends;
  }
  async getPropertyComplianceStats(): Promise<Array<{
    property: string;
    totalEvents: number;
    averageScore: number;
    complianceRate: number;
  }>> {
    const events = await db.select().from(complianceEvents);

    const propertyData = new Map<string, any[]>();

    for (const event of events) {
      const property = event.property || "Unknown";
      if (!propertyData.has(property)) {
        propertyData.set(property, []);
      }
      propertyData.get(property)!.push(event);
    }

    return Array.from(propertyData.entries())
      .map(([property, propEvents]) => {
        const totalEvents = propEvents.length;
        const averageScore = propEvents.reduce((sum, e) => sum + e.points, 0) / totalEvents;
        const complianceRate = (propEvents.filter(e => e.points >= 10).length / totalEvents) * 100;

        return {
          property,
          totalEvents,
          averageScore,
          complianceRate,
        };
      })
      .sort((a, b) => b.totalEvents - a.totalEvents);
  }
  async getTrainingNeeds(): Promise<Array<{
    criterion: string;
    weight: number;
    staffNeedingTraining: Array<{ staffId: string; staffName: string; failureRate: number }>;
  }>> {
    const events = await db.select().from(complianceEvents);
    const allStaff = await this.getAllStaff();

    const criterionFailures = new Map<string, Map<string, { failures: number; total: number; weight: number }>>();

    for (const event of events) {
      if (event.rawPayload?.checks) {
        const checks = event.rawPayload.checks;
        const weights = event.rawPayload.weights || {};

        for (const [criterion, value] of Object.entries(checks)) {
          if (!criterionFailures.has(criterion)) {
            criterionFailures.set(criterion, new Map());
          }

          const staffMap = criterionFailures.get(criterion)!;
          if (!staffMap.has(event.staffId)) {
            staffMap.set(event.staffId, { failures: 0, total: 0, weight: weights[criterion] || 0 });
          }

          const staffData = staffMap.get(event.staffId)!;
          staffData.total++;
          if (value === false || value === "no") {
            staffData.failures++;
          }
        }
      }
    }

    const trainingNeeds: Array<{
      criterion: string;
      weight: number;
      staffNeedingTraining: Array<{ staffId: string; staffName: string; failureRate: number }>;
    }> = [];

    for (const [criterion, staffMap] of criterionFailures.entries()) {
      const staffNeedingTraining: Array<{ staffId: string; staffName: string; failureRate: number }> = [];
      let totalWeight = 0;

      for (const [staffId, data] of staffMap.entries()) {
        const failureRate = (data.failures / data.total) * 100;
        totalWeight = data.weight;

        // Only include staff with >30% failure rate
        if (failureRate > 30) {
          const staffMember = allStaff.find(s => s.id === staffId);
          if (staffMember) {
            staffNeedingTraining.push({
              staffId,
              staffName: staffMember.fullName,
              failureRate,
            });
          }
        }
      }

      if (staffNeedingTraining.length > 0) {
        trainingNeeds.push({
          criterion,
          weight: totalWeight,
          staffNeedingTraining: staffNeedingTraining.sort((a, b) => b.failureRate - a.failureRate),
        });
      }
    }

    return trainingNeeds.sort((a, b) => b.staffNeedingTraining.length - a.staffNeedingTraining.length);
  }

  // Prize Settings
  async getPrizeSettings(): Promise<PrizeSettings> {
    const [settings] = await db.select().from(prizeSettings).limit(1);
    return settings;
  }
  async updatePrizeSettings(data: Partial<InsertPrizeSettings>): Promise<PrizeSettings> {
    const [updated] = await db
      .update(prizeSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(prizeSettings.id, "default")) // Assuming a single settings record
      .returning();
    return updated;
  }

  // System Settings
  async getSystemSettings(): Promise<SystemSettings> {
    const [settings] = await db.select().from(systemSettings).limit(1);
    return settings;
  }
  async updateSystemSettings(data: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    const [updated] = await db
      .update(systemSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(systemSettings.id, "default")) // Assuming a single settings record
      .returning();
    return updated;
  }

  // Availability (legacy)
  async getAvailability(startDate: string, endDate: string): Promise<Availability[]> {
    return db.select().from(availability).where(and(gte(availability.date, startDate), lte(availability.date, endDate)));
  }
  async getAvailabilityByStaffAndDate(staffId: string, date: string): Promise<Availability | null> {
    const [avail] = await db.select().from(availability).where(and(eq(availability.staffId, staffId), eq(availability.date, date))).limit(1);
    return avail || null;
  }
  async createAvailability(data: InsertAvailability): Promise<Availability> {
    const [created] = await db.insert(availability).values(data).returning();
    return created;
  }
  async updateAvailability(id: string, data: Partial<InsertAvailability>): Promise<Availability> {
    const [updated] = await db
      .update(availability)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(availability.id, id))
      .returning();
    return updated;
  }
  async upsertAvailability(staffId: string, date: string, available: boolean, notes?: string): Promise<Availability> {
    const existing = await this.getAvailabilityByStaffAndDate(staffId, date);
    if (existing) {
      return this.updateAvailability(existing.id, { available, notes });
    } else {
      return this.createAvailability({ staffId, date, available, notes });
    }
  }

  // Availability Requests
  async createAvailabilityRequest(data: InsertAvailabilityRequest): Promise<AvailabilityRequest> {
    const [created] = await db.insert(availabilityRequests).values(data).returning();
    return created;
  }
  async getAvailabilityRequest(id: string): Promise<AvailabilityRequest | undefined> {
    const [request] = await db.select().from(availabilityRequests).where(eq(availabilityRequests.id, id)).limit(1);
    return request;
  }
  async getRecentAvailabilityRequests(limit: number = 10): Promise<AvailabilityRequest[]> {
    return db.select().from(availabilityRequests).orderBy(desc(availabilityRequests.createdAt)).limit(limit);
  }
  async updateAvailabilityRequest(id: string, updates: Partial<InsertAvailabilityRequest>): Promise<AvailabilityRequest | undefined> {
    const [updated] = await db
      .update(availabilityRequests)
      .set(updates)
      .where(eq(availabilityRequests.id, id))
      .returning();
    return updated;
  }

  // Availability Responses
  async createAvailabilityResponse(data: InsertAvailabilityResponse): Promise<AvailabilityResponse> {
    const [created] = await db.insert(availabilityResponses).values(data).returning();
    return created;
  }
  async getAvailabilityResponsesByToken(token: string): Promise<AvailabilityResponse[]> {
    return db.select().from(availabilityResponses).where(eq(availabilityResponses.responseToken, token));
  }
  async getAvailabilityResponsesByRequest(requestId: string): Promise<AvailabilityResponse[]> {
    return db.select().from(availabilityResponses).where(eq(availabilityResponses.requestId, requestId));
  }
  async getAvailabilityResponsesByRequestAndStaff(requestId: string, staffId: string): Promise<AvailabilityResponse[]> {
    return db.select().from(availabilityResponses).where(and(eq(availabilityResponses.requestId, requestId), eq(availabilityResponses.staffId, staffId)));
  }
  async getAvailabilityResponsesByDateRange(startDate: string, endDate: string): Promise<AvailabilityResponse[]> {
    return db.select().from(availabilityResponses).where(and(gte(availabilityResponses.date, startDate), lte(availabilityResponses.date, endDate)));
  }
  async getAvailabilityResponsesByStaffAndDate(staffId: string, date: string): Promise<AvailabilityResponse[]>{
    return db.select().from(availabilityResponses).where(and(eq(availabilityResponses.staffId, staffId), eq(availabilityResponses.date, date)));
  }
  async upsertAvailabilityResponse(staffId: string, date: string, timeSlot: string, available: boolean, token: string): Promise<AvailabilityResponse> {
    const [upserted] = await db
      .insert(availabilityResponses)
      .values({ staffId, date, timeSlot, available, responseToken: token })
      .onConflictDoUpdate({
        target: [availabilityResponses.staffId, availabilityResponses.date, availabilityResponses.timeSlot],
        set: { available, submittedAt: new Date() },
      })
      .returning();
    return upserted;
  }
  async bulkSubmitAvailability(token: string, responses: Array<{ staffId: string, date: string, timeSlot: string, available: boolean }>): Promise<AvailabilityResponse[]> {
    const results = [];
    for (const response of responses) {
      results.push(await this.upsertAvailabilityResponse(response.staffId, response.date, response.timeSlot, response.available, token));
    }
    return results;
  }
  async getAvailabilityFormData(token: string): Promise<{ staff: Staff | null, request: AvailabilityRequest, responses: AvailabilityResponse[] } | null> {
    const request = await this.getAvailabilityRequest(token);
    if (!request) return null;
    const responses = await this.getAvailabilityResponsesByToken(token);
    if (responses.length === 0) return { staff: null, request, responses: [] };
    const staffIds = [...new Set(responses.map(r => r.staffId))];
    if (staffIds.length === 0) return { staff: null, request, responses };
    const staffMembers = await db.select().from(staff).where(sql`${staff.id} = ANY(${staffIds})`);
    const firstStaffId = responses[0]?.staffId;
    const firstStaff = firstStaffId ? staffMembers.find(s => s.id === firstStaffId) || null : null;
    return { staff: firstStaff, request, responses };
  }
  async getStaffSubmissionStatus(requestId: string): Promise<Array<{ staffId: string; staffName: string; phone: string | null; token: string; submitted: boolean }>> {
    const request = await this.getAvailabilityRequest(requestId);
    if (!request) return [];
    // Get all active staff members since availabilityRequests doesn't have roleType
    const staffMembers = await db.select().from(staff).where(eq(staff.status, 'active'));
    const submissions = await this.getAvailabilityResponsesByRequest(requestId);
    const submittedStaffIds = new Set(submissions.map(s => s.staffId));

    return staffMembers.map(s => ({
      staffId: s.id,
      staffName: s.fullName,
      phone: s.phone,
      token: requestId,
      submitted: submittedStaffIds.has(s.id),
    }));
  }

  // Admin Staff
  async getAdminStaff(): Promise<AdminStaff[]> {
    return db.select().from(adminStaff);
  }
  async getAdminStaffById(id: string): Promise<AdminStaff | null> {
    const [admin] = await db.select().from(adminStaff).where(eq(adminStaff.id, id)).limit(1);
    return admin || null;
  }
  async getAdminStaffByEmail(email: string): Promise<AdminStaff | null> {
    const [admin] = await db.select().from(adminStaff).where(eq(adminStaff.email, email)).limit(1);
    return admin || null;
  }
  async createAdminStaff(data: InsertAdminStaff): Promise<AdminStaff> {
    const [created] = await db.insert(adminStaff).values(data).returning();
    return created;
  }
  async updateAdminStaff(id: string, data: Partial<InsertAdminStaff>): Promise<AdminStaff> {
    const [updated] = await db
      .update(adminStaff)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(adminStaff.id, id))
      .returning();
    return updated;
  }
  async deleteAdminStaff(id: string): Promise<void> {
    await db.delete(adminStaff).where(eq(adminStaff.id, id));
  }

  // Admin Availability Requests
  async createAdminAvailabilityRequest(data: InsertAdminAvailabilityRequest): Promise<AdminAvailabilityRequest> {
    const [created] = await db.insert(adminAvailabilityRequests).values(data).returning();
    return created;
  }
  async getAdminAvailabilityRequest(id: string): Promise<AdminAvailabilityRequest | undefined> {
    const [request] = await db.select().from(adminAvailabilityRequests).where(eq(adminAvailabilityRequests.id, id)).limit(1);
    return request;
  }
  async updateAdminAvailabilityRequest(id: string, updates: Partial<InsertAdminAvailabilityRequest>): Promise<AdminAvailabilityRequest | undefined> {
    const [updated] = await db
      .update(adminAvailabilityRequests)
      .set(updates)
      .where(eq(adminAvailabilityRequests.id, id))
      .returning();
    return updated;
  }

  // Admin Availability Responses
  async createAdminAvailabilityResponse(data: InsertAdminAvailabilityResponse): Promise<AdminAvailabilityResponse> {
    const [created] = await db.insert(adminAvailabilityResponses).values(data).returning();
    return created;
  }
  async getAdminAvailabilityResponsesByToken(token: string): Promise<AdminAvailabilityResponse[]> {
    return db.select().from(adminAvailabilityResponses).where(eq(adminAvailabilityResponses.responseToken, token));
  }
  async getAdminAvailabilityResponsesByDateRange(startDate: string, endDate: string): Promise<AdminAvailabilityResponse[]> {
    return db.select().from(adminAvailabilityResponses).where(and(gte(adminAvailabilityResponses.date, startDate), lte(adminAvailabilityResponses.date, endDate)));
  }
  async upsertAdminAvailabilityResponse(adminStaffId: string, date: string, timeSlot: string, available: boolean, token: string): Promise<AdminAvailabilityResponse> {
    const [upserted] = await db
      .insert(adminAvailabilityResponses)
      .values({ adminStaffId, date, timeSlot, available, responseToken: token })
      .onConflictDoUpdate({
        target: [adminAvailabilityResponses.adminStaffId, adminAvailabilityResponses.date, adminAvailabilityResponses.timeSlot],
        set: { available, submittedAt: new Date() },
      })
      .returning();
    return upserted;
  }

  // Admin Shift Templates
  async createShiftTemplate(data: InsertAdminShiftTemplate): Promise<AdminShiftTemplate> {
    const [created] = await db.insert(adminShiftTemplates).values(data).returning();
    return created;
  }
  async getShiftTemplates(staffId?: string): Promise<AdminShiftTemplate[]> {
    if (staffId) {
      return db.select().from(adminShiftTemplates).where(eq(adminShiftTemplates.staffId, staffId));
    }
    return db.select().from(adminShiftTemplates);
  }
  async getShiftTemplate(id: string): Promise<AdminShiftTemplate | null> {
    const [template] = await db.select().from(adminShiftTemplates).where(eq(adminShiftTemplates.id, id)).limit(1);
    return template || null;
  }
  async updateShiftTemplate(id: string, data: Partial<InsertAdminShiftTemplate>): Promise<AdminShiftTemplate> {
    const [updated] = await db
      .update(adminShiftTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(adminShiftTemplates.id, id))
      .returning();
    return updated;
  }
  async deleteShiftTemplate(id: string): Promise<void> {
    await db.delete(adminShiftTemplates).where(eq(adminShiftTemplates.id, id));
  }

  // Admin Scheduled Shifts
  async createScheduledShift(data: InsertAdminScheduledShift): Promise<AdminScheduledShift> {
    const [created] = await db.insert(adminScheduledShifts).values(data).returning();
    return created;
  }
  async getScheduledShifts(startDate: string, endDate: string, staffId?: string): Promise<AdminScheduledShift[]> {
    let query = db.select().from(adminScheduledShifts).where(and(gte(adminScheduledShifts.shiftDate, startDate), lte(adminScheduledShifts.shiftDate, endDate)));
    if (staffId) query = query.where(eq(adminScheduledShifts.staffId, staffId));
    return query.orderBy(asc(adminScheduledShifts.shiftDate), asc(adminScheduledShifts.startTime));
  }
  async getScheduledShift(id: string): Promise<AdminScheduledShift | null> {
    const [shift] = await db.select().from(adminScheduledShifts).where(eq(adminScheduledShifts.id, id)).limit(1);
    return shift || null;
  }
  async updateScheduledShift(id: string, data: Partial<InsertAdminScheduledShift>): Promise<AdminScheduledShift> {
    const [updated] = await db
      .update(adminScheduledShifts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(adminScheduledShifts.id, id))
      .returning();
    return updated;
  }
  async deleteScheduledShift(id: string): Promise<void> {
    await db.delete(adminScheduledShifts).where(eq(adminScheduledShifts.id, id));
  }
  async generateShiftsFromTemplates(startDate: string, endDate: string, staffId?: string): Promise<AdminScheduledShift[]> {
    // This is a complex operation that would involve fetching templates, iterating through dates,
    // and creating scheduled shifts. For now, it's a placeholder.
    throw new Error("Not implemented");
  }
  async getWeeklyHoursSummary(startDate: string, endDate: string): Promise<Array<{
    staffId: string;
    staffName: string;
    totalHours: number;
    byDay: Record<string, number>;
  }>> {
    // Placeholder - implement actual logic to sum hours from scheduled shifts
    throw new Error("Not implemented");
  }

  // Location Groups
  async createLocationGroup(data: InsertLocationGroup): Promise<LocationGroup> {
    const [created] = await db.insert(locationGroups).values(data).returning();
    return created;
  }
  async getLocationGroups(): Promise<LocationGroup[]> {
    return db.select().from(locationGroups);
  }
  async getLocationGroup(id: string): Promise<LocationGroup | null> {
    const [group] = await db.select().from(locationGroups).where(eq(locationGroups.id, id)).limit(1);
    return group || null;
  }
  async updateLocationGroup(id: string, data: Partial<InsertLocationGroup>): Promise<LocationGroup> {
    const [updated] = await db
      .update(locationGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(locationGroups.id, id))
      .returning();
    return updated;
  }
  async deleteLocationGroup(id: string): Promise<void> {
    await db.delete(locationGroups).where(eq(locationGroups.id, id));
  }

  // Properties
  async createProperty(data: InsertProperty): Promise<Property> {
    const [created] = await db.insert(properties).values(data).returning();
    return created;
  }
  async getProperties(): Promise<Property[]> {
    return db.select().from(properties);
  }
  async getProperty(id: string): Promise<Property | null> {
    const [prop] = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return prop || null;
  }
  async updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property> {
    const [updated] = await db
      .update(properties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated;
  }
  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }
  async getPropertiesByLocationGroup(locationGroupId: string): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.locationGroupId, locationGroupId));
  }
  async findPropertyByUplistingId(uplistingId: string): Promise<Property | null> {
    const [prop] = await db.select().from(properties).where(eq(properties.uplistingId, uplistingId)).limit(1);
    return prop || null;
  }
  async findPropertyByName(name: string): Promise<Property | null> {
    const [prop] = await db.select().from(properties).where(eq(properties.name, name)).limit(1);
    return prop || null;
  }
  async getPropertyDetails(id: string): Promise<Property | null> {
    return this.getProperty(id);
  }
  async calculateTravelTimes(propertyId: string, limit?: number): Promise<any[]> {
    // Placeholder - requires integration with a mapping service
    throw new Error("Not implemented");
  }
  async bulkImportProperties(properties: Array<{ row: number; data: Partial<InsertProperty> & { locationGroup?: string } }>): Promise<{ created: number; updated: number; failed: number; errors: Array<{ row: number; message: string }> }> {
    // Placeholder - complex logic involving location group lookups and property creation/updates
    throw new Error("Not implemented");
  }

  // Property Aliases
  async createPropertyAlias(data: InsertPropertyAlias): Promise<PropertyAlias> {
    const [created] = await db.insert(propertyAliases).values(data).returning();
    return created;
  }
  async getPropertyAliases(propertyId: string): Promise<PropertyAlias[]> {
    return db.select().from(propertyAliases).where(eq(propertyAliases.propertyId, propertyId));
  }

  // Import Batches
  async createImportBatch(data: InsertImportBatch): Promise<ImportBatch> {
    const [created] = await db.insert(importBatches).values(data).returning();
    return created;
  }
  async getImportBatches(): Promise<ImportBatch[]> {
    return db.select().from(importBatches).orderBy(desc(importBatches.createdAt));
  }
  async getImportBatch(id: string): Promise<ImportBatch | null> {
    const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1);
    return batch || null;
  }
  async updateImportBatch(id: string, data: Partial<InsertImportBatch>): Promise<ImportBatch> {
    const [updated] = await db
      .update(importBatches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(importBatches.id, id))
      .returning();
    return updated;
  }

  // Cleaning Jobs
  async createCleaningJob(data: InsertCleaningJob): Promise<CleaningJob> {
    const [created] = await db.insert(cleaningJobs).values(data).returning();
    return created;
  }
  async getCleaningJobs(filters?: { startDate?: string, endDate?: string, status?: string }): Promise<CleaningJob[]> {
    let query = db.select().from(cleaningJobs);
    const conditions = [];
    if (filters?.startDate) conditions.push(gte(cleaningJobs.jobDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(cleaningJobs.jobDate, filters.endDate));
    if (filters?.status) conditions.push(eq(cleaningJobs.status, filters.status));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(cleaningJobs.jobDate));
  }
  async getCleaningJob(id: string): Promise<CleaningJob | null> {
    const [job] = await db.select().from(cleaningJobs).where(eq(cleaningJobs.id, id)).limit(1);
    return job || null;
  }
  async updateCleaningJob(id: string, data: Partial<InsertCleaningJob>): Promise<CleaningJob> {
    const [updated] = await db
      .update(cleaningJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cleaningJobs.id, id))
      .returning();
    return updated;
  }

  // Cleaning Assignments
  async createCleaningAssignment(data: InsertCleaningAssignment): Promise<CleaningAssignment> {
    const [created] = await db.insert(cleaningAssignments).values(data).returning();
    return created;
  }
  async getCleaningAssignments(filters?: { startDate?: string, endDate?: string, staffId?: string }): Promise<CleaningAssignment[]> {
    let query = db.select().from(cleaningAssignments);
    const conditions = [];
    if (filters?.startDate) conditions.push(gte(cleaningAssignments.assignmentDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(cleaningAssignments.assignmentDate, filters.endDate));
    if (filters?.staffId) conditions.push(eq(cleaningAssignments.staffId, filters.staffId));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(asc(cleaningAssignments.assignmentDate));
  }
  async getCleaningAssignment(id: string): Promise<CleaningAssignment | null> {
    const [assignment] = await db.select().from(cleaningAssignments).where(eq(cleaningAssignments.id, id)).limit(1);
    return assignment || null;
  }
  async updateCleaningAssignment(id: string, data: Partial<InsertCleaningAssignment>): Promise<CleaningAssignment> {
    const [updated] = await db
      .update(cleaningAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cleaningAssignments.id, id))
      .returning();
    return updated;
  }
  async getAssignmentsByWeek(startDate: string, endDate: string): Promise<CleaningAssignment[]> {
    return db.select().from(cleaningAssignments).where(and(gte(cleaningAssignments.assignmentDate, startDate), lte(cleaningAssignments.assignmentDate, endDate)));
  }

  // Matching Issues
  async createMatchingIssue(data: InsertMatchingIssue): Promise<MatchingIssue> {
    const [created] = await db.insert(matchingIssues).values(data).returning();
    return created;
  }
  async getMatchingIssues(importBatchId?: string): Promise<MatchingIssue[]> {
    if (importBatchId) {
      return db.select().from(matchingIssues).where(eq(matchingIssues.importBatchId, importBatchId));
    }
    return db.select().from(matchingIssues);
  }
  async resolveMatchingIssue(id: string, propertyId: string): Promise<MatchingIssue> {
    const [resolved] = await db
      .update(matchingIssues)
      .set({ status: "resolved", propertyId, resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(matchingIssues.id, id))
      .returning();
    return resolved;
  }

  // Assignment Notifications
  async createAssignmentNotification(data: InsertAssignmentNotification): Promise<AssignmentNotification> {
    const [created] = await db.insert(assignmentNotifications).values(data).returning();
    return created;
  }

  // Schedule Drafts
  async getScheduleDrafts(weekStart?: string): Promise<ScheduleDraft[]> {
    if (weekStart) {
      return db.select().from(scheduleDrafts).where(eq(scheduleDrafts.weekStart, weekStart));
    }
    return db.select().from(scheduleDrafts);
  }

  // Schedule Timetables
  async createScheduleTimetable(data: InsertScheduleTimetable): Promise<ScheduleTimetable> {
    const [created] = await db.insert(scheduleTimetables).values(data).returning();
    return created;
  }
  async getScheduleTimetables(weekStart?: string): Promise<ScheduleTimetable[]> {
    if (weekStart) {
      return db.select().from(scheduleTimetables).where(eq(scheduleTimetables.weekStart, weekStart));
    }
    return db.select().from(scheduleTimetables);
  }
  async getScheduleTimetable(id: string): Promise<ScheduleTimetable | null> {
    const [timetable] = await db.select().from(scheduleTimetables).where(eq(scheduleTimetables.id, id)).limit(1);
    return timetable || null;
  }
  async getScheduleTimetableByToken(token: string): Promise<ScheduleTimetable | null> {
    const [timetable] = await db.select().from(scheduleTimetables).where(eq(scheduleTimetables.token, token)).limit(1);
    return timetable || null;
  }
  async updateScheduleTimetable(id: string, data: Partial<InsertScheduleTimetable>): Promise<ScheduleTimetable> {
    const [updated] = await db
      .update(scheduleTimetables)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scheduleTimetables.id, id))
      .returning();
    return updated;
  }

  // Cleaner Schedule Acceptances
  async createCleanerScheduleAcceptance(data: InsertCleanerScheduleAcceptance): Promise<CleanerScheduleAcceptance> {
    const [created] = await db.insert(cleanerScheduleAcceptances).values(data).returning();
    return created;
  }
  async getCleanerScheduleAcceptances(timetableId: string): Promise<CleanerScheduleAcceptance[]> {
    return db.select().from(cleanerScheduleAcceptances).where(eq(cleanerScheduleAcceptances.timetableId, timetableId));
  }
  async getCleanerScheduleAcceptance(timetableId: string, cleanerId: string): Promise<CleanerScheduleAcceptance | null> {
    const [acceptance] = await db.select().from(cleanerScheduleAcceptances).where(and(eq(cleanerScheduleAcceptances.timetableId, timetableId), eq(cleanerScheduleAcceptances.cleanerId, cleanerId))).limit(1);
    return acceptance || null;
  }

  // Screening Links
  async createScreeningLink(data: InsertScreeningLink): Promise<ScreeningLink> {
    const [created] = await db.insert(screeningLinks).values(data).returning();
    return created;
  }
  async getScreeningLink(id: string): Promise<ScreeningLink | null> {
    const [link] = await db.select().from(screeningLinks).where(eq(screeningLinks.id, id)).limit(1);
    return link || null;
  }
  async getScreeningLinkByToken(token: string): Promise<ScreeningLink | null> {
    const [link] = await db.select().from(screeningLinks).where(eq(screeningLinks.token, token)).limit(1);
    return link || null;
  }
  async getScreeningLinksByCandidate(candidateId: string): Promise<ScreeningLink[]> {
    return db.select().from(screeningLinks).where(eq(screeningLinks.candidateId, candidateId));
  }
  async updateScreeningLink(id: string, updates: Partial<InsertScreeningLink>): Promise<ScreeningLink | null> {
    const [updated] = await db
      .update(screeningLinks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(screeningLinks.id, id))
      .returning();
    return updated;
  }

  // Screening Responses
  async createScreeningResponse(data: InsertScreeningResponse): Promise<ScreeningResponse> {
    const [created] = await db.insert(screeningResponses).values(data).returning();
    return created;
  }
  async getScreeningResponsesByLink(screeningLinkId: string): Promise<ScreeningResponse[]> {
    return db.select().from(screeningResponses).where(eq(screeningResponses.screeningLinkId, screeningLinkId));
  }
  async getScreeningResponsesByCandidate(candidateId: string): Promise<ScreeningResponse[]> {
    return db.select().from(screeningResponses).where(eq(screeningResponses.candidateId, candidateId));
  }

  // Onboarding Submissions
  async createOnboardingSubmission(data: InsertOnboardingSubmission): Promise<OnboardingSubmission> {
    const [created] = await db.insert(onboardingSubmissions).values(data).returning();
    return created;
  }
  async getOnboardingSubmission(id: string): Promise<OnboardingSubmission | null> {
    const [submission] = await db.select().from(onboardingSubmissions).where(eq(onboardingSubmissions.id, id)).limit(1);
    return submission || null;
  }
  async getOnboardingSubmissionByToken(token: string): Promise<OnboardingSubmission | null> {
    const [submission] = await db.select().from(onboardingSubmissions).where(eq(onboardingSubmissions.onboardingToken, token)).limit(1);
    return submission || null;
  }
  async getOnboardingSubmissionByCandidate(candidateId: string): Promise<OnboardingSubmission | null> {
    const [submission] = await db.select().from(onboardingSubmissions).where(eq(onboardingSubmissions.candidateId, candidateId)).limit(1);
    return submission || null;
  }
  async updateOnboardingSubmission(id: string, updates: Partial<InsertOnboardingSubmission>): Promise<OnboardingSubmission | null> {
    const [updated] = await db
      .update(onboardingSubmissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(onboardingSubmissions.id, id))
      .returning();
    return updated;
  }

  // Photo ID Uploads
  async createPhotoIdUpload(data: InsertPhotoIdUpload): Promise<PhotoIdUpload> {
    const [created] = await db.insert(photoIdUploads).values(data).returning();
    return created;
  }
  async getPhotoIdUpload(id: string): Promise<PhotoIdUpload | null> {
    const [upload] = await db.select().from(photoIdUploads).where(eq(photoIdUploads.id, id)).limit(1);
    return upload || null;
  }
  async getPhotoIdUploadsByCandidate(candidateId: string): Promise<PhotoIdUpload[]> {
    return db.select().from(photoIdUploads).where(eq(photoIdUploads.candidateId, candidateId));
  }
  async updatePhotoIdUploadAccess(id: string, accessedBy: string): Promise<PhotoIdUpload | null> {
    const [updated] = await db
      .update(photoIdUploads)
      .set({ accessedBy, accessedAt: new Date(), updatedAt: new Date() })
      .where(eq(photoIdUploads.id, id))
      .returning();
    return updated;
  }
  async deletePhotoIdUpload(id: string): Promise<void> {
    await db.delete(photoIdUploads).where(eq(photoIdUploads.id, id));
  }

  // Meeting Attendance
  async createMeetingAttendance(data: InsertMeetingAttendance): Promise<MeetingAttendance> {
    const [created] = await db.insert(meetingAttendance).values(data).returning();
    return created;
  }
  async getMeetingAttendance(id: string): Promise<MeetingAttendance | null> {
    const [attendance] = await db.select().from(meetingAttendance).where(eq(meetingAttendance.id, id)).limit(1);
    return attendance || null;
  }
  async getMeetingAttendanceByMeeting(meetingId: string): Promise<MeetingAttendance[]> {
    return db.select().from(meetingAttendance).where(eq(meetingAttendance.meetingId, meetingId));
  }
  async getMeetingAttendanceByCandidate(candidateId: string): Promise<MeetingAttendance[]> {
    return db.select().from(meetingAttendance).where(eq(meetingAttendance.candidateId, candidateId));
  }
  async updateMeetingAttendance(id: string, updates: Partial<InsertMeetingAttendance>): Promise<MeetingAttendance | null> {
    const [updated] = await db
      .update(meetingAttendance)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetingAttendance.id, id))
      .returning();
    return updated;
  }

  // Communication Logs
  async createCommunicationLog(data: InsertCommunicationLog): Promise<CommunicationLog> {
    const [created] = await db.insert(communicationLogs).values(data).returning();
    return created;
  }
  async getCommunicationLogs(filters?: { candidateId?: string; status?: string; limit?: number; offset?: number }): Promise<CommunicationLog[]> {
    let query = db.select().from(communicationLogs);
    const conditions = [];
    if (filters?.candidateId) conditions.push(eq(communicationLogs.candidateId, filters.candidateId));
    if (filters?.status) conditions.push(eq(communicationLogs.status, filters.status));
    if (conditions.length > 0) query = query.where(and(...conditions));
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset) query = query.offset(filters.offset);
    return query.orderBy(desc(communicationLogs.createdAt));
  }
  async getCommunicationLogsByCandidate(candidateId: string): Promise<CommunicationLog[]> {
    return this.getCommunicationLogs({ candidateId });
  }

  // Onboarding Checklist Templates
  async getOnboardingChecklistTemplates(): Promise<OnboardingChecklistTemplate[]> {
    return db.select().from(onboardingChecklistTemplates).orderBy(asc(onboardingChecklistTemplates.sequenceOrder));
  }
  async createOnboardingChecklistTemplate(data: InsertOnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate> {
    const [created] = await db.insert(onboardingChecklistTemplates).values(data).returning();
    return created;
  }
  async initializeDefaultOnboardingTemplates(): Promise<void> {
    const existing = await db.select().from(onboardingChecklistTemplates).limit(1);
    if (existing.length > 0) return;

    const defaultTemplates = [
      {
        step: "photo_id",
        title: "Photo ID Verification",
        description: "Upload a clear photo of government-issued ID",
        category: "paperwork",
        daysToComplete: 7,
        sequenceOrder: 1,
        required: true,
        automatedTrigger: false,
      },
      {
        step: "trial_shift_1",
        title: "First Trial Shift",
        description: "Complete first supervised cleaning shift",
        category: "training",
        daysToComplete: 14,
        sequenceOrder: 2,
        required: true,
        automatedTrigger: false,
      },
    ];

    await db.insert(onboardingChecklistTemplates).values(defaultTemplates);
  }

  // Onboarding Checklist Items
  async createOnboardingChecklistItem(data: InsertOnboardingChecklistItem): Promise<OnboardingChecklistItem> {
    const [created] = await db.insert(onboardingChecklistItems).values(data).returning();
    return created;
  }
  async getOnboardingChecklistItems(candidateId?: string, staffId?: string): Promise<OnboardingChecklistItem[]> {
    let query = db.select().from(onboardingChecklistItems);
    const conditions = [];
    if (candidateId) conditions.push(eq(onboardingChecklistItems.candidateId, candidateId));
    if (staffId) conditions.push(eq(onboardingChecklistItems.assignedToStaffId, staffId));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(asc(onboardingChecklistItems.sequenceOrder));
  }
  async updateOnboardingChecklistItem(id: string, updates: Partial<InsertOnboardingChecklistItem>): Promise<OnboardingChecklistItem> {
    const [updated] = await db
      .update(onboardingChecklistItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(onboardingChecklistItems.id, id))
      .returning();
    return updated;
  }
  async initializeOnboardingChecklist(candidateId: string): Promise<void> {
    const templates = await this.getOnboardingChecklistTemplates();
    const items = templates.map(template => ({
      candidateId,
      checklistTemplateId: template.id,
      status: "pending",
      dueDate: new Date(Date.now() + template.daysToComplete * 24 * 60 * 60 * 1000),
      sequenceOrder: template.sequenceOrder,
    }));
    await db.insert(onboardingChecklistItems).values(items);
  }
  async getPendingOnboardingItems(): Promise<OnboardingChecklistItem[]> {
    return db.select().from(onboardingChecklistItems).where(eq(onboardingChecklistItems.status, "pending"));
  }

  // Badges
  async getBadges(): Promise<Badge[]> {
    return db.select().from(badges).where(eq(badges.active, true));
  }
  async createBadge(data: InsertBadge): Promise<Badge> {
    const [created] = await db.insert(badges).values(data).returning();
    return created;
  }
  async initializeDefaultBadges(): Promise<void> {
    const existing = await db.select().from(badges).limit(1);
    if (existing.length > 0) return;

    const defaultBadges = [
      {
        name: "Perfect Score",
        description: "Achieved 100% compliance score",
        icon: "⭐",
        category: "performance",
        criteria: { type: "perfect_score" as const, scoreRequired: 100 },
        rarity: "epic",
        active: true,
      },
    ];

    await db.insert(badges).values(defaultBadges);
  }
  async initializeLinenProducts(): Promise<void> {
    // Placeholder - implement based on your linen product requirements
    console.log("[Storage] Linen products initialization placeholder");
  }

  async initializeLinenStockTaskTemplates(): Promise<void> {
    // Check if templates already exist
    const existingTemplates = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.category, "linen-stock"))
      .limit(1);

    if (existingTemplates.length > 0) {
      console.log("[Storage] Linen stock task templates already exist");
      return;
    }

    // Get the first user to use as creator (or skip if no users exist yet)
    const firstUser = await db.select().from(users).limit(1);
    if (firstUser.length === 0) {
      console.log("[Storage] No users found - skipping linen stock task templates initialization");
      return;
    }

    // Create default linen stock task templates
    const defaultTemplates = [
      {
        name: "check-duvet-covers",
        title: "Check Duvet Covers Stock",
        description: "Count and verify duvet covers inventory at Head Office",
        category: "linen-stock",
        assignedToRole: "linen-manager",
        recurrenceType: "weekly",
        priority: "medium",
        estimatedMinutes: 15,
        isActive: true,
        createdBy: firstUser[0].id,
      },
      {
        name: "check-bed-sheets",
        title: "Check Bed Sheets Stock",
        description: "Count and verify bed sheets inventory at Head Office",
        category: "linen-stock",
        assignedToRole: "linen-manager",
        recurrenceType: "weekly",
        priority: "medium",
        estimatedMinutes: 15,
        isActive: true,
        createdBy: firstUser[0].id,
      },
      {
        name: "check-towels",
        title: "Check Towels Stock",
        description: "Count and verify towels inventory at Head Office",
        category: "linen-stock",
        assignedToRole: "linen-manager",
        recurrenceType: "weekly",
        priority: "medium",
        estimatedMinutes: 10,
        isActive: true,
        createdBy: firstUser[0].id,
      },
    ];

    await db.insert(taskTemplates).values(defaultTemplates);
    console.log("[Storage] Initialized linen stock task templates");
  }
  async getStaffBadges(staffId: string): Promise<Array<StaffBadge & { badge: Badge }>> {
    return db
      .select({ staffBadge: staffBadges, badge: badges })
      .from(staffBadges)
      .innerJoin(badges, eq(staffBadges.badgeId, badges.id))
      .where(eq(staffBadges.staffId, staffId));
  }
  async awardBadge(staffId: string, badgeId: string): Promise<StaffBadge> {
    const [awarded] = await db.insert(staffBadges).values({ staffId, badgeId }).returning();
    return awarded;
  }
  async checkAndAwardBadges(staffId: string): Promise<StaffBadge[]> {
    // Placeholder - complex logic to check criteria and award badges
    throw new Error("Not implemented");
  }
  async getEnhancedLeaderboard(): Promise<Array<{
    staff: Staff;
    avgScore: number;
    totalEvents: number;
    badges: Array<StaffBadge & { badge: Badge }>;
    rank: number;
  }>> {
    // Get ALL staff members, not just those with compliance events
    const allStaff = await this.getAllStaff();
    const leaderboard = [];

    for (const staff of allStaff) {
      const stats = await this.getStaffComplianceStats(staff.id);
      const staffBadgeData = await this.getStaffBadges(staff.id);
      const badges = staffBadgeData.map((sb: any) => ({
        ...sb.staffBadge,
        badge: sb.badge
      }));

      leaderboard.push({ 
        staff, 
        avgScore: stats.averageScore, 
        totalEvents: stats.totalEvents,
        badges,
        rank: 0 // Will be set after sorting
      });
    }

    // Sort by average score descending
    leaderboard.sort((a, b) => b.avgScore - a.avgScore);

    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  }

  // Pipeline Analytics
  async getPipelineMetrics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalCandidates: number;
    byStage: Record<string, number>;
    bySource: Record<string, number>;
    byRoleType: Record<string, number>;
    conversionRates: {
      uploadedToScreened: number;
      screenedToScheduled: number;
      scheduledToAttended: number;
      attendedToHired: number;
      overallConversion: number;
    };
  }> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }
  async getTimeToHireMetrics(): Promise<{
    averageDays: number;
    byStage: {
      uploadedToScreened: number;
      screenedToScheduled: number;
      scheduledToAttended: number;
      attendedToHired: number;
    };
    fastest: number;
    slowest: number;
  }> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }
  async getCandidateFunnel(): Promise<Array<{ stage: string; count: number; percentage: number }>> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }
  async getBottleneckAnalysis(): Promise<Array<{
    stage: string;
    avgDaysStuck: number;
    candidatesStuck: number;
  }>> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }
  async getWeeklyActivity(): Promise<Array<{
    week: string;
    newCandidates: number;
    screened: number;
    hired: number;
  }>> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }

  // Hiring Analytics
  async getHiringPipelineMetrics(): Promise<HiringPipelineMetrics> {
    const allCandidates = await db.select().from(hiringCandidates);

    // Count candidates by stage
    const byStage: Record<string, number> = {
      uploaded: allCandidates.filter(c => c.status === 'uploaded').length,
      screened: allCandidates.filter(c => c.status === 'screened').length,
      scheduled: allCandidates.filter(c => c.status === 'scheduled').length,
      attended: allCandidates.filter(c => c.status === 'attended').length,
      hired: allCandidates.filter(c => c.status === 'hired').length,
      not_suitable: allCandidates.filter(c => c.status === 'not_suitable').length,
      withdrawn: allCandidates.filter(c => c.status === 'withdrawn').length,
    };

    const uploaded = byStage.uploaded || 1; // Avoid division by zero
    const screened = byStage.screened || 0;
    const scheduled = byStage.scheduled || 0;
    const attended = byStage.attended || 0;
    const hired = byStage.hired || 0;

    return {
      totalCandidates: allCandidates.length,
      byStage,
      conversionRates: {
        uploadedToScreened: uploaded > 0 ? (screened / uploaded) * 100 : 0,
        screenedToScheduled: screened > 0 ? (scheduled / screened) * 100 : 0,
        scheduledToAttended: scheduled > 0 ? (attended / scheduled) * 100 : 0,
        attendedToHired: attended > 0 ? (hired / attended) * 100 : 0,
        overallConversion: allCandidates.length > 0 ? (hired / allCandidates.length) * 100 : 0,
      },
    };
  }

  async getSourcePerformance(): Promise<SourcePerformance> {
    const allCandidates = await db.select().from(hiringCandidates);

    const bySource: Record<string, {
      totalCandidates: number;
      screenedCount: number;
      hiredCount: number;
      screeningRate: number;
      hireRate: number;
    }> = {};

    // Group candidates by source
    allCandidates.forEach(candidate => {
      const source = candidate.source || 'unknown';

      if (!bySource[source]) {
        bySource[source] = {
          totalCandidates: 0,
          screenedCount: 0,
          hiredCount: 0,
          screeningRate: 0,
          hireRate: 0,
        };
      }

      bySource[source].totalCandidates++;

      if (['screened', 'scheduled', 'attended', 'hired'].includes(candidate.status)) {
        bySource[source].screenedCount++;
      }

      if (candidate.status === 'hired') {
        bySource[source].hiredCount++;
      }
    });

    // Calculate rates
    Object.keys(bySource).forEach(source => {
      const sourceData = bySource[source];
      sourceData.screeningRate = sourceData.totalCandidates > 0 
        ? (sourceData.screenedCount / sourceData.totalCandidates) * 100 
        : 0;
      sourceData.hireRate = sourceData.totalCandidates > 0 
        ? (sourceData.hiredCount / sourceData.totalCandidates) * 100 
        : 0;
    });

    // Find top source
    let topSource: string | null = null;
    let topSourceHireRate = 0;

    Object.keys(bySource).forEach(source => {
      if (bySource[source].hireRate > topSourceHireRate) {
        topSource = source;
        topSourceHireRate = bySource[source].hireRate;
      }
    });

    return {
      bySource,
      topSource,
      topSourceHireRate,
    };
  }

  async getTimeToHireAnalytics(): Promise<TimeToHireMetrics> {
    const hiredCandidates = await db
      .select()
      .from(hiringCandidates)
      .where(eq(hiringCandidates.status, 'hired'));

    if (hiredCandidates.length === 0) {
      return {
        averageDaysToHire: 0,
        byStage: {
          uploadedToScreened: 0,
          screenedToScheduled: 0,
          scheduledToAttended: 0,
          attendedToHired: 0,
        },
        fastest: 0,
        slowest: 0,
        medianDaysToHire: 0,
      };
    }

    const timesToHire: number[] = [];
    const stageTimings = {
      uploadedToScreened: [] as number[],
      screenedToScheduled: [] as number[],
      scheduledToAttended: [] as number[],
      attendedToHired: [] as number[],
    };

    hiredCandidates.forEach(candidate => {
      const uploadDate = new Date(candidate.uploadDate);
      const hireDate = candidate.hireDate ? new Date(candidate.hireDate) : new Date();
      const daysToHire = Math.ceil((hireDate.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
      timesToHire.push(daysToHire);

      // Calculate stage timings (using estimated dates when actual dates not available)
      if (candidate.screeningDate) {
        const screenDate = new Date(candidate.screeningDate);
        const daysToScreen = Math.ceil((screenDate.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
        stageTimings.uploadedToScreened.push(daysToScreen);
      }

      if (candidate.interviewDate) {
        const interviewDate = new Date(candidate.interviewDate);
        if (candidate.screeningDate) {
          const screenDate = new Date(candidate.screeningDate);
          const daysToSchedule = Math.ceil((interviewDate.getTime() - screenDate.getTime()) / (1000 * 60 * 60 * 24));
          stageTimings.screenedToScheduled.push(daysToSchedule);
        }

        // Assume attended same as scheduled for now
        stageTimings.scheduledToAttended.push(0);

        if (candidate.hireDate) {
          const hiredDate = new Date(candidate.hireDate);
          const daysToHire = Math.ceil((hiredDate.getTime() - interviewDate.getTime()) / (1000 * 60 * 60 * 24));
          stageTimings.attendedToHired.push(daysToHire);
        }
      }
    });

    // Calculate averages
    const average = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // Sort for median
    timesToHire.sort((a, b) => a - b);
    const medianDaysToHire = timesToHire.length > 0
      ? timesToHire[Math.floor(timesToHire.length / 2)]
      : 0;

    return {
      averageDaysToHire: average(timesToHire),
      byStage: {
        uploadedToScreened: average(stageTimings.uploadedToScreened),
        screenedToScheduled: average(stageTimings.screenedToScheduled),
        scheduledToAttended: average(stageTimings.scheduledToAttended),
        attendedToHired: average(stageTimings.attendedToHired),
      },
      fastest: Math.min(...timesToHire) || 0,
      slowest: Math.max(...timesToHire) || 0,
      medianDaysToHire,
    };
  }

  // Maintenance Requests
  async createMaintenanceRequest(data: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const [created] = await db.insert(maintenanceRequests).values(data).returning();
    return created;
  }
  async getMaintenanceRequests(filters?: { propertyId?: string; status?: string; priority?: string; serviceType?: string }): Promise<MaintenanceRequest[]> {
    let query = db.select().from(maintenanceRequests);
    const conditions = [];
    if (filters?.propertyId) conditions.push(eq(maintenanceRequests.propertyId, filters.propertyId));
    if (filters?.status) conditions.push(eq(maintenanceRequests.status, filters.status));
    if (filters?.priority) conditions.push(eq(maintenanceRequests.priority, filters.priority));
    if (filters?.serviceType) conditions.push(eq(maintenanceRequests.serviceType, filters.serviceType));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(maintenanceRequests.createdAt));
  }
  async getMaintenanceRequest(id: string): Promise<MaintenanceRequest | null> {
    const [request] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id)).limit(1);
    return request || null;
  }
  async updateMaintenanceRequest(id: string, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest> {
    const [updated] = await db
      .update(maintenanceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, id))
      .returning();
    return updated;
  }
  async deleteMaintenanceRequest(id: string): Promise<void> {
    await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
  }
  async assignMaintenanceRequest(requestId: string, contractorId: string, scheduledDate?: Date, estimatedCost?: number): Promise<MaintenanceAssignment> {
    const [assigned] = await db.insert(maintenanceAssignments).values({ requestId, contractorId, scheduledDate, estimatedCost }).returning();
    await this.updateMaintenanceRequest(requestId, { status: "assigned", scheduledDate, estimatedCost });
    return assigned;
  }
  async completeMaintenanceRequest(requestId: string, actualCost?: number, notes?: string): Promise<MaintenanceRequest> {
    const [completed] = await db
      .update(maintenanceRequests)
      .set({ status: "completed", actualCost, notes, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, requestId))
      .returning();
    return completed;
  }

  // Contractors
  async createContractor(data: InsertContractor): Promise<Contractor> {
    const [created] = await db.insert(contractors).values(data).returning();
    return created;
  }
  async getContractors(filters?: { isActive?: boolean; specialty?: string }): Promise<Contractor[]> {
    let query = db.select().from(contractors);
    const conditions = [];
    if (filters?.isActive !== undefined) conditions.push(eq(contractors.isActive, filters.isActive));
    if (filters?.specialty) conditions.push(eq(contractors.specialty, filters.specialty));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(asc(contractors.name));
  }
  async getContractor(id: string): Promise<Contractor | null> {
    const [contractor] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1);
    return contractor || null;
  }
  async updateContractor(id: string, data: Partial<InsertContractor>): Promise<Contractor> {
    const [updated] = await db
      .update(contractors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractors.id, id))
      .returning();
    return updated;
  }
  async deleteContractor(id: string): Promise<void> {
    await db.delete(contractors).where(eq(contractors.id, id));
  }

  // Maintenance Assignments
  async getMaintenanceAssignmentsByRequest(requestId: string): Promise<MaintenanceAssignment[]> {
    return db.select().from(maintenanceAssignments).where(eq(maintenanceAssignments.requestId, requestId));
  }
  async updateMaintenanceAssignment(id: string, data: Partial<InsertMaintenanceAssignment>): Promise<MaintenanceAssignment> {
    const [updated] = await db
      .update(maintenanceAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenanceAssignments.id, id))
      .returning();
    return updated;
  }

  // Maintenance Statistics
  async getMaintenanceStatsByProperty(): Promise<Array<{
    property: Property;
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    totalCost: number;
    avgCompletionTime: number;
  }>> {
    const allProperties = await db.select().from(properties);
    const result = [];

    for (const property of allProperties) {
      const requests = await db
        .select()
        .from(maintenanceRequests)
        .where(eq(maintenanceRequests.propertyId, property.id));

      const totalRequests = requests.length;
      const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress').length;
      const completedRequests = requests.filter(r => r.status === 'completed').length;
      const totalCost = requests
        .filter(r => r.actualCost !== null)
        .reduce((sum, r) => sum + (r.actualCost || 0), 0);

      // Calculate average completion time in days
      const completedWithDates = requests.filter(r => r.status === 'completed' && r.completedAt && r.createdAt);
      const avgCompletionTime = completedWithDates.length > 0
        ? completedWithDates.reduce((sum, r) => {
            const days = (r.completedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / completedWithDates.length
        : 0;

      result.push({
        property,
        totalRequests,
        pendingRequests,
        completedRequests,
        totalCost,
        avgCompletionTime
      });
    }

    return result;
  }

  async getContractorPerformance(): Promise<Array<{
    contractor: Contractor;
    assignmentCount: number;
    completedCount: number;
    avgCompletionTime: number;
    avgCost: number;
    rating: number;
  }>> {
    const allContractors = await db.select().from(contractors);
    const result = [];

    for (const contractor of allContractors) {
      const assignments = await db
        .select({
          assignment: maintenanceAssignments,
          request: maintenanceRequests
        })
        .from(maintenanceAssignments)
        .leftJoin(maintenanceRequests, eq(maintenanceAssignments.maintenanceRequestId, maintenanceRequests.id))
        .where(eq(maintenanceAssignments.contractorId, contractor.id));

      const assignmentCount = assignments.length;
      const completedAssignments = assignments.filter(a => a.request?.status === 'completed');
      const completedCount = completedAssignments.length;

      // Calculate average cost
      const costsArray = completedAssignments
        .filter(a => a.request?.actualCost !== null)
        .map(a => a.request!.actualCost || 0);
      const avgCost = costsArray.length > 0
        ? costsArray.reduce((sum, cost) => sum + cost, 0) / costsArray.length
        : 0;

      // Calculate average completion time in days
      const completedWithDates = completedAssignments.filter(a => a.request?.completedAt && a.request?.createdAt);
      const avgCompletionTime = completedWithDates.length > 0
        ? completedWithDates.reduce((sum, a) => {
            const days = (a.request!.completedAt!.getTime() - a.request!.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / completedWithDates.length
        : 0;

      result.push({
        contractor,
        assignmentCount,
        completedCount,
        avgCompletionTime,
        avgCost,
        rating: contractor.rating || 5
      });
    }

    return result;
  }
  async getMaintenanceRequestsByStaff(staffId: string): Promise<MaintenanceRequest[]> {
    return db.select().from(maintenanceRequests).where(eq(maintenanceRequests.assignedWorkerId, staffId));
  }

  // Interview Scheduling
  async getNextAvailableInterviewSlot(roleType?: string): Promise<Date | null> {
    // Placeholder - complex logic involving staff availability and existing bookings
    throw new Error("Not implemented");
  }
  async checkSlotAvailability(datetime: Date): Promise<boolean> {
    // Placeholder - check against existing scheduled interviews/staff availability
    throw new Error("Not implemented");
  }
  async autoScheduleCandidate(candidateId: string): Promise<{ success: boolean; meetingId?: string; scheduledAt?: Date; error?: string }> {
    // Placeholder - complex logic involving finding slots and creating meetings
    throw new Error("Not implemented");
  }
  async getUpcomingInterviewSlots(limit?: number): Promise<any[]> {
    // Placeholder - query for available interview slots
    throw new Error("Not implemented");
  }

  // Inspection System
  async createInspectionTemplate(data: InsertInspectionTemplate): Promise<InspectionTemplate> {
    const [created] = await db.insert(inspectionTemplates).values(data).returning();
    return created;
  }
  async getInspectionTemplates(): Promise<InspectionTemplate[]> {
    return db.select().from(inspectionTemplates);
  }
  async getInspectionTemplate(id: string): Promise<InspectionTemplate | null> {
    const [template] = await db.select().from(inspectionTemplates).where(eq(inspectionTemplates.id, id)).limit(1);
    return template || null;
  }
  async updateInspectionTemplate(id: string, data: Partial<InsertInspectionTemplate>): Promise<InspectionTemplate> {
    const [updated] = await db
      .update(inspectionTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inspectionTemplates.id, id))
      .returning();
    return updated;
  }
  async deleteInspectionTemplate(id: string): Promise<void> {
    await db.delete(inspectionTemplates).where(eq(inspectionTemplates.id, id));
  }
  async initializeDefaultInspectionTemplates(): Promise<void> {
    const existing = await db.select().from(inspectionTemplates).limit(1);
    if (existing.length > 0) return;

    const defaultTemplate = {
      name: "Standard Property Inspection",
      category: "cleaning",
      items: [
        {
          category: "Kitchen",
          description: "All surfaces clean",
          required: true,
          type: "check" as const,
        },
      ],
      isActive: true,
    };

    await db.insert(inspectionTemplates).values(defaultTemplate);
  }

  async createInspectionReport(data: InsertInspectionReport): Promise<InspectionReport> {
    const [created] = await db.insert(inspectionReports).values(data).returning();
    return created;
  }
  async getInspectionReports(): Promise<InspectionReport[]> {
    return db.select().from(inspectionReports).orderBy(desc(inspectionReports.reportDate));
  }
  async getInspectionReport(id: string): Promise<InspectionReport | null> {
    const [report] = await db.select().from(inspectionReports).where(eq(inspectionReports.id, id)).limit(1);
    return report || null;
  }
  async updateInspectionReport(id: string, data: Partial<InsertInspectionReport>): Promise<InspectionReport> {
    const [updated] = await db
      .update(inspectionReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inspectionReports.id, id))
      .returning();
    return updated;
  }
  async completeInspection(id: string, overallScore: number): Promise<InspectionReport> {
    const [completed] = await db
      .update(inspectionReports)
      .set({ overallScore, status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(inspectionReports.id, id))
      .returning();
    return completed;
  }

  async createInspectionItem(data: InsertInspectionItem): Promise<InspectionItem> {
    const [created] = await db.insert(inspectionItems).values(data).returning();
    return created;
  }
  async getInspectionItems(reportId: string): Promise<InspectionItem[]> {
    return db.select().from(inspectionItems).where(eq(inspectionItems.reportId, reportId));
  }
  async updateInspectionItem(id: string, data: Partial<InsertInspectionItem>): Promise<InspectionItem> {
    const [updated] = await db
      .update(inspectionItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inspectionItems.id, id))
      .returning();
    return updated;
  }

  // Notification Settings
  async getNotificationSettings(): Promise<InspectionNotificationSettings[]> {
    return db.select().from(inspectionNotificationSettings);
  }
  async createNotificationSetting(data: InsertInspectionNotificationSettings): Promise<InspectionNotificationSettings> {
    const [created] = await db.insert(inspectionNotificationSettings).values(data).returning();
    return created;
  }
  async updateNotificationSetting(id: string, data: Partial<InsertInspectionNotificationSettings>): Promise<InspectionNotificationSettings> {
    const [updated] = await db
      .update(inspectionNotificationSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inspectionNotificationSettings.id, id))
      .returning();
    return updated;
  }
  async deleteNotificationSetting(id: string): Promise<void> {
    await db.delete(inspectionNotificationSettings).where(eq(inspectionNotificationSettings.id, id));
  }
  async bulkCreateInspectionItems(items: InsertInspectionItem[]): Promise<InspectionItem[]> {
    return db.insert(inspectionItems).values(items).returning();
  }

  async createInspectionIssue(data: InsertInspectionIssue): Promise<InspectionIssue> {
    const [created] = await db.insert(inspectionIssues).values(data).returning();
    return created;
  }
  async getInspectionIssues(reportId?: string): Promise<InspectionIssue[]> {
    if (reportId) {
      return db.select().from(inspectionIssues).where(eq(inspectionIssues.reportId, reportId));
    }
    return db.select().from(inspectionIssues);
  }
  async updateInspectionIssue(id: string, data: Partial<InsertInspectionIssue>): Promise<InspectionIssue> {
    const [updated] = await db
      .update(inspectionIssues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inspectionIssues.id, id))
      .returning();
    return updated;
  }
  async linkIssueToMaintenanceRequest(issueId: string, maintenanceRequestId: string): Promise<InspectionIssue> {
    const [updated] = await db
      .update(inspectionIssues)
      .set({ maintenanceRequestId, updatedAt: new Date() })
      .where(eq(inspectionIssues.id, issueId))
      .returning();
    return updated;
  }

  async getPropertyInspectionHistory(propertyId: string): Promise<InspectionReport[]> {
    return db.select().from(inspectionReports).where(eq(inspectionReports.propertyId, propertyId)).orderBy(desc(inspectionReports.reportDate));
  }
  async getInspectionAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalInspections: number;
    averageScore: number;
    completionRate: number;
    issuesFound: number;
    criticalIssues: number;
    propertyStats: Array<{
      propertyId: string;
      propertyName: string;
      inspectionCount: number;
      averageScore: number;
      lastInspectionDate: Date | null;
    }>;
    inspectorStats: Array<{
      inspectorId: string;
      inspectorName: string;
      inspectionCount: number;
      averageScore: number;
    }>;
  }> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }

  // RentCheck PDF Inspection Management
  async createPdfInspection(data: { pdfUrl: string; sourceType: string; propertyId: string; inspectorId: string; templateId: string; aiExtractedData?: any; date?: Date }): Promise<InspectionReport> {
    const reportData: InsertInspectionReport = {
      ...data,
      reportDate: data.date || new Date(),
      inspectorId: data.inspectorId,
      propertyId: data.propertyId,
      inspectionTemplateId: data.templateId,
      status: "pending_ai_extraction", // Or initial status based on needs
      aiExtractedData: data.aiExtractedData,
      pdfUrl: data.pdfUrl,
      sourceType: data.sourceType,
    };
    return this.createInspectionReport(reportData);
  }
  async updateInspectionAiData(id: string, aiExtractedData: any): Promise<InspectionReport> {
    const [updated] = await db
      .update(inspectionReports)
      .set({ aiExtractedData, status: "pending_review", updatedAt: new Date() })
      .where(eq(inspectionReports.id, id))
      .returning();
    return updated;
  }
  async getInspectionWithDetails(id: string): Promise<InspectionReport & { items: InspectionItem[]; issues: InspectionIssue[] } | null> {
    const report = await this.getInspectionReport(id);
    if (!report) return null;
    const items = await this.getInspectionItems(id);
    const issues = await this.getInspectionIssues(id);
    return { ...report, items, issues };
  }
  async getInspectionsByProperty(propertyId: string, dateFrom?: Date, dateTo?: Date): Promise<InspectionReport[]> {
    let query = db.select().from(inspectionReports).where(eq(inspectionReports.propertyId, propertyId));
    if (dateFrom) query = query.where(gte(inspectionReports.reportDate, dateFrom));
    if (dateTo) query = query.where(lte(inspectionReports.reportDate, dateTo));
    return query.orderBy(desc(inspectionReports.reportDate));
  }
  async markInspectionClientNotified(id: string): Promise<InspectionReport> {
    const [updated] = await db
      .update(inspectionReports)
      .set({ clientNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(inspectionReports.id, id))
      .returning();
    return updated;
  }


  // Reviews & Complaints
  async createReview(data: InsertReviewComplaint): Promise<ReviewComplaint> {
    const [created] = await db.insert(reviewsComplaints).values(data).returning();
    return created;
  }
  async getReviews(filters?: {
    propertyId?: string;
    type?: string;
    status?: string;
    priority?: string;
    sentiment?: string;
    source?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ReviewComplaint[]> {
    let query = db.select().from(reviewsComplaints);
    const conditions = [];
    if (filters?.propertyId) conditions.push(eq(reviewsComplaints.propertyId, filters.propertyId));
    if (filters?.type) conditions.push(eq(reviewsComplaints.type, filters.type));
    if (filters?.status) conditions.push(eq(reviewsComplaints.status, filters.status));
    if (filters?.priority) conditions.push(eq(reviewsComplaints.priority, filters.priority));
    if (filters?.sentiment) conditions.push(eq(reviewsComplaints.sentiment, filters.sentiment));
    if (filters?.source) conditions.push(eq(reviewsComplaints.source, filters.source));
    if (filters?.startDate) conditions.push(gte(reviewsComplaints.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(reviewsComplaints.createdAt, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(reviewsComplaints.createdAt));
  }
  async getReview(id: string): Promise<ReviewComplaint | null> {
    const [review] = await db.select().from(reviewsComplaints).where(eq(reviewsComplaints.id, id)).limit(1);
    return review || null;
  }
  async updateReview(id: string, data: Partial<InsertReviewComplaint>): Promise<ReviewComplaint> {
    const [updated] = await db
      .update(reviewsComplaints)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reviewsComplaints.id, id))
      .returning();
    return updated;
  }
  async deleteReview(id: string): Promise<void> {
    await db.delete(reviewsComplaints).where(eq(reviewsComplaints.id, id));
  }
  async respondToReview(id: string, responseText: string, respondedBy: string): Promise<ReviewComplaint> {
    const [updated] = await db
      .update(reviewsComplaints)
      .set({ response: responseText, respondedAt: new Date(), respondedBy, status: "responded", updatedAt: new Date() })
      .where(eq(reviewsComplaints.id, id))
      .returning();
    return updated;
  }

  // Review Categories
  async addReviewCategories(reviewId: string, categories: InsertReviewCategory[]): Promise<ReviewCategory[]> {
    const items = categories.map(c => ({ ...c, reviewId }));
    return db.insert(reviewCategories).values(items).returning();
  }
  async getReviewCategories(reviewId: string): Promise<ReviewCategory[]> {
    return db.select().from(reviewCategories).where(eq(reviewCategories.reviewId, reviewId));
  }

  // Review Themes
  async saveReviewThemes(reviewId: string, themes: InsertReviewTheme[]): Promise<ReviewTheme[]> {
    await db.delete(reviewThemes).where(eq(reviewThemes.reviewId, reviewId)); // Clear existing themes
    const items = themes.map(t => ({ ...t, reviewId }));
    return db.insert(reviewThemes).values(items).returning();
  }
  async getReviewThemes(reviewId: string): Promise<ReviewTheme[]> {
    return db.select().from(reviewThemes).where(eq(reviewThemes.reviewId, reviewId));
  }
  async deleteReviewThemes(reviewId: string): Promise<void> {
    await db.delete(reviewThemes).where(eq(reviewThemes.reviewId, reviewId));
  }
  async getThemesSummary(dateFrom?: Date, dateTo?: Date): Promise<Array<{
    theme: string;
    count: number;
    avgConfidence: number;
    sentiment: { positive: number; neutral: number; negative: number };
  }>> {
    // Build date filter conditions
    const conditions = [];
    if (dateFrom) conditions.push(gte(reviewsComplaints.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(reviewsComplaints.createdAt, dateTo));

    // Get all themes with their associated reviews
    let themeQuery = db
      .select({
        theme: reviewThemes.theme,
        confidence: reviewThemes.confidence,
        sentiment: reviewsComplaints.sentiment,
        reviewId: reviewThemes.reviewId,
      })
      .from(reviewThemes)
      .leftJoin(reviewsComplaints, eq(reviewThemes.reviewId, reviewsComplaints.id));

    if (conditions.length > 0) {
      themeQuery = themeQuery.where(and(...conditions));
    }

    const themeData = await themeQuery;

    // Group by theme and calculate aggregates
    const themeMap = new Map<string, {
      count: number;
      totalConfidence: number;
      sentiments: { positive: number; neutral: number; negative: number };
    }>();

    for (const row of themeData) {
      if (!row.theme) continue;
      
      const existing = themeMap.get(row.theme) || {
        count: 0,
        totalConfidence: 0,
        sentiments: { positive: 0, neutral: 0, negative: 0 },
      };

      existing.count += 1;
      existing.totalConfidence += row.confidence || 0;

      // Track sentiment
      const sentiment = row.sentiment?.toLowerCase() || 'neutral';
      if (sentiment === 'positive') existing.sentiments.positive += 1;
      else if (sentiment === 'negative') existing.sentiments.negative += 1;
      else existing.sentiments.neutral += 1;

      themeMap.set(row.theme, existing);
    }

    // Convert map to array and calculate averages
    return Array.from(themeMap.entries())
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0,
        sentiment: data.sentiments,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Action Items
  async createActionItem(data: InsertActionItem): Promise<ActionItem> {
    const [created] = await db.insert(actionItems).values(data).returning();
    return created;
  }
  async getActionItems(filters?: { reviewId?: string; status?: string; assignedTo?: string }): Promise<ActionItem[]> {
    let query = db.select().from(actionItems);
    const conditions = [];
    if (filters?.reviewId) conditions.push(eq(actionItems.reviewId, filters.reviewId));
    if (filters?.status) conditions.push(eq(actionItems.status, filters.status));
    if (filters?.assignedTo) conditions.push(eq(actionItems.assignedTo, filters.assignedTo));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(asc(actionItems.dueDate));
  }
  async getActionItem(id: string): Promise<ActionItem | null> {
    const [item] = await db.select().from(actionItems).where(eq(actionItems.id, id)).limit(1);
    return item || null;
  }
  async updateActionItem(id: string, data: Partial<InsertActionItem>): Promise<ActionItem> {
    const [updated] = await db
      .update(actionItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(actionItems.id, id))
      .returning();
    return updated;
  }
  async completeActionItem(id: string): Promise<ActionItem> {
    const [updated] = await db
      .update(actionItems)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(actionItems.id, id))
      .returning();
    return updated;
  }

  // Review Analytics
  async analyzeReviewSentiment(content: string): Promise<{ sentiment: string; score: number; categories: string[] }> {
    // Simple keyword-based sentiment analysis
    const positiveWords = ['excellent', 'amazing', 'great', 'wonderful', 'perfect', 'love', 'loved', 'fantastic', 'outstanding', 'superb', 'clean', 'helpful', 'comfortable', 'beautiful'];
    const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'poor', 'dirty', 'disgusting', 'broken', 'uncomfortable', 'rude', 'unhelpful', 'disappointing', 'disappointed', 'never'];
    
    const lowerContent = content.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of positiveWords) {
      if (lowerContent.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (lowerContent.includes(word)) negativeCount++;
    }
    
    // Determine sentiment
    let sentiment = 'neutral';
    let score = 0.5;
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      score = Math.min(0.5 + (positiveCount * 0.1), 1.0);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      score = Math.max(0.5 - (negativeCount * 0.1), 0.0);
    }
    
    return { sentiment, score, categories: [] };
  }

  async getReviewAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalReviews: number;
    averageRating: number;
    sentimentDistribution: { positive: number; neutral: number; negative: number };
    responseRate: number;
    avgResponseTime: number;
    criticalComplaints: number;
  }> {
    // Build date filter
    const conditions = [];
    if (dateFrom) conditions.push(gte(reviewsComplaints.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(reviewsComplaints.createdAt, dateTo));

    // Get all reviews
    let query = db.select().from(reviewsComplaints);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const allReviews = await query;

    // Calculate metrics
    const totalReviews = allReviews.length;
    
    // Average rating
    const ratingsSum = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const averageRating = totalReviews > 0 ? ratingsSum / totalReviews : 0;
    
    // Sentiment distribution
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    for (const review of allReviews) {
      const sentiment = review.sentiment?.toLowerCase() || 'neutral';
      if (sentiment === 'positive') sentiments.positive++;
      else if (sentiment === 'negative') sentiments.negative++;
      else sentiments.neutral++;
    }
    
    // Response rate
    const responded = allReviews.filter(r => r.response).length;
    const responseRate = totalReviews > 0 ? (responded / totalReviews) * 100 : 0;
    
    // Average response time (in hours)
    const responseTimes: number[] = [];
    for (const review of allReviews) {
      if (review.response && review.respondedAt) {
        const createdTime = new Date(review.createdAt).getTime();
        const respondedTime = new Date(review.respondedAt).getTime();
        const hours = (respondedTime - createdTime) / (1000 * 60 * 60);
        responseTimes.push(hours);
      }
    }
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 0;
    
    // Critical complaints
    const criticalComplaints = allReviews.filter(r => 
      r.type === 'complaint' && r.priority === 'high'
    ).length;

    return {
      totalReviews,
      averageRating,
      sentimentDistribution: sentiments,
      responseRate,
      avgResponseTime,
      criticalComplaints,
    };
  }
  async getPropertyReviewTrends(propertyId: string, days: number = 30): Promise<Array<{
    date: string;
    reviews: number;
    avgRating: number;
    avgSentiment: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const reviews = await db
      .select()
      .from(reviewsComplaints)
      .where(
        and(
          eq(reviewsComplaints.propertyId, propertyId),
          gte(reviewsComplaints.createdAt, startDate)
        )
      )
      .orderBy(asc(reviewsComplaints.createdAt));

    // Group by date
    const trendsMap = new Map<string, { reviews: number; totalRating: number; totalSentiment: number }>();

    for (const review of reviews) {
      const dateKey = new Date(review.createdAt).toISOString().split('T')[0];
      const existing = trendsMap.get(dateKey) || { reviews: 0, totalRating: 0, totalSentiment: 0 };

      existing.reviews += 1;
      existing.totalRating += review.rating || 0;
      
      // Convert sentiment to numeric
      const sentiment = review.sentiment?.toLowerCase() || 'neutral';
      const sentimentScore = sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0;
      existing.totalSentiment += sentimentScore;

      trendsMap.set(dateKey, existing);
    }

    // Convert to array and calculate averages
    return Array.from(trendsMap.entries())
      .map(([date, data]) => ({
        date,
        reviews: data.reviews,
        avgRating: data.reviews > 0 ? data.totalRating / data.reviews : 0,
        avgSentiment: data.reviews > 0 ? data.totalSentiment / data.reviews : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  async getUnresolvedComplaints(): Promise<ReviewComplaint[]> {
    return db.select().from(reviewsComplaints).where(eq(reviewsComplaints.status, "open"));
  }
  async getCriticalAlerts(): Promise<ReviewComplaint[]> {
    return db.select().from(reviewsComplaints).where(eq(reviewsComplaints.priority, "high"));
  }
  async getCommonComplaintThemes(limit: number = 10): Promise<Array<{
    theme: string;
    count: number;
    avgPriority: string;
  }>> {
    // Get themes from complaints only
    const themeData = await db
      .select({
        theme: reviewThemes.theme,
        priority: reviewsComplaints.priority,
      })
      .from(reviewThemes)
      .leftJoin(reviewsComplaints, eq(reviewThemes.reviewId, reviewsComplaints.id))
      .where(eq(reviewsComplaints.type, 'complaint'));

    // Group by theme
    const themeMap = new Map<string, { count: number; priorities: string[] }>();

    for (const row of themeData) {
      if (!row.theme) continue;

      const existing = themeMap.get(row.theme) || { count: 0, priorities: [] };
      existing.count += 1;
      if (row.priority) existing.priorities.push(row.priority);

      themeMap.set(row.theme, existing);
    }

    // Calculate average priority
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const priorityName = ['', 'low', 'medium', 'high'];

    return Array.from(themeMap.entries())
      .map(([theme, data]) => {
        const avgWeight = data.priorities.length > 0
          ? data.priorities.reduce((sum, p) => sum + (priorityWeight[p as keyof typeof priorityWeight] || 0), 0) / data.priorities.length
          : 0;
        const avgPriority = priorityName[Math.round(avgWeight)] || 'medium';

        return { theme, count: data.count, avgPriority };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Complaint Submission Tokens
  async createComplaintToken(data: InsertComplaintSubmissionToken): Promise<ComplaintSubmissionToken> {
    const [created] = await db.insert(complaintSubmissionTokens).values(data).returning();
    return created;
  }
  async getComplaintTokenById(id: string): Promise<ComplaintSubmissionToken | undefined> {
    const [token] = await db.select().from(complaintSubmissionTokens).where(eq(complaintSubmissionTokens.id, id)).limit(1);
    return token;
  }
  async getComplaintTokenByHash(hashedToken: string): Promise<ComplaintSubmissionToken | undefined> {
    const [token] = await db.select().from(complaintSubmissionTokens).where(eq(complaintSubmissionTokens.hashedToken, hashedToken)).limit(1);
    return token;
  }
  async updateTokenStatus(id: string, status: string, metadata: any): Promise<void> {
    await db
      .update(complaintSubmissionTokens)
      .set({ status, metadata })
      .where(eq(complaintSubmissionTokens.id, id));
  }
  async validateAndUseToken(hashedToken: string): Promise<{valid: boolean, token?: ComplaintSubmissionToken, propertyId?: string}> {
    const token = await this.getComplaintTokenByHash(hashedToken);
    
    if (!token) {
      return { valid: false };
    }
    
    // Check if token is expired
    if (new Date() > new Date(token.expiresAt)) {
      await this.updateTokenStatus(token.id, 'expired', token.metadata);
      return { valid: false, token };
    }
    
    // Check if token has remaining uses
    if (token.remainingUses <= 0) {
      return { valid: false, token };
    }
    
    // Check if token is active
    if (token.status !== 'active') {
      return { valid: false, token };
    }
    
    // Decrement remaining uses and update usedAt if first use
    const newRemainingUses = token.remainingUses - 1;
    const updates: any = { 
      remainingUses: newRemainingUses,
    };
    
    if (!token.usedAt) {
      updates.usedAt = new Date();
    }
    
    // If no remaining uses, mark as expired
    if (newRemainingUses <= 0) {
      updates.status = 'expired';
    }
    
    await db
      .update(complaintSubmissionTokens)
      .set(updates)
      .where(eq(complaintSubmissionTokens.id, token.id));
    
    return { 
      valid: true, 
      token: { ...token, remainingUses: newRemainingUses },
      propertyId: token.propertyId 
    };
  }
  async getAllComplaintTokens(): Promise<ComplaintSubmissionToken[]> {
    return db.select().from(complaintSubmissionTokens).orderBy(desc(complaintSubmissionTokens.createdAt));
  }

  // Comprehensive Complaint Analytics
  async getComplaintAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    overview: {
      totalComplaints: number;
      resolvedComplaints: number;
      resolutionRate: number;
      avgResolutionTimeHours: number;
      criticalComplaints: number;
      unresolvedCritical: number;
    };
    categories: Array<{
      category: string;
      count: number;
      percentage: number;
      avgPriority: string;
      trend: 'up' | 'down' | 'stable';
      trendPercentage: number;
    }>;
    propertyPerformance: Array<{
      propertyId: string;
      propertyName: string;
      complaintCount: number;
      complaintRate: number;
      avgResolutionTimeHours: number;
      commonIssues: string[];
    }>;
    repeatComplaints: Array<{
      propertyId: string;
      propertyName: string;
      category: string;
      count: number;
      lastOccurrence: Date;
      status: string;
    }>;
    staffPerformance: Array<{
      staffId: string;
      staffName: string;
      complaintsResponded: number;
      avgResponseTimeHours: number;
      resolutionRate: number;
    }>;
    compensation: {
      totalCompensated: number;
      avgCompensation: number;
      compensationByReason: Array<{
        reason: string;
        count: number;
        totalAmount: number;
      }>;
    };
    trends: Array<{
      period: string;
      complaints: number;
      resolved: number;
      avgResolutionTime: number;
    }>;
    insights: Array<{
      type: 'warning' | 'success' | 'info';
      title: string;
      description: string;
      actionable: boolean;
      priority: 'high' | 'medium' | 'low';
    }>;
  }> {
    // Build date filters
    const conditions = [eq(reviewsComplaints.type, 'complaint')];
    if (dateFrom) conditions.push(gte(reviewsComplaints.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(reviewsComplaints.createdAt, dateTo));

    // Get all complaints in period
    const complaints = await db
      .select()
      .from(reviewsComplaints)
      .where(and(...conditions));

    // Get property data for joins
    const allProperties = await db.select().from(properties);
    const propertyMap = new Map(allProperties.map(p => [p.id, p.name]));

    // === OVERVIEW ===
    const totalComplaints = complaints.length;
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;
    const resolutionRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;
    
    const resolutionTimes: number[] = [];
    for (const c of complaints) {
      if (c.status === 'resolved' && c.resolvedAt) {
        const created = new Date(c.createdAt).getTime();
        const resolved = new Date(c.resolvedAt).getTime();
        resolutionTimes.push((resolved - created) / (1000 * 60 * 60));
      }
    }
    const avgResolutionTimeHours = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    const criticalComplaints = complaints.filter(c => c.priority === 'high').length;
    const unresolvedCritical = complaints.filter(c => c.priority === 'high' && c.status !== 'resolved').length;

    // === CATEGORIES ===
    const categoryMap = new Map<string, { count: number; priorities: string[] }>();
    const issueFields = ['cleaningIssues', 'maintenanceIssues', 'customerServiceIssues', 'linenIssues'] as const;
    
    for (const c of complaints) {
      for (const field of issueFields) {
        if (c[field]) {
          const category = field.replace('Issues', '');
          const existing = categoryMap.get(category) || { count: 0, priorities: [] };
          existing.count += 1;
          if (c.priority) existing.priorities.push(c.priority);
          categoryMap.set(category, existing);
        }
      }
    }

    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const categories = Array.from(categoryMap.entries()).map(([category, data]) => {
      const avgWeight = data.priorities.length > 0
        ? data.priorities.reduce((sum, p) => sum + (priorityWeight[p as keyof typeof priorityWeight] || 0), 0) / data.priorities.length
        : 2;
      const avgPriority = avgWeight > 2.5 ? 'high' : avgWeight > 1.5 ? 'medium' : 'low';
      
      return {
        category,
        count: data.count,
        percentage: totalComplaints > 0 ? (data.count / totalComplaints) * 100 : 0,
        avgPriority,
        trend: 'stable' as const,
        trendPercentage: 0,
      };
    });

    // === PROPERTY PERFORMANCE ===
    const propertyComplaintsMap = new Map<string, { complaints: typeof complaints; resolutionTimes: number[]; themes: string[] }>();
    
    for (const c of complaints) {
      const existing = propertyComplaintsMap.get(c.propertyId) || { complaints: [], resolutionTimes: [], themes: [] };
      existing.complaints.push(c);
      
      if (c.status === 'resolved' && c.resolvedAt) {
        const hours = (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
        existing.resolutionTimes.push(hours);
      }
      
      propertyComplaintsMap.set(c.propertyId, existing);
    }

    // Get themes for each property
    const allThemes = await db.select().from(reviewThemes);
    const complaintIds = new Set(complaints.map(c => c.id));
    
    for (const theme of allThemes) {
      if (complaintIds.has(theme.reviewId)) {
        const complaint = complaints.find(c => c.id === theme.reviewId);
        if (complaint) {
          const propData = propertyComplaintsMap.get(complaint.propertyId);
          if (propData && theme.theme) {
            propData.themes.push(theme.theme);
          }
        }
      }
    }

    const propertyPerformance = Array.from(propertyComplaintsMap.entries())
      .map(([propertyId, data]) => {
        const themeCounts = new Map<string, number>();
        for (const theme of data.themes) {
          themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
        }
        const commonIssues = Array.from(themeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([theme]) => theme);

        return {
          propertyId,
          propertyName: propertyMap.get(propertyId) || 'Unknown',
          complaintCount: data.complaints.length,
          complaintRate: data.complaints.length, // Could calculate per booking if we had booking data
          avgResolutionTimeHours: data.resolutionTimes.length > 0
            ? data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length
            : 0,
          commonIssues,
        };
      })
      .sort((a, b) => b.complaintCount - a.complaintCount);

    // === REPEAT COMPLAINTS ===
    const repeatMap = new Map<string, Array<typeof complaints[0]>>();
    
    for (const c of complaints) {
      for (const field of issueFields) {
        if (c[field]) {
          const key = `${c.propertyId}-${field}`;
          const existing = repeatMap.get(key) || [];
          existing.push(c);
          repeatMap.set(key, existing);
        }
      }
    }

    const repeatComplaints = Array.from(repeatMap.entries())
      .filter(([_, comps]) => comps.length > 1)
      .map(([key, comps]) => {
        const [propertyId, category] = key.split('-');
        const sorted = comps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return {
          propertyId,
          propertyName: propertyMap.get(propertyId) || 'Unknown',
          category: category.replace('Issues', ''),
          count: comps.length,
          lastOccurrence: sorted[0].createdAt,
          status: sorted[0].status,
        };
      })
      .sort((a, b) => b.count - a.count);

    // === STAFF PERFORMANCE === (simplified - would need staff tracking in responses)
    const staffPerformance: Array<{
      staffId: string;
      staffName: string;
      complaintsResponded: number;
      avgResponseTimeHours: number;
      resolutionRate: number;
    }> = [];

    // === COMPENSATION ===
    let totalCompensated = 0;
    let compensationCount = 0;
    const compensationReasons = new Map<string, { count: number; total: number }>();

    for (const c of complaints) {
      if (c.compensationOffered) {
        compensationCount += 1;
        // Try to parse compensation amount (simplified)
        const match = c.compensationOffered.match(/£?(\d+(?:\.\d{2})?)/);
        if (match) {
          const amount = parseFloat(match[1]);
          totalCompensated += amount;
          
          // Categorize by issue type
          for (const field of issueFields) {
            if (c[field]) {
              const reason = field.replace('Issues', '');
              const existing = compensationReasons.get(reason) || { count: 0, total: 0 };
              existing.count += 1;
              existing.total += amount;
              compensationReasons.set(reason, existing);
            }
          }
        }
      }
    }

    const compensation = {
      totalCompensated,
      avgCompensation: compensationCount > 0 ? totalCompensated / compensationCount : 0,
      compensationByReason: Array.from(compensationReasons.entries()).map(([reason, data]) => ({
        reason,
        count: data.count,
        totalAmount: data.total,
      })),
    };

    // === TRENDS === (monthly breakdown)
    const trendsMap = new Map<string, { complaints: number; resolved: number; totalResolutionTime: number; resolvedCount: number }>();
    
    for (const c of complaints) {
      const month = new Date(c.createdAt).toISOString().slice(0, 7); // YYYY-MM
      const existing = trendsMap.get(month) || { complaints: 0, resolved: 0, totalResolutionTime: 0, resolvedCount: 0 };
      
      existing.complaints += 1;
      if (c.status === 'resolved') {
        existing.resolved += 1;
        if (c.resolvedAt) {
          const hours = (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
          existing.totalResolutionTime += hours;
          existing.resolvedCount += 1;
        }
      }
      
      trendsMap.set(month, existing);
    }

    const trends = Array.from(trendsMap.entries())
      .map(([period, data]) => ({
        period,
        complaints: data.complaints,
        resolved: data.resolved,
        avgResolutionTime: data.resolvedCount > 0 ? data.totalResolutionTime / data.resolvedCount : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // === INSIGHTS ===
    const insights: Array<{
      type: 'warning' | 'success' | 'info';
      title: string;
      description: string;
      actionable: boolean;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    if (unresolvedCritical > 0) {
      insights.push({
        type: 'warning',
        title: `${unresolvedCritical} Unresolved Critical Complaint${unresolvedCritical > 1 ? 's' : ''}`,
        description: `There ${unresolvedCritical === 1 ? 'is' : 'are'} ${unresolvedCritical} high-priority complaint${unresolvedCritical > 1 ? 's' : ''} requiring immediate attention.`,
        actionable: true,
        priority: 'high',
      });
    }

    if (repeatComplaints.length > 0) {
      const topRepeat = repeatComplaints[0];
      insights.push({
        type: 'warning',
        title: 'Recurring Issues Detected',
        description: `${topRepeat.propertyName} has ${topRepeat.count} repeated ${topRepeat.category} complaints. Consider a thorough inspection.`,
        actionable: true,
        priority: 'high',
      });
    }

    if (resolutionRate > 90) {
      insights.push({
        type: 'success',
        title: 'Excellent Resolution Rate',
        description: `${resolutionRate.toFixed(1)}% of complaints have been resolved. Keep up the great work!`,
        actionable: false,
        priority: 'low',
      });
    }

    if (avgResolutionTimeHours < 24) {
      insights.push({
        type: 'success',
        title: 'Fast Response Time',
        description: `Average resolution time is ${avgResolutionTimeHours.toFixed(1)} hours. Excellent responsiveness!`,
        actionable: false,
        priority: 'low',
      });
    }

    return {
      overview: {
        totalComplaints,
        resolvedComplaints,
        resolutionRate,
        avgResolutionTimeHours,
        criticalComplaints,
        unresolvedCritical,
      },
      categories,
      propertyPerformance,
      repeatComplaints,
      staffPerformance,
      compensation,
      trends,
      insights,
    };
  }

  // ======== ORDERING SYSTEM METHODS ========
  // Supplier Management
  async createSupplier(data: InsertOrderingSupplier): Promise<OrderingSupplier> {
    const [created] = await db.insert(orderingSuppliers).values(data).returning();
    return created;
  }
  async getSuppliers(filters?: { isActive?: boolean; type?: string }): Promise<OrderingSupplier[]> {
    let query = db.select().from(orderingSuppliers);
    const conditions = [];
    if (filters?.isActive !== undefined) conditions.push(eq(orderingSuppliers.isActive, filters.isActive));
    if (filters?.type) conditions.push(eq(orderingSuppliers.type, filters.type));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(asc(orderingSuppliers.name));
  }
  async getSupplier(id: string): Promise<OrderingSupplier | null> {
    const [supplier] = await db.select().from(orderingSuppliers).where(eq(orderingSuppliers.id, id)).limit(1);
    return supplier || null;
  }
  async updateSupplier(id: string, data: Partial<InsertOrderingSupplier>): Promise<OrderingSupplier> {
    const [updated] = await db
      .update(orderingSuppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orderingSuppliers.id, id))
      .returning();
    return updated;
  }
  async deleteSupplier(id: string): Promise<void> {
    await db.delete(orderingSuppliers).where(eq(orderingSuppliers.id, id));
  }

  // Product Management
  async createProduct(data: InsertOrderingProduct): Promise<OrderingProduct> {
    const [created] = await db.insert(orderingProducts).values(data).returning();
    return created;
  }
  async getProducts(filters?: {
    category?: string;
    supplier?: string;
    isActive?: boolean;
    lowStock?: boolean;
  }): Promise<OrderingProduct[]> {
    let query = db.select().from(orderingProducts);
    const conditions = [];
    if (filters?.category) conditions.push(eq(orderingProducts.category, filters.category));
    if (filters?.supplier) conditions.push(eq(orderingProducts.supplierId, filters.supplier));
    if (filters?.isActive !== undefined) conditions.push(eq(orderingProducts.isActive, filters.isActive));
    if (filters?.lowStock) {
      // This assumes we have a way to calculate current stock and compare to a target/reorder level
      // For now, returning all products and letting the service layer handle filtering
    }
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(asc(orderingProducts.name));
  }
  async getProduct(id: string): Promise<OrderingProduct | null> {
    const [product] = await db.select().from(orderingProducts).where(eq(orderingProducts.id, id)).limit(1);
    return product || null;
  }
  async updateProduct(id: string, data: Partial<InsertOrderingProduct>): Promise<OrderingProduct> {
    const [updated] = await db
      .update(orderingProducts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orderingProducts.id, id))
      .returning();
    return updated;
  }
  async deleteProduct(id: string): Promise<void> {
    await db.delete(orderingProducts).where(eq(orderingProducts.id, id));
  }
  async getLowStockProducts(): Promise<Array<OrderingProduct & { percentageRemaining: number }>> {
    const products = await db
      .select()
      .from(orderingProducts)
      .where(
        sql`min_stock IS NOT NULL AND current_stock <= min_stock`
      )
      .orderBy(asc(orderingProducts.currentStock));
    
    return products.map(product => ({
      ...product,
      percentageRemaining: product.minStock && product.minStock > 0
        ? Math.round((product.currentStock / product.minStock) * 100)
        : 0
    }));
  }
  async bulkImportProducts(products: InsertOrderingProduct[]): Promise<{ created: number; updated: number; failed: number }> {
    // Placeholder - logic to handle creating/updating products
    throw new Error("Not implemented");
  }

  // Order Management
  async createOrder(data: InsertOrderingOrder): Promise<OrderingOrder> {
    // Generate order number if not provided
    const orderNumber = data.orderNumber || await this.generateOrderNumber();
    const [created] = await db.insert(orderingOrders).values({
      ...data,
      orderNumber
    }).returning();
    return created;
  }
  async getOrders(filters?: {
    status?: string;
    supplier?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<OrderingOrder[]> {
    let query = db.select().from(orderingOrders);
    const conditions = [];
    if (filters?.status) conditions.push(eq(orderingOrders.status, filters.status));
    if (filters?.supplier) conditions.push(eq(orderingOrders.supplierId, filters.supplier));
    if (filters?.startDate) conditions.push(gte(orderingOrders.orderDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(orderingOrders.orderDate, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(orderingOrders.orderDate));
  }
  async getOrder(id: string): Promise<OrderingOrder | null> {
    const [order] = await db.select().from(orderingOrders).where(eq(orderingOrders.id, id)).limit(1);
    return order || null;
  }
  async updateOrder(id: string, data: Partial<InsertOrderingOrder>): Promise<OrderingOrder> {
    const [updated] = await db
      .update(orderingOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orderingOrders.id, id))
      .returning();
    return updated;
  }
  async deleteOrder(id: string): Promise<void> {
    await db.delete(orderingOrders).where(eq(orderingOrders.id, id));
  }
  async generateOrderNumber(): Promise<string> {
    // Get the most recent order to find the highest order number
    const [latestOrder] = await db
      .select()
      .from(orderingOrders)
      .orderBy(desc(orderingOrders.createdAt))
      .limit(1);
    
    if (!latestOrder || !latestOrder.orderNumber) {
      return "ORD-001";
    }
    
    // Extract the numeric part from the order number (e.g., "ORD-123" -> 123)
    const match = latestOrder.orderNumber.match(/ORD-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1], 10) + 1;
      return `ORD-${nextNumber.toString().padStart(3, '0')}`;
    }
    
    // Fallback if order number doesn't match expected format
    return `ORD-${Date.now().toString().slice(-6)}`;
  }

  // Order Items
  async addOrderItem(data: InsertOrderingOrderItem): Promise<OrderingOrderItem> {
    const [created] = await db.insert(orderingOrderItems).values(data).returning();
    return created;
  }
  async getOrderItems(orderId: string): Promise<Array<OrderingOrderItem & { product: OrderingProduct; productName: string }>> {
    const results = await db
      .select()
      .from(orderingOrderItems)
      .leftJoin(orderingProducts, eq(orderingOrderItems.productId, orderingProducts.id))
      .where(eq(orderingOrderItems.orderId, orderId));
    
    // Flatten the structure to match frontend expectations
    return results.map((row) => ({
      ...row.ordering_order_items,
      product: row.ordering_products || undefined,
      productName: row.ordering_products?.name || 'Unknown Product',
    })) as Array<OrderingOrderItem & { product: OrderingProduct; productName: string }>;
  }
  async updateOrderItem(id: string, data: Partial<InsertOrderingOrderItem>): Promise<OrderingOrderItem> {
    const [updated] = await db
      .update(orderingOrderItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orderingOrderItems.id, id))
      .returning();
    return updated;
  }
  async removeOrderItem(id: string): Promise<void> {
    await db.delete(orderingOrderItems).where(eq(orderingOrderItems.id, id));
  }
  async receiveOrderItems(orderId: string, items: Array<{ itemId: string; receivedQuantity: number }>): Promise<void> {
    // Placeholder - update item quantities and potentially order status
    for (const item of items) {
      await this.updateOrderItem(item.itemId, { receivedQuantity: item.receivedQuantity });
    }
    // Potentially update order status if all items are received
    throw new Error("Not implemented");
  }

  // Stock Management
  async adjustStock(productId: string, adjustment: number, reason: string, movedBy?: string): Promise<OrderingStockMovement> {
    const [product] = await db.select().from(orderingProducts).where(eq(orderingProducts.id, productId));
    if (!product) throw new Error("Product not found");

    // Determine movement type based on adjustment direction
    const movementType = adjustment > 0 ? 'in' : adjustment < 0 ? 'out' : 'adjustment';

    // Create stock movement record
    const [movement] = await db.insert(orderingStockMovements).values({
      productId,
      movementType,
      quantity: Math.abs(adjustment),
      reason,
      movedBy: movedBy || null,
    }).returning();

    // Update product stock
    await db.update(orderingProducts).set({ currentStock: product.currentStock + adjustment, updatedAt: new Date() }).where(eq(orderingProducts.id, productId));

    return movement;
  }
  async getStockMovements(filters?: {
    productId?: string;
    movementType?: string; // e.g., 'in', 'out', 'adjustment'
    startDate?: Date;
    endDate?: Date;
  }): Promise<Array<OrderingStockMovement & { product: OrderingProduct }>> {
    let query = db.select({ movement: orderingStockMovements, product: orderingProducts }).from(orderingStockMovements)
      .innerJoin(orderingProducts, eq(orderingStockMovements.productId, orderingProducts.id));
    const conditions = [];
    if (filters?.productId) conditions.push(eq(orderingStockMovements.productId, filters.productId));
    // Note: movementType would likely be inferred from quantityChange sign or a dedicated field
    if (filters?.startDate) conditions.push(gte(orderingStockMovements.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(orderingStockMovements.createdAt, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(orderingStockMovements.createdAt));
  }
  async allocateStockToProperty(productId: string, propertyId: string, quantity: number, movedBy?: string): Promise<OrderingStockMovement> {
    // This is a complex operation that might involve creating a specific type of stock movement
    // and potentially updating property-specific stock levels if tracked separately.
    // For now, assuming it's similar to adjusting stock for a 'use' purpose.
    return this.adjustStock(productId, -quantity, `Allocated to property ${propertyId}`, movedBy);
  }
  async getStockByProperty(propertyId: string): Promise<Array<{ product: OrderingProduct; quantity: number }>> {
    // Placeholder - requires linking stock movements or product allocations to properties
    throw new Error("Not implemented");
  }

  // Inventory Counting System
  async createStockCount(data: InsertStockCount): Promise<StockCount> {
    const [created] = await db.insert(stockCounts).values(data).returning();
    return created;
  }
  async getStockCounts(filters?: {
    productId?: string;
    locationCode?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Array<StockCount & { product: OrderingProduct; countedByStaff?: Staff }>> {
    let query = db.select({ stockCount: stockCounts, product: orderingProducts, countedByStaff: staff }).from(stockCounts)
      .leftJoin(orderingProducts, eq(stockCounts.productId, orderingProducts.id))
      .leftJoin(staff, eq(stockCounts.countedByStaffId, staff.id));
    const conditions = [];
    if (filters?.productId) conditions.push(eq(stockCounts.productId, filters.productId));
    if (filters?.locationCode) conditions.push(eq(stockCounts.locationCode, filters.locationCode));
    if (filters?.startDate) conditions.push(gte(stockCounts.countDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(stockCounts.countDate, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(stockCounts.countDate));
  }
  async getLatestStockCounts(locationCode?: string): Promise<Array<StockCount & { product: OrderingProduct }>> {
    // This requires a subquery or window function to get the latest count per product
    throw new Error("Not implemented");
  }
  async getLatestStockCountByProduct(productId: string, locationCode?: string): Promise<StockCount | null> {
    let query = db.select().from(stockCounts).where(eq(stockCounts.productId, productId));
    if (locationCode) query = query.where(eq(stockCounts.locationCode, locationCode));
    const [latest] = await query.orderBy(desc(stockCounts.countDate)).limit(1);
    return latest || null;
  }
  async updateProductTargetQuantity(productId: string, targetQuantity: number): Promise<OrderingProduct> {
    const [updated] = await db
      .update(orderingProducts)
      .set({ targetQuantity, updatedAt: new Date() })
      .where(eq(orderingProducts.id, productId))
      .returning();
    return updated;
  }
  async getProductsBelowTarget(locationCode?: string): Promise<Array<{
    product: OrderingProduct;
    latestCount: StockCount | null;
    targetQuantity: number;
    actualQuantity: number;
    orderQuantity: number;
  }>> {
    // This requires joining products with their latest stock counts and comparing to targetQuantity
    throw new Error("Not implemented");
  }

  // Quick Order System
  async quickReorder(productIds?: string[]): Promise<{ ordersCreated: OrderingOrder[]; errors: string[] }> {
    const ordersCreated: OrderingOrder[] = [];
    const errors: string[] = [];

    try {
      // Get products to reorder
      let productsToReorder: OrderingProduct[];
      
      if (productIds && productIds.length > 0) {
        // Get specific products
        productsToReorder = await db
          .select()
          .from(orderingProducts)
          .where(
            sql`id = ANY(${productIds}::varchar[])`
          );
      } else {
        // Get all low stock products
        productsToReorder = await db
          .select()
          .from(orderingProducts)
          .where(
            sql`min_stock IS NOT NULL AND current_stock <= min_stock AND is_active = true`
          );
      }

      if (productsToReorder.length === 0) {
        return { ordersCreated: [], errors: ["No products need reordering"] };
      }

      // Group products by supplier
      const productsBySupplier = new Map<string, OrderingProduct[]>();
      
      for (const product of productsToReorder) {
        const supplier = product.supplier || "Unknown Supplier";
        if (!productsBySupplier.has(supplier)) {
          productsBySupplier.set(supplier, []);
        }
        productsBySupplier.get(supplier)!.push(product);
      }

      // Create an order for each supplier
      for (const [supplier, products] of productsBySupplier.entries()) {
        try {
          // Generate order number
          const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          
          // Create order
          const [order] = await db
            .insert(orderingOrders)
            .values({
              orderNumber,
              supplier,
              status: "pending",
              orderDate: new Date(),
              totalAmount: 0, // Will be updated after adding items
              notes: `Auto-generated quick reorder for ${products.length} product(s)`,
            })
            .returning();

          // Add order items
          let totalAmount = 0;
          for (const product of products) {
            // Calculate reorder quantity
            const reorderQty = product.maxStock 
              ? product.maxStock - product.currentStock 
              : product.minStock 
                ? product.minStock * 2 
                : 10; // Default to 10 if no limits set
            
            const unitPrice = product.lastPrice || product.averagePrice || 0;
            const lineTotal = reorderQty * unitPrice;
            totalAmount += lineTotal;

            await db.insert(orderingOrderItems).values({
              orderId: order.id,
              productId: product.id,
              productName: product.name,
              quantity: reorderQty,
              unitPrice,
              lineTotal,
            });
          }

          // Update order total
          await db
            .update(orderingOrders)
            .set({ totalAmount })
            .where(eq(orderingOrders.id, order.id));

          order.totalAmount = totalAmount;
          ordersCreated.push(order);
        } catch (error) {
          errors.push(`Failed to create order for supplier ${supplier}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { ordersCreated, errors };
    } catch (error) {
      errors.push(`Quick reorder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { ordersCreated, errors };
    }
  }
  async suggestReorderQuantities(productId: string): Promise<{ suggested: number; minOrder: number; economicOrder: number }> {
    // Placeholder - requires historical data and EOQ calculations
    throw new Error("Not implemented");
  }

  // Ordering Analytics
  async getOrderingAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalSpent: number;
    orderCount: number;
    productsPurchased: number;
    spendingByCategory: Array<{ category: string; total: number; percentage: number }>;
    spendingBySupplier: Array<{ supplier: string; total: number; orderCount: number }>;
    topProducts: Array<{ product: OrderingProduct; totalOrdered: number; totalSpent: number }>;
    monthlyTrend: Array<{ month: string; spent: number; orders: number }>;
    stockValue: number;
    lowStockCount: number;
  }> {
    // Get orders within date range
    let ordersQuery = db.select().from(orderingOrders);
    const conditions = [];
    if (dateFrom) conditions.push(gte(orderingOrders.orderDate, dateFrom));
    if (dateTo) conditions.push(lte(orderingOrders.orderDate, dateTo));
    if (conditions.length > 0) ordersQuery = ordersQuery.where(and(...conditions));
    
    const orders = await ordersQuery;
    const orderItems = await db.select().from(orderingOrderItems);
    const products = await db.select().from(orderingProducts);
    const suppliers = await db.select().from(orderingSuppliers);
    
    // Calculate total spent
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const orderCount = orders.length;
    
    // Count unique products purchased
    const productIds = new Set(orderItems.map(item => item.productId));
    const productsPurchased = productIds.size;
    
    // Spending by category
    const categoryMap = new Map<string, number>();
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const category = product.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + Number(item.subtotal || 0));
      }
    }
    const spendingByCategory = Array.from(categoryMap.entries()).map(([category, total]) => ({
      category,
      total,
      percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0
    })).sort((a, b) => b.total - a.total);
    
    // Spending by supplier
    const supplierMap = new Map<string, { total: number; count: number }>();
    for (const order of orders) {
      const existing = supplierMap.get(order.supplierId) || { total: 0, count: 0 };
      supplierMap.set(order.supplierId, {
        total: existing.total + Number(order.totalAmount || 0),
        count: existing.count + 1
      });
    }
    const spendingBySupplier = Array.from(supplierMap.entries()).map(([supplierId, data]) => {
      const supplier = suppliers.find(s => s.id === supplierId);
      return {
        supplier: supplier?.name || 'Unknown',
        total: data.total,
        orderCount: data.count
      };
    }).sort((a, b) => b.total - a.total);
    
    // Top products
    const productMap = new Map<string, { quantity: number; spent: number }>();
    for (const item of orderItems) {
      const existing = productMap.get(item.productId) || { quantity: 0, spent: 0 };
      productMap.set(item.productId, {
        quantity: existing.quantity + item.quantity,
        spent: existing.spent + Number(item.subtotal || 0)
      });
    }
    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return product ? {
          product,
          totalOrdered: data.quantity,
          totalSpent: data.spent
        } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
    
    // Monthly trend (last 6 months)
    const monthlyMap = new Map<string, { spent: number; orders: number }>();
    for (const order of orders) {
      const monthKey = new Date(order.orderDate).toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(monthKey) || { spent: 0, orders: 0 };
      monthlyMap.set(monthKey, {
        spent: existing.spent + Number(order.totalAmount || 0),
        orders: existing.orders + 1
      });
    }
    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, spent: data.spent, orders: data.orders }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Stock value (current stock * unit price)
    const stockValue = products.reduce((sum, product) => 
      sum + (product.currentStock * Number(product.unitPrice || 0)), 0
    );
    
    // Low stock count
    const lowStockCount = products.filter(p => 
      p.reorderLevel && p.currentStock <= p.reorderLevel
    ).length;
    
    return {
      totalSpent,
      orderCount,
      productsPurchased,
      spendingByCategory,
      spendingBySupplier,
      topProducts,
      monthlyTrend,
      stockValue,
      lowStockCount
    };
  }
  async getProductUsageHistory(productId: string, days?: number): Promise<Array<{
    date: string;
    quantityUsed: number;
    orders: number;
    averagePrice: number;
  }>> {
    // Placeholder - requires analyzing stock movements and order items
    throw new Error("Not implemented");
  }
  async getSupplierPerformanceMetrics(supplierId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageDeliveryTime: number;
    onTimeDeliveryRate: number;
    priceChanges: Array<{ productId: string; productName: string; oldPrice: number; newPrice: number; changePercent: number }>;
  }> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }

  // Invoice Management
  async createInvoice(data: InsertSupplierInvoice): Promise<SupplierInvoice> {
    const [created] = await db.insert(supplierInvoices).values(data).returning();
    return created;
  }
  async updateInvoice(id: string, data: Partial<InsertSupplierInvoice>): Promise<SupplierInvoice> {
    const [updated] = await db
      .update(supplierInvoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supplierInvoices.id, id))
      .returning();
    return updated;
  }
  async getInvoices(filters?: { supplier?: string; startDate?: Date; endDate?: Date }): Promise<SupplierInvoice[]> {
    let query = db.select().from(supplierInvoices);
    const conditions = [];
    if (filters?.supplier) conditions.push(eq(supplierInvoices.supplierId, filters.supplier));
    if (filters?.startDate) conditions.push(gte(supplierInvoices.invoiceDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(supplierInvoices.invoiceDate, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(supplierInvoices.invoiceDate));
  }
  async getInvoice(id: string): Promise<SupplierInvoice | null> {
    const [invoice] = await db.select().from(supplierInvoices).where(eq(supplierInvoices.id, id)).limit(1);
    return invoice || null;
  }

  // Price History Management
  async createPriceHistory(data: InsertProductPriceHistory): Promise<ProductPriceHistory> {
    const [created] = await db.insert(productPriceHistory).values(data).returning();
    return created;
  }
  async getProductPriceHistory(productId: string): Promise<ProductPriceHistory[]> {
    return db.select().from(productPriceHistory).where(eq(productPriceHistory.productId, productId)).orderBy(desc(productPriceHistory.createdAt));
  }
  async getPriceAnalytics(): Promise<{
    priceIncreases: Array<{ productName: string; oldPrice: number; newPrice: number; changePercent: number }>;
    priceDecreases: Array<{ productName: string; oldPrice: number; newPrice: number; changePercent: number }>;
    totalImpact: number;
  }> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }

  // Helper Methods
  async getProductByNameAndSupplier(name: string, supplier: string): Promise<OrderingProduct | null> {
    const [product] = await db.select().from(orderingProducts).where(and(eq(orderingProducts.name, name), eq(orderingProducts.supplierId, supplier))).limit(1);
    return product || null;
  }
  async getSupplierByName(name: string): Promise<OrderingSupplier | null> {
    const [supplier] = await db.select().from(orderingSuppliers).where(eq(orderingSuppliers.name, name)).limit(1);
    return supplier || null;
  }

  // ======== WAGE REPORTING SYSTEM METHODS ========
  // Wage Reports
  async createWageReport(data: InsertWageReport): Promise<WageReport> {
    const [created] = await db.insert(wageReports).values(data).returning();
    return created;
  }
  async getWageReports(filters?: {
    staffId?: string;
    month?: number;
    year?: number;
    status?: string;
  }): Promise<WageReport[]> {
    let query = db.select().from(wageReports);
    const conditions = [];
    if (filters?.staffId) conditions.push(eq(wageReports.staffId, filters.staffId));
    if (filters?.month) conditions.push(eq(wageReports.month, filters.month));
    if (filters?.year) conditions.push(eq(wageReports.year, filters.year));
    if (filters?.status) conditions.push(eq(wageReports.status, filters.status));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(wageReports.year), desc(wageReports.month));
  }
  async getWageReport(id: string): Promise<WageReport | null> {
    const [report] = await db.select().from(wageReports).where(eq(wageReports.id, id)).limit(1);
    return report || null;
  }
  async updateWageReport(id: string, data: Partial<InsertWageReport>): Promise<WageReport> {
    const [updated] = await db
      .update(wageReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wageReports.id, id))
      .returning();
    return updated;
  }
  async deleteWageReport(id: string): Promise<void> {
    await db.delete(wageReports).where(eq(wageReports.id, id));
  }
  async calculateMonthlyWages(month: number, year: number): Promise<WageReport[]> {
    // Placeholder - requires logic to aggregate timesheet data and apply wage settings
    throw new Error("Not implemented");
  }
  async approveWageReport(id: string, approvedBy: string): Promise<WageReport> {
    const [updated] = await db
      .update(wageReports)
      .set({ status: "approved", approvedAt: new Date(), approvedBy, updatedAt: new Date() })
      .where(eq(wageReports.id, id))
      .returning();
    return updated;
  }
  async markWageReportPaid(id: string, paidDate: Date, paymentMethod: string): Promise<WageReport> {
    const [updated] = await db
      .update(wageReports)
      .set({ status: "paid", paidAt: paidDate, paymentMethod, updatedAt: new Date() })
      .where(eq(wageReports.id, id))
      .returning();
    return updated;
  }
  async getWageReportByStaffAndMonth(staffId: string, month: number, year: number): Promise<WageReport | null> {
    const [report] = await db.select().from(wageReports).where(and(eq(wageReports.staffId, staffId), eq(wageReports.month, month), eq(wageReports.year, year))).limit(1);
    return report || null;
  }

  // Wage Settings
  async createWageSettings(data: InsertWageSettings): Promise<WageSettings> {
    const [created] = await db.insert(wageSettings).values(data).returning();
    return created;
  }
  async getWageSettings(staffId: string): Promise<WageSettings | null> {
    const [settings] = await db.select().from(wageSettings).where(eq(wageSettings.staffId, staffId)).limit(1);
    return settings || null;
  }
  async getActiveWageSettings(staffId: string, date?: Date): Promise<WageSettings | null> {
    let query = db.select().from(wageSettings).where(eq(wageSettings.staffId, staffId));
    if (date) {
      query = query.where(lte(wageSettings.effectiveDate, date));
    }
    const [settings] = await query.orderBy(desc(wageSettings.effectiveDate)).limit(1);
    return settings || null;
  }
  async getAllWageSettings(): Promise<WageSettings[]> {
    return db.select().from(wageSettings);
  }
  async updateWageSettings(id: string, data: Partial<InsertWageSettings>): Promise<WageSettings> {
    const [updated] = await db
      .update(wageSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wageSettings.id, id))
      .returning();
    return updated;
  }
  async deleteWageSettings(id: string): Promise<void> {
    await db.delete(wageSettings).where(eq(wageSettings.id, id));
  }

  // Timesheets
  async createTimesheet(data: InsertTimesheet): Promise<Timesheet> {
    const [created] = await db.insert(timesheets).values(data).returning();
    return created;
  }
  async getTimesheets(filters?: {
    staffId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<Timesheet[]> {
    let query = db.select().from(timesheets);
    const conditions = [];
    if (filters?.staffId) conditions.push(eq(timesheets.staffId, filters.staffId));
    if (filters?.startDate) conditions.push(gte(timesheets.workDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(timesheets.workDate, filters.endDate));
    if (filters?.status) conditions.push(eq(timesheets.status, filters.status));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(timesheets.workDate));
  }
  async getTimesheet(id: string): Promise<Timesheet | null> {
    const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id)).limit(1);
    return timesheet || null;
  }
  async updateTimesheet(id: string, data: Partial<InsertTimesheet>): Promise<Timesheet> {
    const [updated] = await db
      .update(timesheets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(timesheets.id, id))
      .returning();
    return updated;
  }
  async deleteTimesheet(id: string): Promise<void> {
    await db.delete(timesheets).where(eq(timesheets.id, id));
  }
  async clockIn(staffId: string, propertyId?: string, jobType?: string): Promise<Timesheet> {
    return this.createTimesheet({ staffId, propertyId, jobType, startTime: new Date(), status: "in_progress" });
  }
  async clockOut(timesheetId: string): Promise<Timesheet> {
    const [updated] = await db
      .update(timesheets)
      .set({ endTime: new Date(), status: "completed", updatedAt: new Date() })
      .where(eq(timesheets.id, timesheetId))
      .returning();
    return updated;
  }
  async approveTimesheet(id: string, approvedBy: string): Promise<Timesheet> {
    const [updated] = await db
      .update(timesheets)
      .set({ status: "approved", approvedAt: new Date(), approvedBy, updatedAt: new Date() })
      .where(eq(timesheets.id, id))
      .returning();
    return updated;
  }
  async getTimesheetsByStaffAndDateRange(staffId: string, startDate: Date, endDate: Date): Promise<Timesheet[]> {
    return this.getTimesheets({ staffId, startDate, endDate });
  }

  // Wage Analytics
  async getWageAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalWagesPaid: number;
    totalHoursWorked: number;
    averageHourlyRate: number;
    overtimeHours: number;
    totalBonuses: number;
    totalDeductions: number;
    staffCount: number;
    laborCostPercentage: number;
    monthlyTrend: Array<{ month: string; totalWages: number; hoursWorked: number }>;
    staffWageBreakdown: Array<{ staffId: string; staffName: string; totalWages: number; hoursWorked: number }>;
  }> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }
  async getStaffWageHistory(staffId: string, months?: number): Promise<Array<{
    month: string;
    hoursWorked: number;
    regularHours: number;
    overtimeHours: number;
    totalWages: number;
    netPay: number;
  }>> {
    // Placeholder - requires aggregating wage report data
    throw new Error("Not implemented");
  }
  async exportPayrollCSV(month: number, year: number): Promise<string> {
    // Placeholder - generate CSV from aggregated wage data
    throw new Error("Not implemented");
  }

  // ======== WAGE DOCUMENT PROCESSING SYSTEM ========
  // Wage Periods
  async createWagePeriod(data: InsertWagePeriod): Promise<WagePeriod> {
    const [created] = await db.insert(wagePeriods).values(data).returning();
    return created;
  }
  async getWagePeriods(): Promise<WagePeriod[]> {
    return db.select().from(wagePeriods).orderBy(desc(wagePeriods.startDate));
  }
  async getWagePeriod(id: string): Promise<WagePeriod | null> {
    const [period] = await db.select().from(wagePeriods).where(eq(wagePeriods.id, id)).limit(1);
    return period || null;
  }
  async updateWagePeriod(id: string, data: Partial<InsertWagePeriod>): Promise<WagePeriod> {
    const [updated] = await db
      .update(wagePeriods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wagePeriods.id, id))
      .returning();
    return updated;
  }

  // Wage Document Uploads
  async createWageDocumentUpload(data: InsertWageDocumentUpload): Promise<WageDocumentUpload> {
    const [created] = await db.insert(wageDocumentUploads).values(data).returning();
    return created;
  }
  async getWageDocumentUploads(wagePeriodId: string): Promise<WageDocumentUpload[]> {
    return db.select().from(wageDocumentUploads).where(eq(wageDocumentUploads.wagePeriodId, wagePeriodId));
  }
  async getWageDocumentUpload(id: string): Promise<WageDocumentUpload | null> {
    const [upload] = await db.select().from(wageDocumentUploads).where(eq(wageDocumentUploads.id, id)).limit(1);
    return upload || null;
  }
  async updateWageDocumentUpload(id: string, data: Partial<InsertWageDocumentUpload>): Promise<WageDocumentUpload> {
    const [updated] = await db
      .update(wageDocumentUploads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wageDocumentUploads.id, id))
      .returning();
    return updated;
  }

  // Cleaner Wages
  async createCleanerWage(data: InsertCleanerWage): Promise<CleanerWage> {
    const [created] = await db.insert(cleanerWages).values(data).returning();
    return created;
  }
  async bulkCreateCleanerWages(data: InsertCleanerWage[]): Promise<CleanerWage[]> {
    return db.insert(cleanerWages).values(data).returning();
  }
  async getCleanerWages(wagePeriodId: string): Promise<CleanerWage[]> {
    return db.select().from(cleanerWages).where(eq(cleanerWages.wagePeriodId, wagePeriodId));
  }
  async getCleanerWage(id: string): Promise<CleanerWage | null> {
    const [wage] = await db.select().from(cleanerWages).where(eq(cleanerWages.id, id)).limit(1);
    return wage || null;
  }
  async updateCleanerWage(id: string, data: Partial<InsertCleanerWage>): Promise<CleanerWage> {
    const [updated] = await db
      .update(cleanerWages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cleanerWages.id, id))
      .returning();
    return updated;
  }
  async deleteCleanerWage(id: string): Promise<void> {
    await db.delete(cleanerWages).where(eq(cleanerWages.id, id));
  }

  // Wage Tokens
  async createWageToken(data: InsertWageToken): Promise<WageToken> {
    const [created] = await db.insert(wageTokens).values(data).returning();
    return created;
  }
  async getWageTokenByToken(token: string): Promise<WageToken | null> {
    const [wageToken] = await db.select().from(wageTokens).where(eq(wageTokens.token, token)).limit(1);
    return wageToken || null;
  }
  async markWageTokenViewed(id: string): Promise<void> {
    await db.update(wageTokens).set({ viewedAt: new Date(), updatedAt: new Date() }).where(eq(wageTokens.id, id));
  }
  async deleteExpiredWageTokens(): Promise<void> {
    await db.delete(wageTokens).where(lte(wageTokens.expiresAt, new Date()));
  }

  // Wage Document Processing Analytics
  async getWageDocumentAnalytics(wagePeriodId: string): Promise<{
    totalWageBill: number;
    totalCleaners: number;
    averageEarnings: number;
    highestEarner: { name: string; amount: number } | null;
    lowestEarner: { name: string; amount: number } | null;
    fixedCleaningTotal: number;
    hourlyWorkTotal: number;
    smsStats: { sent: number; pending: number; failed: number };
  }> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }
  async getWagePeriodComparison(month: number, year: number, previousMonths: number = 3): Promise<Array<{
    month: number;
    year: number;
    totalWageBill: number;
    totalCleaners: number;
    averageEarnings: number;
    changePercent: number;
  }>> {
    // Placeholder - requires fetching multiple wage periods and comparing
    throw new Error("Not implemented");
  }

  // ======== UPLISTING BOOKING REPORT PARSER ========
  async createUplistingUpload(data: InsertUplistingBookingUpload): Promise<UplistingBookingUpload> {
    const [created] = await db.insert(uplistingBookingUploads).values(data).returning();
    return created;
  }
  async getUplistingUploads(): Promise<UplistingBookingUpload[]> {
    return db.select().from(uplistingBookingUploads).orderBy(desc(uplistingBookingUploads.createdAt));
  }
  async getUplistingUpload(id: string): Promise<UplistingBookingUpload | null> {
    const [upload] = await db.select().from(uplistingBookingUploads).where(eq(uplistingBookingUploads.id, id)).limit(1);
    return upload || null;
  }
  async createCheckoutScheduleItems(items: InsertUplistingCheckoutSchedule[]): Promise<void> {
    await db.insert(uplistingCheckoutSchedule).values(items);
  }
  async getCheckoutSchedule(uploadId: string): Promise<UplistingCheckoutSchedule[]> {
    return db.select().from(uplistingCheckoutSchedule).where(eq(uplistingCheckoutSchedule.uploadId, uploadId));
  }
  async getAllCheckoutSchedule(filters?: { startDate?: string; endDate?: string }): Promise<UplistingCheckoutSchedule[]> {
    let query = db.select().from(uplistingCheckoutSchedule);
    const conditions = [];
    if (filters?.startDate) conditions.push(gte(uplistingCheckoutSchedule.checkoutDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(uplistingCheckoutSchedule.checkoutDate, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(asc(uplistingCheckoutSchedule.checkoutDate));
  }
  async deleteUplistingUpload(id: string): Promise<void> {
    await db.delete(uplistingBookingUploads).where(eq(uplistingBookingUploads.id, id));
  }

  // Business Performance Analytics
  async getBusinessAnalyticsDashboard(dateFrom?: Date, dateTo?: Date): Promise<any> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }

  // AST Lettings - Buildings
  async createAstBuilding(data: InsertAstBuilding): Promise<AstBuilding> {
    const [created] = await db.insert(astBuildings).values(data).returning();
    return created;
  }
  async updateAstBuilding(id: string, data: Partial<InsertAstBuilding>): Promise<AstBuilding> {
    const [updated] = await db
      .update(astBuildings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(astBuildings.id, id))
      .returning();
    return updated;
  }
  async getAstBuildings(): Promise<AstBuilding[]> {
    return db.select().from(astBuildings);
  }
  async getAstBuilding(id: string): Promise<AstBuilding | null> {
    const [building] = await db.select().from(astBuildings).where(eq(astBuildings.id, id)).limit(1);
    return building || null;
  }

  // AST Lettings - Apartments
  async createAstApartment(data: InsertAstApartment): Promise<AstApartment> {
    const [created] = await db.insert(astApartments).values(data).returning();
    return created;
  }
  async updateAstApartment(id: string, data: Partial<InsertAstApartment>): Promise<AstApartment> {
    const [updated] = await db
      .update(astApartments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(astApartments.id, id))
      .returning();
    return updated;
  }
  async getAstApartmentsByBuilding(buildingId: string): Promise<AstApartment[]> {
    return db.select().from(astApartments).where(eq(astApartments.buildingId, buildingId));
  }
  async getAstApartment(id: string): Promise<AstApartment | null> {
    const [apartment] = await db.select().from(astApartments).where(eq(astApartments.id, id)).limit(1);
    return apartment || null;
  }
  async deleteAstApartment(apartmentId: string): Promise<void> {
    await db.delete(astApartments).where(eq(astApartments.id, apartmentId));
  }

  // AST Lettings - Properties
  async createAstProperty(data: InsertAstProperty): Promise<AstProperty> {
    const [created] = await db.insert(astProperties).values(data).returning();
    return created;
  }
  async getAstProperties(): Promise<AstProperty[]> {
    return db.select().from(astProperties);
  }
  async getAstProperty(id: string): Promise<AstProperty | null> {
    const [property] = await db.select().from(astProperties).where(eq(astProperties.id, id)).limit(1);
    return property || null;
  }
  async updateAstProperty(id: string, data: Partial<InsertAstProperty>): Promise<AstProperty> {
    const [updated] = await db
      .update(astProperties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(astProperties.id, id))
      .returning();
    return updated;
  }
  async deleteAstProperty(id: string): Promise<void> {
    await db.delete(astProperties).where(eq(astProperties.id, id));
  }

  // AST Lettings - Tenancies
  async createAstTenancy(data: InsertAstTenancy): Promise<AstTenancy> {
    const [created] = await db.insert(astTenancies).values(data).returning();
    return created;
  }
  async getAstTenancies(filters?: { astPropertyId?: string; status?: string }): Promise<AstTenancy[]> {
    let query = db.select().from(astTenancies);
    const conditions = [];
    if (filters?.astPropertyId) conditions.push(eq(astTenancies.astPropertyId, filters.astPropertyId));
    if (filters?.status) conditions.push(eq(astTenancies.status, filters.status));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(astTenancies.startDate));
  }
  async getAstTenancy(id: string): Promise<AstTenancy | null> {
    const [tenancy] = await db.select().from(astTenancies).where(eq(astTenancies.id, id)).limit(1);
    return tenancy || null;
  }
  async updateAstTenancy(id: string, data: Partial<InsertAstTenancy>): Promise<AstTenancy> {
    const [updated] = await db
      .update(astTenancies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(astTenancies.id, id))
      .returning();
    return updated;
  }
  async deleteAstTenancy(id: string): Promise<void> {
    await db.delete(astTenancies).where(eq(astTenancies.id, id));
  }
  async getAstTenanciesWithProperties(): Promise<Array<AstTenancy & { property: AstProperty }>> {
    return db
      .select({ tenancy: astTenancies, property: astProperties })
      .from(astTenancies)
      .leftJoin(astProperties, eq(astTenancies.astPropertyId, astProperties.id));
  }
  async getAstTenanciesWithDetails(): Promise<Array<AstTenancy & { property?: AstProperty; building?: AstBuilding; apartment?: AstApartment }>> {
    return db
      .select({ tenancy: astTenancies, property: astProperties, building: astBuildings, apartment: astApartments })
      .from(astTenancies)
      .leftJoin(astProperties, eq(astTenancies.astPropertyId, astProperties.id))
      .leftJoin(astBuildings, eq(astProperties.buildingId, astBuildings.id))
      .leftJoin(astApartments, eq(astTenancies.astApartmentId, astApartments.id));
  }

  // AST Lettings - Contracts
  async createAstContract(data: InsertAstContract): Promise<AstContract> {
    const [created] = await db.insert(astContracts).values(data).returning();
    return created;
  }
  async getAstContractsByTenancy(tenancyId: string): Promise<AstContract[]> {
    return db.select().from(astContracts).where(eq(astContracts.tenancyId, tenancyId));
  }
  async getAstContract(id: string): Promise<AstContract | null> {
    const [contract] = await db.select().from(astContracts).where(eq(astContracts.id, id)).limit(1);
    return contract || null;
  }
  async deleteAstContract(id: string): Promise<void> {
    await db.delete(astContracts).where(eq(astContracts.id, id));
  }

  // AST Lettings - Rent Payments
  async createAstRentPayment(data: InsertAstRentPayment): Promise<AstRentPayment> {
    const [created] = await db.insert(astRentPayments).values(data).returning();
    return created;
  }
  async getAstRentPayments(filters?: { tenancyId?: string; status?: string }): Promise<AstRentPayment[]> {
    let query = db.select().from(astRentPayments);
    const conditions = [];
    if (filters?.tenancyId) conditions.push(eq(astRentPayments.tenancyId, filters.tenancyId));
    if (filters?.status) conditions.push(eq(astRentPayments.status, filters.status));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(asc(astRentPayments.paymentDate));
  }
  async getAstRentPayment(id: string): Promise<AstRentPayment | null> {
    const [payment] = await db.select().from(astRentPayments).where(eq(astRentPayments.id, id)).limit(1);
    return payment || null;
  }
  async updateAstRentPayment(id: string, data: Partial<InsertAstRentPayment>): Promise<AstRentPayment> {
    const [updated] = await db
      .update(astRentPayments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(astRentPayments.id, id))
      .returning();
    return updated;
  }
  async deleteAstRentPayment(id: string): Promise<void> {
    await db.delete(astRentPayments).where(eq(astRentPayments.id, id));
  }
  async generateRentPaymentSchedule(tenancyId: string): Promise<AstRentPayment[]> {
    // Placeholder - complex logic based on tenancy start/end dates, rent amount, frequency
    throw new Error("Not implemented");
  }
  async getUpcomingRentPayments(): Promise<Array<AstRentPayment & { tenancy: AstTenancy; property: AstProperty }>> {
    // Placeholder - requires joining with tenancy and property tables
    throw new Error("Not implemented");
  }
  async getOverdueRentPayments(): Promise<Array<AstRentPayment & { tenancy: AstTenancy; property: AstProperty }>> {
    // Placeholder - requires joining with tenancy and property tables and checking paymentDate
    throw new Error("Not implemented");
  }

  // AST Inventory Reports
  async createAstInventoryReport(data: InsertAstInventoryReport): Promise<AstInventoryReport> {
    const [created] = await db.insert(astInventoryReports).values(data).returning();
    return created;
  }
  async getAstInventoryReports(filters?: { astPropertyId?: string; tenancyId?: string; reportType?: string }): Promise<AstInventoryReport[]> {
    let query = db.select().from(astInventoryReports);
    const conditions = [];
    if (filters?.astPropertyId) conditions.push(eq(astInventoryReports.astPropertyId, filters.astPropertyId));
    if (filters?.tenancyId) conditions.push(eq(astInventoryReports.tenancyId, filters.tenancyId));
    if (filters?.reportType) conditions.push(eq(astInventoryReports.reportType, filters.reportType));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(astInventoryReports.reportDate));
  }
  async getAstInventoryReport(id: string): Promise<AstInventoryReport | null> {
    const [report] = await db.select().from(astInventoryReports).where(eq(astInventoryReports.id, id)).limit(1);
    return report || null;
  }
  async updateAstInventoryReport(id: string, data: Partial<InsertAstInventoryReport>): Promise<AstInventoryReport> {
    const [updated] = await db
      .update(astInventoryReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(astInventoryReports.id, id))
      .returning();
    return updated;
  }
  async deleteAstInventoryReport(id: string): Promise<void> {
    await db.delete(astInventoryReports).where(eq(astInventoryReports.id, id));
  }
  async getAstInventoryReportsWithLinks(tenancyId: string): Promise<Array<AstInventoryReport & { property: AstProperty }>> {
    return db
      .select({ report: astInventoryReports, property: astProperties })
      .from(astInventoryReports)
      .innerJoin(astProperties, eq(astInventoryReports.astPropertyId, astProperties.id))
      .where(eq(astInventoryReports.tenancyId, tenancyId));
  }

  // AST Deposits
  async createAstDeposit(data: InsertAstDeposit): Promise<AstDeposit> {
    const [created] = await db.insert(astDeposits).values(data).returning();
    return created;
  }
  async getAstDeposits(filters?: { tenancyId?: string }): Promise<AstDeposit[]> {
    let query = db.select().from(astDeposits);
    if (filters?.tenancyId) query = query.where(eq(astDeposits.tenancyId, filters.tenancyId));
    return query.orderBy(desc(astDeposits.depositDate));
  }
  async getAstDeposit(id: string): Promise<AstDeposit | null> {
    const [deposit] = await db.select().from(astDeposits).where(eq(astDeposits.id, id)).limit(1);
    return deposit || null;
  }
  async updateAstDeposit(id: string, data: Partial<InsertAstDeposit>): Promise<AstDeposit> {
    const [updated] = await db
      .update(astDeposits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(astDeposits.id, id))
      .returning();
    return updated;
  }
  async deleteAstDeposit(id: string): Promise<void> {
    await db.delete(astDeposits).where(eq(astDeposits.id, id));
  }
  async getAstDepositsWithTenancyInfo(): Promise<Array<AstDeposit & { tenancy: AstTenancy; property: AstProperty }>> {
    return db
      .select({ deposit: astDeposits, tenancy: astTenancies, property: astProperties })
      .from(astDeposits)
      .innerJoin(astTenancies, eq(astDeposits.tenancyId, astTenancies.id))
      .innerJoin(astProperties, eq(astTenancies.astPropertyId, astProperties.id));
  }

  // Landlord Management
  async getLandlords(): Promise<Landlord[]> {
    return db.select().from(landlords).orderBy(asc(landlords.name));
  }
  async getLandlordById(id: number): Promise<Landlord | undefined> {
    const [landlord] = await db.select().from(landlords).where(eq(landlords.id, id)).limit(1);
    return landlord;
  }
  async getLandlordByEmail(email: string): Promise<Landlord | undefined> {
    const [landlord] = await db.select().from(landlords).where(eq(landlords.email, email)).limit(1);
    return landlord;
  }
  async createLandlord(data: InsertLandlord): Promise<Landlord> {
    const [created] = await db.insert(landlords).values(data).returning();
    return created;
  }
  async updateLandlord(id: number, data: Partial<InsertLandlord>): Promise<Landlord> {
    const [updated] = await db
      .update(landlords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(landlords.id, id))
      .returning();
    return updated;
  }
  async updateLandlordLastLogin(landlordId: number): Promise<void> {
    await db.update(landlords).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(landlords.id, landlordId));
  }
  async updateLandlordPassword(landlordId: number, hashedPassword: string): Promise<void> {
    await db.update(landlords).set({ passwordHash: hashedPassword, updatedAt: new Date() }).where(eq(landlords.id, landlordId));
  }
  async updateLandlordResetToken(landlordId: number, token: string, expiry: Date): Promise<void> {
    await db.update(landlords).set({ resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date() }).where(eq(landlords.id, landlordId));
  }
  async getLandlordByResetToken(token: string): Promise<Landlord | undefined> {
    const [landlord] = await db.select().from(landlords).where(eq(landlords.resetToken, token)).limit(1);
    return landlord;
  }
  async clearLandlordResetToken(landlordId: number): Promise<void> {
    await db.update(landlords).set({ resetToken: null, resetTokenExpiry: null, updatedAt: new Date() }).where(eq(landlords.id, landlordId));
  }
  async deleteLandlord(id: number): Promise<void> {
    await db.delete(landlords).where(eq(landlords.id, id));
  }
  async getPropertiesByLandlord(landlordId: number): Promise<AstProperty[]> {
    return db.select().from(astProperties).where(eq(astProperties.landlordId, landlordId));
  }
  async assignPropertyToLandlord(propertyId: string, landlordId: number): Promise<void> {
    await db.update(astProperties).set({ landlordId, updatedAt: new Date() }).where(eq(astProperties.id, propertyId));
  }
  async getMaintenanceRequestsByLandlord(landlordId: number): Promise<MaintenanceRequest[]> {
    // Get maintenance requests directly linked to this landlord (AST properties)
    return db.select().from(maintenanceRequests).where(eq(maintenanceRequests.landlordId, landlordId)).orderBy(desc(maintenanceRequests.createdAt));
  }
  async getLandlordStatements(landlordId: number): Promise<MonthlyStatement[]> {
    return db.select().from(monthlyStatements).where(eq(monthlyStatements.landlordId, landlordId));
  }
  async getManagementContractsByLandlord(landlordId: number): Promise<ManagementContract[]> {
    return db.select().from(managementContracts).where(eq(managementContracts.landlordId, landlordId));
  }

  // Monthly Statements
  async getStatements(landlordId?: number): Promise<MonthlyStatement[]> {
    let query = db.select().from(monthlyStatements);
    if (landlordId) query = query.where(eq(monthlyStatements.landlordId, landlordId));
    return query.orderBy(desc(monthlyStatements.year), desc(monthlyStatements.month));
  }
  async getStatementById(id: number): Promise<MonthlyStatement | undefined> {
    const [statement] = await db.select().from(monthlyStatements).where(eq(monthlyStatements.id, id)).limit(1);
    return statement;
  }
  async createStatement(data: InsertMonthlyStatement): Promise<MonthlyStatement> {
    const [created] = await db.insert(monthlyStatements).values(data).returning();
    return created;
  }
  async updateStatement(id: number, data: Partial<InsertMonthlyStatement>): Promise<MonthlyStatement> {
    const [updated] = await db
      .update(monthlyStatements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(monthlyStatements.id, id))
      .returning();
    return updated;
  }
  async deleteStatement(id: number): Promise<void> {
    await db.delete(monthlyStatements).where(eq(monthlyStatements.id, id));
  }
  async getStatementsByMonth(year: number, month: number): Promise<MonthlyStatement[]> {
    return db.select().from(monthlyStatements).where(and(eq(monthlyStatements.year, year), eq(monthlyStatements.month, month)));
  }
  async getMaintenanceForLandlord(landlordId: number, startDate: Date, endDate: Date): Promise<MaintenanceRequest[]> {
    // Get maintenance requests for this landlord within date range
    return db.select().from(maintenanceRequests).where(
      and(
        eq(maintenanceRequests.landlordId, landlordId),
        gte(maintenanceRequests.createdAt, startDate),
        lte(maintenanceRequests.createdAt, endDate)
      )
    ).orderBy(desc(maintenanceRequests.createdAt));
  }

  // Daily Task Management - Task Templates
  async getTaskTemplates(): Promise<TaskTemplate[]> {
    return db.select().from(taskTemplates).orderBy(asc(taskTemplates.name));
  }
  async getTaskTemplateById(id: string): Promise<TaskTemplate | null> {
    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id)).limit(1);
    return template || null;
  }
  async createTaskTemplate(data: InsertTaskTemplate): Promise<TaskTemplate> {
    const [created] = await db.insert(taskTemplates).values(data).returning();
    return created;
  }
  async updateTaskTemplate(id: string, data: Partial<InsertTaskTemplate>): Promise<TaskTemplate> {
    const [updated] = await db
      .update(taskTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(taskTemplates.id, id))
      .returning();
    return updated;
  }
  async deleteTaskTemplate(id: string): Promise<void> {
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
  }

  // Daily Task Management - Daily Task Instances
  async getDailyTaskInstances(date: string, staffId?: string): Promise<DailyTaskInstance[]> {
    let query = db.select().from(dailyTaskInstances).where(eq(dailyTaskInstances.taskDate, date));
    if(staffId) query = query.where(eq(dailyTaskInstances.staffId, staffId));
    return query.orderBy(asc(dailyTaskInstances.startTime));
  }
  async createDailyTaskInstance(data: InsertDailyTaskInstance): Promise<DailyTaskInstance> {
    const [created] = await db.insert(dailyTaskInstances).values(data).returning();
    return created;
  }
  async updateDailyTaskInstance(id: string, data: Partial<InsertDailyTaskInstance>): Promise<DailyTaskInstance> {
    const [updated] = await db
      .update(dailyTaskInstances)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyTaskInstances.id, id))
      .returning();
    return updated;
  }
  async getTaskHistory(startDate: string, endDate: string, staffId?: string): Promise<DailyTaskInstance[]> {
    let query = db.select().from(dailyTaskInstances).where(and(gte(dailyTaskInstances.taskDate, startDate), lte(dailyTaskInstances.taskDate, endDate)));
    if (staffId) query = query.where(eq(dailyTaskInstances.staffId, staffId));
    return query.orderBy(asc(dailyTaskInstances.taskDate), asc(dailyTaskInstances.startTime));
  }

  // Specialized Services - Waste Clearance
  async createWasteClearanceRequest(data: InsertSpecializedServiceRequest): Promise<SpecializedServiceRequest> {
    return this.createSpecializedServiceRequest({ ...data, serviceType: "waste_clearance" });
  }
  async listWasteClearanceRequests(filters?: { status?: string }): Promise<SpecializedServiceRequest[]> {
    return this.listSpecializedServiceRequests("waste_clearance", filters);
  }
  async updateWasteClearanceRequest(id: string, data: Partial<InsertSpecializedServiceRequest>): Promise<SpecializedServiceRequest> {
    return this.updateSpecializedServiceRequest(id, data);
  }

  // Specialized Services - Generic
  async createSpecializedServiceRequest(data: InsertSpecializedServiceRequest): Promise<SpecializedServiceRequest> {
    const [created] = await db.insert(specializedServiceRequests).values(data).returning();
    return created;
  }
  async listSpecializedServiceRequests(serviceType: string, filters?: { status?: string }): Promise<SpecializedServiceRequest[]> {
    let query = db.select().from(specializedServiceRequests).where(eq(specializedServiceRequests.serviceType, serviceType));
    if (filters?.status) query = query.where(eq(specializedServiceRequests.status, filters.status));
    return query.orderBy(desc(specializedServiceRequests.createdAt));
  }
  async updateSpecializedServiceRequest(id: string, data: Partial<InsertSpecializedServiceRequest>): Promise<SpecializedServiceRequest> {
    const [updated] = await db
      .update(specializedServiceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(specializedServiceRequests.id, id))
      .returning();
    return updated;
  }

  // Specialized Services - Equipment Tracking
  async logEquipmentMovement(data: InsertEquipmentMovement): Promise<EquipmentMovement> {
    const [created] = await db.insert(equipmentMovements).values(data).returning();
    return created;
  }
  async listEquipmentMovements(filters?: { equipmentType?: string; staffId?: string; startDate?: string; endDate?: string }): Promise<EquipmentMovement[]> {
    let query = db.select().from(equipmentMovements);
    const conditions = [];
    if (filters?.equipmentType) conditions.push(eq(equipmentMovements.equipmentType, filters.equipmentType));
    if (filters?.staffId) conditions.push(eq(equipmentMovements.checkedOutToStaffId, filters.staffId));
    if (filters?.startDate) conditions.push(gte(equipmentMovements.checkedOutAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(equipmentMovements.checkedOutAt, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(equipmentMovements.checkedOutAt));
  }
  async getCurrentEquipmentStatus(equipmentType: string): Promise<Array<{ equipmentNumber: number; staffName?: string; signedOutAt?: Date } | { equipmentNumber: number; available: true }>> {
    // This requires joining with staff and checking for recent check-out records
    throw new Error("Not implemented");
  }
  async getEquipmentMovementById(id: string): Promise<EquipmentMovement | undefined> {
    const [movement] = await db.select().from(equipmentMovements).where(eq(equipmentMovements.id, id)).limit(1);
    return movement;
  }
  async updateEquipmentMovementPhotos(id: string, photoUrls: string[]): Promise<EquipmentMovement> {
    const [updated] = await db
      .update(equipmentMovements)
      .set({ photos: photoUrls, updatedAt: new Date() })
      .where(eq(equipmentMovements.id, id))
      .returning();
    return updated;
  }

  // Specialized Services - Building A Linen Orders
  async createDwellLinenOrder(data: InsertDwellLinenOrder): Promise<DwellLinenOrder> {
    const [created] = await db.insert(dwellLinenOrders).values(data).returning();
    return created;
  }
  async listDwellLinenOrders(): Promise<DwellLinenOrder[]> {
    return db.select().from(dwellLinenOrders).orderBy(desc(dwellLinenOrders.orderDate));
  }
  async updateDwellLinenOrder(id: string, data: Partial<InsertDwellLinenOrder>): Promise<DwellLinenOrder> {
    const [updated] = await db
      .update(dwellLinenOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dwellLinenOrders.id, id))
      .returning();
    return updated;
  }

  // Hotel Linen Delivery Notes
  async createLinenDeliveryNote(data: InsertLinenDeliveryNote): Promise<LinenDeliveryNote> {
    const [created] = await db.insert(linenDeliveryNotes).values(data).returning();
    return created;
  }
  async listLinenDeliveryNotes(building?: string): Promise<LinenDeliveryNote[]> {
    let query = db.select().from(linenDeliveryNotes);
    if (building) query = query.where(eq(linenDeliveryNotes.building, building));
    return query.orderBy(desc(linenDeliveryNotes.deliveryDate));
  }
  async getLinenDeliveryNote(id: string): Promise<LinenDeliveryNote | null> {
    const [note] = await db.select().from(linenDeliveryNotes).where(eq(linenDeliveryNotes.id, id)).limit(1);
    return note || null;
  }
  async getLinenDeliveryNotesByOrder(orderId: string): Promise<LinenDeliveryNote[]> {
    return db.select().from(linenDeliveryNotes).where(eq(linenDeliveryNotes.orderId, orderId));
  }

  // Linen Order Schedules
  async createLinenOrderSchedule(data: InsertLinenOrderSchedule): Promise<LinenOrderSchedule> {
    const [created] = await db.insert(linenOrderSchedules).values(data).returning();
    return created;
  }
  async getLinenOrderSchedules(): Promise<LinenOrderSchedule[]> {
    return db.select().from(linenOrderSchedules);
  }
  async getLinenOrderSchedule(id: number): Promise<LinenOrderSchedule | null> {
    const [schedule] = await db.select().from(linenOrderSchedules).where(eq(linenOrderSchedules.id, id)).limit(1);
    return schedule || null;
  }
  async updateLinenOrderSchedule(id: number, data: Partial<InsertLinenOrderSchedule>): Promise<LinenOrderSchedule> {
    const [updated] = await db
      .update(linenOrderSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(linenOrderSchedules.id, id))
      .returning();
    return updated;
  }
  async deleteLinenOrderSchedule(id: number): Promise<void> {
    await db.delete(linenOrderSchedules).where(eq(linenOrderSchedules.id, id));
  }
  async getDwellLinenOrderByToken(token: string): Promise<DwellLinenOrder | null> {
    const [order] = await db.select().from(dwellLinenOrders).where(eq(dwellLinenOrders.token, token)).limit(1);
    return order || null;
  }

  // Cleaning Supplies Ordering System - Schedules
  async createCleaningOrderSchedule(data: InsertCleaningOrderSchedule): Promise<CleaningOrderSchedule> {
    const [created] = await db.insert(cleaningOrderSchedules).values(data).returning();
    return created;
  }
  async getCleaningOrderSchedules(): Promise<CleaningOrderSchedule[]> {
    return db.select().from(cleaningOrderSchedules);
  }
  async getCleaningOrderSchedule(id: number): Promise<CleaningOrderSchedule | null> {
    const [schedule] = await db.select().from(cleaningOrderSchedules).where(eq(cleaningOrderSchedules.id, id)).limit(1);
    return schedule || null;
  }
  async updateCleaningOrderSchedule(id: number, data: Partial<InsertCleaningOrderSchedule>): Promise<CleaningOrderSchedule> {
    const [updated] = await db
      .update(cleaningOrderSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cleaningOrderSchedules.id, id))
      .returning();
    return updated;
  }
  async deleteCleaningOrderSchedule(id: number): Promise<void> {
    await db.delete(cleaningOrderSchedules).where(eq(cleaningOrderSchedules.id, id));
  }

  // Cleaning Supplies Ordering System - Orders
  async createCleaningOrder(data: InsertCleaningOrder): Promise<CleaningOrder> {
    const [created] = await db.insert(cleaningOrders).values(data).returning();
    return created;
  }
  async getCleaningOrders(filters?: { propertyName?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<CleaningOrder[]> {
    let query = db.select().from(cleaningOrders);
    const conditions = [];
    if (filters?.propertyName) conditions.push(eq(cleaningOrders.propertyName, filters.propertyName));
    if (filters?.status) conditions.push(eq(cleaningOrders.status, filters.status));
    if (filters?.dateFrom) conditions.push(gte(cleaningOrders.orderDate, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(cleaningOrders.orderDate, filters.dateTo));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(cleaningOrders.orderDate));
  }
  async getCleaningOrderByToken(token: string): Promise<CleaningOrder | null> {
    const [order] = await db.select().from(cleaningOrders).where(eq(cleaningOrders.token, token)).limit(1);
    return order || null;
  }
  async updateCleaningOrder(id: number, data: Partial<InsertCleaningOrder>): Promise<CleaningOrder> {
    const [updated] = await db
      .update(cleaningOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cleaningOrders.id, id))
      .returning();
    return updated;
  }

  // Cleaning Supplies Ordering System - Reminder Logs
  async createCleaningOrderReminderLog(data: InsertCleaningOrderReminderLog): Promise<CleaningOrderReminderLog> {
    const [created] = await db.insert(cleaningOrderReminderLogs).values(data).returning();
    return created;
  }
  async getCleaningOrderReminderLogs(filters?: { scheduleId?: number }): Promise<CleaningOrderReminderLog[]> {
    let query = db.select().from(cleaningOrderReminderLogs);
    if (filters?.scheduleId) query = query.where(eq(cleaningOrderReminderLogs.scheduleId, filters.scheduleId));
    return query.orderBy(desc(cleaningOrderReminderLogs.sentAt));
  }
  async updateCleaningOrderReminderLog(id: number, data: Partial<InsertCleaningOrderReminderLog>): Promise<CleaningOrderReminderLog> {
    const [updated] = await db
      .update(cleaningOrderReminderLogs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cleaningOrderReminderLogs.id, id))
      .returning();
    return updated;
  }
  async getScheduleWithLogs(scheduleId: number): Promise<{ schedule: CleaningOrderSchedule; logs: CleaningOrderReminderLog[] } | null> {
    const schedule = await this.getCleaningOrderSchedule(scheduleId);
    if (!schedule) return null;
    const logs = await this.getCleaningOrderReminderLogs({ scheduleId });
    return { schedule, logs };
  }

  // Critical Information Lists
  async getAllCriticalInfo(searchTerm?: string): Promise<CriticalInfo[]> {
    let query = db.select().from(criticalInfo);
    if (searchTerm) {
      query = query.where(
        or(
          sql`LOWER(${criticalInfo.title}) LIKE LOWER(${`%${searchTerm}%`})`,
          sql`LOWER(${criticalInfo.content}) LIKE LOWER(${`%${searchTerm}%`})`
        )
      );
    }
    return query.orderBy(asc(criticalInfo.title));
  }
  async getCriticalInfoById(id: string): Promise<CriticalInfo | null> {
    const [info] = await db.select().from(criticalInfo).where(eq(criticalInfo.id, id)).limit(1);
    return info || null;
  }
  async createCriticalInfo(data: InsertCriticalInfo): Promise<CriticalInfo> {
    const [created] = await db.insert(criticalInfo).values(data).returning();
    return created;
  }
  async createCriticalInfoBulk(items: InsertCriticalInfo[]): Promise<CriticalInfo[]> {
    return db.insert(criticalInfo).values(items).returning();
  }
  async updateCriticalInfo(id: string, data: Partial<InsertCriticalInfo>): Promise<CriticalInfo> {
    const [updated] = await db
      .update(criticalInfo)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(criticalInfo.id, id))
      .returning();
    return updated;
  }
  async deleteCriticalInfo(id: string): Promise<void> {
    await db.delete(criticalInfo).where(eq(criticalInfo.id, id));
  }

  // Cleaning Rates
  async getAllCleaningRates(): Promise<CleaningRate[]> {
    return db.select().from(cleaningRates).orderBy(asc(cleaningRates.name));
  }
  async getCleaningRateById(id: string): Promise<CleaningRate | null> {
    const [rate] = await db.select().from(cleaningRates).where(eq(cleaningRates.id, id)).limit(1);
    return rate || null;
  }
  async createCleaningRate(data: InsertCleaningRate): Promise<CleaningRate> {
    const [created] = await db.insert(cleaningRates).values(data).returning();
    return created;
  }
  async updateCleaningRate(id: string, data: Partial<InsertCleaningRate>): Promise<CleaningRate> {
    const [updated] = await db
      .update(cleaningRates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cleaningRates.id, id))
      .returning();
    return updated;
  }
  async deleteCleaningRate(id: string): Promise<void> {
    await db.delete(cleaningRates).where(eq(cleaningRates.id, id));
  }

  // Business Analytics - Financial Documents
  async createFinancialDocument(data: InsertBankStatement): Promise<BankStatement> {
    const [created] = await db.insert(bankStatements).values(data).returning();
    return created;
  }
  async getFinancialDocuments(): Promise<BankStatement[]> {
    return db.select().from(bankStatements).orderBy(desc(bankStatements.statementDate));
  }
  async getFinancialDocumentById(id: string): Promise<BankStatement | null> {
    const [doc] = await db.select().from(bankStatements).where(eq(bankStatements.id, id)).limit(1);
    return doc || null;
  }
  async updateFinancialDocument(id: string, data: Partial<InsertBankStatement>): Promise<BankStatement> {
    const [updated] = await db
      .update(bankStatements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bankStatements.id, id))
      .returning();
    return updated;
  }
  async deleteFinancialDocument(id: string): Promise<void> {
    await db.delete(bankStatements).where(eq(bankStatements.id, id));
  }

  // Business Analytics - Transactions
  async createTransaction(data: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const [created] = await db.insert(financialTransactions).values(data).returning();
    return created;
  }
  async createTransactions(data: InsertFinancialTransaction[]): Promise<FinancialTransaction[]> {
    return db.insert(financialTransactions).values(data).returning();
  }
  async getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
    source?: string;
  }): Promise<FinancialTransaction[]> {
    let query = db.select().from(financialTransactions);
    const conditions = [];
    if (filters?.startDate) conditions.push(gte(financialTransactions.transactionDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(financialTransactions.transactionDate, filters.endDate));
    if (filters?.type) conditions.push(eq(financialTransactions.type, filters.type));
    if (filters?.category) conditions.push(eq(financialTransactions.category, filters.category));
    if (filters?.source) conditions.push(eq(financialTransactions.source, filters.source));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(financialTransactions.transactionDate));
  }
  async getTransactionById(id: string): Promise<FinancialTransaction | null> {
    const [transaction] = await db.select().from(financialTransactions).where(eq(financialTransactions.id, id)).limit(1);
    return transaction || null;
  }
  async updateTransaction(id: string, data: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction> {
    const [updated] = await db
      .update(financialTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(financialTransactions.id, id))
      .returning();
    return updated;
  }
  async deleteTransaction(id: string): Promise<void> {
    await db.delete(financialTransactions).where(eq(financialTransactions.id, id));
  }

  // Business Analytics - P&L Reports
  async getPNLSummary(startDate: string, endDate: string): Promise<{
    income: Record<string, number>;
    expenses: Record<string, number>;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  }> {
    // Placeholder - requires aggregation of income and expense transactions
    throw new Error("Not implemented");
  }
  async getFinancialMetrics(startDate: string, endDate: string): Promise<{
    totalRevenue: number;
    managementFees: number;
    maintenanceCosts: number;
    softwareCosts: number;
    otherExpenses: number;
    netProfit: number;
    profitMargin: number;
  }> {
    // Placeholder - requires aggregation of relevant financial data
    throw new Error("Not implemented");
  }

  // ======== PROPERLY CLEANER ALLOCATION SYSTEM ========
  // Properly uploads
  async createProperlyUpload(data: InsertProperlyUpload): Promise<ProperlyUpload> {
    const [created] = await db.insert(properlyUploads).values(data).returning();
    return created;
  }
  async getProperlyUploads(): Promise<ProperlyUpload[]> {
    return db.select().from(properlyUploads).orderBy(desc(properlyUploads.uploadDate));
  }
  async getProperlyUpload(id: string): Promise<ProperlyUpload | null> {
    const [upload] = await db.select().from(properlyUploads).where(eq(properlyUploads.id, id)).limit(1);
    return upload || null;
  }
  async updateProperlyUploadStatus(id: string, status: string): Promise<void> {
    await db.update(properlyUploads).set({ status, updatedAt: new Date() }).where(eq(properlyUploads.id, id));
  }

  // Cleaning tasks
  async createProperlyCleaningTasks(tasks: InsertProperlyCleaningTask[]): Promise<ProperlyCleaningTask[]> {
    return db.insert(properlyCleaningTasks).values(tasks).returning();
  }
  async getProperlyCleaningTasks(uploadId: string): Promise<ProperlyCleaningTask[]> {
    return db.select().from(properlyCleaningTasks).where(eq(properlyCleaningTasks.uploadId, uploadId));
  }
  async getProperlyCleaningTasksByDate(date: string): Promise<ProperlyCleaningTask[]> {
    return db.select().from(properlyCleaningTasks).where(eq(properlyCleaningTasks.taskDate, date));
  }
  async getProperlyCleaningTask(id: string): Promise<ProperlyCleaningTask | null> {
    const [task] = await db.select().from(properlyCleaningTasks).where(eq(properlyCleaningTasks.id, id)).limit(1);
    return task || null;
  }

  // Allocations
  async createCleanerAllocations(allocations: InsertProperlyCleanerAllocation[]): Promise<ProperlyCleanerAllocation[]> {
    return db.insert(properlyCleanerAllocations).values(allocations).returning();
  }
  async getCleanerAllocations(uploadId: string): Promise<ProperlyCleanerAllocation[]> {
    return db.select().from(properlyCleanerAllocations).where(eq(properlyCleanerAllocations.uploadId, uploadId));
  }
  async getCleanerAllocationsByDate(date: string): Promise<ProperlyCleanerAllocation[]> {
    return db.select().from(properlyCleanerAllocations).where(eq(properlyCleanerAllocations.allocationDate, date));
  }
  async getAllocationWithDetails(allocationId: string): Promise<any> {
    // Placeholder - join with staff, property, etc.
    throw new Error("Not implemented");
  }
  async updateAllocationConfirmation(allocationId: string, confirmed: boolean): Promise<void> {
    await db.update(properlyCleanerAllocations).set({ confirmed, updatedAt: new Date() }).where(eq(properlyCleanerAllocations.id, allocationId));
  }
  async updateAllocation(id: string, data: Partial<InsertProperlyCleanerAllocation>): Promise<ProperlyCleanerAllocation> {
    const [updated] = await db
      .update(properlyCleanerAllocations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(properlyCleanerAllocations.id, id))
      .returning();
    return updated;
  }

  // Building preferences
  async setCleanerBuildingPreference(data: InsertCleanerBuildingPreference): Promise<CleanerBuildingPreference> {
    const [created] = await db.insert(cleanerBuildingPreferences).values(data).returning();
    return created;
  }
  async getCleanerBuildingPreferences(building?: string): Promise<CleanerBuildingPreference[]> {
    let query = db.select().from(cleanerBuildingPreferences);
    if (building) query = query.where(eq(cleanerBuildingPreferences.building, building));
    return query;
  }
  async getCleanerPreferencesForStaff(staffId: string): Promise<CleanerBuildingPreference[]> {
    return db.select().from(cleanerBuildingPreferences).where(eq(cleanerBuildingPreferences.staffId, staffId));
  }
  async updateCleanerBuildingPreference(staffId: string, building: string, preferenceLevel: number): Promise<CleanerBuildingPreference> {
    const [updated] = await db
      .update(cleanerBuildingPreferences)
      .set({ preferenceLevel, updatedAt: new Date() })
      .where(and(eq(cleanerBuildingPreferences.staffId, staffId), eq(cleanerBuildingPreferences.building, building)))
      .returning();
    return updated;
  }
  async initializeCleanerBuildingPreferences(): Promise<void> {
    // Placeholder for cleaner building preferences initialization
    console.log("[Storage] Cleaner building preferences initialization placeholder");
  }

  // History
  async recordAllocationHistory(data: InsertAllocationHistory): Promise<AllocationHistory> {
    const [created] = await db.insert(allocationHistory).values(data).returning();
    return created;
  }
  async getAllocationHistory(filters?: { cleanerId?: string; building?: string; dateFrom?: string; dateTo?: string }): Promise<AllocationHistory[]> {
    let query = db.select().from(allocationHistory);
    const conditions = [];
    if (filters?.cleanerId) conditions.push(eq(allocationHistory.cleanerId, filters.cleanerId));
    if (filters?.building) conditions.push(eq(allocationHistory.building, filters.building));
    if (filters?.dateFrom) conditions.push(gte(allocationHistory.allocationDate, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(allocationHistory.allocationDate, filters.dateTo));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(allocationHistory.allocationDate));
  }

  // Helper methods for allocation
  async checkCleanerAvailability(staffId: string, date: string): Promise<boolean> {
    // This requires checking current allocations and potentially preferences
    const allocations = await this.getCleanerAllocationsByDate(date);
    const cleanerAllocations = allocations.filter(a => a.cleanerId === staffId && a.status !== 'cancelled');
    return cleanerAllocations.length === 0;
  }
  async getCleanerAllocation(allocationId: string): Promise<ProperlyCleanerAllocation | null> {
    const [allocation] = await db.select().from(properlyCleanerAllocations).where(eq(properlyCleanerAllocations.id, allocationId)).limit(1);
    return allocation || null;
  }
  async updateAllocationStatus(allocationId: string, status: string): Promise<void> {
    await db.update(properlyCleanerAllocations).set({ status, updatedAt: new Date() }).where(eq(properlyCleanerAllocations.id, allocationId));
  }
  async getStaffMember(staffId: string): Promise<Staff | null> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
    return staffMember || null;
  }

  // Manual cleaning adjustments
  async createManualCleaningAdjustment(data: InsertManualCleaningAdjustment): Promise<ManualCleaningAdjustment> {
    const [created] = await db.insert(manualCleaningAdjustments).values(data).returning();
    return created;
  }
  async getManualCleaningAdjustments(filters?: { adjustmentDate?: string; status?: string }): Promise<ManualCleaningAdjustment[]> {
    let query = db.select().from(manualCleaningAdjustments);
    const conditions = [];
    if (filters?.adjustmentDate) conditions.push(eq(manualCleaningAdjustments.adjustmentDate, filters.adjustmentDate));
    if (filters?.status) conditions.push(eq(manualCleaningAdjustments.status, filters.status));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(manualCleaningAdjustments.adjustmentDate));
  }
  async updateManualCleaningAdjustment(id: string, data: Partial<InsertManualCleaningAdjustment>): Promise<ManualCleaningAdjustment> {
    const [updated] = await db
      .update(manualCleaningAdjustments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(manualCleaningAdjustments.id, id))
      .returning();
    return updated;
  }
  async deleteManualCleaningAdjustment(id: string): Promise<void> {
    await db.delete(manualCleaningAdjustments).where(eq(manualCleaningAdjustments.id, id));
  }

  // ======== LINEN PACKING ASSISTANT ========
  // Linen packing items
  async createLinenPackingItems(items: InsertLinenPackingItem[]): Promise<LinenPackingItem[]> {
    return db.insert(linenPackingItems).values(items).returning();
  }
  async getLinenPackingItems(propertyAddress: string): Promise<LinenPackingItem[]> {
    return db.select().from(linenPackingItems).where(eq(linenPackingItems.propertyAddress, propertyAddress));
  }
  async getAllLinenPackingProperties(): Promise<string[]> {
    const results = await db.selectDistinct({ propertyAddress: linenPackingItems.propertyAddress }).from(linenPackingItems);
    return results.map(r => r.propertyAddress);
  }
  async deleteAllLinenPackingItems(): Promise<void> {
    await db.delete(linenPackingItems);
  }

  // Special requests
  async createSpecialRequest(data: InsertSpecialRequest): Promise<SpecialRequest> {
    const [created] = await db.insert(specialRequests).values(data).returning();
    return created;
  }
  async getSpecialRequests(propertyName?: string): Promise<SpecialRequest[]> {
    let query = db.select().from(specialRequests);
    if (propertyName) query = query.where(eq(specialRequests.propertyName, propertyName));
    return query.orderBy(desc(specialRequests.createdAt));
  }
  async getActiveSpecialRequests(propertyName: string): Promise<SpecialRequest[]> {
    return db.select().from(specialRequests).where(and(eq(specialRequests.propertyName, propertyName), eq(specialRequests.status, "active")));
  }
  async updateSpecialRequest(id: string, data: Partial<InsertSpecialRequest>): Promise<SpecialRequest> {
    const [updated] = await db
      .update(specialRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(specialRequests.id, id))
      .returning();
    return updated;
  }
  async markSpecialRequestCompleted(id: string, completedBy: string): Promise<void> {
    await db.update(specialRequests).set({ status: "completed", completedAt: new Date(), completedBy, updatedAt: new Date() }).where(eq(specialRequests.id, id));
  }
  async deleteSpecialRequest(id: string): Promise<void> {
    await db.delete(specialRequests).where(eq(specialRequests.id, id));
  }

  // Cleaning costs
  async createCleaningCosts(costs: InsertCleaningCost[]): Promise<CleaningCost[]> {
    return db.insert(cleaningCosts).values(costs).returning();
  }
  async getCleaningCost(propertyName: string): Promise<CleaningCost | null> {
    const [cost] = await db.select().from(cleaningCosts).where(eq(cleaningCosts.propertyName, propertyName)).limit(1);
    return cost || null;
  }
  async getAllCleaningCosts(): Promise<CleaningCost[]> {
    return db.select().from(cleaningCosts);
  }
  async updateCleaningCost(propertyName: string, data: Partial<InsertCleaningCost>): Promise<CleaningCost> {
    const [updated] = await db
      .update(cleaningCosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cleaningCosts.propertyName, propertyName))
      .returning();
    return updated;
  }
  async deleteAllCleaningCosts(): Promise<void> {
    await db.delete(cleaningCosts);
  }

  // ======== LINEN PACKING SESSIONS (COMPLIANCE AUTOMATION) ========
  async createLinenPackingSession(data: InsertLinenPackingSession): Promise<LinenPackingSession> {
    const [created] = await db.insert(linenPackingSessions).values(data).returning();
    return created;
  }
  async getComplianceAutomationData(staffId: string, date: Date): Promise<{
    trolleySignedInOut: boolean;
    caddySignedInOut: boolean;
    usedChatbot: boolean;
    viewedSpecialRequests: boolean;
  }> {
    // Placeholder - requires checking various data points for the given staff and date
    throw new Error("Not implemented");
  }

  // ======== GUEST SUPPORT CHATBOT ========
  // Chat sessions
  async createGuestSupportChatSession(data: InsertGuestSupportChatSession): Promise<GuestSupportChatSession> {
    const [created] = await db.insert(guestSupportChatSessions).values(data).returning();
    return created;
  }
  async getGuestSupportChatSession(sessionId: string): Promise<GuestSupportChatSession | null> {
    const [session] = await db.select().from(guestSupportChatSessions).where(eq(guestSupportChatSessions.id, sessionId)).limit(1);
    return session || null;
  }
  async getGuestSupportChatSessions(userId: string): Promise<GuestSupportChatSession[]> {
    return db.select().from(guestSupportChatSessions).where(eq(guestSupportChatSessions.userId, userId)).orderBy(desc(guestSupportChatSessions.createdAt));
  }
  async updateGuestSupportChatSession(sessionId: string, data: Partial<InsertGuestSupportChatSession>): Promise<GuestSupportChatSession> {
    const [updated] = await db
      .update(guestSupportChatSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(guestSupportChatSessions.id, sessionId))
      .returning();
    return updated;
  }

  // Chat messages
  async createGuestSupportChatMessage(data: InsertGuestSupportChatMessage): Promise<GuestSupportChatMessage> {
    const [created] = await db.insert(guestSupportChatMessages).values(data).returning();
    return created;
  }
  async getGuestSupportChatMessages(sessionId: string): Promise<GuestSupportChatMessage[]> {
    return db.select().from(guestSupportChatMessages).where(eq(guestSupportChatMessages.sessionId, sessionId)).orderBy(asc(guestSupportChatMessages.createdAt));
  }

  // ========STAFF HELPDESK ========
  async createHelpdeskChatSession(userId: string, staffName: string | null): Promise<HelpdeskChatSession> {
    const [created] = await db.insert(helpdeskChatSessions).values({ userId, staffName }).returning();
    return created;
  }
  async getHelpdeskChatSession(sessionId: string): Promise<HelpdeskChatSession | null> {
    const [session] = await db.select().from(helpdeskChatSessions).where(eq(helpdeskChatSessions.id, sessionId)).limit(1);
    return session || null;
  }
  async getHelpdeskChatHistory(sessionId: string): Promise<HelpdeskChatMessage[]> {
    return db.select().from(helpdeskChatMessages).where(eq(helpdeskChatMessages.sessionId, sessionId)).orderBy(asc(helpdeskChatMessages.createdAt));
  }
  async saveHelpdeskChatMessage(message: InsertHelpdeskChatMessage): Promise<HelpdeskChatMessage> {
    const [created] = await db.insert(helpdeskChatMessages).values(message).returning();
    return created;
  }

  // ======== TENANT COMMUNICATION ========
  async createTenantCommunicationChatSession(userId: string, staffName: string | null): Promise<TenantCommunicationChatSession> {
    const [created] = await db.insert(tenantCommunicationChatSessions).values({ userId, staffName }).returning();
    return created;
  }
  async getTenantCommunicationChatSession(sessionId: string): Promise<TenantCommunicationChatSession | null> {
    const [session] = await db.select().from(tenantCommunicationChatSessions).where(eq(tenantCommunicationChatSessions.id, sessionId)).limit(1);
    return session || null;
  }
  async getTenantCommunicationChatHistory(sessionId: string): Promise<TenantCommunicationChatMessage[]> {
    return db.select().from(tenantCommunicationChatMessages).where(eq(tenantCommunicationChatMessages.sessionId, sessionId)).orderBy(asc(tenantCommunicationChatMessages.createdAt));
  }
  async saveTenantCommunicationChatMessage(message: InsertTenantCommunicationChatMessage): Promise<TenantCommunicationChatMessage> {
    const [created] = await db.insert(tenantCommunicationChatMessages).values(message).returning();
    return created;
  }
  async markEmailAsSent(messageId: string): Promise<TenantCommunicationChatMessage> {
    const [updated] = await db
      .update(tenantCommunicationChatMessages)
      .set({ emailSentAt: new Date(), updatedAt: new Date() })
      .where(eq(tenantCommunicationChatMessages.id, messageId))
      .returning();
    return updated;
  }
  async markSmsAsSent(messageId: string): Promise<TenantCommunicationChatMessage> {
    const [updated] = await db
      .update(tenantCommunicationChatMessages)
      .set({ smsSentAt: new Date(), updatedAt: new Date() })
      .where(eq(tenantCommunicationChatMessages.id, messageId))
      .returning();
    return updated;
  }

  // ======== KNOWLEDGE BASE ========
  async getAllKnowledgeBaseEntries(chatbotType?: string): Promise<KnowledgeBaseEntry[]> {
    let query = db.select().from(knowledgeBaseEntries);
    if (chatbotType) query = query.where(eq(knowledgeBaseEntries.chatbotType, chatbotType));
    return query.orderBy(asc(knowledgeBaseEntries.title));
  }
  async getActiveKnowledgeBaseEntries(chatbotType?: string): Promise<KnowledgeBaseEntry[]> {
    let query = db.select().from(knowledgeBaseEntries).where(eq(knowledgeBaseEntries.isActive, true));
    if (chatbotType) query = query.where(eq(knowledgeBaseEntries.chatbotType, chatbotType));
    return query.orderBy(asc(knowledgeBaseEntries.title));
  }
  async getKnowledgeBaseEntry(id: string): Promise<KnowledgeBaseEntry | null> {
    const [entry] = await db.select().from(knowledgeBaseEntries).where(eq(knowledgeBaseEntries.id, id)).limit(1);
    return entry || null;
  }
  async createKnowledgeBaseEntry(data: InsertKnowledgeBaseEntry): Promise<KnowledgeBaseEntry> {
    const [created] = await db.insert(knowledgeBaseEntries).values(data).returning();
    return created;
  }
  async updateKnowledgeBaseEntry(id: string, data: Partial<InsertKnowledgeBaseEntry>): Promise<KnowledgeBaseEntry> {
    const [updated] = await db
      .update(knowledgeBaseEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeBaseEntries.id, id))
      .returning();
    return updated;
  }
  async deleteKnowledgeBaseEntry(id: string): Promise<void> {
    await db.delete(knowledgeBaseEntries).where(eq(knowledgeBaseEntries.id, id));
  }
  async generateKnowledgeFromPortalData(chatbotType: string): Promise<{ created: number; updated: number }> {
    // Placeholder - logic to process portal data and update/create KB entries
    throw new Error("Not implemented");
  }

  // Pending Knowledge Uploads
  async getPendingKnowledgeUploads(chatbotType?: string): Promise<PendingKnowledgeUpload[]> {
    let query = db.select().from(pendingKnowledgeUploads);
    if (chatbotType) query = query.where(eq(pendingKnowledgeUploads.chatbotType, chatbotType));
    return query.orderBy(desc(pendingKnowledgeUploads.createdAt));
  }
  async getPendingKnowledgeUpload(id: string): Promise<PendingKnowledgeUpload | null> {
    const [upload] = await db.select().from(pendingKnowledgeUploads).where(eq(pendingKnowledgeUploads.id, id)).limit(1);
    return upload || null;
  }
  async createPendingKnowledgeUpload(data: InsertPendingKnowledgeUpload): Promise<PendingKnowledgeUpload> {
    const [created] = await db.insert(pendingKnowledgeUploads).values(data).returning();
    return created;
  }
  async updatePendingKnowledgeUpload(id: string, updates: Partial<InsertPendingKnowledgeUpload>): Promise<PendingKnowledgeUpload> {
    const [updated] = await db
      .update(pendingKnowledgeUploads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pendingKnowledgeUploads.id, id))
      .returning();
    return updated;
  }
  async deletePendingKnowledgeUpload(id: string): Promise<void> {
    await db.delete(pendingKnowledgeUploads).where(eq(pendingKnowledgeUploads.id, id));
  }
  async approvePendingUpload(id: string, finalData: { title: string; category: string; tags: string[] }): Promise<KnowledgeBaseEntry> {
    const upload = await this.getPendingKnowledgeUpload(id);
    if (!upload) throw new Error("Upload not found");

    const kbEntry = await this.createKnowledgeBaseEntry({
      ...finalData,
      content: upload.content,
      chatbotType: upload.chatbotType,
      isActive: true,
    });

    await this.deletePendingKnowledgeUpload(id);
    return kbEntry;
  }

  // ======== LINEN PACKING LISTS ========
  async getLinenPackingLists(): Promise<LinenPackingList[]> {
    return db.select().from(linenPackingLists).orderBy(desc(linenPackingLists.createdAt));
  }
  async getLinenPackingList(id: string): Promise<LinenPackingList | null> {
    const [list] = await db.select().from(linenPackingLists).where(eq(linenPackingLists.id, id)).limit(1);
    return list || null;
  }
  async getLinenPackingListByPropertyId(propertyId: string): Promise<LinenPackingList | null> {
    const [list] = await db.select().from(linenPackingLists).where(eq(linenPackingLists.propertyId, propertyId)).limit(1);
    return list || null;
  }
  async createLinenPackingList(data: InsertLinenPackingList): Promise<LinenPackingList> {
    const [created] = await db.insert(linenPackingLists).values(data).returning();
    return created;
  }
  async updateLinenPackingList(id: string, data: Partial<InsertLinenPackingList>): Promise<LinenPackingList> {
    const [updated] = await db
      .update(linenPackingLists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(linenPackingLists.id, id))
      .returning();
    return updated;
  }
  async deleteLinenPackingList(id: string): Promise<void> {
    await db.delete(linenPackingLists).where(eq(linenPackingLists.id, id));
  }

  // ======== WEEKLY ROTA TASKS ========
  async getWeeklyRotaTasks(): Promise<WeeklyRotaTask[]> {
    return db.select().from(weeklyRotaTasks);
  }
  async getWeeklyRotaTask(id: string): Promise<WeeklyRotaTask | null> {
    const [task] = await db.select().from(weeklyRotaTasks).where(eq(weeklyRotaTasks.id, id)).limit(1);
    return task || null;
  }
  async getWeeklyRotaTasksByDay(day: string): Promise<WeeklyRotaTask[]> {
    return db.select().from(weeklyRotaTasks).where(eq(weeklyRotaTasks.dayOfWeek, day));
  }
  async createWeeklyRotaTask(data: InsertWeeklyRotaTask): Promise<WeeklyRotaTask> {
    const [created] = await db.insert(weeklyRotaTasks).values(data).returning();
    return created;
  }
  async bulkCreateWeeklyRotaTasks(tasks: InsertWeeklyRotaTask[]): Promise<WeeklyRotaTask[]> {
    return db.insert(weeklyRotaTasks).values(tasks).returning();
  }
  async updateWeeklyRotaTask(id: string, data: Partial<InsertWeeklyRotaTask>): Promise<WeeklyRotaTask> {
    const [updated] = await db
      .update(weeklyRotaTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(weeklyRotaTasks.id, id))
      .returning();
    return updated;
  }
  async deleteWeeklyRotaTask(id: string): Promise<void> {
    await db.delete(weeklyRotaTasks).where(eq(weeklyRotaTasks.id, id));
  }
  async deleteAllWeeklyRotaTasks(): Promise<void> {
    await db.delete(weeklyRotaTasks);
  }

  // ======== TRAINING VIDEOS ========
  // Training Videos
  async getTrainingVideos(): Promise<TrainingVideo[]> {
    return db.select().from(trainingVideos).orderBy(asc(trainingVideos.title));
  }
  async getTrainingVideo(id: string): Promise<TrainingVideo | null> {
    const [video] = await db.select().from(trainingVideos).where(eq(trainingVideos.id, id)).limit(1);
    return video || null;
  }
  async createTrainingVideo(data: InsertTrainingVideo): Promise<TrainingVideo> {
    const [created] = await db.insert(trainingVideos).values(data).returning();
    return created;
  }
  async updateTrainingVideo(id: string, data: Partial<InsertTrainingVideo>): Promise<TrainingVideo> {
    const [updated] = await db
      .update(trainingVideos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingVideos.id, id))
      .returning();
    return updated;
  }
  async deleteTrainingVideo(id: string): Promise<void> {
    await db.delete(trainingVideos).where(eq(trainingVideos.id, id));
  }
  async getTrainingVideosByCategory(category: string): Promise<TrainingVideo[]> {
    return db.select().from(trainingVideos).where(eq(trainingVideos.category, category)).orderBy(asc(trainingVideos.title));
  }

  // Training Completions
  async logTrainingCompletion(videoId: string, staffId: string, staffName: string): Promise<TrainingCompletion> {
    const [created] = await db.insert(trainingCompletions).values({ videoId, staffId, staffName }).returning();
    return created;
  }
  async getTrainingCompletions(videoId: string): Promise<TrainingCompletion[]> {
    return db.select().from(trainingCompletions).where(eq(trainingCompletions.videoId, videoId));
  }
  async getStaffTrainingHistory(staffId: string): Promise<TrainingCompletion[]> {
    return db.select().from(trainingCompletions).where(eq(trainingCompletions.staffId, staffId)).orderBy(desc(trainingCompletions.completedAt));
  }
  async getTrainingAnalytics(): Promise<{
    totalVideos: number;
    totalCompletions: number;
    videoStats: Array<{
      video: TrainingVideo;
      completionCount: number;
      completionRate: number;
    }>;
  }> {
    // Placeholder - complex analytics logic
    throw new Error("Not implemented");
  }

  // ======== PROPERTY ONBOARDING ========
  // Onboarding Sessions
  async createPropertyOnboardingSession(data: InsertPropertyOnboardingSession): Promise<PropertyOnboardingSession> {
    const [created] = await db.insert(propertyOnboardingSessions).values(data).returning();
    return created;
  }
  async getPropertyOnboardingSession(id: string): Promise<PropertyOnboardingSession | null> {
    const [session] = await db.select().from(propertyOnboardingSessions).where(eq(propertyOnboardingSessions.id, id)).limit(1);
    return session || null;
  }
  async getAllPropertyOnboardingSessions(): Promise<PropertyOnboardingSession[]> {
    return db.select().from(propertyOnboardingSessions).orderBy(desc(propertyOnboardingSessions.createdAt));
  }
  async updatePropertyOnboardingSession(id: string, data: Partial<InsertPropertyOnboardingSession>): Promise<PropertyOnboardingSession> {
    const [updated] = await db
      .update(propertyOnboardingSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(propertyOnboardingSessions.id, id))
      .returning();
    return updated;
  }
  async completePropertyOnboardingSession(sessionId: string, propertyId: string): Promise<PropertyOnboardingSession> {
    const [updated] = await db
      .update(propertyOnboardingSessions)
      .set({ status: "completed", propertyId, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(propertyOnboardingSessions.id, sessionId))
      .returning();
    return updated;
  }

  // Onboarding Responses
  async savePropertyOnboardingResponse(data: InsertPropertyOnboardingResponse): Promise<PropertyOnboardingResponse> {
    const [created] = await db.insert(propertyOnboardingResponses).values(data).returning();
    return created;
  }
  async getPropertyOnboardingResponses(sessionId: string): Promise<PropertyOnboardingResponse[]> {
    return db.select().from(propertyOnboardingResponses).where(eq(propertyOnboardingResponses.sessionId, sessionId)).orderBy(asc(propertyOnboardingResponses.step));
  }
  async getPropertyOnboardingResponsesByStep(sessionId: string, step: number): Promise<PropertyOnboardingResponse[]> {
    return db.select().from(propertyOnboardingResponses).where(and(eq(propertyOnboardingResponses.sessionId, sessionId), eq(propertyOnboardingResponses.step, step)));
  }
  async updatePropertyOnboardingResponse(id: string, answer: string): Promise<PropertyOnboardingResponse> {
    const [updated] = await db
      .update(propertyOnboardingResponses)
      .set({ answer, status: "answered", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(propertyOnboardingResponses.id, id))
      .returning();
    return updated;
  }

  // ======== MANAGEMENT CONTRACTS ========
  async createManagementContract(data: InsertManagementContract): Promise<ManagementContract> {
    const [created] = await db.insert(managementContracts).values(data).returning();
    return created;
  }
  async getManagementContract(id: string): Promise<ManagementContract | null> {
    const [contract] = await db.select().from(managementContracts).where(eq(managementContracts.id, id)).limit(1);
    return contract || null;
  }
  async getAllManagementContracts(): Promise<ManagementContract[]> {
    return db.select().from(managementContracts).orderBy(desc(managementContracts.startDate));
  }
  async getManagementContractsByProperty(propertyId: string): Promise<ManagementContract[]> {
    return db.select().from(managementContracts).where(eq(managementContracts.propertyId, propertyId));
  }
  async getActiveManagementContracts(): Promise<ManagementContract[]> {
    return db.select().from(managementContracts).where(eq(managementContracts.status, "active"));
  }
  async getExpiringContracts(daysAhead: number): Promise<ManagementContract[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);
    return db.select().from(managementContracts).where(and(eq(managementContracts.status, "active"), lte(managementContracts.endDate, expiryDate)));
  }
  async updateManagementContract(id: string, data: Partial<InsertManagementContract>): Promise<ManagementContract> {
    const [updated] = await db
      .update(managementContracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(managementContracts.id, id))
      .returning();
    return updated;
  }
  async updateContractAnalysis(id: string, analysisData: {
    analysisCompleted: boolean;
    isLegallyValid?: boolean;
    legalAnalysisNotes?: string;
    aiAnalysisSummary?: string;
    renewalDate?: Date;
    startDate?: Date;
    endDate?: Date;
    managementFeePercentage?: string;
    managementFeeFixed?: string;
    specialTerms?: string;
  }): Promise<ManagementContract> {
    const [updated] = await db
      .update(managementContracts)
      .set({ ...analysisData, analysisCompletedAt: analysisData.analysisCompleted ? new Date() : undefined, updatedAt: new Date() })
      .where(eq(managementContracts.id, id))
      .returning();
    return updated;
  }
  async markContractRenewalNotificationSent(id: string): Promise<ManagementContract> {
    const [updated] = await db
      .update(managementContracts)
      .set({ renewalNotificationSentAt: new Date(), updatedAt: new Date() })
      .where(eq(managementContracts.id, id))
      .returning();
    return updated;
  }
  async deleteManagementContract(id: string): Promise<void> {
    await db.delete(managementContracts).where(eq(managementContracts.id, id));
  }

  // ======== COMPLIANCE AUTOMATION ========
  async getComplianceAutomationSnapshot(params: {
    staffId: string;
    date: Date;
    property?: string;
  }): Promise<{
    trolleySignedInOut: { compliant: boolean; points: number; evidence: string[] };
    caddySignedInOut: { compliant: boolean; points: number; evidence: string[] };
    usedChatbot: { compliant: boolean; points: number; evidence: string[] };
    missedSpecialRequests: { compliant: boolean; points: number; evidence: string[] };
  }> {
    // Placeholder - complex logic involving multiple data sources
    throw new Error("Not implemented");
  }

  // ======== RENTCHECK INSPECTIONS ========
  async createRentCheckInspection(inspection: InsertRentCheckInspection): Promise<RentCheckInspection> {
    const [created] = await db.insert(rentCheckInspections).values(inspection).returning();
    return created;
  }
  async createRentCheckRoomRating(rating: InsertRentCheckRoomRating): Promise<RentCheckRoomRating> {
    const [created] = await db.insert(rentCheckRoomRatings).values(rating).returning();
    return created;
  }
  async getRentCheckInspections(filters?: { propertyId?: string; startDate?: string; endDate?: string }): Promise<RentCheckInspection[]> {
    let query = db.select().from(rentCheckInspections);
    const conditions = [];
    if (filters?.propertyId) conditions.push(eq(rentCheckInspections.propertyId, filters.propertyId));
    if (filters?.startDate) conditions.push(gte(rentCheckInspections.inspectionDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(rentCheckInspections.inspectionDate, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    return query.orderBy(desc(rentCheckInspections.inspectionDate));
  }
  async getRentCheckInspectionById(id: string): Promise<RentCheckInspection | undefined> {
    const [inspection] = await db.select().from(rentCheckInspections).where(eq(rentCheckInspections.id, id)).limit(1);
    return inspection;
  }
  async getRentCheckRoomRatings(inspectionId: string): Promise<RentCheckRoomRating[]> {
    return db.select().from(rentCheckRoomRatings).where(eq(rentCheckRoomRatings.inspectionId, inspectionId));
  }
  async findLastCleanerForProperty(propertyAddress: string, inspectionDate: string): Promise<{ staffId: string; cleaningDate: string; daysSince: number } | null> {
    // Placeholder - joining cleaning assignments or similar tables
    throw new Error("Not implemented");
  }

  // ======== ACTIVITY LOGS ========
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }
  async getActivityLogs(filters?: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogs);
    const conditions = [];
    if (filters?.userId) conditions.push(eq(activityLogs.userId, filters.userId));
    if (filters?.resourceType) conditions.push(eq(activityLogs.resourceType, filters.resourceType));
    if (filters?.action) conditions.push(eq(activityLogs.action, filters.action));
    if (filters?.startDate) conditions.push(gte(activityLogs.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(activityLogs.createdAt, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset) query = query.offset(filters.offset);
    return query.orderBy(desc(activityLogs.createdAt));
  }
  async getActivityLogCount(filters?: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    let query = db.select({ count: sql`count(*)` }).from(activityLogs);
    const conditions = [];
    if (filters?.userId) conditions.push(eq(activityLogs.userId, filters.userId));
    if (filters?.resourceType) conditions.push(eq(activityLogs.resourceType, filters.resourceType));
    if (filters?.action) conditions.push(eq(activityLogs.action, filters.action));
    if (filters?.startDate) conditions.push(gte(activityLogs.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(activityLogs.createdAt, filters.endDate));
    if (conditions.length > 0) query = query.where(and(...conditions));
    const result = await query;
    return Number(result[0].count);
  }

  // ======== POTENTIAL CLIENTS PIPELINE ========
  // Potential Clients
  async getPotentialClients(): Promise<PotentialClient[]> {
    return db.select().from(potentialClients).orderBy(desc(potentialClients.createdAt));
  }

  async getAllPotentialClients(): Promise<PotentialClient[]> {
    return this.getPotentialClients();
  }

  async getPotentialClientById(id: string): Promise<PotentialClient | null> {
    const [client] = await db.select().from(potentialClients).where(eq(potentialClients.id, id)).limit(1);
    return client || null;
  }
  async createPotentialClient(data: InsertPotentialClient): Promise<PotentialClient> {
    const [created] = await db.insert(potentialClients).values(data).returning();
    return created;
  }
  async updatePotentialClient(id: string, data: Partial<InsertPotentialClient>): Promise<PotentialClient> {
    const [updated] = await db
      .update(potentialClients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(potentialClients.id, id))
      .returning();
    return updated;
  }
  async deletePotentialClient(id: string): Promise<void> {
    await db.delete(potentialClients).where(eq(potentialClients.id, id));
  }

  // Client Contacts
  async getClientContacts(potentialClientId: string): Promise<ClientContact[]> {
    return db.select().from(clientContacts).where(eq(clientContacts.potentialClientId, potentialClientId));
  }
  async createClientContact(data: InsertClientContact): Promise<ClientContact> {
    const [created] = await db.insert(clientContacts).values(data).returning();
    return created;
  }
  async updateClientContact(id: string, data: Partial<InsertClientContact>): Promise<ClientContact> {
    const [updated] = await db
      .update(clientContacts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientContacts.id, id))
      .returning();
    return updated;
  }
  async deleteClientContact(id: string): Promise<void> {
    await db.delete(clientContacts).where(eq(clientContacts.id, id));
  }

  // Client Properties
  async getClientProperties(potentialClientId: string): Promise<ClientProperty[]> {
    return db.select().from(clientProperties).where(eq(clientProperties.potentialClientId, potentialClientId));
  }
  async createClientProperty(data: InsertClientProperty): Promise<ClientProperty> {
    const [created] = await db.insert(clientProperties).values(data).returning();
    return created;
  }
  async updateClientProperty(id: string, data: Partial<InsertClientProperty>): Promise<ClientProperty> {
    const [updated] = await db
      .update(clientProperties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientProperties.id, id))
      .returning();
    return updated;
  }
  async deleteClientProperty(id: string): Promise<void> {
    await db.delete(clientProperties).where(eq(clientProperties.id, id));
  }

  // Client Pipeline Stages
  async getClientPipelineStage(potentialClientId: string): Promise<ClientPipelineStage | null> {
    const [stage] = await db.select().from(clientPipelineStages).where(eq(clientPipelineStages.potentialClientId, potentialClientId)).limit(1);
    return stage || null;
  }
  async createClientPipelineStage(data: InsertClientPipelineStage): Promise<ClientPipelineStage> {
    const [created] = await db.insert(clientPipelineStages).values(data).returning();
    return created;
  }
  async updateClientPipelineStage(id: string, data: Partial<InsertClientPipelineStage>): Promise<ClientPipelineStage> {
    const [updated] = await db
      .update(clientPipelineStages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientPipelineStages.id, id))
      .returning();
    return updated;
  }

  // Client Stage History
  async getClientStageHistory(potentialClientId: string): Promise<ClientStageHistory[]> {
    return db.select().from(clientStageHistory).where(eq(clientStageHistory.potentialClientId, potentialClientId)).orderBy(asc(clientStageHistory.createdAt));
  }
  async createClientStageHistory(data: InsertClientStageHistory): Promise<ClientStageHistory> {
    const [created] = await db.insert(clientStageHistory).values(data).returning();
    return created;
  }

  // Client Meetings
  async getClientMeetings(potentialClientId: string): Promise<ClientMeeting[]> {
    return db.select().from(clientMeetings).where(eq(clientMeetings.potentialClientId, potentialClientId)).orderBy(asc(clientMeetings.scheduledAt));
  }
  async getClientMeetingById(id: string): Promise<ClientMeeting | null> {
    const [meeting] = await db.select().from(clientMeetings).where(eq(clientMeetings.id, id)).limit(1);
    return meeting || null;
  }
  async createClientMeeting(data: InsertClientMeeting): Promise<ClientMeeting> {
    const [created] = await db.insert(clientMeetings).values(data).returning();
    return created;
  }
  async updateClientMeeting(id: string, data: Partial<InsertClientMeeting>): Promise<ClientMeeting> {
    const [updated] = await db
      .update(clientMeetings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientMeetings.id, id))
      .returning();
    return updated;
  }
  async updateMeetingOutcome(id: string, data: UpdateClientMeetingOutcome): Promise<ClientMeeting> {
    const [updated] = await db
      .update(clientMeetings)
      .set({ outcome: data.outcome, notes: data.notes, updatedAt: new Date() })
      .where(eq(clientMeetings.id, id))
      .returning();
    return updated;
  }
  async listUpcomingMeetings(potentialClientId: string): Promise<ClientMeeting[]> {
    return db.select().from(clientMeetings).where(and(eq(clientMeetings.potentialClientId, potentialClientId), gte(clientMeetings.scheduledAt, new Date()))).orderBy(asc(clientMeetings.scheduledAt));
  }
  async deleteClientMeeting(id: string): Promise<void> {
    await db.delete(clientMeetings).where(eq(clientMeetings.id, id));
  }

  // Client Follow-ups
  async getClientFollowUps(potentialClientId: string): Promise<ClientFollowUp[]> {
    return db.select().from(clientFollowUps).where(eq(clientFollowUps.potentialClientId, potentialClientId)).orderBy(asc(clientFollowUps.followUpDate));
  }
  async getOverdueFollowUps(): Promise<ClientFollowUp[]> {
    return db.select().from(clientFollowUps).where(and(lt(clientFollowUps.followUpDate, new Date()), ne(clientFollowUps.status, "completed")));
  }
  async createClientFollowUp(data: InsertClientFollowUp): Promise<ClientFollowUp> {
    const [created] = await db.insert(clientFollowUps).values(data).returning();
    return created;
  }
  async updateClientFollowUp(id: string, data: Partial<InsertClientFollowUp>): Promise<ClientFollowUp> {
    const [updated] = await db
      .update(clientFollowUps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientFollowUps.id, id))
      .returning();
    return updated;
  }
  async deleteClientFollowUp(id: string): Promise<void> {
    await db.delete(clientFollowUps).where(eq(clientFollowUps.id, id));
  }

  // Client Communications
  async getClientCommunications(potentialClientId: string): Promise<ClientCommunication[]> {
    return db.select().from(clientCommunications).where(eq(clientCommunications.potentialClientId, potentialClientId)).orderBy(asc(clientCommunications.createdAt));
  }
  async createClientCommunication(data: InsertClientCommunication): Promise<ClientCommunication> {
    const [created] = await db.insert(clientCommunications).values(data).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();