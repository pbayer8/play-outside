import { CalendarService } from "./services/calendarService";

async function clearAllEvents() {
	try {
		const calendarService = new CalendarService();
		await calendarService.clearAllEvents(true);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

clearAllEvents();
