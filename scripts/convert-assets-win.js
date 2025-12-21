const fs = require('fs');
const path = require('path');

// Simple BMP Encoder for 24-bit RGB (No dependencies)
function encodeBMP(imgData, width, height) {
    const rowSize = (width * 3 + 3) & ~3; // Align to 4 bytes
    const fileSize = 54 + rowSize * height;
    const buffer = Buffer.alloc(fileSize);

    // Bitmap File Header
    buffer.write('BM', 0);
    buffer.writeUInt32LE(fileSize, 2);
    buffer.writeUInt32LE(54, 10); // Offset to pixel data

    // DIB Header
    buffer.writeUInt32LE(40, 14); // Header size
    buffer.writeInt32LE(width, 18);
    buffer.writeInt32LE(height, 22); // Positive height = bottom-up (standard BMP)
    buffer.writeUInt16LE(1, 26); // Planes
    buffer.writeUInt16LE(24, 28); // BPP
    buffer.writeUInt32LE(0, 30); // Compression (BI_RGB)
    buffer.writeUInt32LE(rowSize * height, 34); // Image size

    // Pixel Data
    // Note: We need raw RGB data. Since we don't have a PNG decoder, 
    // we will rely on the fact that we can just use the previous Puppeteer script 
    // to output a BMP directly if we can, OR we just use a placeholder 
    // BUT since we can't easily decode PNG without a lib, 
    // I will modify the generate-installer-assets.js to output SCREENSHOTS 
    // which Puppeteer can do... actually Puppeteer only does PNG/JPEG/WEBP.

    // RETRACTION: Writing a pure JS PNG decoder is too complex.
    // ALTERNATIVE: Use Jimp if available? No.
    // ALTERNATIVE: Use PowerShell to convert.
    return null;
}

// Plan B: PowerShell conversion script
const psScript = `
Add-Type -AssemblyName System.Drawing

function Convert-To24BitBmp {
    param(
        [string]$SourcePath,
        [string]$DestPath
    )
    
    $srcImage = [System.Drawing.Image]::FromFile($SourcePath)
    # Create a blank bitmap with the same dimensions but 24-bit RGB format
    $destImage = New-Object System.Drawing.Bitmap($srcImage.Width, $srcImage.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    
    # Draw the source image onto the new 24-bit bitmap
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.DrawImage($srcImage, 0, 0, $srcImage.Width, $srcImage.Height)
    $graphics.Dispose()
    
    # Save as BMP
    $destImage.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
    
    $destImage.Dispose()
    $srcImage.Dispose()
}

Convert-To24BitBmp "${path.resolve('build/installerSidebar.png')}" "${path.resolve('build/installerSidebar.bmp')}"
Convert-To24BitBmp "${path.resolve('build/installerHeader.png')}" "${path.resolve('build/installerHeader.bmp')}"
`;

const cp = require('child_process');
const psPath = path.join(__dirname, 'convert.ps1');
fs.writeFileSync(psPath, psScript);

console.log('Running PowerShell conversion...');
try {
    cp.execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`);
    console.log('Conversion complete: .bmp files created in build/');
    fs.unlinkSync(psPath); // cleanup
} catch (e) {
    console.error('Conversion failed:', e.message);
}
