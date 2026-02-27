import { TargetLevel } from './types';

export const mockTargetLevels: TargetLevel[] = [];

// Generate some mock targets for testing
const categories = ['VUB/SSK', 'AMB', 'LÄKARE'];
const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

categories.forEach(cat => {
    weeks.forEach(week => {
        let baseHours = 0;
        if (cat === 'VUB/SSK') baseHours = 350; // roughly 10 full time
        if (cat === 'AMB') baseHours = 200; // roughly 5-6 full time
        if (cat === 'LÄKARE') baseHours = 40; // 1 full time

        // Add some variation for summer (weeks 25-33)
        if (week >= 25 && week <= 33) {
            baseHours = baseHours * 0.8; // Lower need in summer? Or higher? Let's say lower.
        }

        mockTargetLevels.push({
            category: cat,
            year: 2026,
            week_number: week,
            hours: baseHours
        });
    });
});
