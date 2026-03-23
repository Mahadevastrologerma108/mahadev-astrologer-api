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

        const commonParams = `datetime=${datetime}&coordinates=${coordinates}`;
        const headers = { Authorization: `Bearer ${accessToken}` };

        // 🔱 Ek-ek karke request mangna (Safer for Sandbox Mode)
        const planetsRes = await fetch(`https://api.prokerala.com/v2/astrology/planets?${commonParams}`, { headers });
        const planets = await planetsRes.json();

        const lagnaRes = await fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=birth&chart_style=north-indian`, { headers });
        const lagna = await lagnaRes.json();

        const navamshaRes = await fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=navamsha&chart_style=north-indian`, { headers });
        const navamsha = await navamshaRes.json();

        const chandraRes = await fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=moon&chart_style=north-indian`, { headers });
        const chandra = await chandraRes.json();

        // 🛑 Error Check: Agar data missing ho
        if (!planets.data || !lagna.data || !navamsha.data || !chandra.data) {
            throw new Error(JSON.stringify(lagna.errors || "Data structure mismatch from Prokerala"));
        }

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
        res.status(500).json({ success: false, error: error.message });
    }
}
