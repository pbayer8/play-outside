import SunCalc from "suncalc";
import { config } from "../config";
import type { Daylight } from "../types";

export class SunlightService {
	getDaylightWindows(days: number): Daylight[] {
		const windows: Daylight[] = [];
		const now = new Date();

		for (let i = 0; i < days; i++) {
			const date = new Date(now);
			date.setDate(date.getUTCDate() + i);

			const times = SunCalc.getTimes(date, config.LATITUDE, config.LONGITUDE);
			windows.push({
				sunrise: times.sunrise,
				sunset: times.sunset,
			});
		}

		return windows;
	}
}
