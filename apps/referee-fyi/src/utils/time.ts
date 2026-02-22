export function timeAgo(input: Date) {
	const date = new Date(input);
	const formatter = new Intl.RelativeTimeFormat("en");
	const ranges = {
		years: 3600 * 24 * 365,
		months: 3600 * 24 * 30,
		weeks: 3600 * 24 * 7,
		days: 3600 * 24,
		hours: 3600,
		minutes: 60,
		seconds: 1,
	};
	const secondsElapsed = (date.getTime() - Date.now()) / 1000;
	for (const [key, value] of Object.entries(ranges)) {
		if (value < Math.abs(secondsElapsed)) {
			const delta = secondsElapsed / value;
			return formatter.format(
				Math.round(delta),
				key as Intl.RelativeTimeFormatUnit,
			);
		}
	}
	return formatter.format(-1, "seconds");
}
