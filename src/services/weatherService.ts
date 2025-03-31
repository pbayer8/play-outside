import { config } from "../config";
import type { NiceWeatherWindow } from "../types";

export class WeatherService {
	private readonly baseUrl = "https://api.open-meteo.com/v1";

	async getHourlyForecast(days: number): Promise<NiceWeatherWindow[]> {
		const url = `${this.baseUrl}/forecast?latitude=${config.LATITUDE}&longitude=${config.LONGITUDE}&hourly=temperature_2m,precipitation_probability,windspeed_10m&temperature_unit=fahrenheit&timezone=America%2FDenver&forecast_days=${days}`;
		console.log("Fetching weather data from:", url);

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Weather API error: ${response.statusText}`);
		}

		const data = await response.json();
		console.log("Weather API response:", JSON.stringify(data, null, 2));

		const windows: NiceWeatherWindow[] = [];

		// Process each hour of the forecast
		for (let i = 0; i < data.hourly.time.length; i++) {
			// Parse the time string and adjust for timezone
			const timeStr = data.hourly.time[i];
			const time = new Date(`${timeStr}Z`); // Append Z to force UTC interpretation
			const denverTime = new Date(time.getTime() - 6 * 60 * 60 * 1000); // Adjust for Denver timezone (UTC-6)

			const temperature = data.hourly.temperature_2m[i];
			const precipChance = data.hourly.precipitation_probability[i] ?? 0;
			const windSpeed = data.hourly.windspeed_10m[i] ?? 0;

			console.log(`Processing weather data point ${i}:`);
			console.log(`Raw time: ${timeStr}`);
			console.log(`UTC time: ${time.toISOString()}`);
			console.log(`Denver time: ${denverTime.toISOString()}`);
			console.log(`Denver hour: ${denverTime.getHours()}`);

			windows.push({
				start: denverTime,
				end: new Date(denverTime.getTime() + 60 * 60 * 1000), // Add 1 hour
				temperature,
				precipChance,
				windSpeed,
			});
		}

		console.log(`Created ${windows.length} weather windows`);
		console.log("First window:", JSON.stringify(windows[0], null, 2));
		console.log(
			"Last window:",
			JSON.stringify(windows[windows.length - 1], null, 2),
		);

		return windows;
	}
}
