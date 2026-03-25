module.exports = async function (req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { datetime, coordinates } = req.body;
        if (!datetime || !coordinates) {
            return res.status(400).json({ success: false, error: 'Missing datetime or coordinates' });
        }

        // 1. Prokerala Token
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
        
        if (!accessToken) {
            throw new Error("Prokerala API Keys Missing or Invalid!");
        }

        const commonParams = `datetime=${datetime}&coordinates=${coordinates}&ayanamsa=1&la=hi`;
        const headers = { 
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
        };

        // 2. Fetch Logic
        async function smartFetch(url) {
            try {
                const response = await fetch(url, { headers });
                const text = await response.text();
                try { 
                    return JSON.parse(text); 
                } catch (e) {
                    if (text.trim().startsWith('<svg')) return { data: { svg: text } }; 
                    return { data: null };
                }
            } catch (err) {
                return { data: null };
            }
        }

        // 3. API Calls
        const [planets, lagna, navamsha, chalit, birthDetails] = await Promise.all([
            smartFetch(`https://api.prokerala.com/v2/astrology/planet-position?${commonParams}`),
            smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=rasi&chart_style=north-indian`),
            smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=navamsa&chart_style=north-indian`),
            smartFetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=chalit&chart_style=north-indian`),
            smartFetch(`https://api.prokerala.com/v2/astrology/birth-details?${commonParams}`)
        ]);

        return res.status(200).json({
            success: true,
            planets: planets?.data || [],
            birthDetails: birthDetails?.data || {},
            charts: {
                lagna: lagna?.data?.svg || "-",
                navamsha: navamsha?.data?.svg || "-",
                chalit: chalit?.data?.svg || "-"
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
