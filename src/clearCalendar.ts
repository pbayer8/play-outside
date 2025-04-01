import { clearAllEvents } from "./utils/weatherCalendarService";

async function main() {
	try {
		await clearAllEvents(true);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

main();
