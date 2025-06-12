document.addEventListener("DOMContentLoaded", function () {
    function showBanglaDate() {
        const today = new Date();
        const gregorianDate = {
            date: today.getDate(),
            month: today.getMonth() + 1,
            year: today.getFullYear(),
        };
        const banglaDate = fhsConvertToBanglaDate(gregorianDate);
        document.getElementById("fhs-bangla-day").textContent = banglaDate.day;
        document.getElementById("fhs-bangla-date").textContent = banglaDate.date;
        document.getElementById("fhs-bangla-month").textContent = banglaDate.month;
        document.getElementById("fhs-bangla-year").textContent = banglaDate.year;
        document.getElementById("fhs-bangla-season").textContent =
            banglaDate.season;
    }

    // Improved Bangla date conversion (approximate)
    function fhsConvertToBanglaDate(gregorianDate) {
        const banglaMonths = [
            "বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন",
            "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"
        ];
        const banglaSeasons = [
            "গ্রীষ্মকাল", "বর্ষা্কাল", "শরৎ্কাল", "হে্মন্তকাল", "শীত্কাল", "বসন্তকাল"
        ];
        const banglaMonthStart = [
            { month: 4, day: 14 }, // বৈশাখ starts April 14
            { month: 5, day: 15 }, // জ্যৈষ্ঠ starts May 15
            { month: 6, day: 15 }, // আষাঢ় starts June 15
            { month: 7, day: 16 }, // শ্রাবণ starts July 16
            { month: 8, day: 16 }, // ভাদ্র starts August 16
            { month: 9, day: 16 }, // আশ্বিন starts September 16
            { month: 10, day: 17 }, // কার্তিক starts October 17
            { month: 11, day: 16 }, // অগ্রহায়ণ starts November 16
            { month: 12, day: 16 }, // পৌষ starts December 16
            { month: 1, day: 15 }, // মাঘ starts January 15
            { month: 2, day: 13 }, // ফাল্গুন starts February 13
            { month: 3, day: 15 }  // চৈত্র starts March 15
        ];

        // Find Bangla month and date
        let bMonth = 0, bDate = 0, bYear = gregorianDate.year - 593;
        for (let i = 0; i < 12; i++) {
            let start = banglaMonthStart[i];
            let end = banglaMonthStart[(i + 1) % 12];
            let startDate = new Date(gregorianDate.year, start.month - 1, start.day);
            let endDate = new Date(
                start.month > end.month
                    ? gregorianDate.year + 1
                    : gregorianDate.year,
                end.month - 1,
                end.day
            );
            let current = new Date(gregorianDate.year, gregorianDate.month - 1, gregorianDate.date);
            if (current >= startDate && current < endDate) {
                bMonth = i;
                bDate = Math.floor((current - startDate) / (1000 * 60 * 60 * 24)) + 1;
                // Adjust Bangla year for months before mid-April
                if (i < 0) bYear--;
                break;
            }
            // For January, February, March, adjust Bangla year
            if (gregorianDate.month < 4 || (gregorianDate.month === 4 && gregorianDate.date < 14)) {
                bYear--;
            }
        }

        // Day name
        const days = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
        const jsDate = new Date(gregorianDate.year, gregorianDate.month - 1, gregorianDate.date);
        const day = days[jsDate.getDay()];

        // Season
        const season = banglaSeasons[Math.floor(bMonth / 2)];

        // Convert date and year to Bangla numerals
        function toBanglaNumber(num) {
            return num
                .toString()
                .replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
        }

        return {
            day: day,
            date: toBanglaNumber(bDate),
            month: banglaMonths[bMonth],
            year: toBanglaNumber(bYear),
            season: season
        };
    }

    showBanglaDate();
});
