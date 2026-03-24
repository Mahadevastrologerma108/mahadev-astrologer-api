export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    const { datetime, coordinates } = req.body;

    try {
        const tokenResponse = await fetch('https://api.prokerala.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.PROKERALA_CLIENT_ID,
                client_secret: process.env.PROKERALA_CLIENT_SECRET
            })
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error("Access Token Not Found");

        const commonParams = `datetime=${datetime}&coordinates=${coordinates}&ayanamsa=1&la=hi`;
        const headers = { 
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
        };

        // 🛑 THE BULLETPROOF FETCHER (No change here)
        async function smartFetch(url) {
            const response = await fetch(url, { headers });
            const text = await response.text();
            try {
                return JSON.parse(text); 
            } catch (e) {
                if (text.trim().startsWith('<svg')) {
                    return { data: { svg: text } }; 
                }
                throw new Error("Prokerala Sent Unknown Data: " + text.substring(0, 30));
            }
        }

        // 🚀 THE BRAHMASTRA: Fetching EVERYTHING at the exact same time! (2x Faster)
        const [planets, lagna, navamsha, chandra, chalit, dasamsa, birthDetails, dasha] = await Promise.all([
            smartFetch(`https://api.prokerala.com/v2/astrology/planets?${commonParams}`),
            smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=rasi&chart_style=north-indian`),
            smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=navamsa&chart_style=north-indian`),
            smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=moon&chart_style=north-indian`),
            smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=chalit&chart_style=north-indian`),
            smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=dasamsa&chart_style=north-indian`),
            smartFetch(`https://api.prokerala.com/v2/astrology/birth-details?${commonParams}`),
            smartFetch(`https://api.prokerala.com/v2/astrology/dasha?${commonParams}`)
        ]);

        // Send Mega Data to Website
        res.status(200).json({
            success: true,
            planets: planets.data || [],
            birthDetails: birthDetails.data || {},
            dasha: dasha.data || {},
            charts: {
                lagna: lagna.data ? lagna.data.svg : "<p>Chart Error</p>",
                navamsha: navamsha.data ? navamsha.data.svg : "<p>Chart Error</p>",
                chandra: chandra.data ? chandra.data.svg : "<p>Chart Error</p>",
                chalit: chalit.data ? chalit.data.svg : "<p>Chart Error</p>",
                dasamsa: dasamsa.data ? dasamsa.data.svg : "<p>Chart Error</p>"
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
