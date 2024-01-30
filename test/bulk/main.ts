
import puppeteer from "puppeteer";
import "dotenv/config"

const BASE_URL = "http://localhost:5173";
const { SKU, CODE, DIVISION } = process.env;


(async () => {

    console.log(BASE_URL);
    console.log(`SKU: ${SKU} CODE: ${CODE}`);

    if (!SKU || !CODE) {
        return;
    }

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setViewport({ width: 412, height: 915, hasTouch: true, isMobile: true });


    const url = new URL(`/${SKU}/join?code=${CODE}`, BASE_URL);
    console.log(`Connecting to ${url}...`);
    await page.goto(url.toString());

    console.log(`OK`);

    let text = "Your Name";
    let selector = "xpath/" + `//label[text()='${text}']`;

    let input = await page.waitForSelector(selector);
    await input?.click();
    await page.keyboard.type('Test', { delay: 10 });

    // Enter name
    // const name = crypto.randomUUID();
    // await page.type("input[required]", name);
    // console.log("NAME: " + name);

    // const joinButton = await page.waitForSelector("button::-p-text(Join)");
    // await joinButton?.click();

    // url.pathname = `/${SKU}/${DIVISION}`;
    // await page.goto(url.toString());

    // // get all matches 
    // const selector = await page.waitForSelector("button[data-matchid]");
    // await selector?.click();

})();
