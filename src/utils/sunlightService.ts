import SunCalc from "suncalc";
import { config } from "../config";
import type { Daylight } from "../types";

export function getDaylightWindows(days: number): Daylight[] {
	const windows: Daylight[] = [];
	const now = new Date();

	for (let i = 0; i < days; i++) {
		const date = new Date(now);
		date.setDate(date.getDate() + i);

		const times = SunCalc.getTimes(date, config.LATITUDE, config.LONGITUDE);
		windows.push({
			sunrise: config.INCLUDE_CIVIL_TWILIGHT ? times.dawn : times.sunrise,
			sunset: config.INCLUDE_CIVIL_TWILIGHT ? times.dusk : times.sunset,
		});
	}

	return windows;
}
