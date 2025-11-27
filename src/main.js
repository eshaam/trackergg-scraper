import { PlaywrightCrawler, Dataset, log } from 'crawlee';
import { Actor } from 'apify';
import OpenAI from 'openai';

// ---------------- CONFIGURATION ----------------
const OPENAI_MODEL = "gpt-4o";
const TIMEOUT_MS = 60000;

// Base URLs
const BASE_URLS = {
    "fortnite": "https://fortnitetracker.com",
    "marvel-rivals": "https://tracker.gg/marvel-rivals"
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------- AI HELPERS ----------------

async function extractStatsWithAI(game, rawText) {
    const systemPrompt = `
    You are a data extractor. Extract player stats for "${game}" from the text dump of a stats profile page.
    
    Rules:
    1. Look for keywords like "K/D", "Win %", "Kills", "Matches".
    2. Return a STRICT JSON object: { "username": string, "rank": string, "kills": string, "matchesPlayed": string, "winRate": string }.
    3. If a specific stat is not found, set it to null.
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: rawText.slice(0, 50000) }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
        log.error(`AI Extraction Error: ${e.message}`);
        return null;
    }
}

// ---------------- MAIN ACTOR ----------------

await Actor.init();
const input = await Actor.getInput() || {};
const { players = [] } = input;

const proxyConfiguration = await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'], countryCode: 'US' });

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    useSessionPool: true,
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 180,
    headless: true,

    preNavigationHooks: [async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.route('**/*.{png,jpg,jpeg,mp4,gif,woff,woff2}', (route) => route.abort());
    }],

    requestHandler: async ({ page, request }) => {
        const { game, username, platform, marvelId } = request.userData;
        const targetUser = (game === 'marvel-rivals' && marvelId) ? marvelId : username;

        // ---------------- STRATEGY 1: Direct URL Construction (Most Reliable) ----------------
        // If we know the platform, we skip the search bar entirely.
        let targetUrl = request.url;
        let isDirectNavigation = false;

        if (platform && username) {
            // Map common input platforms to URL slugs
            const platformMap = {
                'psn': 'psn', 'playstation': 'psn', 'ps5': 'psn',
                'xbox': 'xbl', 'xbl': 'xbl',
                'battlenet': 'battlenet', 'pc': 'battlenet',
                'origin': 'origin',
                'steam': 'steam'
            };
            const pSlug = platformMap[platform.toLowerCase()] || platform;

            if (game === 'warzone') {
                targetUrl = `${BASE_URLS[game]}/profile/${pSlug}/${encodeURIComponent(username)}/overview`;
                isDirectNavigation = true;
            } else if (game === 'apex') {
                targetUrl = `${BASE_URLS[game]}/profile/${pSlug}/${encodeURIComponent(username)}/overview`;
                isDirectNavigation = true;
            }
        }

        log.info(`[${game}] Navigating: ${targetUrl} (Direct Mode: ${isDirectNavigation})`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });

        // 1. Consent Handling
        try {
            const consentBtn = page.locator('button:has-text("Accept"), button:has-text("Agree"), button[mode="primary"]');
            if (await consentBtn.count() > 0) {
                await consentBtn.first().click({ timeout: 5000 }).catch(() => { });
                await page.waitForTimeout(1000);
            }
        } catch (e) { }

        // ---------------- STRATEGY 2: Search Interaction (If Direct Nav failed or not used) ----------------
        // If we are still on the homepage (or didn't use direct nav), we must search.
        const currentUrlInitial = page.url();
        const isHomePage = currentUrlInitial.length < (BASE_URLS[game].length + 5); // Rough check if we are on root

        if (!isDirectNavigation || isHomePage) {
            log.info(`[${game}] Performing Search interaction for: ${targetUser}`);

            // A. Find Input
            const selectors = ['input[type="search"]', '.search-container input', 'input[placeholder*="Search"]'];
            let searchInput;
            for (const sel of selectors) {
                if (await page.locator(sel).first().isVisible()) {
                    searchInput = page.locator(sel).first();
                    break;
                }
            }
            if (!searchInput) throw new Error("Search input not found");

            // B. Type Slow to trigger Autocomplete
            await searchInput.click();
            await searchInput.fill('');
            await searchInput.pressSequentially(targetUser, { delay: 150 }); // Typing slowly is KEY
            await page.waitForTimeout(2000); // Wait for dropdown

            // C. Try to click "Search" icon or "Autocomplete Result"
            // Tracker.gg often requires clicking the result, not just Enter
            const dropdownOption = page.locator('div[class*="option"], .search-result, .force-search');

            if (await dropdownOption.count() > 0) {
                log.info(`[${game}] Clicking autocomplete suggestion...`);
                await dropdownOption.first().click();
            } else {
                log.info(`[${game}] No autocomplete. Pressing Enter...`);
                await searchInput.press('Enter');

                // Fallback: Click search icon if Enter didn't work
                await page.waitForTimeout(1000);
                if (page.url() === currentUrlInitial) {
                    const searchIcon = page.locator('.fa-search, button[type="submit"], svg.search-icon');
                    if (await searchIcon.count() > 0) {
                        log.info(`[${game}] Clicking search icon directly...`);
                        await searchIcon.first().click();
                    }
                }
            }
        }

        // 3. Wait for Results
        log.info(`[${game}] Waiting for profile load...`);
        try {
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            // Wait specifically for a profile element
            await page.waitForSelector('.user-info, .profile-header, .stat', { timeout: 10000 });
        } catch (e) {
            log.warning(`[${game}] Wait timeout (might be 404 or slow). Checking URL...`);
        }

        const finalUrl = page.url();
        log.info(`[${game}] Final URL: ${finalUrl}`);

        if (finalUrl === BASE_URLS[game] || finalUrl.includes('search?')) {
            log.error(`[${game}] Failed to reach profile page.`);
            await Dataset.pushData({ status: "failed", game, user: targetUser, url: finalUrl, error: "Stuck on Search/Home" });
            return;
        }

        // 4. Extraction
        log.info(`[${game}] Extracting stats...`);
        let contentText;
        try {
            contentText = await page.locator('main').innerText({ timeout: 2000 });
        } catch (e) {
            contentText = await page.locator('body').innerText();
        }

        const stats = await extractStatsWithAI(game, contentText);

        await Dataset.pushData({
            status: "success",
            game,
            user: targetUser,
            url: finalUrl,
            stats
        });
    },
});

const requests = [];
for (const p of players) {
    for (const gameKey of p.games) {
        if (BASE_URLS[gameKey]) {
            requests.push({
                url: BASE_URLS[gameKey],
                userData: {
                    game: gameKey,
                    username: p.username,
                    platform: p.platform, // Ensure this is passed in your input JSON
                    marvelId: p.marvelId
                }
            });
        }
    }
}

await crawler.run(requests);
await Actor.exit();