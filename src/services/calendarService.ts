import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";
import { config } from "../config";
import type { NiceWeatherWindow } from "../types";

interface MergedWindow {
	start: Date;
	end: Date;
	conditions: string;
	minTemp: number;
	maxTemp: number;
	minPrecipChance: number;
	maxPrecipChance: number;
	minWindSpeed: number;
	maxWindSpeed: number;
}

function toFixedMax(value: string | number, dp: number) {
	return +Number.parseFloat(value.toString()).toFixed(dp);
}

export class CalendarService {
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

			console.log(`Found ${allEvents.length} total events to clear`);

			for (const event of allEvents) {
				if (event.id) {
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

	async createEvents(weatherWindows: NiceWeatherWindow[]) {
		try {
			// Sort windows by start time
			weatherWindows.sort((a, b) => a.start.getTime() - b.start.getTime());

			// Merge consecutive windows with same conditions
			const mergedWindows: MergedWindow[] = [];
			let currentWindow: MergedWindow | null = null;

			for (const window of weatherWindows) {
				const conditions = this.getWeatherConditions(window);

				if (!currentWindow) {
					currentWindow = {
						start: window.start,
						end: window.end,
						conditions,
						minTemp: window.temperature,
						maxTemp: window.temperature,
						minPrecipChance: window.precipChance,
						maxPrecipChance: window.precipChance,
						minWindSpeed: window.windSpeed,
						maxWindSpeed: window.windSpeed,
					};
				} else if (
					currentWindow.conditions === conditions &&
					this.isSameDay(currentWindow.end, window.start)
				) {
					// Update the end time and average the conditions
					currentWindow.end = window.end;
					currentWindow.minTemp = Math.min(
						currentWindow.minTemp,
						window.temperature,
					);
					currentWindow.maxTemp = Math.max(
						currentWindow.maxTemp,
						window.temperature,
					);
					currentWindow.minPrecipChance = Math.min(
						currentWindow.minPrecipChance,
						window.precipChance,
					);
					currentWindow.maxPrecipChance = Math.max(
						currentWindow.maxPrecipChance,
						window.precipChance,
					);
					currentWindow.minWindSpeed = Math.min(
						currentWindow.minWindSpeed,
						window.windSpeed,
					);
					currentWindow.maxWindSpeed = Math.max(
						currentWindow.maxWindSpeed,
						window.windSpeed,
					);
				} else {
					mergedWindows.push(currentWindow);
					currentWindow = {
						start: window.start,
						end: window.end,
						conditions,
						minTemp: window.temperature,
						maxTemp: window.temperature,
						minPrecipChance: window.precipChance,
						maxPrecipChance: window.precipChance,
						minWindSpeed: window.windSpeed,
						maxWindSpeed: window.windSpeed,
					};
				}
			}

			if (currentWindow) {
				mergedWindows.push(currentWindow);
			}

			// Create events for merged windows
			for (const window of mergedWindows) {
				const minTemp = toFixedMax(window.minTemp, 1);
				const maxTemp = toFixedMax(window.maxTemp, 1);
				const minPrecipChance = toFixedMax(window.minPrecipChance, 1);
				const maxPrecipChance = toFixedMax(window.maxPrecipChance, 1);
				const minWindSpeed = toFixedMax(window.minWindSpeed, 1);
				const maxWindSpeed = toFixedMax(window.maxWindSpeed, 1);
				await this.calendar.events.insert({
					calendarId: config.GOOGLE_CALENDAR_ID,
					requestBody: {
						summary: window.conditions,
						start: {
							dateTime: window.start.toISOString(),
							timeZone: "America/Denver",
						},
						end: {
							dateTime: window.end.toISOString(),
							timeZone: "America/Denver",
						},
						description: [
							`Temperature: ${minTemp === maxTemp ? minTemp : `${minTemp} - ${maxTemp}`}°F`,
							`Precipitation: ${minPrecipChance === maxPrecipChance ? minPrecipChance : `${minPrecipChance} - ${maxPrecipChance}`}%`,
							`Wind: ${minWindSpeed === maxWindSpeed ? minWindSpeed : `${minWindSpeed} - ${maxWindSpeed}`} MPH`,
						].join("\n"),
						colorId: this.getColorId(window),
					},
				});
			}

			console.log(`Created ${mergedWindows.length} merged weather windows`);
		} catch (error) {
			console.error("Error creating events:", error);
			throw error;
		}
	}

	private getWeatherConditions(window: NiceWeatherWindow): string {
		const conditions: string[] = [];
		if (window.temperature < config.MIN_TEMP_F) conditions.push("❄️ Cold");
		else if (window.temperature > config.MAX_TEMP_F) conditions.push("🔥 Hot");
		if (window.precipChance > config.MAX_PRECIP_CHANCE)
			conditions.push("💧 Precipitating");
		if (window.windSpeed > config.MAX_WIND_MPH) conditions.push("💨 Windy");
		if (conditions.length === 0) return "🌤 Play Outside";
		return conditions.join(", ");
	}

	private getColorId(window: MergedWindow): string {
		// 1 Lavender, 2 Sage, 3 Grape, 4 Flamingo, 5 Banana, 6 Tangerine, 7 Peacock, 8 Graphite, 9 Blueberry, 10 Basil, 11 Tomato
		if (window.maxPrecipChance > config.MAX_PRECIP_CHANCE) return "9";
		if (window.minTemp < config.MIN_TEMP_F) return "7";
		if (window.maxTemp > config.MAX_TEMP_F) return "11";
		if (window.maxWindSpeed > config.MAX_WIND_MPH) return "8";
		return "2";
	}

	private isSameDay(date1: Date, date2: Date): boolean {
		return (
			date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate()
		);
	}
}
