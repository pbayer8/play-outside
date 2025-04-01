import { config } from "./config";
import { SunlightService } from "./services/sunlightService";
import { WeatherCalendarService } from "./services/weatherCalendarService";
import { WeatherService } from "./services/weatherService";
import type { NiceWeatherWindow } from "./types";

async function getWeatherWindows(): Promise<NiceWeatherWindow[]> {
	const weatherService = new WeatherService();
	const sunlightService = new SunlightService();

	console.log("Fetching weather data");
	const weatherData = await weatherService.getForecast();
	console.log("Fetching daylight data");
	const daylightWindows = sunlightService.getDaylightWindows(
		config.DAYS_TO_FORECAST,
	);

	const allWindows: NiceWeatherWindow[] = [];

	// For each daylight window, process weather windows
	for (const day of daylightWindows) {
		const dayStart = new Date(day.sunrise);
		const dayEnd = new Date(day.sunset);

		// Find weather data for this day
		const dayWeather = weatherData.filter((w) => {
			const wDate = new Date(w.start);
			return (
				wDate.getFullYear() === dayStart.getFullYear() &&
				wDate.getMonth() === dayStart.getMonth() &&
				wDate.getDate() === dayStart.getDate()
			);
		});

		// Process each weather window that falls within daylight hours
		for (const weatherWindow of dayWeather) {
			const windowStart = new Date(weatherWindow.start);
			const windowEnd = new Date(weatherWindow.end);

			// Skip if the window is completely outside daylight hours
			if (windowEnd <= dayStart || windowStart >= dayEnd) {
				continue;
			}

			// Adjust window to fit within daylight hours
			const adjustedStart = windowStart < dayStart ? dayStart : windowStart;
			const adjustedEnd = windowEnd > dayEnd ? dayEnd : windowEnd;

			allWindows.push({
				start: adjustedStart,
				end: adjustedEnd,
				temperature: weatherWindow.temperature,
				precipChance: weatherWindow.precipChance,
				windSpeed: weatherWindow.windSpeed,
			});
		}
	}

	return allWindows;
}

async function main() {
	try {
		const calendarService = new WeatherCalendarService();

		// Clear existing weather windows
		console.log("Clearing existing calendar events");
		await calendarService.clearUpcomingEvents();

		// Find and create new weather windows
		const weatherWindows = await getWeatherWindows();
		console.log(`Found ${weatherWindows.length} weather windows`);

		await calendarService.createEvents(weatherWindows);
		console.log(
			`Successfully created ${weatherWindows.length} weather windows`,
		);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

main();
