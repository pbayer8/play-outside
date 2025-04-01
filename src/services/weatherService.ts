import { config } from "../config";
import type { NiceWeatherWindow } from "../types";

export class WeatherService {
	private readonly baseUrl = "https://api.open-meteo.com/v1";

	async getHourlyForecast(days: number): Promise<NiceWeatherWindow[]> {
		const response = await fetch(
			`${this.baseUrl}/forecast?latitude=${config.LATITUDE}&longitude=${config.LONGITUDE}&hourly=temperature_2m,precipitation_probability,windspeed_10m&temperature_unit=fahrenheit&timezone=${encodeURIComponent(config.TZ)}&forecast_days=${days}`,
		);

		if (!response.ok) {
			throw new Error(`Weather API error: ${response.statusText}`);
		}

		const data = await response.json();
		const windows: NiceWeatherWindow[] = [];

		// Process each hour of the forecast
		for (let i = 0; i < data.hourly.time.length; i++) {
			const time = new Date(data.hourly.time[i]);
			const temperature = data.hourly.temperature_2m[i];
			const precipChance = data.hourly.precipitation_probability[i] ?? 0;
			const windSpeed = data.hourly.windspeed_10m[i] ?? 0;

			windows.push({
				start: time,
				end: new Date(time.getTime() + 60 * 60 * 1000), // Add 1 hour
				temperature,
				precipChance,
				windSpeed,
			});
		}

		return windows;
	}
}
