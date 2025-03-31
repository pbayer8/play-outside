import { CalendarService } from "./services/calendarService";

async function clearUpcomingEvents() {
	try {
		const calendarService = new CalendarService();
		await calendarService.clearUpcomingEvents();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

clearUpcomingEvents();
