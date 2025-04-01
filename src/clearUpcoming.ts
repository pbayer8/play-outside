import { WeatherCalendarService } from "./services/weatherCalendarService";

async function clearUpcomingEvents() {
	try {
		const calendarService = new WeatherCalendarService();
		await calendarService.clearUpcomingEvents();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

clearUpcomingEvents();
