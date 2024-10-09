import puppeteer from 'puppeteer';
import assert from 'assert';
import dotenv from 'dotenv';

dotenv.config();

export async function scrapeTUWEL(req, res) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        const login = await checkIfLoggedInTUWEL(page);
        
        if (!login) {
            await loginToTUWEL(page);
        }
        
        await setupPage(page);

        const assignments = await scrapeData(page);

        console.log(assignments);

        await browser.close();
        res.status(200).json({ success: true, assignments });
    } catch (err) {
        console.error('Error during scraping:', err);
        res.status(500).json({ success: false, message: 'Scraping failed', err });
    }
}



async function checkIfLoggedInTUWEL(page) {
    const tuwelURL = "https://tuwel.tuwien.ac.at/my/";
    await page.goto(tuwelURL, { waitUntil: 'networkidle0' });

    if (page.url() === "https://tuwel.tuwien.ac.at/login/index.php") {
        return false;
    } else if (page.url() == tuwelURL) {
        return true;
    } else {
        throw new Error("Unexpected URL while trying to log into TUWEL: " + page.url() + "Please contact Thor");
    }
}

async function loginToTUWEL(page) {
    try {
        await page.click("a.btn.btn-primary.btn-lg.my-3.my-md-5.font-weight-bold.px-5");
    
        await page.waitForSelector( "#username.form-control", { visible: true });
        await page.click("#username.form-control");
        await page.type("#username.form-control", process.env.TUWEL_USERNAME, { delay: 100 });
        
        await page.click("#password.form-control");
        await page.type("#password.form-control", process.env.TUWEL_PASSWORD, { delay: 100 });
        
    
        await page.locator("button#samlloginbutton").click();
    
        if (page.url() === "https://idp.zid.tuwien.ac.at/simplesaml/module.php/core/loginuserpass.php?") {
            throw new Error("Login failed, wrong credentials");
        }
    } catch (err) {
        throw new Error("Couldn't log in to TUWEL");
    }
}

async function setupPage(page) {
    try {
        // Wait for navigation and assert the URL
        await page.waitForNavigation({ waitUntil: "networkidle0" });
        assert(page.url().startsWith("https://tuwel.tuwien.ac.at/my"));

        const buttonText = await page.evaluate(() => {
            const button = document.querySelector('button[aria-label="Zeitleiste nach Datum filtern"]');
            return button ? button.innerHTML : null; // Return innerHTML or null if button doesn't exist
        });

        if (!buttonText == "Nächste 6 Monate") {
            await page.locator('button[aria-label="Zeitleiste nach Datum filtern"]').click();
            await Promise.all([
                page.click('a[data-filtername="next6months"]'),
                page.waitForNavigation({waitUntil: 'networkidle0'})
            ]);
        }

        // Wait for the "Mehr Aktivitäten" button to be visible
        const moreEventsButtonSelector = 'button.btn.btn-secondary[data-action="more-events"]';
        try {
            await page.waitForSelector(
                moreEventsButtonSelector,
                 { timeout: 1000 }
                );
            await page.click(moreEventsButtonSelector);
        } catch (err) {
            console.log("No more data button");
        }

        return true;

    } catch (error) {
        throw new Error(error);
    }
}

async function scrapeData(page) {
    try {
        
        const assignments = await page.evaluate(() => {
            const data = [];
            const assignment = document.querySelectorAll('[data-region="event-list-content-date"]');
    
            assignment.forEach(element => {
                const date = element.querySelector('h5').innerText;
    
                // Get the next sibling which contains the list of events
                const nextElement = element.nextElementSibling;
                const eventItems = nextElement.querySelectorAll('[data-region="event-list-item"]');
    
                eventItems.forEach(item => {
                    const time = item.querySelector('.text-right').innerText;
                    const title = item.querySelector('.event-name a').innerText;
                    const description = item.querySelector('small.mb-0').innerText;
    
                    data.push({
                        title,
                        date,
                        time,
                        description
                    });
                });
            });
            return data;
        });

        return assignments;

    } catch (error) {
        throw new Error("Problems scraping data: " + error);
    }
}

