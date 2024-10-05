import puppeteer from 'puppeteer';
import assert from 'assert';
import dotenv from 'dotenv';

dotenv.config();

export async function scrapeTUWEL(req, res) {
    const browser = await puppeteer.launch({devtools: true});
    const page = await browser.newPage();
    
    try {
        
        const login = await checkIfLoggedInTUWEL(page);
        
        // If not logged in - log in
        if (!login) {
            await page.click("a.btn.btn-primary.btn-lg.my-3.my-md-5.font-weight-bold.px-5")
            console.log('Username from .env:', process.env.TUWEL_USERNAME);
            await page.locator("#username").fill(process.env.TUWEL_USERNAME);
            await page.locator("#password").fill(process.env.TUWEL_PASSWORD);
            await page.locator("#samlloginbutton").click();

            if (page.url() === "https://idp.zid.tuwien.ac.at/simplesaml/module.php/core/loginuserpass.php?") {
                throw new Error("Login failed, wrong credentials");
            }
        }
        //login successful

        const data = await getScrapedData(page);

//        await browser.close();
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Error during scraping:', err);
        res.status(500).json({ success: false, message: 'Scraping failed', err });
    }
}

async function checkIfLoggedInTUWEL(page) {
    const tuwelURL = "https://tuwel.tuwien.ac.at/my/";
    await page.goto(tuwelURL);
    await page.setViewport({width: 1600, height: 800});

    if (page.url() === "https://tuwel.tuwien.ac.at/login/index.php") {
        return false;
    } else if (page.url() == tuwelURL) {
        return true;
    } else {
        throw new Error("Unexpected URL while trying to log into TUWEL: " + page.url() + "Please contact Thor")
    }
}


async function getScrapedData(page) {
    await page.waitForNavigation({ waitUntil: "networkidle0" });
    assert(page.url() === "https://tuwel.tuwien.ac.at/my/");

    await page.locator('button[aria-label="Zeitleiste nach Datum filtern"]').click();
    await page.locator('a[data-filtername="next6months"]').click();
}
