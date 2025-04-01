import { clearUpcomingEvents } from "./utils/weatherCalendarService";

async function main() {
	try {
		await clearUpcomingEvents();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

main();
