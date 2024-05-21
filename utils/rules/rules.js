const puppeteer = require("puppeteer");

const games = [
  {
    title: "High Stakes",
    season: "2024-2025",
    programs: ["V5RC", "VURC", "VAIRC"],
    url: "https://www.robotevents.com/storage/game_manual/V5RC_2024-2025_High_Stakes/rules/",
  },
  {
    title: "Rapid Relay",
    season: "2024-2025",
    programs: ["VIQRC"],
    url: "https://www.robotevents.com/storage/game_manual/VIQRC_2024-2025_Rapid_Relay/rules/",
  },
  {
    title: "Over Under",
    season: "2023-2024",
    programs: ["V5RC", "VURC", "VAIRC"],
    url: "https://www.robotevents.com/storage/game_manual/VRC_2023-2024_Over_Under/rules/",
  },
  {
    title: "Full Volume",
    season: "2023-2024",
    programs: ["VIQRC"],
    url: "https://www.robotevents.com/storage/game_manual/VIQRC_2023-2024_Full_Volume/rules/",
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
      "Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0"
    );
    await rulePage.setUserAgent(
      "Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0"
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
        (g) => g.rules[0].rule.replaceAll(/[^A-Z]/g, "") === group
      );
      if (groupIndex < 0) {
        groupIndex = ruleGroups.length;
        ruleGroups.push({ name: "", programs: game.programs, rules: [] });
      }

      const link = new URL(base);
      link.pathname += rule + ".html";

      await rulePage.goto(link);

      const name = await (
        await rulePage.$("h1")
      ).evaluate((t) => t.textContent);
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

      output.games.push({
        title: game.title,
        season: game.season,
        programs: game.programs,
        ruleGroups,
      });
    }

    console.log(JSON.stringify(output, null, 4));

    await browser.close();
  }
})();
