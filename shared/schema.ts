import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer, real, date, index, serial, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidates table - stores applicant information from CSV upload
export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  roleType: text("role_type").notNull(), // "driver" or "non-driver"
  source: text("source").default("indeed"), // "indeed", "referral", "website", "linkedin", "other"
  screeningAnswers: jsonb("screening_answers").$type<Record<string, string>>().notNull().default({}),
  status: text("status").notNull().default("uploaded"), // uploaded, screened, scheduled, attended, hired, trial
  meetingScheduledAt: timestamp("meeting_scheduled_at"),
  meetingAttended: boolean("meeting_attended").default(false),
  onboardingFormData: jsonb("onboarding_form_data").$type<Record<string, any>>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Group meetings table - tracks scheduled group interview meetings
export const groupMeetings = pgTable("group_meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleType: text("role_type").notNull(), // "driver" or "non-driver"
  scheduledAt: timestamp("scheduled_at").notNull(),
  calendlyEventId: text("calendly_event_id"),
  calendlyEventUrl: text("calendly_event_url"),
  googleCalendarEventId: text("google_calendar_event_id"),
  googleCalendarMeetingLink: text("google_calendar_meeting_link"),
  googleCalendarEventIdSecondary: text("google_calendar_event_id_secondary"), // ops@example.com
  googleCalendarMeetingLinkSecondary: text("google_calendar_meeting_link_secondary"),
  candidateIds: text("candidate_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  maxCapacity: integer("max_capacity").notNull().default(10),
  attendeeCount: integer("attendee_count").notNull().default(0),
  attendanceToken: text("attendance_token"), // Unique token for quick attendance marking
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, archived
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meeting confirmations table - tracks candidate confirmations for group meetings
export const meetingConfirmations = pgTable("meeting_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => groupMeetings.id, { onDelete: "cascade" }),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  confirmed: boolean("confirmed").default(false),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Trial shifts table - tracks trial shifts for hired candidates
export const trialShifts = pgTable("trial_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  mentorStaffId: varchar("mentor_staff_id").references(() => staff.id, { onDelete: "set null" }), // Assigned mentor
  shiftNumber: integer("shift_number").notNull(), // 1 or 2
  scheduledAt: timestamp("scheduled_at").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, no-show, passed, failed
  feedback: text("feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Candidate stage history - tracks status changes through the hiring pipeline
export const candidateStageHistory = pgTable("candidate_stage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),  // null for first entry
  toStatus: text("to_status").notNull(),
  changedBy: varchar("changed_by"),  // user ID or "system"
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  note: text("note"),  // optional note for why status changed
});

// Screening question type definition
export type ScreeningQuestionType = 'yes_no' | 'multiple_choice' | 'text';

export interface ScreeningQuestion {
  id: string;
  prompt: string;
  type: ScreeningQuestionType;
  options?: string[];
  correctAnswer?: string | string[];
  required: boolean;
  weight: number;
  feedback?: string;
}

// Legacy format for backward compatibility
export interface LegacyScreeningQuestion {
  question: string;
  correctAnswer: string;
}

// Communication template type definition
export interface CommunicationTemplate {
  enabled: boolean;
  emailSubject?: string;
  emailBody?: string;
  smsBody?: string;
}

export interface CommunicationTemplates {
  screeningPassed?: CommunicationTemplate;
  screeningFailed?: CommunicationTemplate;
  meetingScheduled?: CommunicationTemplate;
  meetingReminder?: CommunicationTemplate;
  hired?: CommunicationTemplate;
  rejected?: CommunicationTemplate;
}

// Hiring settings - stores configuration like screening questions
export const hiringSettings = pgTable("hiring_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverScreeningQuestions: jsonb("driver_screening_questions").$type<ScreeningQuestion[]>().notNull().default([]),
  nonDriverScreeningQuestions: jsonb("non_driver_screening_questions").$type<ScreeningQuestion[]>().notNull().default([]),
  passingScoreDriver: integer("passing_score_driver").notNull().default(100),
  passingScoreNonDriver: integer("passing_score_non_driver").notNull().default(100),
  onboardingFormFields: jsonb("onboarding_form_fields").$type<Array<{label: string, type: string, required: boolean}>>().notNull().default([]),
  onboardingFormUrl: text("onboarding_form_url"),
  hiringActive: boolean("hiring_active").notNull().default(false),
  communicationTemplates: jsonb("communication_templates").$type<CommunicationTemplates>().notNull().default({}),
  adminPhoneNumbers: jsonb("admin_phone_numbers").$type<{
    harry?: string;
    aras?: string;
  }>().notNull().default({}),
  // Interview scheduling settings
  recurringMeetingEnabled: boolean("recurring_meeting_enabled").notNull().default(true),
  recurringMeetingDay: integer("recurring_meeting_day").notNull().default(2), // Tuesday by default (0=Sunday, 6=Saturday)
  recurringMeetingTime: varchar("recurring_meeting_time").notNull().default("14:00"), // 2 PM by default
  recurringMeetingDuration: integer("recurring_meeting_duration").notNull().default(60), // 60 minutes by default
  minNoticePeriodHours: integer("min_notice_period_hours").notNull().default(48), // 48 hours minimum notice
  meetingLocation: varchar("meeting_location").default("Google Meet - Link will be provided"), // Google Meet or physical address
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Current staff table - tracks employed staff members
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  roleType: text("role_type").notNull(), // "driver" or "non-driver"
  hireDate: date("hire_date"), // Nullable for legacy staff without exact hire dates
  status: text("status").notNull().default("active"), // active, inactive, on-leave
  notes: text("notes"),

  // NEW FIELDS - Extended Profile Information
  niNumber: text("ni_number"), // National Insurance number
  address: text("address"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  dateOfBirth: date("date_of_birth"),
  photoUrl: text("photo_url"), // Profile photo

  // Certifications & Training
  certifications: jsonb("certifications").$type<Array<{
    id: string;
    name: string;
    issuedBy: string;
    issuedDate: string;
    expiryDate?: string;
    certificateUrl?: string;
  }>>().default(sql`'[]'::jsonb`),

  // Skills & Specializations
  skills: jsonb("skills").$type<string[]>().default(sql`'[]'::jsonb`), // e.g., ["deep-cleaning", "laundry", "ironing"]
  languages: jsonb("languages").$type<string[]>().default(sql`'[]'::jsonb`), // e.g., ["English", "Polish"]

  // Employment Details
  contractType: text("contract_type"), // "full-time", "part-time", "zero-hours"
  hourlyRate: real("hourly_rate"),
  bankDetails: jsonb("bank_details").$type<{
    accountName?: string;
    sortCode?: string;
    accountNumber?: string;
  }>(), // Encrypted/secured in real production

  // Performance Metrics (calculated fields, updated periodically)
  avgComplianceScore: real("avg_compliance_score").default(0),
  totalShiftsCompleted: integer("total_shifts_completed").default(0),
  availabilitySubmissionRate: real("availability_submission_rate").default(0), // % of on-time submissions

  // Personal Calendar & Communication Preferences
  calendarPreferences: jsonb("calendar_preferences").$type<{
    timezone?: string;
    weekStartsOn?: number; // 0=Sunday, 1=Monday
    preferredNotificationTime?: string; // e.g., "09:00"
  }>().default({}),
  contactOptIn: boolean("contact_opt_in").default(true), // Opt-in for SMS/email notifications

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Compliance events table - tracks daily compliance checks and scores
export const complianceEvents = pgTable("compliance_events", {
  eventId: text("event_id").primaryKey(),
  eventDate: date("event_date").notNull(),
  weekStart: date("week_start").notNull(),
  source: text("source").notNull().default("Compliance"),
  property: text("property"),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  points: real("points").notNull(),
  maxPoints: real("max_points").notNull().default(15.0),
  reason: text("reason").notNull(),
  rawPayload: jsonb("raw_payload").$type<{
    src: string;
    event_date: string;
    staff_member: string;
    staff_id_resolved: string;
    property?: string;
    checks: Record<string, any>;
    weights: Record<string, number>;
    notes?: string;
    form_response_id: string;
    auditor?: string;
  }>().notNull(),
  createdByZap: text("created_by_zap").notNull().default("Compliance_Form_v1"),
  linkKey: text("link_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Type exports for staff and compliance tables
export type Staff = typeof staff.$inferSelect;
export type ComplianceEvent = typeof complianceEvents.$inferSelect;

// Prize settings table - stores prize configuration for monthly rankings
export const prizeSettings = pgTable("prize_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstPlacePrize: text("first_place_prize").notNull().default("£50 bonus"),
  secondPlacePrize: text("second_place_prize").notNull().default("£30 bonus"),
  thirdPlacePrize: text("third_place_prize").notNull().default("£20 bonus"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// System settings table - stores global system configuration
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directBookingLink: text("direct_booking_link").notNull().default("https://example.com/book"),
  officePhone: text("office_phone").notNull().default("+44 1234 567890"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Availability table - tracks staff availability for scheduling (legacy - now using availability responses)
export const availability = pgTable("availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  available: boolean("available").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Availability requests - tracks automated SMS reminders sent Wed/Sun 4:30pm
export const availabilityRequests = pgTable("availability_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestDate: timestamp("request_date").notNull().defaultNow(),
  periodStart: date("period_start").notNull(), // First day of 7-day period
  periodEnd: date("period_end").notNull(), // Last day of 7-day period
  deadline: timestamp("deadline").notNull(), // 24 hours after request_date
  staffIds: text("staff_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  sentCount: integer("sent_count").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending, sent, failed, partial
  errorMessage: text("error_message"),
  reminderSentAt: timestamp("reminder_sent_at"), // Track when 24-hour reminder was sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Availability responses - stores staff time-slot submissions via mobile form
export const availabilityResponses = pgTable("availability_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").references(() => availabilityRequests.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  responseToken: text("response_token").notNull(), // Token for mobile link (shared by all slots in same submission)
  date: date("date").notNull(), // Which day they're responding about
  timeSlot: text("time_slot").notNull(), // "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"
  available: boolean("available"), // null = no response, true = available, false = unavailable
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin staff table - tracks admin/management staff (separate from cleaning staff)
export const adminStaff = pgTable("admin_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // "manager" or "admin"
  receivesReminders: boolean("receives_reminders").notNull().default(false), // Only May and StaffA get reminders
  status: text("status").notNull().default("active"), // active, inactive
  phone: text("phone"),
  backupEmail: text("backup_email"),
  preferredContact: text("preferred_contact").notNull().default("email"), // "email", "phone", "slack"
  slackHandle: text("slack_handle"),
  teamsHandle: text("teams_handle"),
  employmentStatus: text("employment_status").notNull().default("full-time"), // "full-time", "part-time", "contractor"
  photo: text("photo"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Admin availability requests - tracks automated email reminders for 2-week periods
export const adminAvailabilityRequests = pgTable("admin_availability_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestDate: timestamp("request_date").notNull().defaultNow(),
  periodStart: date("period_start").notNull(), // First day of 2-week period
  periodEnd: date("period_end").notNull(), // Last day of 2-week period
  adminStaffIds: text("admin_staff_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  sentCount: integer("sent_count").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending, sent, failed, partial
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin availability responses - stores flexible time-slot submissions (more flexible than cleaning staff)
export const adminAvailabilityResponses = pgTable("admin_availability_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").references(() => adminAvailabilityRequests.id, { onDelete: "cascade" }),
  adminStaffId: varchar("admin_staff_id").notNull().references(() => adminStaff.id, { onDelete: "cascade" }),
  responseToken: text("response_token").notNull(), // Token for submission link (shared by all slots)
  date: date("date").notNull(), // Which day they're responding about
  timeSlot: text("time_slot").notNull(), // Flexible hourly slots: "09:00", "10:00", "11:00", etc.
  available: boolean("available"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin shift templates - recurring weekly shift patterns for office staff
export const adminShiftTemplates = pgTable("admin_shift_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => adminStaff.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Monday Office Hours"
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: text("start_time").notNull(), // e.g., "09:00"
  endTime: text("end_time").notNull(), // e.g., "17:00"
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"), // nullable - ongoing if null
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Admin scheduled shifts - actual shifts (generated from templates or created manually)
export const adminScheduledShifts = pgTable("admin_scheduled_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => adminStaff.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").references(() => adminShiftTemplates.id, { onDelete: "set null" }), // null if manual
  date: date("date").notNull(),
  startTime: text("start_time").notNull(), // e.g., "09:00"
  endTime: text("end_time").notNull(), // e.g., "17:00"
  durationHours: numeric("duration_hours").notNull(), // calculated from start/end time
  source: text("source").notNull().default("manual"), // "template" or "manual"
  status: text("status").notNull().default("scheduled"), // "scheduled", "completed", "cancelled"
  notes: text("notes"),
  createdBy: varchar("created_by"), // user ID who created this shift
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Screening links - unique tokens sent to candidates for online screening
export const screeningLinks = pgTable("screening_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  screeningToken: text("screening_token").notNull().unique(), // Unique token for screening link
  roleType: text("role_type").notNull(), // "driver" or "non-driver"
  sentVia: text("sent_via").notNull().default("email"), // email, sms, both
  sentAt: timestamp("sent_at"),
  expiresAt: timestamp("expires_at"), // Link expiry (14 days from creation)
  completedAt: timestamp("completed_at"), // When candidate completed screening
  passed: boolean("passed"), // null = not completed, true = passed, false = failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Screening responses - candidate answers to screening questions
export const screeningResponses = pgTable("screening_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  screeningLinkId: varchar("screening_link_id").notNull().references(() => screeningLinks.id, { onDelete: "cascade" }),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Onboarding submissions - post-meeting data collection (NI number, photo ID, availability)
export const onboardingSubmissions = pgTable("onboarding_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  onboardingToken: text("onboarding_token").notNull().unique(), // Unique token for onboarding link
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  niNumber: text("ni_number").notNull(), // National Insurance number
  photoIdUploadId: varchar("photo_id_upload_id"), // Reference to uploaded photo ID
  availabilityData: jsonb("availability_data").$type<Record<string, boolean>>(), // 7-day availability
  sentAt: timestamp("sent_at"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Photo ID uploads - secure storage references for candidate photo IDs
export const photoIdUploads = pgTable("photo_id_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // bytes
  mimeType: text("mime_type").notNull(), // image/jpeg, image/png, application/pdf
  storageKey: text("storage_key").notNull().unique(), // Object storage key/path
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  accessedAt: timestamp("accessed_at"), // Last time file was accessed (for audit)
  accessedBy: varchar("accessed_by"), // User ID who accessed (for audit)
});

// Meeting attendance - tracks who actually showed up to group meetings
export const meetingAttendance = pgTable("meeting_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => groupMeetings.id, { onDelete: "cascade" }),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  attended: boolean("attended").notNull().default(false),
  wantsToProceed: boolean("wants_to_proceed"), // null = not asked yet, true/false = their decision
  onboardingLinkSent: boolean("onboarding_link_sent").default(false),
  markedAt: timestamp("marked_at").notNull().defaultNow(),
  markedBy: varchar("marked_by"), // User ID who marked attendance
});

// Communication logs - tracks all automated emails/SMS sent to candidates
export const communicationLogs = pgTable("communication_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // 'email' or 'sms'
  templateKey: text("template_key").notNull(), // screeningPassed, screeningFailed, meetingScheduled, etc.
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull(), // 'sent' or 'failed'
  error: text("error"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// Onboarding checklist templates - defines the onboarding steps
export const onboardingChecklistTemplates = pgTable("onboarding_checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  step: text("step").notNull(), // "onboarding_form", "photo_id", "trial_shift_1", etc.
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "paperwork", "training", "equipment", "introduction"
  daysToComplete: integer("days_to_complete").notNull().default(7), // SLA in days
  sequenceOrder: integer("sequence_order").notNull(), // Display order
  required: boolean("required").notNull().default(true),
  automatedTrigger: boolean("automated_trigger").default(false), // Auto-complete when detected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Onboarding checklist items - actual items for each candidate/staff
export const onboardingChecklistItems = pgTable("onboarding_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").references(() => staff.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => onboardingChecklistTemplates.id),
  status: text("status").notNull().default("pending"), // "pending", "in_progress", "completed", "overdue"
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by"), // User who marked complete
  dueDate: timestamp("due_date").notNull(),
  notes: text("notes"),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Badges/Achievements table - defines available badges
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // emoji or icon name
  category: text("category").notNull(), // "performance", "consistency", "milestone", "special"
  criteria: jsonb("criteria").$type<{
    type: "compliance_streak" | "perfect_score" | "total_shifts" | "availability_rate" | "custom";
    threshold?: number;
    scoreRequired?: number;
  }>().notNull(),
  rarity: text("rarity").notNull().default("common"), // "common", "rare", "epic", "legendary"
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Staff badges - tracks which badges each staff member has earned
export const staffBadges = pgTable("staff_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  badgeId: varchar("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
  progress: integer("progress").default(0),
  notified: boolean("notified").default(false),
});

// Maintenance Requests - tracks property maintenance issues with comprehensive guest and property details
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "cascade" }),
  reportedBy: varchar("reported_by").references(() => staff.id, { onDelete: "set null" }), // Can be null for guest-reported issues
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // critical, high, medium, low
  status: text("status").notNull().default("pending"), // pending, assigned, in_progress, completed, cancelled
  serviceType: text("service_type").notNull().default("general"), // general, waste_disposal, electrician, plumber, locksmith
  assignedWorkerId: varchar("assigned_worker_id").references(() => staff.id, { onDelete: "set null" }), // Internal staff worker assignment - OPTIONAL initially
  photoGcsPaths: text("photo_gcs_paths").array(), // Array of Google Cloud Storage paths
  googleDriveLink: text("google_drive_link"), // Optional Google Drive link for additional photos

  // Guest information (from Uplisting data or manual entry)
  guestName: text("guest_name"),
  guestPhone: text("guest_phone"),

  // Property availability for contractor visit
  availabilityDate: timestamp("availability_date"), // When property is available for maintenance
  availabilityTime: text("availability_time"), // Time slot for visit

  // Property access details (auto-populated from critical info, must be verified)
  propertyAddress: text("property_address"),
  accessCode: text("access_code"),
  wifiDetails: text("wifi_details"),
  checkInDetails: text("check_in_details"),
  detailsVerified: boolean("details_verified").notNull().default(false), // User must verify all details

  // Landlord cross-reference (for AST properties)
  landlordId: integer("landlord_id").references(() => landlords.id, { onDelete: "set null" }),

  // Cost tracking (no estimated cost at creation, only likely cost for landlord notification and actual cost at completion)
  likelyCost: real("likely_cost"), // Likely cost estimate for landlord notification
  actualCost: real("actual_cost"), // Actual cost after completion

  // Contractor assignment (for specialized services)
  suggestedContractorId: varchar("suggested_contractor_id").references(() => contractors.id, { onDelete: "set null" }), // Auto-suggested contractor based on service type and property

  // Client notification settings
  notifyClient: boolean("notify_client").notNull().default(true), // Whether to notify the client when job is submitted

  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Contractors - manages repair service contractors
export const contractors = pgTable("contractors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  specialties: text("specialties").array().notNull().default(sql`ARRAY[]::text[]`), // plumbing, electrical, HVAC, general, etc.
  rating: real("rating").default(5), // 1-5 star rating
  isActive: boolean("is_active").notNull().default(true),

  // Area/Property Assignment
  assignedLocationGroupIds: text("assigned_location_group_ids").array().default(sql`ARRAY[]::text[]`), // Assigned areas
  assignedPropertyIds: text("assigned_property_ids").array().default(sql`ARRAY[]::text[]`), // Assigned specific properties
  priority: integer("priority").default(5), // 1-10 scale, higher number = higher priority for assignment

  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Maintenance Assignments - links requests to contractors
export const maintenanceAssignments = pgTable("maintenance_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maintenanceRequestId: varchar("maintenance_request_id").notNull().references(() => maintenanceRequests.id, { onDelete: "cascade" }),
  contractorId: varchar("contractor_id").notNull().references(() => contractors.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  cost: real("cost"),
  invoiceNumber: text("invoice_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inspection Templates - Reusable checklist templates for property inspections
export const inspectionTemplates = pgTable("inspection_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // "cleaning", "maintenance", "turnover"
  items: jsonb("items").$type<Array<{
    category: string; // Kitchen, Bedrooms, Bathrooms, Living Areas, Exterior
    description: string;
    required: boolean;
    type: "check" | "rating" | "text";
  }>>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Inspection Reports - Completed inspection reports
export const inspectionReports = pgTable("inspection_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => inspectionTemplates.id),
  inspectorId: varchar("inspector_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  assignedCleanerId: varchar("assigned_cleaner_id").references(() => staff.id, { onDelete: "set null" }), // Cleaner who most recently cleaned this property
  date: timestamp("date").notNull().defaultNow(),
  overallScore: real("overall_score"), // 0-100
  status: text("status").notNull().default("pending"), // "pending", "in_progress", "completed"
  notes: text("notes"),
  photos: text("photos").array().notNull().default(sql`ARRAY[]::text[]`), // Array of photo URLs
  pdfUrl: text("pdf_url"), // RentCheck PDF upload URL
  sourceType: text("source_type").notNull().default("manual"), // "manual", "rentcheck", "webhook"
  aiExtractedData: jsonb("ai_extracted_data"), // AI-extracted data from PDF
  clientNotified: boolean("client_notified").notNull().default(false), // Whether client has been notified
  clientNotifiedAt: timestamp("client_notified_at"), // When client was notified
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Inspection Items - Individual checklist item responses
export const inspectionItems = pgTable("inspection_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => inspectionReports.id, { onDelete: "cascade" }),
  itemCategory: text("item_category").notNull(),
  itemDescription: text("item_description").notNull(),
  passed: boolean("passed"), // For check type
  rating: integer("rating"), // 1-5 for rating type
  notes: text("notes"), // For text type or additional notes
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inspection Issues - Issues found during inspection
export const inspectionIssues = pgTable("inspection_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => inspectionReports.id, { onDelete: "cascade" }),
  severity: text("severity").notNull(), // "minor", "major", "critical"
  description: text("description").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  assignedTo: varchar("assigned_to").references(() => contractors.id, { onDelete: "set null" }),
  maintenanceRequestId: varchar("maintenance_request_id").references(() => maintenanceRequests.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inspection Notification Settings - Thresholds for client notifications
export const inspectionNotificationSettings = pgTable("inspection_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "cascade" }), // null = global default
  scoreThreshold: real("score_threshold").notNull().default(75), // Minimum score to trigger notification
  enabled: boolean("enabled").notNull().default(true),
  recipientEmails: text("recipient_emails").array().notNull().default(sql`ARRAY[]::text[]`), // Client emails
  ccEmails: text("cc_emails").array().notNull().default(sql`ARRAY[]::text[]`), // Additional recipients
  emailTemplate: text("email_template"), // Custom email template
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// QuickBooks Settings - Store connection settings, tokens, company ID
export const quickbooksSettings = pgTable("quickbooks_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull(), // QuickBooks Company/Realm ID
  companyName: varchar("company_name"),
  accessToken: text("access_token").notNull(), // Encrypted OAuth access token
  refreshToken: text("refresh_token").notNull(), // Encrypted OAuth refresh token
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
  environment: varchar("environment").notNull().default("sandbox"), // sandbox or production
  isActive: boolean("is_active").notNull().default(true),
  webhookToken: varchar("webhook_token"), // For webhook verification
  syncSettings: jsonb("sync_settings").$type<{
    autoSyncEnabled?: boolean;
    syncFrequencyMinutes?: number;
    syncInvoices?: boolean;
    syncCustomers?: boolean;
    syncPayments?: boolean;
    defaultTerms?: string;
    defaultPaymentMethod?: string;
  }>().notNull().default({
    autoSyncEnabled: true,
    syncFrequencyMinutes: 60,
    syncInvoices: true,
    syncCustomers: true,
    syncPayments: true
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// QuickBooks Customers - Synced customer data
export const quickbooksCustomers = pgTable("quickbooks_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quickbooksId: varchar("quickbooks_id").notNull().unique(), // QuickBooks Customer ID
  settingsId: varchar("settings_id").notNull().references(() => quickbooksSettings.id, { onDelete: "cascade" }),
  displayName: varchar("display_name").notNull(),
  companyName: varchar("company_name"),
  givenName: varchar("given_name"),
  familyName: varchar("family_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  mobile: varchar("mobile"),
  billingAddress: jsonb("billing_address").$type<{
    line1?: string;
    line2?: string;
    city?: string;
    countrySubDivisionCode?: string;
    postalCode?: string;
    country?: string;
  }>().default({}),
  shippingAddress: jsonb("shipping_address").$type<{
    line1?: string;
    line2?: string;
    city?: string;
    countrySubDivisionCode?: string;
    postalCode?: string;
    country?: string;
  }>().default({}),
  notes: text("notes"),
  balance: real("balance").default(0),
  active: boolean("active").notNull().default(true),
  taxable: boolean("taxable").notNull().default(true),
  currencyRef: varchar("currency_ref").default("GBP"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // Store full QB customer object
  lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// QuickBooks Invoices - Mirror of QB invoices with local metadata
export const quickbooksInvoices = pgTable("quickbooks_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quickbooksId: varchar("quickbooks_id").unique(), // QuickBooks Invoice ID (null for drafts)
  settingsId: varchar("settings_id").notNull().references(() => quickbooksSettings.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => quickbooksCustomers.id, { onDelete: "set null" }),
  quickbooksCustomerId: varchar("quickbooks_customer_id"), // QuickBooks Customer ID reference
  docNumber: varchar("doc_number"), // Invoice number
  txnDate: date("txn_date").notNull(), // Transaction date
  dueDate: date("due_date"),
  privateNote: text("private_note"), // Internal notes
  customerMemo: text("customer_memo"), // Customer-visible memo
  billEmail: varchar("bill_email"),
  shipDate: date("ship_date"),
  trackingNum: varchar("tracking_num"),
  totalAmount: real("total_amount").notNull(),
  balance: real("balance").default(0), // Amount due
  depositAmount: real("deposit_amount").default(0),
  status: varchar("status").notNull().default("draft"), // draft, pending, sent, paid, voided
  lineItems: jsonb("line_items").$type<Array<{
    id?: string;
    lineNum?: number;
    description?: string;
    amount: number;
    detailType: string;
    salesItemLineDetail?: {
      itemRef?: { value: string; name: string };
      unitPrice?: number;
      qty?: number;
      taxCodeRef?: { value: string };
    };
  }>>().notNull().default([]),
  billingAddress: jsonb("billing_address").$type<{
    line1?: string;
    line2?: string;
    city?: string;
    countrySubDivisionCode?: string;
    postalCode?: string;
    country?: string;
  }>().default({}),
  shippingAddress: jsonb("shipping_address").$type<{
    line1?: string;
    line2?: string;
    city?: string;
    countrySubDivisionCode?: string;
    postalCode?: string;
    country?: string;
  }>().default({}),
  emailStatus: varchar("email_status"), // NotSet, NeedToSend, EmailSent
  linkedTxns: jsonb("linked_txns").$type<Array<{
    txnId: string;
    txnType: string;
    txnLineId?: string;
  }>>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // Store full QB invoice object
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// QuickBooks Sync History - Track sync history and status
export const quickbooksSync = pgTable("quickbooks_sync", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingsId: varchar("settings_id").notNull().references(() => quickbooksSettings.id, { onDelete: "cascade" }),
  syncType: varchar("sync_type").notNull(), // full, incremental, manual, webhook
  entityType: varchar("entity_type").notNull(), // customer, invoice, payment, all
  status: varchar("status").notNull().default("pending"), // pending, in_progress, completed, failed
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsFailed: integer("records_failed").default(0),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details").$type<{
    errors?: Array<{
      entity?: string;
      entityId?: string;
      error: string;
      timestamp: string;
    }>;
  }>().default({}),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas with validation
export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGroupMeetingSchema = createInsertSchema(groupMeetings).omit({
  id: true,
  createdAt: true,
  attendeeCount: true,
});

export const insertMeetingConfirmationSchema = createInsertSchema(meetingConfirmations).omit({
  id: true,
  createdAt: true,
  confirmed: true,
  confirmedAt: true,
});

export const insertTrialShiftSchema = createInsertSchema(trialShifts).omit({
  id: true,
  createdAt: true,
});

export const insertCandidateStageHistorySchema = createInsertSchema(candidateStageHistory).omit({
  id: true,
  changedAt: true,
});

export const insertHiringSettingsSchema = createInsertSchema(hiringSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional().refine((val) => !val || /^\+?\d[\d\s\-().]{6,}$/.test(val), {
    message: "Please enter a valid phone number (e.g., +44 7XXX XXXXXX)",
  }),
  emergencyContactPhone: z.string().optional().refine((val) => !val || /^\+?\d[\d\s\-().]{6,}$/.test(val), {
    message: "Please enter a valid phone number",
  }),
  hourlyRate: z.coerce.number().min(10, "Hourly rate must be at least £10").max(50, "Hourly rate cannot exceed £50").optional(),
});

export const insertComplianceEventSchema = createInsertSchema(complianceEvents).omit({
  createdAt: true,
});

export const insertPrizeSettingsSchema = createInsertSchema(prizeSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvailabilityRequestSchema = createInsertSchema(availabilityRequests).omit({
  id: true,
  createdAt: true,
});

export const insertAvailabilityResponseSchema = createInsertSchema(availabilityResponses).omit({
  id: true,
  createdAt: true,
});

export const insertAdminStaffSchema = createInsertSchema(adminStaff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminAvailabilityRequestSchema = createInsertSchema(adminAvailabilityRequests).omit({
  id: true,
  createdAt: true,
});

export const insertAdminAvailabilityResponseSchema = createInsertSchema(adminAvailabilityResponses).omit({
  id: true,
  createdAt: true,
});

export const insertAdminShiftTemplateSchema = createInsertSchema(adminShiftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminScheduledShiftSchema = createInsertSchema(adminScheduledShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScreeningLinkSchema = createInsertSchema(screeningLinks).omit({
  id: true,
  createdAt: true,
});

export const insertScreeningResponseSchema = createInsertSchema(screeningResponses).omit({
  id: true,
  createdAt: true,
});

export const insertOnboardingSubmissionSchema = createInsertSchema(onboardingSubmissions).omit({
  id: true,
  createdAt: true,
});

export const insertPhotoIdUploadSchema = createInsertSchema(photoIdUploads).omit({
  id: true,
});

export const insertMeetingAttendanceSchema = createInsertSchema(meetingAttendance).omit({
  id: true,
  markedAt: true,
});

export const insertCommunicationLogSchema = createInsertSchema(communicationLogs).omit({
  id: true,
  sentAt: true,
});

export const insertOnboardingChecklistTemplateSchema = createInsertSchema(onboardingChecklistTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOnboardingChecklistItemSchema = createInsertSchema(onboardingChecklistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertStaffBadgeSchema = createInsertSchema(staffBadges).omit({
  id: true,
  earnedAt: true,
});

// Screening question validation schemas
export const screeningQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1, "Question prompt is required"),
  type: z.enum(['yes_no', 'multiple_choice', 'text']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
  required: z.boolean().default(true),
  weight: z.number().min(0).default(1),
  feedback: z.string().optional(),
}).refine((data) => {
  if (data.type === 'multiple_choice') {
    return data.options && data.options.length >= 2;
  }
  return true;
}, {
  message: "Multiple choice questions must have at least 2 options",
});

export const legacyScreeningQuestionSchema = z.object({
  question: z.string(),
  correctAnswer: z.string(),
});

// Migration helper: converts legacy format to new format
export function migrateLegacyQuestion(legacy: LegacyScreeningQuestion): ScreeningQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: legacy.question,
    type: 'text',
    correctAnswer: legacy.correctAnswer,
    required: true,
    weight: 1,
  };
}

// Migration helper: converts array of legacy questions
export function migrateLegacyQuestions(
  questions: (LegacyScreeningQuestion | ScreeningQuestion)[]
): ScreeningQuestion[] {
  return questions.map(q => {
    if ('id' in q && 'prompt' in q && 'type' in q) {
      return q as ScreeningQuestion;
    }
    return migrateLegacyQuestion(q as LegacyScreeningQuestion);
  });
}

// CSV upload schema for validation
export const csvCandidateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  roleType: z.enum(["driver", "non-driver"]),
  screeningAnswers: z.record(z.string()),
});

// Enhanced CSV row validation schema with detailed error messages
export const csvCandidateRowSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  phone: z.string()
    .transform(val => {
      if (!val) return '';
      // Remove all formatting characters
      const cleaned = val.replace(/[\s\-().]/g, '');
      // Remove leading apostrophe from Excel/CSV
      return cleaned.startsWith("'") ? cleaned.substring(1) : cleaned;
    })
    .pipe(
      z.string()
        .refine(
          val => !val || /^\+?\d{10,15}$/.test(val),
          "Phone must be 10-15 digits with optional + prefix"
        )
        .optional()
        .or(z.literal(""))
    ),
  roleType: z.enum(["driver", "non-driver"], {
    errorMap: () => ({ message: "Role type must be 'driver' or 'non-driver'" })
  }),
  screeningAnswers: z.record(z.string()).optional().default({}),
});

// Compliance webhook payload schema
export const compliancePayloadSchema = z.object({
  form_response_id: z.string(),
  date_of_shift: z.string(),
  staff_member: z.string(),
  property: z.string().optional().default(""),
  checks: z.record(z.any()),
  notes: z.string().optional().default(""),
  auditor: z.string().optional().default(""),
});

// Location groups table - defines property groupings by area for scheduling
export const locationGroups = pgTable("location_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(), // e.g., "city-centre", "clifton"
  displayName: text("display_name").notNull(), // e.g., "City Centre", "Clifton"
  maxJobsPerDay: integer("max_jobs_per_day").default(10),
  travelTimeMinutes: integer("travel_time_minutes").default(15),
  notes: text("notes"),
  // Location-based SMS routing - staff IDs who get schedules for this location
  defaultRecipients: text("default_recipients").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Properties master table - configured property list
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  uplistingId: text("uplisting_id").unique(),
  locationGroupId: varchar("location_group_id").references(() => locationGroups.id),
  active: boolean("active").notNull().default(true),
  defaultCleanDuration: integer("default_clean_duration").default(120), // minutes
  priorityRank: integer("priority_rank").default(0),
  preferredStaffIds: text("preferred_staff_ids").array().default(sql`ARRAY[]::text[]`),
  notes: text("notes"),

  // NEW FIELDS for Task 16
  propertyType: text("property_type"), // "Studio", "1-Bed", "2-Bed", "3-Bed", "4-Bed+", "House"
  bedrooms: integer("bedrooms"), // nullable - studios have 0
  bathrooms: integer("bathrooms"), // 1, 2, 3, etc.
  cleaningFrequency: text("cleaning_frequency"), // "After Each Booking", "Weekly", "Bi-Weekly", "Monthly"
  specialInstructions: text("special_instructions"), // Detailed cleaning notes
  latitude: real("latitude"), // nullable - for map view
  longitude: real("longitude"), // nullable - for map view

  // Default cleaning rate for this property
  cleaningRateId: varchar("cleaning_rate_id").references(() => cleaningRates.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Property iCal Feed Configuration - stores iCal feed URLs for automatic booking sync
export const propertyIcalFeeds = pgTable("property_ical_feeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  feedName: text("feed_name").notNull(), // e.g., "Airbnb Calendar", "Booking.com Feed"
  feedUrl: text("feed_url").notNull(), // iCal URL from Properly or other platforms
  isActive: boolean("is_active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncStatus: text("last_sync_status"), // "success", "error", "pending"
  lastSyncError: text("last_sync_error"),
  syncFrequencyMinutes: integer("sync_frequency_minutes").default(30),
  totalBookingsSynced: integer("total_bookings_synced").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// iCal Bookings - stores parsed bookings from iCal feeds
export const icalBookings = pgTable("ical_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedId: varchar("feed_id").notNull().references(() => propertyIcalFeeds.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  eventUid: text("event_uid").notNull(), // Unique event ID from iCal
  summary: text("summary"), // Event title/guest name (may be anonymized like "Reserved")
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  description: text("description"),
  status: text("status").default("confirmed"), // "confirmed", "tentative", "cancelled"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Property aliases for fuzzy matching when CSV names vary
export const propertyAliases = pgTable("property_aliases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  aliasName: text("alias_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Import batches - tracks CSV import sessions
export const importBatches = pgTable("import_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull().default("uplisting"), // uplisting, manual
  weekStart: date("week_start").notNull(),
  fileName: text("file_name"),
  rowCount: integer("row_count").default(0),
  matchedCount: integer("matched_count").default(0),
  unmatchedCount: integer("unmatched_count").default(0),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  summaryMetrics: jsonb("summary_metrics").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cleaning jobs - imported from Uplisting CSV
export const cleaningJobs = pgTable("cleaning_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importBatchId: varchar("import_batch_id").references(() => importBatches.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "set null" }),
  scheduledDate: date("scheduled_date").notNull(),
  checkOutTime: text("check_out_time"),
  checkInTime: text("check_in_time"),
  slotStart: text("slot_start"), // Calculated cleaning start time
  slotEnd: text("slot_end"), // Calculated cleaning end time
  jobType: text("job_type").notNull().default("turnover"), // turnover, mid-stay, inspection
  estimatedDuration: integer("estimated_duration").default(120), // minutes
  guestName: text("guest_name"),
  bookingReference: text("booking_reference"),
  autoMatched: boolean("auto_matched").default(false),
  matchConfidence: text("match_confidence"), // exact, fuzzy, manual
  status: text("status").notNull().default("pending"), // pending, assigned, completed, cancelled
  notes: text("notes"),
  notesInternal: text("notes_internal"),

  // Cleaning rate snapshot - captures payment amount at assignment time
  cleaningRateId: varchar("cleaning_rate_id").references(() => cleaningRates.id, { onDelete: "set null" }),
  effectiveRateAmount: numeric("effective_rate_amount", { precision: 10, scale: 2 }), // Snapshot of payment amount
  effectiveCurrency: text("effective_currency").default("GBP"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cleaning assignments - the generated schedule
export const cleaningAssignments = pgTable("cleaning_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cleaningJobId: varchar("cleaning_job_id").notNull().references(() => cleaningJobs.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  assignedDate: date("assigned_date").notNull(), // Format: YYYY-MM-DD
  status: text("status", { enum: ["assigned", "completed", "cancelled", "in_progress"] }).notNull().default("assigned"),
  notes: text("notes"),
  // Calendar metadata for individual staff calendar views
  calendarEntry: jsonb("calendar_entry").$type<{
    displayTitle?: string;
    propertyName?: string;
    locationGroup?: string;
    estimatedDuration?: number;
    color?: string;
  }>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Assignment notifications - tracks sending schedules to staff
export const assignmentNotifications = pgTable("assignment_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => cleaningAssignments.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // email, sms, both
  status: text("status").notNull().default("pending"), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Matching issues - tracks ambiguous CSV rows needing review
export const matchingIssues = pgTable("matching_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importBatchId: varchar("import_batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  csvPropertyName: text("csv_property_name").notNull(),
  csvAddress: text("csv_address"),
  possibleMatches: jsonb("possible_matches").$type<Array<{propertyId: string, name: string, confidence: string}>>().default([]),
  resolved: boolean("resolved").notNull().default(false),
  resolvedPropertyId: varchar("resolved_property_id").references(() => properties.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schedule conversations - AI chatbot conversation history for schedule collaboration
export const scheduleConversations = pgTable("schedule_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(), // Which week this conversation is about
  messages: jsonb("messages").$type<Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>>().notNull().default([]),
  status: text("status").notNull().default("active"), // active, archived, finalized
  currentDraftId: varchar("current_draft_id"), // Reference to latest draft
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schedule drafts - versions/iterations of schedules before finalization
export const scheduleDrafts = pgTable("schedule_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => scheduleConversations.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(),
  draftNumber: integer("draft_number").notNull().default(1), // v1, v2, v3...
  summary: text("summary"), // AI-generated summary of changes
  assignments: jsonb("assignments").$type<Array<{
    staffId: string;
    propertyId: string;
    date: string;
    slotStart: string;
    slotEnd: string;
    source: "ai" | "manual";
  }>>().notNull().default([]),
  status: text("status").notNull().default("draft"), // draft, reviewed, finalized, rejected
  finalizedAt: timestamp("finalized_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schedule timetables - generated output timetables after finalizing drafts
export const scheduleTimetables = pgTable("schedule_timetables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  assignmentIds: text("assignment_ids").array().notNull().default(sql`ARRAY[]::text[]`), // Links to cleaning_assignments
  generatedBy: varchar("generated_by").notNull().references(() => users.id, { onDelete: "set null" }),
  timetableData: jsonb("timetable_data").$type<{
    cleaners: Array<{
      cleanerId: string;
      cleanerName: string;
      scheduleToken: string; // Unique token for cleaner's public schedule page
      days: Array<{
        date: string;
        dayName: string;
        assignments: Array<{
          assignmentId: string;
          propertyName: string;
          propertyAddress: string;
          startTime: string;
          endTime: string;
          duration: number; // minutes
          isAvailable: boolean; // Cross-referenced with cleaner availability
        }>;
      }>;
    }>;
  }>().notNull(),
  whatsappCopy: text("whatsapp_copy"), // Pre-formatted WhatsApp message (weekly format)
  pdfUrl: text("pdf_url"), // GCS URL for PDF (all cleaners timetable)
  availabilityConflicts: jsonb("availability_conflicts").$type<Array<{
    cleanerId: string;
    cleanerName: string;
    date: string;
    assignmentId: string;
    propertyAddress: string;
  }>>().default([]),
  status: text("status").notNull().default("active"), // active, superseded
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cleaner schedule acceptances - tracks when cleaners accept their weekly schedules
export const cleanerScheduleAcceptances = pgTable("cleaner_schedule_acceptances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timetableId: varchar("timetable_id").notNull().references(() => scheduleTimetables.id, { onDelete: "cascade" }),
  cleanerId: varchar("cleaner_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  scheduleToken: text("schedule_token").notNull(), // Token used to access schedule
  acceptedAt: timestamp("accepted_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"), // Optional notes from cleaner
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Staff schedule tokens - for individual calendar access via unique links
export const staffScheduleTokens = pgTable("staff_schedule_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash").notNull().unique(), // SHA-256 hash of actual token
  expiresAt: timestamp("expires_at"), // null = never expires
  lastAccessedAt: timestamp("last_accessed_at"),
  accessCount: integer("access_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Manual onboarding requests - for manually adding candidates with SMS data collection
export const manualOnboardingRequests = pgTable("manual_onboarding_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  requestReason: text("request_reason"), // Why manual entry needed
  missingFields: text("missing_fields").array().default(sql`ARRAY[]::text[]`), // e.g., ["niNumber", "address", "emergencyContact"]
  status: text("status").notNull().default("pending"), // pending, sms_sent, completed, cancelled
  tokenHash: varchar("token_hash").notNull().unique(), // SHA-256 hash for SMS form link security
  smsLog: jsonb("sms_log").$type<Array<{
    sentAt: string;
    recipient: string;
    status: "sent" | "failed";
    error?: string;
  }>>().default([]),
  completedData: jsonb("completed_data").$type<Record<string, any>>().default({}), // Data submitted via SMS form
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Complaint Submission Tokens - secure tokens for guest complaint submission
export const complaintSubmissionTokens = pgTable("complaint_submission_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hashedToken: varchar("hashed_token").notNull().unique(), // SHA-256 hash for security
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestName: text("guest_name"),
  guestContact: text("guest_contact"), // phone or email
  expiresAt: timestamp("expires_at").notNull(), // default 7 days from creation
  maxUses: integer("max_uses").notNull().default(1), // Usually 1 for single use
  remainingUses: integer("remaining_uses").notNull().default(1),
  status: varchar("status").notNull().default("active"), // active, expired, revoked
  submissionMethod: varchar("submission_method"), // "sms", "link_copy", "qr_code"
  metadata: jsonb("metadata").$type<{
    origin?: string;
    notes?: string;
    sentVia?: "sms" | "email" | "manual";
    smsLog?: Array<{
      sentAt: string;
      status: "sent" | "failed";
      sid?: string;
      error?: string;
    }>;
  }>().default({}),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
});

// Reviews and Complaints table - main table for all feedback
export const reviewsComplaints = pgTable("reviews_complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email"),
  source: varchar("source").notNull().default("direct"), // airbnb, booking_com, direct
  type: varchar("type").notNull().default("review"), // review, complaint
  rating: integer("rating"), // 1-5, can be null for complaints
  title: text("title"), // Can be null for complaints (they use content field instead)
  content: text("content").notNull(),
  sentiment: varchar("sentiment").notNull().default("neutral"), // positive, neutral, negative
  sentimentScore: real("sentiment_score").notNull().default(0), // -1 to 1
  status: varchar("status").notNull().default("new"), // new, acknowledged, resolved
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, critical
  responseText: text("response_text"),
  respondedAt: timestamp("responded_at"),
  respondedBy: varchar("responded_by").references(() => staff.id, { onDelete: "set null" }),

  // AI-generated response fields
  responseDraftSubject: text("response_draft_subject"),
  responseDraftBody: text("response_draft_body"),
  compensationAdvice: jsonb("compensation_advice").$type<{
    recommended?: string;
    reason?: string;
    amount?: number;
  }>(),

  // Public form submission tracking
  submissionMethod: varchar("submission_method").default("manual"), // "manual", "public_form"
  submissionTokenId: varchar("submission_token_id").references(() => complaintSubmissionTokens.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Review Categories table - categorized feedback topics
export const reviewCategories = pgTable("review_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => reviewsComplaints.id, { onDelete: "cascade" }),
  category: varchar("category").notNull(), // cleanliness, location, value, communication, amenities
  sentiment: varchar("sentiment").notNull().default("neutral"), // positive, neutral, negative
  mentioned: boolean("mentioned").notNull().default(true),
});

// Action Items table - follow-up actions from complaints
export const actionItems = pgTable("action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => reviewsComplaints.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  assignedTo: varchar("assigned_to").references(() => staff.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, in_progress, completed
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Review Themes table - AI-detected thematic clusters
export const reviewThemes = pgTable("review_themes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => reviewsComplaints.id, { onDelete: "cascade" }),
  theme: varchar("theme").notNull(), // cleanliness, location, value_for_money, communication, amenities, noise, check_in_out, maintenance
  confidence: real("confidence").notNull().default(0), // 0-1 confidence score from AI
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ======== ORDERING SYSTEM TABLES ========
// Ordering suppliers table
export const orderingSuppliers = pgTable("ordering_suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // cleaning, linen, wholesale, amazon, other
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  accountNumber: text("account_number"),
  deliveryDays: text("delivery_days"), // e.g., "Mon, Wed, Fri"
  minimumOrder: real("minimum_order"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Master product catalog table
export const orderingProducts = pgTable("ordering_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // cleaning, linen, wholesale, general
  sku: text("sku"),
  supplier: text("supplier"), // Cleaning/Linen/Hoopers/Amazon/Other
  supplierId: varchar("supplier_id").references(() => orderingSuppliers.id, { onDelete: "set null" }),
  supplierProductId: text("supplier_product_id"),
  unit: text("unit").notNull(), // each, box, case, pack
  packSize: integer("pack_size"),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock"),
  maxStock: integer("max_stock"),
  targetQuantity: integer("target_quantity"), // Preferred quantity to maintain at Head Office
  orderingStrategy: text("ordering_strategy"), // auto_email (Imperial/Hoopers), manual_sms (Amazon)
  lastPrice: real("last_price"),
  averagePrice: real("average_price"),
  preferredSupplier: text("preferred_supplier"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Purchase orders table
export const orderingOrders = pgTable("ordering_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  supplier: text("supplier").notNull(),
  supplierId: varchar("supplier_id").references(() => orderingSuppliers.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"), // draft, pending, ordered, shipped, received, cancelled
  orderDate: timestamp("order_date").notNull().defaultNow(),
  expectedDelivery: timestamp("expected_delivery"),
  receivedDate: timestamp("received_date"),
  totalAmount: real("total_amount"),
  notes: text("notes"),
  orderedBy: varchar("ordered_by").references(() => staff.id, { onDelete: "set null" }),
  trackingNumber: text("tracking_number"),
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Order line items table
export const orderingOrderItems = pgTable("ordering_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orderingOrders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => orderingProducts.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  received: boolean("received").notNull().default(false),
  receivedQuantity: integer("received_quantity"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Stock movements tracking table
export const orderingStockMovements = pgTable("ordering_stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => orderingProducts.id, { onDelete: "restrict" }),
  movementType: text("movement_type").notNull(), // in, out, adjustment
  quantity: integer("quantity").notNull(),
  orderId: varchar("order_id").references(() => orderingOrders.id, { onDelete: "set null" }),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "set null" }),
  reason: text("reason"),
  movedBy: varchar("moved_by").references(() => staff.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Stock counts table - tracks inventory counts at different locations
export const stockCounts = pgTable("stock_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => orderingProducts.id, { onDelete: "cascade" }),
  locationCode: text("location_code").notNull(), // HEAD_OFFICE, HERITAGE, DWELL, STMARYS
  countedQuantity: integer("counted_quantity").notNull(),
  countDate: timestamp("count_date").notNull().defaultNow(),
  countedBy: varchar("counted_by").references(() => staff.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Supplier Invoices - Track uploaded invoices for AI extraction
export const supplierInvoices = pgTable("supplier_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull(),
  supplier: text("supplier").notNull(), // "Hoopers", "Amazon", etc.
  supplierId: varchar("supplier_id").references(() => orderingSuppliers.id, { onDelete: "set null" }),
  invoiceDate: date("invoice_date").notNull(),
  totalAmount: real("total_amount").notNull(),
  taxAmount: real("tax_amount"),
  fileUrl: text("file_url").notNull(), // Google Cloud Storage URL
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // "pdf", "image/png", etc.

  // AI Extraction Data
  extractedData: jsonb("extracted_data").$type<{
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      productCode?: string;
    }>;
    subtotal?: number;
    tax?: number;
    total?: number;
    rawText?: string;
  }>(),
  aiProcessed: boolean("ai_processed").notNull().default(false),
  aiProcessedAt: timestamp("ai_processed_at"),
  aiErrors: text("ai_errors"),

  // Linkage to Orders
  orderId: varchar("order_id").references(() => orderingOrders.id, { onDelete: "set null" }),
  autoCreatedOrder: boolean("auto_created_order").default(false),

  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Product Price History - Track price changes over time
export const productPriceHistory = pgTable("product_price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => orderingProducts.id, { onDelete: "cascade" }),
  supplier: text("supplier").notNull(),
  supplierId: varchar("supplier_id").references(() => orderingSuppliers.id, { onDelete: "set null" }),
  price: real("price").notNull(),
  priceDate: date("price_date").notNull(),
  invoiceId: varchar("invoice_id").references(() => supplierInvoices.id, { onDelete: "set null" }),
  orderId: varchar("order_id").references(() => orderingOrders.id, { onDelete: "set null" }),
  priceChangePercent: real("price_change_percent"), // % change from previous price
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ======== WAGE REPORTING SYSTEM TABLES ========
// Monthly wage reports table - stores calculated monthly wages for each staff
export const wageReports = pgTable("wage_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),

  // Hours worked
  hoursWorked: real("hours_worked").notNull().default(0),
  regularHours: real("regular_hours").notNull().default(0),
  overtimeHours: real("overtime_hours").notNull().default(0),

  // Rates and calculations
  hourlyRate: real("hourly_rate").notNull(),
  overtimeRate: real("overtime_rate").notNull(),
  totalWages: real("total_wages").notNull().default(0),

  // Additional payments and deductions
  bonuses: real("bonuses").default(0),
  deductions: real("deductions").default(0),
  taxDeducted: real("tax_deducted").default(0),
  niDeducted: real("ni_deducted").default(0),
  pensionDeducted: real("pension_deducted").default(0),
  netPay: real("net_pay").notNull().default(0),

  // Status and approval
  status: text("status").notNull().default("draft"), // draft, approved, paid
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  paidDate: date("paid_date"),
  paymentMethod: text("payment_method"), // bank_transfer, cash, cheque
  notes: text("notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Wage settings table - stores staff wage configuration
export const wageSettings = pgTable("wage_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),

  // Employment details
  employmentType: text("employment_type").notNull().default("part-time"), // full-time, part-time, contractor

  // Rate configuration
  hourlyRate: real("hourly_rate").notNull(),
  overtimeRate: real("overtime_rate").notNull().default(1.5), // Multiplier, e.g., 1.5x
  standardHoursPerWeek: real("standard_hours_per_week").default(40),

  // Tax and deductions
  taxRate: real("tax_rate").default(0.20), // e.g., 0.20 for 20%
  niRate: real("ni_rate").default(0.12), // e.g., 0.12 for 12%
  pensionContribution: real("pension_contribution").default(0.05), // e.g., 0.05 for 5%

  // Bank details (encrypted in production)
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankSortCode: text("bank_sort_code"),

  // Validity period
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Timesheets table - tracks daily time entries
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  date: date("date").notNull(),

  // Time tracking
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  breakMinutes: integer("break_minutes").default(0),

  // Calculated hours
  hoursWorked: real("hours_worked").default(0),
  regularHours: real("regular_hours").default(0),
  overtimeHours: real("overtime_hours").default(0),

  // Job details (optional, links to properties)
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "set null" }),
  jobType: text("job_type"), // cleaning, maintenance, inspection, other

  // Approval
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Landlords table - stores landlord information for AST lettings
// LANDLORD MANAGEMENT: Store landlord information for AST properties
// SECURITY NOTE: Bank details are sensitive financial data
export const landlords = pgTable("landlords", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),

  // Authentication fields for client portal
  password: text("password"), // bcrypt hashed password for client portal access
  resetToken: text("reset_token"), // For password reset functionality
  resetTokenExpiry: timestamp("reset_token_expiry"), // When reset token expires
  lastLogin: timestamp("last_login"), // Track last login timestamp

  // SECURITY: Sensitive financial data - always masked in API responses
  // Only accessible via /api/landlords/:id/bank-details endpoint (admin-only, audit-logged)
  bankAccountName: text("bank_account_name"), // Account holder name
  bankAccountNumber: text("bank_account_number"), // Masked as ****XXXX in API responses
  bankSortCode: text("bank_sort_code"), // Masked as **-**-XX in API responses

  address: text("address"),
  notes: text("notes"),
  statementDay: integer("statement_day").default(7), // Day of month to send statements
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly Statements table - AI-powered landlord statement management
export const monthlyStatements = pgTable("monthly_statements", {
  id: serial("id").primaryKey(),
  landlordId: integer("landlord_id").references(() => landlords.id).notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(), // Store in attached_assets/statements/

  // AI-extracted data from PDF
  extractedData: jsonb("extracted_data").$type<{
    statementNumber?: string;
    statementDate?: string;
    statementPeriod?: { start: string; end: string };
    propertyAddress?: string;
    propertyName?: string;
    totalNights?: number;
    totalRevenue?: number;
    managementFees?: number;
    channelCommission?: number;
    ownerPayout?: number;
    bookings?: Array<{
      guestName: string;
      channel: string;
      checkIn: string;
      checkOut: string;
      nights: number;
      accommodation: number;
      cleaningFee: number;
      extraCharges: number;
      total: number;
    }>;
    expenses?: Array<{
      description: string;
      amount: number;
    }>;
  }>(),

  // Legacy manual fields (kept for backward compatibility)
  totalIncome: numeric("total_income", { precision: 10, scale: 2 }),
  totalExpenses: numeric("total_expenses", { precision: 10, scale: 2 }),
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }),

  // AI-generated comprehensive email
  generatedEmail: text("generated_email"),
  emailSubject: text("email_subject"),

  // Approval workflow
  emailApproved: boolean("email_approved").default(false),
  emailApprovedAt: timestamp("email_approved_at"),
  emailApprovedBy: varchar("email_approved_by"),

  // Scheduling
  scheduledSendDate: date("scheduled_send_date"),

  // Status tracking
  status: text("status").default("pending"), // pending, approved, sent, failed
  sentDate: timestamp("sent_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Landlord Invoices - Store uploaded invoices/bills for landlord portal
export const landlordInvoices = pgTable("landlord_invoices", {
  id: serial("id").primaryKey(),
  landlordId: integer("landlord_id").notNull().references(() => landlords.id, { onDelete: "cascade" }),
  astPropertyId: varchar("ast_property_id").references(() => astProperties.id, { onDelete: "set null" }), // Optional property link
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // URL to uploaded CSV file
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  invoiceDate: date("invoice_date"), // Date from CSV
  amount: numeric("amount", { precision: 10, scale: 2 }), // Amount from CSV
  category: text("category"), // e.g., "Utilities", "Maintenance", "Insurance"
  description: text("description"),
  csvData: jsonb("csv_data"), // Store full CSV row data as JSON
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AST Lettings - Buildings (for cluster properties like Albion Street)
export const astBuildings = pgTable("ast_buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landlordId: integer("landlord_id").references(() => landlords.id), // Link to landlord
  name: text("name").notNull(), // e.g., "Albion Street"
  address: text("address").notNull(),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AST Lettings - Apartments within buildings (for cluster properties)
export const astApartments = pgTable("ast_apartments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull().references(() => astBuildings.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Apartment 1", "Flat A"
  bedrooms: integer("bedrooms").notNull(), // Number of individual rooms with AST agreements
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AST Lettings - Long-term rental properties (separate from short-stay)
// For standalone properties (not part of a cluster building)
export const astProperties = pgTable("ast_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landlordId: integer("landlord_id").references(() => landlords.id), // Link to landlord
  name: text("name").notNull(),
  address: text("address").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  propertyType: text("property_type"), // "Flat", "House", "Studio"
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AST Tenancies - Tenancy agreements for AST properties OR apartments
// Can link to EITHER astPropertyId (standalone) OR astApartmentId (cluster)
export const astTenancies = pgTable("ast_tenancies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // For standalone properties - use this
  astPropertyId: varchar("ast_property_id").references(() => astProperties.id, { onDelete: "cascade" }),
  // For cluster apartments - use this + roomNumber
  astApartmentId: varchar("ast_apartment_id").references(() => astApartments.id, { onDelete: "cascade" }),
  roomNumber: text("room_number"), // Optional for HMO properties, REQUIRED for cluster apartments (e.g., "Room 1", "Room A", "Bedroom 1")
  tenantName: text("tenant_name").notNull(),
  tenantEmail: text("tenant_email"),
  tenantPhone: text("tenant_phone"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  rentAmount: real("rent_amount").notNull(),
  rentFrequency: text("rent_frequency").notNull().default("monthly"), // weekly, monthly, quarterly
  depositAmount: real("deposit_amount"),
  status: text("status").notNull().default("active"), // active, expired, terminated
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AST Contracts - PDF contract documents for tenancies
export const astContracts = pgTable("ast_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenancyId: varchar("tenancy_id").notNull().references(() => astTenancies.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // URL to the uploaded PDF
  fileSize: integer("file_size"), // bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  documentType: text("document_type").notNull().default("tenancy_agreement"), // tenancy_agreement, addendum, inventory
  extractedData: jsonb("extracted_data").$type<{
    tenantName?: string;
    propertyAddress?: string;
    rentAmount?: number;
    rentFrequency?: string;
    depositAmount?: number;
    startDate?: string;
    endDate?: string;
    tenantEmail?: string;
    tenantPhone?: string;
  }>(),
  extractionStatus: text("extraction_status").default("pending"), // pending, extracted, failed, manual
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// AST Rent Payments - Track rent payment schedule and history
export const astRentPayments = pgTable("ast_rent_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenancyId: varchar("tenancy_id").notNull().references(() => astTenancies.id, { onDelete: "cascade" }),
  dueDate: date("due_date").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, overdue, waived
  paidDate: date("paid_date"),
  paymentMethod: text("payment_method"), // bank_transfer, cash, cheque
  reference: text("reference"), // Payment reference number
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AST Inventory Reports - PDF uploads for property condition reports
export const astInventoryReports = pgTable("ast_inventory_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  astPropertyId: varchar("ast_property_id").notNull().references(() => astProperties.id, { onDelete: "cascade" }),
  tenancyId: varchar("tenancy_id").references(() => astTenancies.id, { onDelete: "set null" }),
  reportType: text("report_type").notNull(), // "check-in", "check-out", "mid-tenancy"
  reportDate: date("report_date").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // URL to the uploaded PDF
  fileSize: integer("file_size"), // bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  // Link to related documents
  linkedContractId: varchar("linked_contract_id").references(() => astContracts.id, { onDelete: "set null" }),
  linkedDepositId: varchar("linked_deposit_id").references(() => astDeposits.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AST Deposits - PDF uploads for deposit protection scheme documents
export const astDeposits = pgTable("ast_deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenancyId: varchar("tenancy_id").notNull().references(() => astTenancies.id, { onDelete: "cascade" }),
  depositAmount: real("deposit_amount"),
  protectionScheme: text("protection_scheme"), // "DPS", "MyDeposits", "TDS"
  protectionSchemeReference: text("protection_scheme_reference"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // URL to the uploaded DPS PDF
  fileSize: integer("file_size"), // bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  // Link to related documents
  linkedContractId: varchar("linked_contract_id").references(() => astContracts.id, { onDelete: "set null" }),
  linkedCheckInReportId: varchar("linked_check_in_report_id").references(() => astInventoryReports.id, { onDelete: "set null" }),
  linkedCheckOutReportId: varchar("linked_check_out_report_id").references(() => astInventoryReports.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas for Ordering System
export const insertOrderingSupplierSchema = createInsertSchema(orderingSuppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderingProductSchema = createInsertSchema(orderingProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderingOrderSchema = createInsertSchema(orderingOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderingOrderItemSchema = createInsertSchema(orderingOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertOrderingStockMovementSchema = createInsertSchema(orderingStockMovements).omit({
  id: true,
  createdAt: true,
});

export const insertStockCountSchema = createInsertSchema(stockCounts).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierInvoiceSchema = createInsertSchema(supplierInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductPriceHistorySchema = createInsertSchema(productPriceHistory).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for Wage Reporting
export const insertWageReportSchema = createInsertSchema(wageReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWageSettingsSchema = createInsertSchema(wageSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Landlord and Statements insert schemas
export const insertLandlordSchema = createInsertSchema(landlords).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional().refine((val) => !val || /^\+?\d[\d\s\-().]{6,}$/.test(val), {
    message: "Please enter a valid phone number (e.g., +44 7XXX XXXXXX)",
  }),
});

export const insertMonthlyStatementSchema = createInsertSchema(monthlyStatements).omit({
  id: true,
  createdAt: true,
});

export const insertLandlordInvoiceSchema = createInsertSchema(landlordInvoices).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
});

// AST Lettings insert schemas
export const insertAstBuildingSchema = createInsertSchema(astBuildings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAstApartmentSchema = createInsertSchema(astApartments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAstPropertySchema = createInsertSchema(astProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAstTenancySchema = createInsertSchema(astTenancies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  tenantPhone: z.string().optional().refine((val) => !val || /^\+?\d[\d\s\-().]{6,}$/.test(val), {
    message: "Please enter a valid phone number (e.g., +44 7XXX XXXXXX)",
  }),
  tenantEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  rentAmount: z.coerce.number().min(100, "Rent must be at least £100").max(50000, "Rent cannot exceed £50,000 per month"),
  depositAmount: z.coerce.number().min(0, "Deposit cannot be negative").optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
}).refine(
  (data) => {
    // Validate date range if end date is provided
    if (data.endDate && data.startDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end > start;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export const insertAstContractSchema = createInsertSchema(astContracts).omit({
  id: true,
});

export const insertAstRentPaymentSchema = createInsertSchema(astRentPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAstInventoryReportSchema = createInsertSchema(astInventoryReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAstDepositSchema = createInsertSchema(astDeposits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// AST Inventory Reports types
export type AstInventoryReport = typeof astInventoryReports.$inferSelect;
export type InsertAstInventoryReport = z.infer<typeof insertAstInventoryReportSchema>;

// AST Deposits types
export type AstDeposit = typeof astDeposits.$inferSelect;
export type InsertAstDeposit = z.infer<typeof insertAstDepositSchema>;

// Insert schemas for Reviews & Complaints
export const insertReviewsComplaintsSchema = createInsertSchema(reviewsComplaints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewCategoriesSchema = createInsertSchema(reviewCategories).omit({
  id: true,
});

export const insertActionItemsSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewThemesSchema = createInsertSchema(reviewThemes).omit({
  id: true,
  createdAt: true,
});

export const insertComplaintSubmissionTokenSchema = createInsertSchema(complaintSubmissionTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type ComplaintSubmissionToken = typeof complaintSubmissionTokens.$inferSelect;
export type InsertComplaintSubmissionToken = z.infer<typeof insertComplaintSubmissionTokenSchema>;

// Insert schemas for Maintenance
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  priority: z.number().int().min(1).max(10).default(5).optional(),
});

export const insertMaintenanceAssignmentSchema = createInsertSchema(maintenanceAssignments).omit({
  id: true,
  createdAt: true,
});

// Inspection insert schemas
export const insertInspectionTemplateSchema = createInsertSchema(inspectionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInspectionReportSchema = createInsertSchema(inspectionReports).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionItemSchema = createInsertSchema(inspectionItems).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionIssueSchema = createInsertSchema(inspectionIssues).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionNotificationSettingsSchema = createInsertSchema(inspectionNotificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// QuickBooks insert schemas
export const insertQuickBooksSettingsSchema = createInsertSchema(quickbooksSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickBooksCustomerSchema = createInsertSchema(quickbooksCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickBooksInvoiceSchema = createInsertSchema(quickbooksInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Hiring Analytics types
export interface HiringPipelineMetrics {
  totalCandidates: number;
  byStage: Record<string, number>;
  conversionRates: {
    uploadedToScreened: number;
    screenedToScheduled: number;
    scheduledToAttended: number;
    attendedToHired: number;
    overallConversion: number;
  };
}

// Source Performance Response Type
export interface SourcePerformance {
  bySource: Record<string, {
    totalCandidates: number;
    screenedCount: number;
    hiredCount: number;
    screeningRate: number;
    hireRate: number;
  }>;
  topSource: string | null;
  topSourceHireRate: number;
}

// Time to Hire Metrics Response Type
export interface TimeToHireMetrics {
  averageDaysToHire: number;
  byStage: {
    uploadedToScreened: number;
    screenedToScheduled: number;
    scheduledToAttended: number;
    attendedToHired: number;
  };
  fastest: number;
  slowest: number;
  medianDaysToHire: number;
}

// Master Analytics Dashboard Response Type
export interface MasterAnalytics {
  hero: {
    totalCandidates: number;
    complianceScore: number;
    openMaintenance: number;
    revenue: number;
    activeStaff: number;
    occupancyRate: number;
    taskCompletionRate: number;
    lowStockAlerts: number;
  };
  hiring: {
    totalCandidates: number;
    byStage: Record<string, number>;
    bySource: Record<string, number>;
    conversionRate: number;
    avgTimeToHire: number;
  };
  staff: {
    total: number;
    active: number;
    complianceScore: number;
    complianceRate: number;
    totalComplianceEvents: number;
  };
  maintenance: {
    total: number;
    open: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  properties: {
    total: number;
    active: number;
    occupancyRate: number;
  };
  financial: {
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  };
  ordering: {
    totalSpent: number;
    totalOrders: number;
    lowStockCount: number;
    lowStockProducts: any[];
  };
  tasks: {
    todayTotal: number;
    todayCompleted: number;
    todayCompletionRate: number;
    overdue: number;
  };
  ast: {
    totalProperties: number;
    activeTenancies: number;
    totalTenancies: number;
    occupancyRate: number;
    rentCollectionRate: number;
  };
  training: {
    totalVideos: number;
    totalCompletions: number;
    completionRate: number;
  };
}

// ======== POTENTIAL CLIENTS PIPELINE ========

// Potential Clients - Main client/organization record for client acquisition pipeline
export const potentialClients = pgTable("potential_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationName: text("organization_name").notNull(),
  primaryContactName: text("primary_contact_name").notNull(),
  primaryContactEmail: text("primary_contact_email").notNull(),
  primaryContactPhone: text("primary_contact_phone"),
  source: text("source"), // "referral", "website", "cold-outreach", "networking"
  priority: text("priority"), // "hot", "warm", "cold"
  estimatedValue: real("estimated_value"), // Potential revenue
  confidenceLevel: integer("confidence_level"), // 0-100
  notes: text("notes"),
  createdBy: varchar("created_by"), // User ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Client Contacts - Multiple stakeholders per client
export const clientContacts = pgTable("client_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  potentialClientId: varchar("potential_client_id").notNull().references(() => potentialClients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"), // "owner", "manager", "decision-maker"
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Client Properties - Properties the client wants to list
export const clientProperties = pgTable("client_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  potentialClientId: varchar("potential_client_id").notNull().references(() => potentialClients.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  propertyType: text("property_type"), // "flat", "house", "hmo"
  bedrooms: integer("bedrooms"),
  furnished: boolean("furnished"),
  estimatedMonthlyRent: real("estimated_monthly_rent"),
  acquisitionTimeline: text("acquisition_timeline"), // "immediate", "1-3-months", "3-6-months"
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Client Pipeline Stages - Current pipeline status
export const clientPipelineStages = pgTable("client_pipeline_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  potentialClientId: varchar("potential_client_id").notNull().unique().references(() => potentialClients.id, { onDelete: "cascade" }),
  currentStage: text("current_stage").notNull(), // "lead", "initial-contact", "meeting-scheduled", "meeting-held", "proposal-sent", "negotiating", "won", "lost"
  expectedCloseDate: date("expected_close_date"),
  lostReason: text("lost_reason"),
  wonAt: timestamp("won_at"),
  lostAt: timestamp("lost_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Client Stage History - Audit trail
export const clientStageHistory = pgTable("client_stage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  potentialClientId: varchar("potential_client_id").notNull().references(() => potentialClients.id, { onDelete: "cascade" }),
  fromStage: text("from_stage"), // null for first entry
  toStage: text("to_stage").notNull(),
  changedBy: varchar("changed_by"), // user ID or "system"
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  note: text("note"),
});

// Client Meetings - Meeting records
export const clientMeetings = pgTable("client_meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  potentialClientId: varchar("potential_client_id").notNull().references(() => potentialClients.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60), // Duration in minutes
  meetingType: text("meeting_type"), // "initial", "property-viewing", "contract-discussion"
  location: text("location"),
  attendees: text("attendees").array().notNull().default(sql`ARRAY[]::text[]`),
  googleCalendarEventId: text("google_calendar_event_id"), // Google Calendar integration
  googleCalendarMeetingLink: text("google_calendar_meeting_link"),
  otterTranscriptId: text("otter_transcript_id"),
  otterTranscriptUrl: text("otter_transcript_url"),
  outcome: text("outcome"),
  sentiment: text("sentiment"), // "positive", "neutral", "negative"
  nextSteps: text("next_steps"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Client Follow Ups - Tasks and reminders
export const clientFollowUps = pgTable("client_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  potentialClientId: varchar("potential_client_id").notNull().references(() => potentialClients.id, { onDelete: "cascade" }),
  relatedMeetingId: varchar("related_meeting_id").references(() => clientMeetings.id, { onDelete: "set null" }),
  dueAt: timestamp("due_at").notNull(),
  followUpType: text("follow_up_type"), // "call", "email", "sms", "meeting"
  description: text("description").notNull(),
  assignedTo: varchar("assigned_to"), // User ID
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  autoGenerated: boolean("auto_generated").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Client Communications - Full communication log
export const clientCommunications = pgTable("client_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  potentialClientId: varchar("potential_client_id").notNull().references(() => potentialClients.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // "sms", "email", "call", "meeting"
  direction: text("direction"), // "inbound", "outbound"
  twilioSid: text("twilio_sid"),
  justCallCallId: text("just_call_call_id"),
  subject: text("subject"),
  body: text("body"),
  metadata: jsonb("metadata").$type<Record<string, any>>(), // call duration, recording URL, etc.
  sentBy: varchar("sent_by"), // User ID
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// Insert schemas
export const insertPotentialClientSchema = createInsertSchema(potentialClients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
});

export const insertClientPropertySchema = createInsertSchema(clientProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientPipelineStageSchema = createInsertSchema(clientPipelineStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  wonAt: true,
  lostAt: true,
});

export const insertClientStageHistorySchema = createInsertSchema(clientStageHistory).omit({
  id: true,
  changedAt: true,
});

export const insertClientMeetingSchema = createInsertSchema(clientMeetings).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  googleCalendarEventId: true,
  googleCalendarMeetingLink: true,
}).extend({
  // Accept ISO string dates (already in UTC from client)
  // Client converts local timezone to UTC before sending
  scheduledAt: z.string().datetime().refine((dateStr) => {
    const date = new Date(dateStr);
    return date > new Date();
  }, {
    message: "Meeting must be scheduled in the future",
  }),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  attendees: z.array(z.string()).min(1, "At least one attendee is required"),
});

export const updateClientMeetingOutcomeSchema = z.object({
  outcome: z.string().min(1, "Outcome is required"),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  nextSteps: z.string().optional(),
  completedAt: z.coerce.date().optional(),
});

export const insertClientFollowUpSchema = createInsertSchema(clientFollowUps).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertClientCommunicationSchema = createInsertSchema(clientCommunications).omit({
  id: true,
  sentAt: true,
});

// Activity Logs table - tracks all user actions across the system for audit trail
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userEmail: varchar("user_email"),
  userName: varchar("user_name"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: varchar("resource_id"),
  resourceName: text("resource_name"),
  details: jsonb("details").$type<Record<string, any>>().default({}),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Insert schema for Activity Logs
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

// Activity Log types
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Manual cleaning adjustments
export const manualCleaningAdjustments = pgTable("manual_cleaning_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adjustmentDate: date("adjustment_date").notNull(),
  cleanerId: varchar("cleaner_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  building: text("building").notNull(),
  roomUnit: text("room_unit").notNull(),
  propertyName: text("property_name").notNull(),
  estimatedDuration: integer("estimated_duration").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertManualCleaningAdjustmentSchema = createInsertSchema(manualCleaningAdjustments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Allocation history - tracks historical allocation data for learning
export const allocationHistory = pgTable("allocation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cleanerId: varchar("cleaner_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  building: text("building").notNull(),
  cleaningDate: date("cleaning_date").notNull(),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  totalDuration: integer("total_duration").notNull().default(0),
  performanceScore: real("performance_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAllocationHistorySchema = createInsertSchema(allocationHistory).omit({
  id: true,
  createdAt: true,
});

export type AllocationHistory = typeof allocationHistory.$inferSelect;
export type InsertAllocationHistory = z.infer<typeof insertAllocationHistorySchema>;

// Properly-related tables for cleaning task allocation
export const properlyUploads = pgTable("properly_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  rowCount: integer("row_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const properlyCleaningTasks = pgTable("properly_cleaning_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  properlyId: text("properly_id").notNull().unique(),
  building: text("building").notNull(),
  cleaningDate: text("cleaning_date").notNull(),
  cleaningType: text("cleaning_type").notNull(),
  status: text("status").notNull().default("pending"),
  uploadId: varchar("upload_id").references(() => properlyUploads.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cleanerBuildingPreferences = pgTable("cleaner_building_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cleanerId: varchar("cleaner_id").notNull().references(() => staff.id),
  building: text("building").notNull(),
  preferenceLevel: integer("preference_level").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const properlyCleanerAllocations = pgTable("properly_cleaner_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => properlyCleaningTasks.id),
  cleanerId: varchar("cleaner_id").references(() => staff.id),
  allocationType: text("allocation_type").notNull().default("auto"),
  allocationScore: numeric("allocation_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Financial tables
export const bankStatements = pgTable("bank_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number"),
  statementDate: timestamp("statement_date").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  openingBalance: numeric("opening_balance", { precision: 10, scale: 2 }).notNull(),
  closingBalance: numeric("closing_balance", { precision: 10, scale: 2 }).notNull(),
  totalDeposits: numeric("total_deposits", { precision: 10, scale: 2 }).notNull().default("0"),
  totalWithdrawals: numeric("total_withdrawals", { precision: 10, scale: 2 }).notNull().default("0"),
  uploadedFilePath: text("uploaded_file_path"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const financialTransactions = pgTable("financial_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bankStatementId: varchar("bank_statement_id").references(() => bankStatements.id),
  transactionDate: timestamp("transaction_date").notNull(),
  description: text("description").notNull(),
  reference: text("reference"),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  balance: numeric("balance", { precision: 10, scale: 2 }),
  category: text("category"),
  subcategory: text("subcategory"),
  source: text("source"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  reconciled: boolean("reconciled").notNull().default(false),
  reconciledAt: timestamp("reconciled_at"),
  reconciledBy: varchar("reconciled_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Wage-related tables
export const wagePeriods = pgTable("wage_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("draft"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCleaners: integer("total_cleaners").notNull().default(0),
  notes: text("notes"),
  processedBy: varchar("processed_by"),
  processedAt: timestamp("processed_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wageDocumentUploads = pgTable("wage_document_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wagePeriodId: varchar("wage_period_id").notNull().references(() => wagePeriods.id),
  documentType: text("document_type").notNull(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  uploadedBy: varchar("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cleanerWages = pgTable("cleaner_wages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wagePeriodId: varchar("wage_period_id").notNull().references(() => wagePeriods.id),
  cleanerId: varchar("cleaner_id").notNull().references(() => staff.id),
  cleanerName: text("cleaner_name").notNull(),
  totalCleans: integer("total_cleans").notNull().default(0),
  totalHours: numeric("total_hours", { precision: 5, scale: 2 }).notNull().default("0"),
  hourlyRate: numeric("hourly_rate", { precision: 5, scale: 2 }).notNull(),
  baseAmount: numeric("base_amount", { precision: 10, scale: 2 }).notNull(),
  bonusAmount: numeric("bonus_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  deductions: numeric("deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  bankAccount: text("bank_account"),
  sortCode: text("sort_code"),
  notes: text("notes"),
  approved: boolean("approved").notNull().default(false),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wageTokens = pgTable("wage_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  cleanerId: varchar("cleaner_id").notNull().references(() => staff.id),
  wagePeriodId: varchar("wage_period_id").notNull().references(() => wagePeriods.id),
  cleanerWageId: varchar("cleaner_wage_id").references(() => cleanerWages.id),
  expiresAt: timestamp("expires_at").notNull(),
  viewedAt: timestamp("viewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Linen and special requests tables
export const linenPackingItems = pgTable("linen_packing_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyAddress: text("property_address").notNull(),
  itemType: text("item_type").notNull(),
  size: text("size"),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const specialRequests = pgTable("special_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id),
  propertyName: text("property_name").notNull(),
  requestType: text("request_type").notNull(),
  description: text("description").notNull(),
  itemRequested: text("item_requested"),
  quantity: integer("quantity").default(1),
  dateRequired: timestamp("date_required"),
  dateFinished: timestamp("date_finished"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("active"),
  requestedBy: varchar("requested_by"),
  assignedTo: varchar("assigned_to"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cleaningCosts = pgTable("cleaning_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyName: text("property_name").notNull().unique(),
  costPerClean: numeric("cost_per_clean", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GBP"),
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveTo: timestamp("effective_to"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const linenPackingSessions = pgTable("linen_packing_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionDate: timestamp("session_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  packedBy: varchar("packed_by"),
  packedByName: text("packed_by_name"),
  totalProperties: integer("total_properties").notNull().default(0),
  totalItems: integer("total_items").notNull().default(0),
  notes: text("notes"),
  status: text("status").notNull().default("in_progress"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Cleaning order tables
export const cleaningOrderSchedules = pgTable("cleaning_order_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyName: text("property_name").notNull(),
  scheduleDay: text("schedule_day").notNull(),
  scheduleTime: text("schedule_time").notNull(),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  deliveryDay: text("delivery_day"),
  lastSentDate: text("last_sent_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cleaningOrders = pgTable("cleaning_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  scheduleId: varchar("schedule_id").references(() => cleaningOrderSchedules.id),
  propertyName: text("property_name").notNull(),
  propertyAddress: text("property_address"),
  orderDate: timestamp("order_date").notNull(),
  cleaningDate: timestamp("cleaning_date").notNull(),
  cleaningType: text("cleaning_type").notNull(),
  specialInstructions: text("special_instructions"),
  status: text("status").notNull().default("pending"),
  cleanerId: varchar("cleaner_id").references(() => staff.id),
  cleanerName: text("cleaner_name"),
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cleaningOrderReminderLogs = pgTable("cleaning_order_reminder_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").references(() => cleaningOrderSchedules.id),
  orderId: varchar("order_id").references(() => cleaningOrders.id),
  reminderType: text("reminder_type").notNull(),
  sendMethod: text("send_method").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// Add all Insert schemas
export const insertProperlyUploadSchema = createInsertSchema(properlyUploads).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
});

export const insertProperlyCleaningTaskSchema = createInsertSchema(properlyCleaningTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleanerBuildingPreferenceSchema = createInsertSchema(cleanerBuildingPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProperlyCleanerAllocationSchema = createInsertSchema(properlyCleanerAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankStatementSchema = createInsertSchema(bankStatements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.coerce.number().min(0.01, "Amount must be at least £0.01").max(100000, "Amount cannot exceed £100,000"),
});

export const insertWagePeriodSchema = createInsertSchema(wagePeriods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWageDocumentUploadSchema = createInsertSchema(wageDocumentUploads).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
});

export const insertCleanerWageSchema = createInsertSchema(cleanerWages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  hourlyRate: z.coerce.number().min(10, "Hourly rate must be at least £10").max(50, "Hourly rate cannot exceed £50"),
});

export const insertWageTokenSchema = createInsertSchema(wageTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLinenPackingItemSchema = createInsertSchema(linenPackingItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpecialRequestSchema = createInsertSchema(specialRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningCostSchema = createInsertSchema(cleaningCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLinenPackingSessionSchema = createInsertSchema(linenPackingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningOrderScheduleSchema = createInsertSchema(cleaningOrderSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningOrderSchema = createInsertSchema(cleaningOrders).omit({
  id: true,
  token: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningOrderReminderLogSchema = createInsertSchema(cleaningOrderReminderLogs).omit({
  id: true,
  sentAt: true,
});

// Add all Type exports
export type ProperlyUpload = typeof properlyUploads.$inferSelect;
export type InsertProperlyUpload = z.infer<typeof insertProperlyUploadSchema>;
export type ProperlyCleaningTask = typeof properlyCleaningTasks.$inferSelect;
export type InsertProperlyCleaningTask = z.infer<typeof insertProperlyCleaningTaskSchema>;
export type CleanerBuildingPreference = typeof cleanerBuildingPreferences.$inferSelect;
export type InsertCleanerBuildingPreference = z.infer<typeof insertCleanerBuildingPreferenceSchema>;
export type ProperlyCleanerAllocation = typeof properlyCleanerAllocations.$inferSelect;
export type InsertProperlyCleanerAllocation = z.infer<typeof insertProperlyCleanerAllocationSchema>;
export type BankStatement = typeof bankStatements.$inferSelect;
export type InsertBankStatement = z.infer<typeof insertBankStatementSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type WagePeriod = typeof wagePeriods.$inferSelect;
export type InsertWagePeriod = z.infer<typeof insertWagePeriodSchema>;
export type WageDocumentUpload = typeof wageDocumentUploads.$inferSelect;
export type InsertWageDocumentUpload = z.infer<typeof insertWageDocumentUploadSchema>;
export type CleanerWage = typeof cleanerWages.$inferSelect;
export type InsertCleanerWage = z.infer<typeof insertCleanerWageSchema>;
export type WageToken = typeof wageTokens.$inferSelect;
export type InsertWageToken = z.infer<typeof insertWageTokenSchema>;
export type LinenPackingItem = typeof linenPackingItems.$inferSelect;
export type InsertLinenPackingItem = z.infer<typeof insertLinenPackingItemSchema>;
export type SpecialRequest = typeof specialRequests.$inferSelect;
export type InsertSpecialRequest = z.infer<typeof insertSpecialRequestSchema>;
export type CleaningCost = typeof cleaningCosts.$inferSelect;
export type InsertCleaningCost = z.infer<typeof insertCleaningCostSchema>;
export type LinenPackingSession = typeof linenPackingSessions.$inferSelect;
export type InsertLinenPackingSession = z.infer<typeof insertLinenPackingSessionSchema>;
export type CleaningOrderSchedule = typeof cleaningOrderSchedules.$inferSelect;
export type InsertCleaningOrderSchedule = z.infer<typeof insertCleaningOrderScheduleSchema>;
export type CleaningOrder = typeof cleaningOrders.$inferSelect;
export type InsertCleaningOrder = z.infer<typeof insertCleaningOrderSchema>;
export type CleaningOrderReminderLog = typeof cleaningOrderReminderLogs.$inferSelect;
export type InsertCleaningOrderReminderLog = z.infer<typeof insertCleaningOrderReminderLogSchema>;
// Additional missing tables

export const cleaningRates = pgTable("cleaning_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  propertyType: text("property_type"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GBP"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const criticalInfo = pgTable("critical_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const uplistingBookingUploads = pgTable("uplisting_booking_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  processedAt: timestamp("processed_at"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  rowCount: integer("row_count"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const uplistingCheckoutSchedule = pgTable("uplisting_checkout_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uploadId: varchar("upload_id").references(() => uplistingBookingUploads.id),
  propertyName: text("property_name").notNull(),
  checkoutDate: timestamp("checkout_date").notNull(),
  guestName: text("guest_name"),
  bookingReference: text("booking_reference"),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const weeklyRotaTasks = pgTable("weekly_rota_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStartDate: timestamp("week_start_date").notNull(),
  taskType: text("task_type").notNull(),
  taskName: text("task_name").notNull(),
  assignedTo: varchar("assigned_to").references(() => staff.id),
  assignedToName: text("assigned_to_name"),
  dayOfWeek: integer("day_of_week").notNull(),
  timeSlot: text("time_slot"),
  duration: integer("duration"),
  status: text("status").notNull().default("pending"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const weeklyRotaHistory = pgTable("weekly_rota_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStartDate: timestamp("week_start_date").notNull(),
  rotaData: jsonb("rota_data").$type<Record<string, any>>().notNull(),
  generatedBy: varchar("generated_by"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderMessageLogs = pgTable("order_message_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => cleaningOrders.id),
  messageType: text("message_type").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// Insert schemas for additional missing tables
export const insertCleaningRateSchema = createInsertSchema(cleaningRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCriticalInfoSchema = createInsertSchema(criticalInfo).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUplistingBookingUploadSchema = createInsertSchema(uplistingBookingUploads).omit({
  id: true,
  createdAt: true,
});

export const insertUplistingCheckoutScheduleSchema = createInsertSchema(uplistingCheckoutSchedule).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyRotaTaskSchema = createInsertSchema(weeklyRotaTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWeeklyRotaHistorySchema = createInsertSchema(weeklyRotaHistory).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
});

export const insertOrderMessageLogSchema = createInsertSchema(orderMessageLogs).omit({
  id: true,
  sentAt: true,
});

// Type exports for additional missing tables
export type CleaningRate = typeof cleaningRates.$inferSelect;
export type InsertCleaningRate = z.infer<typeof insertCleaningRateSchema>;
export type CriticalInfo = typeof criticalInfo.$inferSelect;
export type InsertCriticalInfo = z.infer<typeof insertCriticalInfoSchema>;
export type UplistingBookingUpload = typeof uplistingBookingUploads.$inferSelect;
export type InsertUplistingBookingUpload = z.infer<typeof insertUplistingBookingUploadSchema>;
export type UplistingCheckoutSchedule = typeof uplistingCheckoutSchedule.$inferSelect;
export type InsertUplistingCheckoutSchedule = z.infer<typeof insertUplistingCheckoutScheduleSchema>;
export type WeeklyRotaTask = typeof weeklyRotaTasks.$inferSelect;
export type InsertWeeklyRotaTask = z.infer<typeof insertWeeklyRotaTaskSchema>;
export type WeeklyRotaHistory = typeof weeklyRotaHistory.$inferSelect;
export type InsertWeeklyRotaHistory = z.infer<typeof insertWeeklyRotaHistorySchema>;
export type OrderMessageLog = typeof orderMessageLogs.$inferSelect;
export type InsertOrderMessageLog = z.infer<typeof insertOrderMessageLogSchema>;

// Task-related tables
export const taskTemplates = pgTable("task_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  recurrenceType: text("recurrence_type").notNull(),
  recurrenceInterval: integer("recurrence_interval"),
  assignedToRole: text("assigned_to_role"),
  estimatedMinutes: integer("estimated_minutes").notNull().default(30),
  priority: text("priority").notNull().default("normal"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dailyTaskInstances = pgTable("daily_task_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => taskTemplates.id),
  taskDate: date("task_date").notNull(),
  taskName: text("task_name").notNull(),
  category: text("category").notNull(),
  assignedTo: varchar("assigned_to").references(() => staff.id),
  assignedToName: text("assigned_to_name"),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const specializedServiceRequests = pgTable("specialized_service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  propertyAddress: text("property_address"),
  clientName: text("client_name"),
  clientContact: text("client_contact"),
  availabilityDate: timestamp("availability_date"),
  lockboxCode: text("lockbox_code"),
  photos: text("photos").array(),
  aiSummary: text("ai_summary"),
  status: text("status").notNull().default("pending"),
  contractorName: text("contractor_name"),
  contractorPhone: text("contractor_phone"),
  contractorEmail: text("contractor_email"),
  notificationLog: jsonb("notification_log").$type<Record<string, any>>(),
  serviceDescription: text("service_description"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const equipmentMovements = pgTable("equipment_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentType: text("equipment_type").notNull(),
  fromLocation: text("from_location").notNull(),
  toLocation: text("to_location").notNull(),
  quantity: integer("quantity").notNull().default(1),
  movedBy: varchar("moved_by").references(() => staff.id),
  movedByName: text("moved_by_name"),
  movementDate: timestamp("movement_date").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const linenOrderSchedules = pgTable("linen_order_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleDay: text("schedule_day").notNull(),
  scheduleTime: text("schedule_time").notNull(),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  lastSentDate: text("last_sent_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dwellLinenOrders = pgTable("dwell_linen_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  scheduleId: varchar("schedule_id").references(() => linenOrderSchedules.id),
  orderNumber: text("order_number").notNull().unique(),
  orderDate: timestamp("order_date").notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  status: text("status").notNull().default("pending"),
  totalItems: integer("total_items").notNull().default(0),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }),
  orderDetails: jsonb("order_details").$type<Record<string, any>>().notNull(),
  deliveryNotes: text("delivery_notes"),
  invoiceNumber: text("invoice_number"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  orderedBy: varchar("ordered_by"),
  receivedBy: varchar("received_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const linenDeliveryNotes = pgTable("linen_delivery_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => dwellLinenOrders.id),
  deliveryDate: timestamp("delivery_date").notNull(),
  driverName: text("driver_name"),
  itemsDelivered: jsonb("items_delivered").$type<Record<string, any>>().notNull(),
  itemsReturned: jsonb("items_returned").$type<Record<string, any>>(),
  discrepancies: text("discrepancies"),
  signedBy: text("signed_by"),
  signatureUrl: text("signature_url"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas for task-related tables
export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyTaskInstanceSchema = createInsertSchema(dailyTaskInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpecializedServiceRequestSchema = createInsertSchema(specializedServiceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEquipmentMovementSchema = createInsertSchema(equipmentMovements).omit({
  id: true,
  createdAt: true,
});

export const insertLinenOrderScheduleSchema = createInsertSchema(linenOrderSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDwellLinenOrderSchema = createInsertSchema(dwellLinenOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLinenDeliveryNoteSchema = createInsertSchema(linenDeliveryNotes).omit({
  id: true,
  createdAt: true,
});

// Type exports for task-related tables
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type DailyTaskInstance = typeof dailyTaskInstances.$inferSelect;
export type InsertDailyTaskInstance = z.infer<typeof insertDailyTaskInstanceSchema>;
export type SpecializedServiceRequest = typeof specializedServiceRequests.$inferSelect;
export type InsertSpecializedServiceRequest = z.infer<typeof insertSpecializedServiceRequestSchema>;
export type EquipmentMovement = typeof equipmentMovements.$inferSelect;
export type InsertEquipmentMovement = z.infer<typeof insertEquipmentMovementSchema>;
export type LinenOrderSchedule = typeof linenOrderSchedules.$inferSelect;
export type InsertLinenOrderSchedule = z.infer<typeof insertLinenOrderScheduleSchema>;
export type DwellLinenOrder = typeof dwellLinenOrders.$inferSelect;
export type InsertDwellLinenOrder = z.infer<typeof insertDwellLinenOrderSchema>;
export type LinenDeliveryNote = typeof linenDeliveryNotes.$inferSelect;
export type InsertLinenDeliveryNote = z.infer<typeof insertLinenDeliveryNoteSchema>;

// Chat and training-related tables
export const guestSupportChatSessions = pgTable("guest_support_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  propertyName: text("property_name"),
  bookingReference: text("booking_reference"),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  resolvedBy: varchar("resolved_by"),
  resolution: text("resolution"),
  rating: integer("rating"),
  feedback: text("feedback"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const guestSupportChatMessages = pgTable("guest_support_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSupportChatSessions.id),
  messageType: text("message_type").notNull(),
  senderType: text("sender_type").notNull(),
  senderId: varchar("sender_id"),
  senderName: text("sender_name"),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<any[]>().default([]),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const trainingVideos = pgTable("training_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  targetRoles: text("target_roles").array(),
  isRequired: boolean("is_required").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const trainingCompletions = pgTable("training_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  videoId: varchar("video_id").notNull().references(() => trainingVideos.id),
  watchedDuration: integer("watched_duration").notNull().default(0),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  attempts: integer("attempts").notNull().default(1),
  feedback: text("feedback"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastWatchedAt: timestamp("last_watched_at").notNull().defaultNow(),
});

export const helpdeskChatSessions = pgTable("helpdesk_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  staffName: text("staff_name").notNull(),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("open"),
  assignedTo: varchar("assigned_to"),
  assignedToName: text("assigned_to_name"),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  rating: integer("rating"),
  feedback: text("feedback"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const helpdeskChatMessages = pgTable("helpdesk_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => helpdeskChatSessions.id),
  messageType: text("message_type").notNull(),
  senderType: text("sender_type").notNull(),
  senderId: varchar("sender_id"),
  senderName: text("sender_name"),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<any[]>().default([]),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const tenantCommunicationChatSessions = pgTable("tenant_communication_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id),
  propertyName: text("property_name").notNull(),
  tenantName: text("tenant_name"),
  tenantEmail: text("tenant_email"),
  tenantPhone: text("tenant_phone"),
  communicationType: text("communication_type").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tenantCommunicationChatMessages = pgTable("tenant_communication_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => tenantCommunicationChatSessions.id),
  messageType: text("message_type").notNull(),
  senderType: text("sender_type").notNull(),
  senderId: varchar("sender_id"),
  senderName: text("sender_name"),
  content: text("content").notNull(),
  templateUsed: text("template_used"),
  attachments: jsonb("attachments").$type<any[]>().default([]),
  deliveryStatus: text("delivery_status"),
  deliveryMethod: text("delivery_method"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// Insert schemas for chat and training tables
export const insertGuestSupportChatSessionSchema = createInsertSchema(guestSupportChatSessions).omit({
  id: true,
  sessionToken: true,
  startedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGuestSupportChatMessageSchema = createInsertSchema(guestSupportChatMessages).omit({
  id: true,
  sentAt: true,
});

export const insertTrainingVideoSchema = createInsertSchema(trainingVideos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingCompletionSchema = createInsertSchema(trainingCompletions).omit({
  id: true,
  startedAt: true,
  lastWatchedAt: true,
});

export const insertHelpdeskChatSessionSchema = createInsertSchema(helpdeskChatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHelpdeskChatMessageSchema = createInsertSchema(helpdeskChatMessages).omit({
  id: true,
  sentAt: true,
});

export const insertTenantCommunicationChatSessionSchema = createInsertSchema(tenantCommunicationChatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantCommunicationChatMessageSchema = createInsertSchema(tenantCommunicationChatMessages).omit({
  id: true,
  sentAt: true,
});

// Type exports for chat and training tables
export type GuestSupportChatSession = typeof guestSupportChatSessions.$inferSelect;
export type InsertGuestSupportChatSession = z.infer<typeof insertGuestSupportChatSessionSchema>;
export type GuestSupportChatMessage = typeof guestSupportChatMessages.$inferSelect;
export type InsertGuestSupportChatMessage = z.infer<typeof insertGuestSupportChatMessageSchema>;
export type TrainingVideo = typeof trainingVideos.$inferSelect;
export type InsertTrainingVideo = z.infer<typeof insertTrainingVideoSchema>;
export type TrainingCompletion = typeof trainingCompletions.$inferSelect;
export type InsertTrainingCompletion = z.infer<typeof insertTrainingCompletionSchema>;
export type HelpdeskChatSession = typeof helpdeskChatSessions.$inferSelect;
export type InsertHelpdeskChatSession = z.infer<typeof insertHelpdeskChatSessionSchema>;
export type HelpdeskChatMessage = typeof helpdeskChatMessages.$inferSelect;
export type InsertHelpdeskChatMessage = z.infer<typeof insertHelpdeskChatMessageSchema>;
export type TenantCommunicationChatSession = typeof tenantCommunicationChatSessions.$inferSelect;
export type InsertTenantCommunicationChatSession = z.infer<typeof insertTenantCommunicationChatSessionSchema>;
export type TenantCommunicationChatMessage = typeof tenantCommunicationChatMessages.$inferSelect;
export type InsertTenantCommunicationChatMessage = z.infer<typeof insertTenantCommunicationChatMessageSchema>;

// Knowledge base and property management tables
export const knowledgeBaseEntries = pgTable("knowledge_base_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(),
  searchVector: text("search_vector"),
  viewCount: integer("view_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  notHelpfulCount: integer("not_helpful_count").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pendingKnowledgeUploads = pgTable("pending_knowledge_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  uploadType: text("upload_type").notNull(),
  status: text("status").notNull().default("pending"),
  processedCount: integer("processed_count").notNull().default(0),
  totalCount: integer("total_count"),
  errorMessage: text("error_message"),
  processedData: jsonb("processed_data").$type<any[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  uploadedBy: varchar("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const linenPackingLists = pgTable("linen_packing_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packingDate: timestamp("packing_date").notNull(),
  weekNumber: integer("week_number"),
  properties: jsonb("properties").$type<any[]>().notNull(),
  totalItems: integer("total_items").notNull().default(0),
  packedBy: varchar("packed_by"),
  packedByName: text("packed_by_name"),
  verifiedBy: varchar("verified_by"),
  verifiedByName: text("verified_by_name"),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const propertyOnboardingSessions = pgTable("property_onboarding_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),
  propertyId: varchar("property_id").references(() => properties.id),
  landlordId: varchar("landlord_id").references(() => landlords.id),
  landlordName: text("landlord_name"),
  propertyAddress: text("property_address"),
  currentStep: integer("current_step").notNull().default(1),
  totalSteps: integer("total_steps").notNull().default(10),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const propertyOnboardingResponses = pgTable("property_onboarding_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => propertyOnboardingSessions.id),
  stepNumber: integer("step_number").notNull(),
  questionId: text("question_id").notNull(),
  questionText: text("question_text"),
  responseType: text("response_type").notNull(),
  response: jsonb("response").$type<any>().notNull(),
  isValid: boolean("is_valid").notNull().default(true),
  validationErrors: jsonb("validation_errors").$type<any[]>(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  respondedAt: timestamp("responded_at").notNull().defaultNow(),
});

export const managementContracts = pgTable("management_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landlordId: varchar("landlord_id").notNull().references(() => landlords.id),
  propertyId: varchar("property_id").references(() => properties.id),
  contractNumber: text("contract_number").notNull().unique(),
  contractType: text("contract_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  managementFeePercentage: numeric("management_fee_percentage", { precision: 5, scale: 2 }),
  managementFeeAmount: numeric("management_fee_amount", { precision: 10, scale: 2 }),
  terms: jsonb("terms").$type<Record<string, any>>().notNull(),
  status: text("status").notNull().default("active"),
  signedDate: timestamp("signed_date"),
  signedBy: text("signed_by"),
  documentUrl: text("document_url"),
  renewalDate: timestamp("renewal_date"),
  terminationDate: timestamp("termination_date"),
  terminationReason: text("termination_reason"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rentCheckInspections = pgTable("rent_check_inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id),
  propertyName: text("property_name").notNull(),
  inspectionDate: timestamp("inspection_date").notNull(),
  inspectorId: varchar("inspector_id").references(() => staff.id),
  inspectorName: text("inspector_name"),
  inspectionType: text("inspection_type").notNull(),
  overallRating: integer("overall_rating"),
  overallCondition: text("overall_condition"),
  tenantPresent: boolean("tenant_present").notNull().default(false),
  tenantName: text("tenant_name"),
  issues: jsonb("issues").$type<any[]>().default([]),
  recommendations: text("recommendations"),
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: timestamp("follow_up_date"),
  photosUrl: text("photos_url"),
  reportUrl: text("report_url"),
  status: text("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rentCheckRoomRatings = pgTable("rent_check_room_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionId: varchar("inspection_id").notNull().references(() => rentCheckInspections.id),
  roomName: text("room_name").notNull(),
  roomType: text("room_type").notNull(),
  cleanliness: integer("cleanliness"),
  condition: integer("condition"),
  safety: integer("safety"),
  notes: text("notes"),
  issues: jsonb("issues").$type<any[]>().default([]),
  photosUrl: text("photos_url"),
  requiresMaintenance: boolean("requires_maintenance").notNull().default(false),
  maintenanceType: text("maintenance_type"),
  maintenanceUrgency: text("maintenance_urgency"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas for knowledge base and property management tables
export const insertKnowledgeBaseEntrySchema = createInsertSchema(knowledgeBaseEntries).omit({
  id: true,
  viewCount: true,
  helpfulCount: true,
  notHelpfulCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPendingKnowledgeUploadSchema = createInsertSchema(pendingKnowledgeUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertLinenPackingListSchema = createInsertSchema(linenPackingLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyOnboardingSessionSchema = createInsertSchema(propertyOnboardingSessions).omit({
  id: true,
  sessionToken: true,
  startedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyOnboardingResponseSchema = createInsertSchema(propertyOnboardingResponses).omit({
  id: true,
  respondedAt: true,
});

export const insertManagementContractSchema = createInsertSchema(managementContracts).omit({
  id: true,
  contractNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRentCheckInspectionSchema = createInsertSchema(rentCheckInspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRentCheckRoomRatingSchema = createInsertSchema(rentCheckRoomRatings).omit({
  id: true,
  createdAt: true,
});

// Type exports for knowledge base and property management tables
export type KnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferSelect;
export type InsertKnowledgeBaseEntry = z.infer<typeof insertKnowledgeBaseEntrySchema>;
export type PendingKnowledgeUpload = typeof pendingKnowledgeUploads.$inferSelect;
export type InsertPendingKnowledgeUpload = z.infer<typeof insertPendingKnowledgeUploadSchema>;
export type LinenPackingList = typeof linenPackingLists.$inferSelect;
export type InsertLinenPackingList = z.infer<typeof insertLinenPackingListSchema>;
export type PropertyOnboardingSession = typeof propertyOnboardingSessions.$inferSelect;
export type InsertPropertyOnboardingSession = z.infer<typeof insertPropertyOnboardingSessionSchema>;
export type PropertyOnboardingResponse = typeof propertyOnboardingResponses.$inferSelect;
export type InsertPropertyOnboardingResponse = z.infer<typeof insertPropertyOnboardingResponseSchema>;
export type ManagementContract = typeof managementContracts.$inferSelect;
export type InsertManagementContract = z.infer<typeof insertManagementContractSchema>;
export type RentCheckInspection = typeof rentCheckInspections.$inferSelect;
export type InsertRentCheckInspection = z.infer<typeof insertRentCheckInspectionSchema>;
export type RentCheckRoomRating = typeof rentCheckRoomRatings.$inferSelect;
export type InsertRentCheckRoomRating = z.infer<typeof insertRentCheckRoomRatingSchema>;

// Missing insert schemas and type exports for existing tables

// Insert schemas for schedule-related tables
export const insertScheduleTimetableSchema = createInsertSchema(scheduleTimetables).omit({
  id: true,
  createdAt: true,
});

export const insertCleanerScheduleAcceptanceSchema = createInsertSchema(cleanerScheduleAcceptances).omit({
  id: true,
  createdAt: true,
});

export const insertStaffScheduleTokenSchema = createInsertSchema(staffScheduleTokens).omit({
  id: true,
  tokenHash: true,
  createdAt: true,
});

// Type exports for schedule-related tables
export type ScheduleTimetable = typeof scheduleTimetables.$inferSelect;
export type InsertScheduleTimetable = z.infer<typeof insertScheduleTimetableSchema>;
export type CleanerScheduleAcceptance = typeof cleanerScheduleAcceptances.$inferSelect;
export type InsertCleanerScheduleAcceptance = z.infer<typeof insertCleanerScheduleAcceptanceSchema>;
export type StaffScheduleToken = typeof staffScheduleTokens.$inferSelect;
export type InsertStaffScheduleToken = z.infer<typeof insertStaffScheduleTokenSchema>;

// Type exports for hiring pipeline tables
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type GroupMeeting = typeof groupMeetings.$inferSelect;
export type InsertGroupMeeting = z.infer<typeof insertGroupMeetingSchema>;
export type MeetingAttendance = typeof meetingAttendance.$inferSelect;
export type InsertMeetingAttendance = z.infer<typeof insertMeetingAttendanceSchema>;