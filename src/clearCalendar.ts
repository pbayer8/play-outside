import { WeatherCalendarService } from "./services/weatherCalendarService";

async function clearAllEvents() {
	try {
		const calendarService = new WeatherCalendarService();
		await calendarService.clearAllEvents(true);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

clearAllEvents();
