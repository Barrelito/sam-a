import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // @sparticuz/chromium levererar Chromium som brotli-packade filer i paketets
    // bin-katalog. Bundlar Next in paketet i funktionen försvinner den katalogen,
    // och chromium.executablePath() letar efter filer som inte finns:
    //   The input directory "/var/task/node_modules/@sparticuz/chromium/bin"
    //   does not exist. Please provide the location of the brotli files.
    // Externa paket lämnas orörda och spåras med sitt innehåll intakt.
    // Gäller alla PDF-exporter: personallista, övertid och veckobrev.
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

    // Bältesspänne: se till att brotli-filerna följer med i just de funktioner
    // som renderar PDF. Katalogen är ~64 MB, så den ska inte läggas i alla
    // API-rutter - bara i de tre som faktiskt startar Chromium.
    outputFileTracingIncludes: {
        "/api/employees/export-pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
        "/api/overtime/export-pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
        "/api/chefstod/newsletters/[id]/export-pdf": [
            "./node_modules/@sparticuz/chromium/bin/**",
        ],
    },
};

export default nextConfig;
