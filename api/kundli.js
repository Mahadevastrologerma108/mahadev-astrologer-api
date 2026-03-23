export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { datetime, coordinates } = req.body;

    try {
        // 1. Get Access Token (Using Built-in Fetch)
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

        if (!accessToken) throw new Error("Failed to get Access Token");

        // 2. Prepare Requests
        const commonParams = `datetime=${datetime}&coordinates=${coordinates}`;
        const headers = { Authorization: `Bearer ${accessToken}` };

        // Sabhi data ek sath mangna (Parallel Fetch)
        const [planetsRes, lagnaRes, navamshaRes, chandraRes] = await Promise.all([
            fetch(`https://api.prokerala.com/v2/astrology/planets?${commonParams}`, { headers }),
            fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=birth&chart_style=north-indian`, { headers }),
            fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=navamsha&chart_style=north-indian`, { headers }),
            fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=moon&chart_style=north-indian`, { headers })
        ]);

        const planets = await planetsRes.json();
        const lagna = await lagnaRes.json();
        const navamsha = await navamshaRes.json();
        const chandra = await chandraRes.json();

        // 3. Send Success Response
        res.status(200).json({
            success: true,
            planets: planets.data,
            charts: {
                lagna: lagna.data.svg,
                navamsha: navamsha.data.svg,
                chandra: chandra.data.svg
            }
        });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
