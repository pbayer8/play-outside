export interface WeatherWindow {
	start: Date;
	end: Date;
	temperature: number;
	precipChance: number;
}

export interface Daylight {
	sunrise: Date;
	sunset: Date;
}

export interface NiceWeatherWindow {
	start: Date;
	end: Date;
	temperature: number;
	precipChance: number;
	windSpeed: number;
}
