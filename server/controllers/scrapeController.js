import puppeteer from 'puppeteer';

export async function scrapeTUWEL(req, res) {
    const browser = await puppeteer.launch({devtools: true});
    const page = await browser.newPage();
    
    try {
        
        const login = await loginTUWEL(page);
        
        if (!login) {
            
        }


//        await browser.close();
        res.status(200).json({ success: true, "data":true });
    } catch (err) {
        console.error('Error during scraping:', err);
        res.status(500).json({ success: false, message: 'Scraping failed', err });
    }
}

async function loginTUWEL(page) {
    const tuwelURL = "https://tuwel.tuwien.ac.at/my/";
    await page.goto(tuwelURL);
    await page.setViewport({width: 1080, height: 1024});

    if (page.url() === "https://tuwel.tuwien.ac.at/login/index.php") {
        return false;
    } else if (page.url() == tuwelURL) {
        return true;
    } else {
        throw new Error("Unexpected URL while trying to log into TUWEL: " + page.url() + "Please contact Thor")
    }
}