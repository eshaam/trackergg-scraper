import { PlaywrightCrawler, Dataset, log, ProxyConfiguration } from 'crawlee';
import { Actor } from 'apify';
import OpenAI from 'openai';

// ---------------- CONFIGURATION ----------------
const CONFIG = {
    openaiModel: "gpt-4o",
    navigationTimeout: 90000, // 90 seconds
    typingDelay: 150, // ms between keystrokes for autocomplete
    games: {
        // You can easily add more games here by following the pattern
        "fortnite": {
            baseUrl: "https://fortnitetracker.com",
            platformMap: { 'psn': 'psn', 'xbox': 'xbl', 'pc': 'pc' }
        },
        "marvel-rivals": {
            baseUrl: "https://tracker.gg/marvel-rivals",
            platformMap: { 'steam': 'steam', 'psn': 'psn', 'xbox': 'xbl' }
        }
    }
};

// ---------------- HELPERS ----------------

/**
 * Constructs a direct profile URL based on known patterns to avoid search flakiness.
 * @param {string} game - The game key (e.g., 'warzone')
 * @param {string} username - Player username
 * @param {string} platform - Player platform
 * @returns {string|null} - The constructed URL or null if pattern unknown.
 */
function constructDirectUrl(game, username, platform) {
    const gameConfig = CONFIG.games[game];
    if (!gameConfig || !username || !platform) return null;

    // Use default platform slug or look it up in the config map
    const pSlug = gameConfig.platformMap[platform.toLowerCase()] || platform;
    const encodedUser = encodeURIComponent(username);

    // Pattern matching for different sub-domains
    if (game === 'warzone' || game === 'apex' || game === 'fortnite' || game === 'marvel-rivals') {
        return `${gameConfig.baseUrl}/profile/${pSlug}/${encodedUser}/overview`;
    }

    return null;
}

/**
 * Interacts with the AI model to parse raw HTML/Text into JSON.
 */
