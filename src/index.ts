import { config } from "./config";
import { CalendarService } from "./services/calendarService";
import { SunlightService } from "./services/sunlightService";
import { WeatherService } from "./services/weatherService";
import type { NiceWeatherWindow } from "./types";

async function getWeatherWindows(): Promise<NiceWeatherWindow[]> {
	const weatherService = new WeatherService();
	const sunlightService = new SunlightService();

	console.log("Fetching weather data");
	const weatherData = await weatherService.getHourlyForecast(
		config.DAYS_TO_FORECAST,
	);
	console.log("Fetching daylight data");
	const daylightWindows = sunlightService.getDaylightWindows(
		config.DAYS_TO_FORECAST,
	);

	const allWindows: NiceWeatherWindow[] = [];

	// For each daylight window, create hourly weather windows
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

		// Create hourly windows from sunrise to sunset
		for (let hour = dayStart.getHours(); hour <= dayEnd.getHours(); hour++) {
			const windowStart = new Date(dayStart);
			windowStart.setHours(hour, 0, 0, 0);

			// Don't start before sunrise
			if (windowStart < dayStart) {
				windowStart.setTime(dayStart.getTime());
			}

			const windowEnd = new Date(windowStart);
			windowEnd.setHours(windowStart.getHours() + 1, 0, 0, 0);

			// Don't end after sunset
			if (windowEnd > dayEnd) {
				windowEnd.setTime(dayEnd.getTime());
			}

			// Find matching weather data
			const hourWeather = dayWeather.find((w) => {
				const wDate = new Date(w.start);
				return wDate.getHours() === hour;
			});

			if (hourWeather) {
				allWindows.push({
					start: windowStart,
					end: windowEnd,
					temperature: hourWeather.temperature,
					precipChance: hourWeather.precipChance,
					windSpeed: hourWeather.windSpeed,
				});
			}
		}
	}

	return allWindows;
}

async function main() {
	try {
		const calendarService = new CalendarService();

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
