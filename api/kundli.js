async function generateMahadevKundli() {
        const dob = document.getElementById('k_dob').value;
        const time = document.getElementById('k_time').value;
        const lat = document.getElementById('k_lat').value;
        const lon = document.getElementById('k_lon').value;
        const resultSection = document.getElementById('result-section');
        const submitBtn = document.getElementById('submitBtn');

        if(!dob || !time || !lat || !lon) {
            alert("🔱 कृपया सभी आवश्यक जानकारी भरें!");
            return;
        }

        // 🛑 SMART JUGAAD 1: Daily Limit Check (Max 2 Charts Per Day)
        const todayDate = new Date().toLocaleDateString();
        let usage = JSON.parse(localStorage.getItem('kundliUsage')) || { date: todayDate, count: 0 };
        
        if (usage.date !== todayDate) {
            usage = { date: todayDate, count: 0 }; // नया दिन, नई शुरुआत!
        }

        // 🛑 SMART JUGAAD 2: Cache System Check
        // चेक करो कि क्या ये सेम डिटेल्स पहले से सेव हैं?
        const cacheKey = `kundli_${dob}_${time}_${lat}_${lon}`;
        const cachedData = localStorage.getItem(cacheKey);

        if (!cachedData && usage.count >= 2) {
            // अगर नया चार्ट है और लिमिट पार हो गई है
            alert("😂 Today's limit exhausted! Come tomorrow and try again or try after 12:00 AM 🕛");
            return;
        }

        submitBtn.innerText = "ब्रह्मांडीय गणना हो रही है... ⏳";
        submitBtn.style.opacity = "0.7";
        resultSection.style.display = "block";
        
        // 🎨 UI Update Function (डेटा छापने का लॉजिक)
        const renderKundli = (data) => {
            // 1. 3 Charts Inject
            document.getElementById('lagna_svg').innerHTML = data.charts.lagna;
            document.getElementById('navamsha_svg').innerHTML = data.charts.navamsha;
            document.getElementById('chalit_svg').innerHTML = data.charts.chalit;
            
            // 2. Planets Table
            let tableHTML = "";
            if (data.planets && Array.isArray(data.planets)) {
                data.planets.forEach(p => {
                    let status = "मार्गी"; 
                    let isRetro = (p.isRetro === "true" || p.isRetro === true);
                    if(isRetro) status = "वक्री (R) 🔄";

                    tableHTML += `<tr>
                        <td><b>${p.name || '-'}</b></td>
                        <td>${p.sign || p.rasi || '-'}</td>
                        <td>${p.normDegree ? p.normDegree.toFixed(2) : (p.degree ? p.degree.toFixed(2) : '-')}°</td>
                        <td>${p.nakshatra || '-'}</td>
                        <td>${p.nakshatra_pad || p.nakshatra_pada || '-'}</td>
                        <td style="color: ${isRetro ? '#ff4d4d' : '#4caf50'};">${status}</td>
                    </tr>`;
                });
            }
            document.getElementById('planets_body').innerHTML = tableHTML;

            // 3. Birth Details
            let bdHtml = "";
            if(data.birthDetails) {
                const bd = data.birthDetails;
                const extractName = (item) => {
                    if (Array.isArray(item) && item.length > 0) return item.map(i => i.name).join(", ");
                    return item?.name || "-";
                };
                
                bdHtml += `<div><b>राशि:</b> ${extractName(bd.chandra_rasi)}</div>`;
                bdHtml += `<div><b>नक्षत्र:</b> ${extractName(bd.nakshatra)}</div>`;
                bdHtml += `<div><b>नक्षत्र पद:</b> ${bd.nakshatra_pada || "-"}</div>`;
                bdHtml += `<div><b>तिथि:</b> ${extractName(bd.tithi)}</div>`;
                bdHtml += `<div><b>करण:</b> ${extractName(bd.karan)}</div>`;
                bdHtml += `<div><b>योग:</b> ${extractName(bd.yoga)}</div>`;
                bdHtml += `<div><b>वर्ण:</b> ${bd.varna || "-"}</div>`;
                bdHtml += `<div><b>वश्य:</b> ${bd.vashya || "-"}</div>`;
                bdHtml += `<div><b>योनि:</b> ${bd.yoni || "-"}</div>`;
                bdHtml += `<div><b>गण:</b> ${bd.gana || "-"}</div>`;
                bdHtml += `<div><b>नाड़ी:</b> ${bd.nadi || "-"}</div>`;
                bdHtml += `<div><b>पाया:</b> ${bd.paya || "-"}</div>`;
            }
            document.getElementById('basic_panchang_data').innerHTML = bdHtml;

            // 👑 Paywall Removed & Consult Banner Added
            const paywall = document.querySelector('.paywall-container');
            if(paywall) {
                paywall.innerHTML = `
                    <h3 class="gold-text cinzel" style="margin-bottom: 10px;">🔱 विस्तृत कुण्डली विश्लेषण</h3>
                    <p style="font-size: 0.95rem; color: #fff; line-height: 1.6;">दशा (महादशा/अंतर्दशा), गोचर फल, कालसर्प दोष, मांगलिक दोष और सटीक उपायों की <b>संपूर्ण जानकारी</b> के लिए हमारे विशेषज्ञों से परामर्श लें।</p>
                    <a href="https://wa.me/YOUR_NUMBER" class="calc-btn" style="text-decoration:none; padding:12px 25px; font-size:1rem; width:auto; display:inline-block; margin-top:15px; background: #25D366; color: #fff; border-radius: 5px;">📱 WhatsApp पर संपर्क करें</a>
                `;
            }
            
            // Remove blur completely
            const premiumContent = document.querySelector('.blur-text');
            if(premiumContent) premiumContent.style.display = 'none';
            
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            submitBtn.innerText = "कुण्डली बनाएं ➔";
            submitBtn.style.opacity = "1";
        };

        // 🚀 THE DECISION: Cache use karein ya API?
        if (cachedData) {
            console.log("🔱 Data Loaded From Cache (Credits Saved!)");
            renderKundli(JSON.parse(cachedData));
        } else {
            console.log("🔱 Fetching Fresh Data From Server...");
            const datetime = `${dob}T${time}:00%2B05:30`;
            const coordinates = `${lat},${lon}`;
            const API_URL = "https://mahadev-astrologer-api.vercel.app/api/kundli"; 

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ datetime, coordinates })
                });

                const rawResponse = await response.text();
                let data = JSON.parse(rawResponse);

                if(!data.success) {
                    alert("API Error: " + JSON.stringify(data.error));
                    submitBtn.innerText = "कुण्डली बनाएं ➔";
                    submitBtn.style.opacity = "1";
                    return;
                }

                // 💾 Save to Cache & Update Daily Limit
                localStorage.setItem(cacheKey, JSON.stringify(data));
                usage.count += 1;
                localStorage.setItem('kundliUsage', JSON.stringify(usage));

                renderKundli(data);

            } catch (error) {
                console.error("Fetch Error:", error);
                alert("सर्वर से संपर्क विफल।");
                submitBtn.innerText = "कुण्डली बनाएं ➔";
                submitBtn.style.opacity = "1";
            }
        }
    }
