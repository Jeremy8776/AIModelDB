const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function convertSvgToPng() {
    const svgPath = path.join(__dirname, '../public/icon-static.svg');
    const outputPath = path.join(__dirname, '../public/icon-source.png');

    // Read SVG content
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    // Create HTML with the SVG - transparent background
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; }
                html, body { 
                    width: 1024px; 
                    height: 1024px; 
                    background: transparent !important;
                }
                svg { 
                    width: 1024px; 
                    height: 1024px; 
                }
            </style>
        </head>
        <body>
            ${svgContent}
        </body>
        </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
    await page.setContent(html);

    // Use omitBackground to preserve transparency
    await page.screenshot({
        path: outputPath,
        type: 'png',
        omitBackground: true,
        clip: { x: 0, y: 0, width: 1024, height: 1024 }
    });

    await browser.close();

    console.log(`✅ Converted SVG to PNG with transparency: ${outputPath}`);
}

convertSvgToPng().catch(console.error);
