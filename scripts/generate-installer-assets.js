const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function convert(source, dest, width, height) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    const svgContent = fs.readFileSync(source, 'utf8');
    await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { margin: 0; padding: 0; background-color: #000000; overflow: hidden; }
                svg { display: block; width: 100%; height: 100%; }
            </style>
        </head>
        <body>
            ${svgContent}
        </body>
        </html>
    `);

    await page.screenshot({ path: dest, omitBackground: false }); // Ensure no transparency for BMP conversion security

    await browser.close();
    console.log(`Generated ${dest} from ${source}`);
}

(async () => {
    const resourcesDir = path.join(__dirname, '../resources');

    // Sidebar
    await convert(
        path.join(resourcesDir, 'sidebar-source.svg'),
        path.join(resourcesDir, 'sidebar.png'),
        492, 942
    );

    // Header
    await convert(
        path.join(resourcesDir, 'header-source.svg'),
        path.join(resourcesDir, 'header.png'),
        450, 171
    );

    // DMG Background
    await convert(
        path.join(resourcesDir, 'dmg-source.svg'),
        path.join(resourcesDir, 'dmg_background.png'),
        540, 380
    );
})();
