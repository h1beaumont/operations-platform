import { google } from 'googleapis';

const TEAM_CALENDAR = 'team@example.com';
const ARAS_CALENDAR = 'ops@example.com';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings?.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings?.settings?.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

interface CreateDualCalendarParams {
  roleType: string;
  startDateTime: Date;
  endDateTime: Date;
  attendeeEmails: string[];
  candidateNames?: string[];
}

interface CreateDualCalendarResult {
  success: boolean;
  eventId?: string;
  meetingLink?: string;
  eventIdSecondary?: string;
  meetingLinkSecondary?: string;
  startTime?: Date;
  error?: string;
}

/**
 * Create a group meeting in BOTH Google Calendars
 * - team@example.com (primary)
 * - ops@example.com (secondary)
 * 
 * Handles failures gracefully - if one calendar fails, still tries the other
 */
export async function createGroupMeetingDualCalendar({
  roleType,
  startDateTime,
  endDateTime,
  attendeeEmails,
  candidateNames = []
}: CreateDualCalendarParams): Promise<CreateDualCalendarResult> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();

    const attendeeList = candidateNames.length > 0 
      ? candidateNames.join(', ')
      : attendeeEmails.join(', ');

    const roleTypeCapitalized = roleType.charAt(0).toUpperCase() + roleType.slice(1);
    const eventTitle = `Group Interview - ${roleTypeCapitalized} Cleaners`;

    const description = `Group Interview Session

Attendees:
${attendeeList}

Purpose: Group interview for Northstay ${roleTypeCapitalized} Cleaner positions

Please ensure you have a stable internet connection and join the meeting on time.`;

    const eventData = {
      summary: eventTitle,
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Europe/London',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Europe/London',
      },
      attendees: attendeeEmails.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `group-interview-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    };

    let primaryEventId: string | undefined;
    let primaryMeetingLink: string | undefined;
    let secondaryEventId: string | undefined;
    let secondaryMeetingLink: string | undefined;
    let primaryError: string | undefined;
    let secondaryError: string | undefined;

    // Try to create event in primary calendar (team@example.com)
    try {
      console.log(`[Dual Calendar] Creating event in primary calendar: ${TEAM_CALENDAR}`);
      const primaryResponse = await calendar.events.insert({
        calendarId: TEAM_CALENDAR,
        conferenceDataVersion: 1,
        sendNotifications: true,
        requestBody: eventData,
      });

      if (primaryResponse.data.id) {
        primaryEventId = primaryResponse.data.id;
        primaryMeetingLink = primaryResponse.data.hangoutLink || primaryResponse.data.htmlLink || undefined;
        console.log(`[Dual Calendar] Primary calendar event created: ${primaryEventId}`);
      }
    } catch (error) {
      primaryError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Dual Calendar] Failed to create event in primary calendar:`, error);
    }

    // Try to create event in secondary calendar (ops@example.com)
    try {
      console.log(`[Dual Calendar] Creating event in secondary calendar: ${ARAS_CALENDAR}`);
      const secondaryResponse = await calendar.events.insert({
        calendarId: ARAS_CALENDAR,
        conferenceDataVersion: 1,
        sendNotifications: true,
        requestBody: eventData,
      });

      if (secondaryResponse.data.id) {
        secondaryEventId = secondaryResponse.data.id;
        secondaryMeetingLink = secondaryResponse.data.hangoutLink || secondaryResponse.data.htmlLink || undefined;
        console.log(`[Dual Calendar] Secondary calendar event created: ${secondaryEventId}`);
      }
    } catch (error) {
      secondaryError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Dual Calendar] Failed to create event in secondary calendar:`, error);
    }

    // If both failed, return error
    if (!primaryEventId && !secondaryEventId) {
      return {
        success: false,
        error: `Both calendars failed. Primary: ${primaryError}. Secondary: ${secondaryError}`,
      };
    }

    // At least one succeeded
    return {
      success: true,
      eventId: primaryEventId,
      meetingLink: primaryMeetingLink,
      eventIdSecondary: secondaryEventId,
      meetingLinkSecondary: secondaryMeetingLink,
      startTime: startDateTime,
    };
  } catch (error) {
    console.error('[Dual Calendar] Unexpected error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      success: false,
      error: `Failed to create calendar events: ${errorMessage}`,
    };
  }
}
