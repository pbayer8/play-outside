import { config } from "../config";
import type { Daylight } from "../types";
import SuncalcService from "./suncalcService";

export class SunlightService {
	getDaylightWindows(days: number): Daylight[] {
		const windows: Daylight[] = [];
		const now = new Date();

		for (let i = 0; i < days; i++) {
			const date = new Date(
				Date.UTC(
					now.getUTCFullYear(),
					now.getUTCMonth(),
					now.getUTCDate() + i,
					0,
					0,
					0,
					0,
				),
			);

			const times = SuncalcService.getTimes(
				date,
				config.LATITUDE,
				config.LONGITUDE,
				undefined,
				true,
			);
			windows.push({
				sunrise: times.sunrise,
				sunset: times.sunset,
			});
		}

		return windows;
	}
}
