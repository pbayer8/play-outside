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
	console.log("Weather data fetched", weatherData[0], weatherData.length);
	console.log("Fetching daylight data");
	const daylightWindows = sunlightService.getDaylightWindows(
		config.DAYS_TO_FORECAST,
	);
	console.log(
		"Daylight data fetched",
		daylightWindows[0],
		daylightWindows.length,
	);
	const allWindows: NiceWeatherWindow[] = [];

	// For each daylight window, create hourly weather windows
	for (const day of daylightWindows) {
		// Keep the original UTC timestamps
		const dayStart = day.sunrise;
		const dayEnd = day.sunset;

		console.log("Processing day:", {
			sunrise: dayStart.toISOString(),
			sunset: dayEnd.toISOString(),
		});

		// Find weather data for this day
		const dayWeather = weatherData.filter((w) => {
			const wDate = new Date(w.start);
			const wTime = wDate.getTime();

			// Include weather data that falls between sunrise and sunset
			return wTime >= dayStart.getTime() && wTime <= dayEnd.getTime();
		});

		console.log("Found weather data for day:", dayWeather.length);
		if (dayWeather.length > 0) {
			console.log("First weather data:", dayWeather[0]);
			console.log("Last weather data:", dayWeather[dayWeather.length - 1]);
		}

		// Also update the hour loop to use UTC hours
		for (
			let hour = dayStart.getUTCHours();
			hour <= dayEnd.getUTCHours();
			hour++
		) {
			// Create window start using UTC timestamp
			const windowStart = new Date(
				Date.UTC(
					dayStart.getUTCFullYear(),
					dayStart.getUTCMonth(),
					dayStart.getUTCDate(),
					hour,
					0,
					0,
					0,
				),
			);

			// Don't start before sunrise
			if (windowStart.getTime() < dayStart.getTime()) {
				windowStart.setTime(dayStart.getTime());
			}

			// Create window end using UTC timestamp
			const windowEnd = new Date(
				Date.UTC(
					windowStart.getUTCFullYear(),
					windowStart.getUTCMonth(),
					windowStart.getUTCDate(),
					windowStart.getUTCHours() + 1,
					0,
					0,
					0,
				),
			);

			// Don't end after sunset
			if (windowEnd.getTime() > dayEnd.getTime()) {
				windowEnd.setTime(dayEnd.getTime());
			}

			console.log("Window:", {
				start: windowStart.toISOString(),
				end: windowEnd.toISOString(),
				hour,
			});

			// Find matching weather data
			const hourWeather = dayWeather.find((w) => {
				const wDate = new Date(w.start);
				return wDate.getUTCHours() === hour;
			});

			console.log("Hour weather:", hourWeather ? "Found" : "Not found");

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
		console.log("Current total windows:", allWindows.length);
	}

	console.log("All windows", allWindows[0], allWindows.length);
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
