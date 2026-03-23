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
            'Accept': 'application/json' // Prokerala को सख्त निर्देश कि JSON ही भेजे
        };

        // 🛑 THE BULLETPROOF FETCHER: यह सीधा SVG और JSON दोनों को संभाल लेगा
        async function smartFetch(url) {
            const response = await fetch(url, { headers });
            const text = await response.text();
            try {
                return JSON.parse(text); // पहले JSON में बदलने की कोशिश
            } catch (e) {
                if (text.trim().startsWith('<svg')) {
                    return { data: { svg: text } }; // अगर सीधा SVG है, तो खुद पैक कर लो!
                }
                throw new Error("Prokerala Sent Unknown Data: " + text.substring(0, 30));
            }
        }

        // 1. Planets Info
        const planets = await smartFetch(`https://api.prokerala.com/v2/astrology/planets?${commonParams}`);
        
        // 2. Charts (Rasi, Navamsa, Moon)
        const lagna = await smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=rasi&chart_style=north-indian`);
        const navamsha = await smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=navamsa&chart_style=north-indian`);
        const chandra = await smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=moon&chart_style=north-indian`);

        // Send Final Data to Website
        res.status(200).json({
            success: true,
            planets: planets.data || [],
            charts: {
                lagna: lagna.data ? lagna.data.svg : "<p>Chart Error</p>",
                navamsha: navamsha.data ? navamsha.data.svg : "<p>Chart Error</p>",
                chandra: chandra.data ? chandra.data.svg : "<p>Chart Error</p>"
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}