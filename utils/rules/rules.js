const puppeteer = require("puppeteer");

const games = [
	// {
	//   title: "Push Back",
	//   season: "2025-2026",
	//   programs: ["V5RC", "VURC", "VAIRC"],
	//   url: "https://www.robotevents.com/storage/game_manual/VEX_V5_Robotics_Competition_2025-2026_Push_Back/rules/",
	// },
	{
		title: "Mix & Match",
		season: "2025-2026",
		programs: ["VIQRC"],
		url: "https://www.robotevents.com/storage/game_manual/VEX_IQ_Robotics_Competition_2025-2026_Mix_Match/rules/",
	},
];

(async () => {
	const output = { games: [] };

	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	for (const game of games) {
		console.error(game.title);
		const base = new URL(game.url);

		const rulePage = await browser.newPage();

		await page.setUserAgent(
			"Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0",
		);
		await rulePage.setUserAgent(
			"Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0",
		);

		// Navigate the page to a URL
		await page.goto(base);

		const ruleGroups = [];

		const rules = await page.$$("li a");

		for (const r of rules) {
			const element = r.asElement();
			if (!element) continue;

			const rule = await element.evaluate((e) => e.textContent);
			const group = rule.replaceAll(/[^A-Z]/g, "");

			let groupIndex = ruleGroups.findIndex(
				(g) => g.rules[0].rule.replaceAll(/[^A-Z]/g, "") === group,
			);
			if (groupIndex < 0) {
				groupIndex = ruleGroups.length;
				ruleGroups.push({ name: "", programs: game.programs, rules: [] });
			}

			const link = new URL(base);
			link.pathname += `${rule}.html`;

			await rulePage.goto(link);

			const name = await (await rulePage.$("h1")).evaluate(
				(t) => t.textContent,
			);
			const description = (await rulePage.$eval("body", (el) => el.innerText))
				.split("\n")[1]
				.split(".")[0]
				.trim();

			const body = {
				rule: name,
				description,
				link: link.href,
			};

			console.error(body.rule, body.description);

			ruleGroups[groupIndex].rules.push(body);
		}

		output.games.push({
			title: game.title,
			season: game.season,
			programs: game.programs,
			ruleGroups,
		});

		console.log(JSON.stringify(output, null, 4));

		await browser.close();
	}
})();
