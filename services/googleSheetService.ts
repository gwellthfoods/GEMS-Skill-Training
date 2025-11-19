import { Participant } from '../types';

// This service sends participant data to a Google Apps Script Web App URL.
// The URL is configured by an administrator in the Admin Dashboard.
//
// The necessary Apps Script code and detailed setup instructions are provided
// within the Admin Dashboard's configuration section. The script enables
// the application to securely add new participant records to a Google Sheet.
// It works by reading the sheet's header row and dynamically mapping the
// submitted data to the correct columns, making it flexible to changes in column order.

export const addParticipantToSheet = async (participant: Participant, googleSheetUrl: string): Promise<void> => {
  if (!googleSheetUrl) {
    throw new Error("Google Sheets integration is not configured. Please ask an admin to set the Web App URL in the dashboard.");
  }
  
  // This function sends the complete participant object as a single package.
  // The Google Apps Script (configured via the URL) is responsible for intelligently
  // reading the headers from the target Google Sheet and mapping the data to the correct columns.
  try {
    const response = await fetch(googleSheetUrl, {
      method: 'POST',
      body: JSON.stringify(participant),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      // Use 'no-cors' mode as Google Scripts can have tricky CORS policies.
      // The request will be "opaque", meaning we can't inspect the response,
      // but the POST will go through. The Apps Script handles success/error logging.
      mode: 'no-cors',
    });

    // In 'no-cors' mode, we can't check response.ok or response.status.
    // We have to assume the request was sent successfully.
    // Error handling should be done within the Google Apps Script itself (e.g., sending an email on failure).
    console.log('Participant data sent to Google Sheet endpoint. Check the sheet for confirmation.');

  } catch (error) {
    console.error("Error sending participant data to Google Sheet:", error);
    throw new Error("Failed to send participant data. Check the network connection and the Web App URL configuration.");
  }
};