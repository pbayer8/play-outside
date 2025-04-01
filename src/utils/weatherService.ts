import { fetchWeatherApi } from "openmeteo";
import { config } from "../config";
import type { NiceWeatherWindow } from "../types";

const baseUrl = "https://api.open-meteo.com/v1/forecast";
const params = {
	latitude: config.LATITUDE,
	longitude: config.LONGITUDE,
	minutely_15: [
		"temperature_2m",
		"wind_speed_10m",
		"precipitation_probability",
	],
	timezone: config.TZ,
	forecast_days: config.DAYS_TO_FORECAST,
	wind_speed_unit: "mph",
	temperature_unit: "fahrenheit",
	precipitation_unit: "inch",
};

// Helper function to form time ranges
function range(start: number, stop: number, step: number) {
	return Array.from(
		{ length: (stop - start) / step },
		(_, i) => start + i * step,
	);
}

export async function getForecast(): Promise<NiceWeatherWindow[]> {
	const responses = await fetchWeatherApi(baseUrl, params);
	const response = responses[0];
	const minutely15 = response.minutely15();

	if (!minutely15) {
		throw new Error("Failed to fetch minutely weather data");
	}

	const timeRange = range(
		Number(minutely15.time()),
		Number(minutely15.timeEnd()),
		minutely15.interval() ?? 0,
	).map((t) => new Date(t * 1000));

	const temperature2m = minutely15.variables(0)?.valuesArray() ?? [];
	const windSpeed10m = minutely15.variables(1)?.valuesArray() ?? [];
	const precipitationProbability = minutely15.variables(2)?.valuesArray() ?? [];

	const windows: NiceWeatherWindow[] = [];

	// Process each 15-minute interval
	for (let i = 0; i < timeRange.length; i++) {
		windows.push({
			start: timeRange[i],
			end: new Date(timeRange[i].getTime() + 15 * 60 * 1000), // Add 15 minutes
			temperature: temperature2m[i],
			precipChance: precipitationProbability[i] ?? 0,
			windSpeed: windSpeed10m[i] ?? 0,
		});
	}

	return windows;
}
