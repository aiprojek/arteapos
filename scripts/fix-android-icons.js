
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ICON_SOURCE = 'assets/icon.svg';
const ANDROID_RES_DIR = 'android/app/src/main/res';

const mipmapDensities = [
    { name: 'ldpi', size: 36 },
    { name: 'mdpi', size: 48 },
    { name: 'hdpi', size: 72 },
    { name: 'xhdpi', size: 96 },
    { name: 'xxhdpi', size: 144 },
    { name: 'xxxhdpi', size: 192 },
];

async function generateIcons() {
    if (!fs.existsSync(ICON_SOURCE)) {
        console.error('Source icon not found:', ICON_SOURCE);
        return;
    }

    for (const density of mipmapDensities) {
        const dir = path.join(ANDROID_RES_DIR, `mipmap-${density.name}`);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Generate ic_launcher.png
        await sharp(ICON_SOURCE)
            .resize(density.size, density.size)
            .toFile(path.join(dir, 'ic_launcher.png'));
        
        // Generate ic_launcher_round.png
        await sharp(ICON_SOURCE)
            .resize(density.size, density.size)
            .composite([{
                input: Buffer.from(`<svg><circle cx="${density.size/2}" cy="${density.size/2}" r="${density.size/2}"/></svg>`),
                blend: 'dest-in'
            }])
            .toFile(path.join(dir, 'ic_launcher_round.png'));

        console.log(`Generated icons for ${density.name} (${density.size}x${density.size})`);
    }

    // Generate Adaptive Icon Foreground/Background (108x108)
    const adaptiveSizes = [
        { name: 'mdpi', size: 108 * 1 },
        { name: 'hdpi', size: 108 * 1.5 },
        { name: 'xhdpi', size: 108 * 2 },
        { name: 'xxhdpi', size: 108 * 3 },
        { name: 'xxxhdpi', size: 108 * 4 },
    ];

    for (const density of adaptiveSizes) {
        const dir = path.join(ANDROID_RES_DIR, `mipmap-${density.name}`);
        
        // Foreground (Logo centered, transparent background)
        await sharp(ICON_SOURCE)
            .resize(Math.round(density.size * 0.6), Math.round(density.size * 0.6))
            .extend({
                top: Math.round(density.size * 0.2),
                bottom: Math.round(density.size * 0.2),
                left: Math.round(density.size * 0.2),
                right: Math.round(density.size * 0.2),
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(path.join(dir, 'ic_launcher_foreground.png'));

        // Background (Solid color based on logo color - #52a37c)
        await sharp({
            create: {
                width: density.size,
                height: density.size,
                channels: 4,
                background: { r: 82, g: 163, b: 124, alpha: 1 } // #52a37c
            }
        })
        .png()
        .toFile(path.join(dir, 'ic_launcher_background.png'));
        
        console.log(`Generated adaptive icons for ${density.name}`);
    }
}

generateIcons().catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
});
