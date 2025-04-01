import dotenv from "dotenv";
import tzlookup from "tz-lookup";

dotenv.config();

const LATITUDE = 35.6869752;
const LONGITUDE = -105.937799;
const TZ = tzlookup(LATITUDE, LONGITUDE);

export const config = {
	// Weather conditions
	MIN_TEMP_F: 45,
	MAX_TEMP_F: 75,
	MAX_PRECIP_CHANCE: 20, // percentage
	MAX_WIND_MPH: 25, // mph
	IDEAL_MIN_TEMP_F: 55,
	IDEAL_MAX_TEMP_F: 70,
	IDEAL_PRECIP_CHANCE: 5, // percentage
	IDEAL_WIND_MPH: 10, // mph

	// Location (Santa Fe, NM)
	LATITUDE,
	LONGITUDE,
	TZ,

	// APIs
	GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,

	// Google Auth
	GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
	GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),

	// Calendar event settings
	DAYS_TO_FORECAST: 14,
};

process.env.TZ = TZ;
