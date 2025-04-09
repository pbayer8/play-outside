import { config } from "../config";
import type { NiceWeatherWindow } from "../types";
import {
	CalendarColorId,
	clearAllEvents as clearGoogleEvents,
	clearUpcomingEvents as clearGoogleUpcomingEvents,
	createEvent,
} from "./googleCalendarService";

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

function isIdealConditions(
	temperature: number,
	precipChance: number,
	windSpeed: number,
): boolean {
	return (
		temperature >= config.IDEAL_MIN_TEMP_F &&
		temperature <= config.IDEAL_MAX_TEMP_F &&
		precipChance <= config.IDEAL_PRECIP_CHANCE &&
		windSpeed <= config.IDEAL_WIND_MPH
	);
}

function getWeatherConditions(window: NiceWeatherWindow): string {
	const conditions: string[] = [];

	// Check for IDEAL conditions first
	if (
		isIdealConditions(window.temperature, window.precipChance, window.windSpeed)
	) {
		return "🌟 Ideal Play Outside";
	}

	// Then check for unacceptable conditions
	if (window.temperature < config.MIN_TEMP_F) conditions.push("❄️ Cold");
	else if (window.temperature > config.MAX_TEMP_F) conditions.push("🔥 Hot");
	if (window.precipChance > config.MAX_PRECIP_CHANCE)
		conditions.push("💧 Precipitating");
	if (window.windSpeed > config.MAX_WIND_MPH) conditions.push("💨 Windy");

	// If there are unacceptable conditions, return them as before
	if (conditions.length > 0) return conditions.join(", ");

	// For windows that are playable but not ideal, show why they're not ideal
	const nonIdealConditions: string[] = [];
	if (window.temperature < config.IDEAL_MIN_TEMP_F)
		nonIdealConditions.push("Cool");
	else if (window.temperature > config.IDEAL_MAX_TEMP_F)
		nonIdealConditions.push("Warm");
	if (window.precipChance > config.IDEAL_PRECIP_CHANCE)
		nonIdealConditions.push("Some Rain");
	if (window.windSpeed > config.IDEAL_WIND_MPH)
		nonIdealConditions.push("Breezy");

	return `🌤 Play Outside${nonIdealConditions.length > 0 ? ` (${nonIdealConditions.join(", ")})` : ""}`;
}

function getColorId(window: MergedWindow): CalendarColorId {
	if (window.maxPrecipChance > config.MAX_PRECIP_CHANCE)
		return CalendarColorId.Blueberry;
	if (window.minTemp < config.MIN_TEMP_F) return CalendarColorId.Peacock;
	if (window.maxTemp > config.MAX_TEMP_F) return CalendarColorId.Tomato;
	if (window.maxWindSpeed > config.MAX_WIND_MPH)
		return CalendarColorId.Lavender;

	if (
		isIdealConditions(
			window.minTemp,
			window.maxPrecipChance,
			window.maxWindSpeed,
		)
	) {
		return CalendarColorId.Banana;
	}
	return CalendarColorId.Sage;
}

function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

export async function clearAllEvents(includePast = false) {
	return clearGoogleEvents(includePast);
}

export async function clearUpcomingEvents() {
	return clearGoogleUpcomingEvents();
}

export async function createEvents(weatherWindows: NiceWeatherWindow[]) {
	try {
		// Sort windows by start time
		weatherWindows.sort((a, b) => a.start.getTime() - b.start.getTime());

		// Merge consecutive windows with same conditions
		const mergedWindows: MergedWindow[] = [];
		let currentWindow: MergedWindow | null = null;

		for (const window of weatherWindows) {
			const conditions = getWeatherConditions(window);

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
				isSameDay(currentWindow.end, window.start)
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

			await createEvent({
				summary: window.conditions,
				start: window.start,
				end: window.end,
				description: [
					`Temperature: ${minTemp === maxTemp ? minTemp : `${minTemp} - ${maxTemp}`}°F`,
					`Precipitation: ${minPrecipChance === maxPrecipChance ? minPrecipChance : `${minPrecipChance} - ${maxPrecipChance}`}%`,
					`Wind: ${minWindSpeed === maxWindSpeed ? minWindSpeed : `${minWindSpeed} - ${maxWindSpeed}`} MPH`,
				].join("\n"),
				colorId: getColorId(window),
			});
		}

		console.log(`Created ${mergedWindows.length} merged weather windows`);
	} catch (error) {
		console.error("Error creating events:", error);
		throw error;
	}
}
