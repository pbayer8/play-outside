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
	console.log(`Received ${weatherData.length} weather data points`);
	console.log(
		"First weather data point:",
		JSON.stringify(weatherData[0], null, 2),
	);
	console.log(
		"Last weather data point:",
		JSON.stringify(weatherData[weatherData.length - 1], null, 2),
	);

	console.log("Fetching daylight data");
	const daylightWindows = sunlightService.getDaylightWindows(
		config.DAYS_TO_FORECAST,
	);
	console.log(`Received ${daylightWindows.length} daylight windows`);
	console.log(
		"First daylight window:",
		JSON.stringify(daylightWindows[0], null, 2),
	);
	console.log(
		"Last daylight window:",
		JSON.stringify(daylightWindows[daylightWindows.length - 1], null, 2),
	);

	const allWindows: NiceWeatherWindow[] = [];

	// For each daylight window, create hourly weather windows
	for (const day of daylightWindows) {
		const dayStart = new Date(day.sunrise);
		const dayEnd = new Date(day.sunset);

		console.log(`\nProcessing day: ${dayStart.toISOString()}`);
		console.log(`Sunrise: ${dayStart.toISOString()}`);
		console.log(`Sunset: ${dayEnd.toISOString()}`);

		// Find weather data for this day
		const dayWeather = weatherData.filter((w) => {
			const wDate = new Date(w.start);
			const isSameDay =
				wDate.getFullYear() === dayStart.getFullYear() &&
				wDate.getMonth() === dayStart.getMonth() &&
				wDate.getDate() === dayStart.getDate();

			if (isSameDay) {
				console.log(
					`Found weather data for hour ${wDate.getHours()}:`,
					JSON.stringify(w, null, 2),
				);
			}
			return isSameDay;
		});

		console.log(`Found ${dayWeather.length} weather data points for this day`);

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

			console.log(`\nChecking hour ${hour}:`);
			console.log(`Window start: ${windowStart.toISOString()}`);
			console.log(`Window end: ${windowEnd.toISOString()}`);

			// Find matching weather data
			const hourWeather = dayWeather.find((w) => {
				const wDate = new Date(w.start);
				const matches = wDate.getHours() === hour;
				console.log(
					`Comparing weather data hour ${wDate.getHours()} with target hour ${hour}: ${matches}`,
				);
				return matches;
			});

			if (hourWeather) {
				console.log(
					`Found matching weather data for hour ${hour}:`,
					JSON.stringify(hourWeather, null, 2),
				);
				allWindows.push({
					start: windowStart,
					end: windowEnd,
					temperature: hourWeather.temperature,
					precipChance: hourWeather.precipChance,
					windSpeed: hourWeather.windSpeed,
				});
			} else {
				console.log(`No weather data found for hour ${hour}`);
				console.log(
					`Available weather data hours: ${dayWeather.map((w) => new Date(w.start).getHours()).join(", ")}`,
				);
			}
		}
	}

	console.log(`\nTotal windows created: ${allWindows.length}`);
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
