const { google } = require('googleapis');
const fs = require('fs');

/**
 * Service untuk mengunggah berkas ke Google Drive admin
 * Membutuhkan kredensial di .env (opsional):
 * GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID
 */
async function uploadToDrive(filePath, fileName, mimeType) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Jika kredensial belum dikonfigurasi, gunakan penyimpanan lokal
    if (!clientId || !clientSecret || !refreshToken) {
        return {
            googleDriveId: null,
            googleDriveLink: null,
            isLocal: true,
        };
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const fileMetadata = {
            name: fileName,
            parents: folderId ? [folderId] : undefined,
        };

        const media = {
            mimeType: mimeType,
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        return {
            googleDriveId: response.data.id,
            googleDriveLink: response.data.webViewLink,
            isLocal: false,
        };
    } catch (err) {
        console.error('Google Drive Upload Error:', err.message);
        // Fallback ke penyimpanan lokal bila terjadi kendala jaringan/token
        return {
            googleDriveId: null,
            googleDriveLink: null,
            isLocal: true,
        };
    }
}

module.exports = { uploadToDrive };
