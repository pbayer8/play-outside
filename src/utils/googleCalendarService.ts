import { backOff } from "exponential-backoff";
import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";
import { config } from "../config";

export enum CalendarColorId {
	Lavender = "1",
	Sage = "2",
	Grape = "3",
	Flamingo = "4",
	Banana = "5",
	Tangerine = "6",
	Peacock = "7",
	Graphite = "8",
	Blueberry = "9",
	Basil = "10",
	Tomato = "11",
}

const auth = new google.auth.JWT({
	email: config.GOOGLE_CLIENT_EMAIL,
	key: config.GOOGLE_PRIVATE_KEY,
	scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3", auth });

interface RateLimitError {
	response?: {
		status?: number;
		data?: {
			error?: {
				message?: string;
			};
		};
	};
}

// Helper function to check if an error is a rate limit error
function isRateLimitError(error: RateLimitError): boolean {
	return (
		(error?.response?.status === 429 ||
			error?.response?.status === 403 ||
			error?.response?.data?.error?.message?.includes("Rate Limit Exceeded")) ??
		false
	);
}

// Wrapper function to handle rate limiting with exponential backoff
async function withRetry<T>(
	operation: () => Promise<T>,
	maxAttempts = 5,
): Promise<T> {
	return backOff(
		async () => {
			try {
				return await operation();
			} catch (error) {
				if (isRateLimitError(error as RateLimitError)) {
					throw error; // Let backOff handle the retry
				}
				throw error; // Re-throw non-rate-limit errors
			}
		},
		{
			numOfAttempts: maxAttempts,
			startingDelay: 1000, // Start with 1 second delay
			maxDelay: 32000, // Max delay of 32 seconds
			retry: (error: unknown) => isRateLimitError(error as RateLimitError),
		},
	);
}

export async function clearAllEvents(includePast = false) {
	try {
		const now = new Date();
		const response = await withRetry(() =>
			calendar.events.list({
				calendarId: config.GOOGLE_CALENDAR_ID,
				timeMin: includePast ? "2020-01-01T00:00:00Z" : now.toISOString(),
			}),
		);

		const events = response.data.items;
		if (!events || events.length === 0) {
			console.log("No events found to clear.");
			return;
		}

		console.log(`Found ${events.length} events to clear`);

		for (const event of events) {
			const eventId = event.id;
			if (eventId) {
				await withRetry(() =>
					calendar.events.delete({
						calendarId: config.GOOGLE_CALENDAR_ID,
						eventId: eventId,
					}),
				);
			}
		}

		console.log(
			`Successfully cleared ${events.length} events from the calendar.`,
		);
	} catch (error) {
		console.error("Error clearing events:", error);
		throw error;
	}
}

export async function clearUpcomingEvents() {
	try {
		const timeMin = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
		console.log("Fetching events from:", timeMin);
		console.log("Using calendar ID:", config.GOOGLE_CALENDAR_ID);

		let allEvents: calendar_v3.Schema$Event[] = [];
		let pageToken: string | undefined = undefined;

		do {
			const response: { data: calendar_v3.Schema$Events } = await withRetry(
				() =>
					calendar.events.list({
						calendarId: config.GOOGLE_CALENDAR_ID,
						timeMin: timeMin,
						pageToken: pageToken,
					}),
			);

			console.log("API Result:", response.data.items?.length);

			const events = response.data.items || [];
			allEvents = allEvents.concat(events);

			pageToken = response.data.nextPageToken || undefined;

			if (pageToken) {
				console.log("More events found, fetching next page...");
			}
		} while (pageToken);

		if (allEvents.length === 0) {
			console.log("No events found in the response");
			return;
		}

		console.log(`Found ${allEvents.length} total events to clear.`);

		for (const event of allEvents) {
			const eventId = event.id;
			if (eventId) {
				await withRetry(() =>
					calendar.events.delete({
						calendarId: config.GOOGLE_CALENDAR_ID,
						eventId: eventId,
					}),
				);
			}
		}

		console.log(`Successfully cleared ${allEvents.length} events`);
	} catch (error) {
		console.error("Error clearing events:", error);
		throw error;
	}
}

export async function createEvent(event: {
	summary: string;
	start: Date;
	end: Date;
	description: string;
	colorId: string;
}) {
	return withRetry(() =>
		calendar.events.insert({
			calendarId: config.GOOGLE_CALENDAR_ID,
			requestBody: {
				summary: event.summary,
				start: {
					dateTime: event.start.toISOString(),
					timeZone: config.TZ,
				},
				end: {
					dateTime: event.end.toISOString(),
					timeZone: config.TZ,
				},
				description: event.description,
				colorId: event.colorId,
			},
		}),
	);
}
