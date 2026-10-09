const { google } = require('googleapis');
const fs = require('fs');

const DEFAULT_FOLDER_ID = '1gzYtiqFXn6lyyr4sDQa6jfXsb7qBHq9L';
const DEFAULT_FOLDER_URL = 'https://drive.google.com/drive/folders/1gzYtiqFXn6lyyr4sDQa6jfXsb7qBHq9L';

/**
 * Service untuk mengunggah berkas ke Google Drive
 * Mendukung autentikasi via:
 * 1. Service Account JSON Key via environment variable (GOOGLE_SERVICE_ACCOUNT_JSON)
 * 2. Service Account Key via Email & Private Key (GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
 * 3. Service Account Key via file path (GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
 * 4. OAuth2 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)
 */
async function uploadToDrive(filePath, fileName, mimeType) {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID;

    let authClient = null;

    try {
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                'https://developers.google.com/oauthplayground'
            );
            oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
            authClient = oauth2Client;
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            let jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
            if ((jsonStr.startsWith("'") && jsonStr.endsWith("'")) || (jsonStr.startsWith('"') && jsonStr.endsWith('"') && !jsonStr.startsWith('{"'))) {
                jsonStr = jsonStr.slice(1, -1);
            }
            const credentials = typeof jsonStr === 'object' ? jsonStr : JSON.parse(jsonStr);
            const jwtClient = google.auth.fromJSON(credentials);
            jwtClient.scopes = ['https://www.googleapis.com/auth/drive'];
            authClient = jwtClient;
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE && fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)) {
            authClient = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
                scopes: ['https://www.googleapis.com/auth/drive'],
            });
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
            const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
            authClient = new google.auth.JWT({
                email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                key: privateKey,
                scopes: ['https://www.googleapis.com/auth/drive'],
            });
        }

        if (!authClient) {
            console.warn('[Google Drive] Variabel kredensial belum disetel. Menyimpan file ke penyimpanan lokal.');
            return {
                googleDriveId: null,
                googleDriveLink: DEFAULT_FOLDER_URL,
                isLocal: true,
                folderUrl: DEFAULT_FOLDER_URL
            };
        }

        const drive = google.drive({ version: 'v3', auth: authClient });

        const fileMetadata = {
            name: fileName,
            parents: folderId ? [folderId] : undefined,
        };

        const media = {
            mimeType: mimeType || 'application/octet-stream',
            body: fs.createReadStream(filePath),
        };

        console.log(`[Google Drive] Mengunggah "${fileName}" ke folder ${folderId}...`);

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true,
        });

        console.log(`[Google Drive] Berhasil! ID berkas: ${response.data.id}`);

        return {
            googleDriveId: response.data.id,
            googleDriveLink: response.data.webViewLink || DEFAULT_FOLDER_URL,
            isLocal: false,
            folderUrl: DEFAULT_FOLDER_URL
        };
    } catch (err) {
        console.error('[Google Drive Upload Error Details]:', {
            message: err.message,
            code: err.code,
            status: err.status,
            errors: err.errors || err.response?.data
        });
        return {
            googleDriveId: null,
            googleDriveLink: DEFAULT_FOLDER_URL,
            isLocal: true,
            folderUrl: DEFAULT_FOLDER_URL,
            error: err.message
        };
    }
}

async function testDriveConnection() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID;
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE && !process.env.GOOGLE_REFRESH_TOKEN) {
        return {
            success: false,
            message: 'Variabel kredensial Google Drive (OAuth atau Service Account) belum disetel di server.',
            folderId
        };
    }

    try {
        let authClient = null;
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                'https://developers.google.com/oauthplayground'
            );
            oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
            authClient = oauth2Client;
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            let jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
            if ((jsonStr.startsWith("'") && jsonStr.endsWith("'")) || (jsonStr.startsWith('"') && jsonStr.endsWith('"') && !jsonStr.startsWith('{"'))) {
                jsonStr = jsonStr.slice(1, -1);
            }
            const credentials = typeof jsonStr === 'object' ? jsonStr : JSON.parse(jsonStr);
            const jwtClient = google.auth.fromJSON(credentials);
            jwtClient.scopes = ['https://www.googleapis.com/auth/drive'];
            authClient = jwtClient;
        }

        const drive = google.drive({ version: 'v3', auth: authClient });
        const folder = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, mimeType, capabilities',
            supportsAllDrives: true,
        });

        return {
            success: true,
            message: `Koneksi berhasil! Terhubung ke folder: "${folder.data.name}"`,
            folder: folder.data
        };
    } catch (err) {
        return {
            success: false,
            message: err.message,
            code: err.code,
            details: err.response?.data || err.errors
        };
    }
}

module.exports = { uploadToDrive, testDriveConnection, DEFAULT_FOLDER_ID, DEFAULT_FOLDER_URL };


