import { google } from 'googleapis';

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

interface CreateGroupMeetingParams {
  title: string;
  startDateTime: Date;
  endDateTime: Date;
  attendeeEmails: string[];
  candidateNames?: string[];
}

interface CreateGroupMeetingResult {
  success: boolean;
  eventId?: string;
  meetingLink?: string;
  eventIdSecondary?: string;
  meetingLinkSecondary?: string;
  startTime?: Date;
  error?: string;
}

export async function createGroupMeeting({
  title,
  startDateTime,
  endDateTime,
  attendeeEmails,
  candidateNames = []
}: CreateGroupMeetingParams): Promise<CreateGroupMeetingResult> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();

    const attendeeList = candidateNames.length > 0 
      ? candidateNames.join(', ')
      : attendeeEmails.join(', ');

    const description = `Group Interview Session
    
Attendees:
${attendeeList}

Purpose: Group interview for Northstay positions

Please ensure you have a stable internet connection and join the meeting on time.`;

    const event = {
      summary: `Northstay - Group Interview: ${candidateNames.slice(0, 3).join(', ')}${candidateNames.length > 3 ? ` +${candidateNames.length - 3} more` : ''}`,
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
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

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendNotifications: true,
      requestBody: event,
    });

    if (!response.data.id) {
      throw new Error('Event created but no event ID returned');
    }

    const meetingLink = response.data.hangoutLink || response.data.htmlLink || undefined;

    console.log('Calendar event created successfully:', {
      eventId: response.data.id,
      meetingLink,
      startTime: startDateTime,
    });

    return {
      success: true,
      eventId: response.data.id,
      meetingLink,
      startTime: startDateTime,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      success: false,
      error: `Failed to create calendar event: ${errorMessage}`,
    };
  }
}
