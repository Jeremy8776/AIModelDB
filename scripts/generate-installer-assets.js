const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function convert(source, dest, width, height) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    const svgContent = fs.readFileSync(source, 'utf8');
    await page.setContent(svgContent);

    await page.screenshot({ path: dest, omitBackground: true }); // SVG has black rect anyway, but cleaner

    await browser.close();
    console.log(`Generated ${dest} from ${source}`);
}

(async () => {
    const resourcesDir = path.join(__dirname, '../resources');

    // Sidebar
    await convert(
        path.join(resourcesDir, 'sidebar-source.svg'),
        path.join(resourcesDir, 'sidebar.png'),
        164, 314
    );

    // Header
    await convert(
        path.join(resourcesDir, 'header-source.svg'),
        path.join(resourcesDir, 'header.png'),
        150, 57
    );

    // DMG Background
    await convert(
        path.join(resourcesDir, 'dmg-source.svg'),
        path.join(resourcesDir, 'dmg_background.png'),
        540, 380
    );
})();