async function extractStatsWithAI(openaiClient, game, rawText) {
    if (!openaiClient) {
        log.error("OpenAI Client not initialized. Skipping extraction.");
        return null;
    }

    const systemPrompt = `
    You are a strict data extraction engine. 
    Task: Extract player stats for "${game}" from the provided website text.
    
    Output Format: JSON
    Schema: { "username": string, "rank": string, "kills": string, "matchesPlayed": string, "winRate": string }
    
    Rules:
    1. If a stat is explicitly missing, use null.
    2. Do not calculate or hallucinate data.
    `;

    try {
        const completion = await openaiClient.chat.completions.create({
            model: CONFIG.openaiModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: rawText.slice(0, 45000) } // Trim to avoid token limits
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
        log.error(`AI Extraction Error: ${e.message}`);
        return null;
    }
}

/**
 * Handles the UI interaction when direct navigation fails.
 */
async function performSearch(page, targetUser) {
    log.info(`Performing manual search interaction for: ${targetUser}`);

    // 1. Locate Search Input
    const searchSelectors = ['input[type="search"]', '.search-container input', 'input[placeholder*="Search"]'];
    let searchInput;

    for (const sel of searchSelectors) {
        if (await page.locator(sel).first().isVisible()) {
            searchInput = page.locator(sel).first();
            break;
        }
    }

    if (!searchInput) throw new Error("Search input not found in DOM.");

    // 2. Interaction: Focus -> Clear -> Type Slowly
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially(targetUser, { delay: CONFIG.typingDelay });
    await page.waitForTimeout(2000); // Wait for AJAX dropdown

    // 3. Selection Strategy
    const autocompleteOption = page.locator('div[class*="option"], .search-result, .force-search');

    // Most reliable method for Tracker.gg: click the first autocomplete result
    if (await autocompleteOption.count() > 0) {
        log.info(`Clicking autocomplete suggestion...`);
        await autocompleteOption.first().click();
    } else {
        // Fallback: Press Enter and then click search icon if URL hasn't changed
        log.info(`No autocomplete found. Pressing Enter...`);
        await searchInput.press('Enter');

        await page.waitForTimeout(1000);
        const searchIcon = page.locator('.fa-search, button[type="submit"], svg.search-icon');
        if (await searchIcon.count() > 0 && page.url().includes('search?')) {
            log.info(`Clicking search icon directly after failed Enter...`);
            await searchIcon.first().click();
        }
    }
}

// ---------------- MAIN ACTOR ----------------

await Actor.init();

// Input Handling
const input = await Actor.getInput() || {};
const { players = [] } = input;

// Validate Environment
if (!process.env.OPENAI_API_KEY) {
    await Actor.fail('Missing OPENAI_API_KEY in environment variables.');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// 🛑 PROXY FIX: You cannot combine RESIDENTIAL with other proxy groups. 
// We try for RESIDENTIAL first, and fall back to AUTO if necessary/configured externally.
let proxyConfiguration;
try {
    // Attempt to use the dedicated Residential proxy group (recommended for stability)
    proxyConfiguration = await Actor.createProxyConfiguration({
        groups: ['RESIDENTIAL'],
        countryCode: 'US'
    });
} catch (e) {
    // Fallback to the general AUTO proxy group
    log.warning(`Residential proxy unavailable or misconfigured: ${e.message}. Falling back to AUTO.`);
    proxyConfiguration = await Actor.createProxyConfiguration({
        groups: ['AUTO'],
        countryCode: 'US'
    });
}


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
        const config = CONFIG.games[game];

        if (!config) {
            log.error(`Game configuration not found for: ${game}`);
            return;
        }

        // --- STEP 1: Determine Navigation Strategy ---
        let targetUrl = config.baseUrl;
        const directUrl = constructDirectUrl(game, username, platform);
        let usedDirectNav = false;

        if (directUrl) {
            targetUrl = directUrl;
            usedDirectNav = true;
        }

        log.info(`[${game}] Navigating to: ${targetUrl} (Direct Mode: ${usedDirectNav})`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.navigationTimeout });

        // --- STEP 2: Handle Cookie Consent ---
        try {
            const consentBtn = page.locator('button:has-text("Accept"), button:has-text("Agree"), button[mode="primary"]');
            if (await consentBtn.count() > 0) {
                await consentBtn.first().click({ timeout: 5000 });
            }
        } catch (e) { /* Ignore consent errors */ }

        // --- STEP 3: Fallback to Search if Direct Nav failed or wasn't used ---
        const currentUrl = page.url();
        // Check if we are still on the homepage (the base URL) after navigation
        const isOnHomePage = currentUrl.replace(/\/$/, '') === config.baseUrl.replace(/\/$/, '');

        if (!usedDirectNav || isOnHomePage) {
            try {
                await performSearch(page, targetUser);
            } catch (err) {
                log.warning(`[${game}] Search interaction failed: ${err.message}`);
                // Continue to try and see if we are on a valid page anyway
            }
        }

        // --- STEP 4: Validation & waiting ---
        log.info(`[${game}] Waiting for profile data load...`);
        try {
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            await page.waitForSelector('.user-info, .profile-header, .stat, .main-content', { timeout: 10000 });
        } catch (e) {
            log.warning(`[${game}] Profile wait timeout. Analyzing what we have...`);
        }

        const finalUrl = page.url();

        // Final check if we are stuck on the base URL or a generic search results page
        if (finalUrl.includes('search?') || finalUrl === config.baseUrl) {
            const errMessage = "Crawler stuck on Homepage or Search Results. Profile not found.";
            log.error(`[${game}] ${errMessage}`);
            await Dataset.pushData({ status: "failed", game, user: targetUser, error: errMessage });
            return;
        }

        // --- STEP 5: AI Extraction ---
        log.info(`[${game}] Extracting stats from ${finalUrl}...`);

        let contentText;
        try {
            contentText = await page.locator('main, #app').innerText({ timeout: 2000 });
        } catch (e) {
            contentText = await page.locator('body').innerText();
        }

        const stats = await extractStatsWithAI(openai, game, contentText);

        await Dataset.pushData({
            status: "success",
            game,
            user: targetUser,
            url: finalUrl,
            stats
        });
    },
});

// Request Generation
const requests = [];
for (const p of players) {
    for (const gameKey of p.games) {
        if (CONFIG.games[gameKey]) {
            requests.push({
                url: CONFIG.games[gameKey].baseUrl,
                userData: {
                    game: gameKey,
                    username: p.username,
                    platform: p.platform,
                    marvelId: p.marvelId
                }
            });
        } else {
            log.warning(`Skipping unknown game: ${gameKey}`);
        }
    }
}

log.info(`Starting crawler with ${requests.length} requests...`);
await crawler.run(requests);
await Actor.exit();