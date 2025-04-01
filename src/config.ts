import dotenv from "dotenv";
dotenv.config();

export const config = {
	// Weather conditions
	MIN_TEMP_F: 45,
	MAX_TEMP_F: 75,
	MAX_PRECIP_CHANCE: 20, // percentage
	MAX_WIND_MPH: 25, // mph

	// Location (Santa Fe, NM)
	LATITUDE: 35.6869752,
	LONGITUDE: -105.937799,

	// APIs
	GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,

	// Google Auth
	GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
	GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),

	// Calendar event settings
	DAYS_TO_FORECAST: 2,
};
