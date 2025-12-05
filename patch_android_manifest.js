import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, 'client/android/app/src/main/AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
    console.error('AndroidManifest.xml not found. Run "npx cap add android" first.');
    process.exit(1);
}

let content = fs.readFileSync(manifestPath, 'utf8');

const intentFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="magnet" />
            </intent-filter>
`;

if (content.includes('android:scheme="magnet"')) {
    console.log('Magnet intent filter already exists.');
} else {
    // Insert before the closing </activity> tag of the main activity
    const mainActivityRegex = /<activity[^>]*>[\s\S]*?android\.intent\.action\.MAIN[\s\S]*?<\/activity>/;
    const match = content.match(mainActivityRegex);

    if (match) {
        const activityContent = match[0];
        const newActivityContent = activityContent.replace('</activity>', `${intentFilter}\n        </activity>`);
        content = content.replace(activityContent, newActivityContent);
        fs.writeFileSync(manifestPath, content);
        console.log('Added magnet intent filter to AndroidManifest.xml');
    } else {
        console.error('Could not find Main Activity in AndroidManifest.xml');
    }
}
