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

export class GoogleCalendarService {
	calendar;

	constructor() {
		const auth = new google.auth.JWT({
			email: config.GOOGLE_CLIENT_EMAIL,
			key: config.GOOGLE_PRIVATE_KEY,
			scopes: ["https://www.googleapis.com/auth/calendar"],
		});

		this.calendar = google.calendar({ version: "v3", auth });
	}

	async clearAllEvents(includePast = false) {
		try {
			const now = new Date();
			const response = await this.calendar.events.list({
				calendarId: config.GOOGLE_CALENDAR_ID,
				timeMin: includePast ? "2020-01-01T00:00:00Z" : now.toISOString(),
			});

			const events = response.data.items;
			if (!events || events.length === 0) {
				console.log("No events found to clear.");
				return;
			}

			console.log(`Found ${events.length} events to clear`);

			for (const event of events) {
				if (event.id) {
					await this.calendar.events.delete({
						calendarId: config.GOOGLE_CALENDAR_ID,
						eventId: event.id,
					});
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

	async clearUpcomingEvents() {
		try {
			const timeMin = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
			console.log("Fetching events from:", timeMin);
			console.log("Using calendar ID:", config.GOOGLE_CALENDAR_ID);

			let allEvents: calendar_v3.Schema$Event[] = [];
			let pageToken: string | undefined = undefined;

			do {
				const response: { data: calendar_v3.Schema$Events } =
					await this.calendar.events.list({
						calendarId: config.GOOGLE_CALENDAR_ID,
						timeMin: timeMin,
						pageToken: pageToken,
					});

				console.log("API Response:", JSON.stringify(response.data, null, 2));

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
				if (event.id) {
					console.log(`Deleting event: ${event.summary} (${event.id})`);
					await this.calendar.events.delete({
						calendarId: config.GOOGLE_CALENDAR_ID,
						eventId: event.id,
					});
				}
			}

			console.log(`Successfully cleared ${allEvents.length} events`);
		} catch (error) {
			console.error("Error clearing events:", error);
			throw error;
		}
	}

	async createEvent(event: {
		summary: string;
		start: Date;
		end: Date;
		description: string;
		colorId: string;
	}) {
		return this.calendar.events.insert({
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
		});
	}
}
