const { google } = require('googleapis');
require('dotenv').config()

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
)
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const FOLDER_ID = '11T7jAQ_Hup5lG9oxvcWydXo3GMJpVqqR';

async function getFileIdByName(fileName, folderId = '11T7jAQ_Hup5lG9oxvcWydXo3GMJpVqqR') {
    try {
        const response = await drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
        });

        if (!response.data.files.length) {
            console.log(`Файл "${fileName}" не найден в папке.`);
            return null;
        }

        return response.data.files[0].id;
    } catch (error) {
        console.error('Ошибка:', error.message);
        return null;
    }
}

async function generatePublicUrl(fileName) {
    const fileId = await getFileIdByName(fileName);
    if (!fileId) return;

    try {
        // Открываем доступ
        await drive.permissions.create({
            fileId,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        // Получаем ссылку
        const result = await drive.files.get({
            fileId,
            fields: 'webViewLink, webContentLink',
        });

        console.log('Ссылка для скачивания:', `https://drive.google.com/uc?id=${fileId}&export=download`);
    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

async function listFilesWithDownloadLinks() {
    try {
        // 1. Получаем все файлы из папки
        const response = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType)',
            pageSize: 1000, // Максимальное количество файлов
        });

        const files = response.data.files;
        if (files.length === 0) {
            console.log('В папке нет файлов.');
            return;
        }

        console.log(`Файлы в папке "Test Folder":\n${'-'.repeat(50)}`);

        // 2. Для каждого файла генерируем ссылку
        for (const file of files) {
            const downloadUrl = `https://drive.google.com/uc?id=${file.id}&export=download`;
            console.log(`Название: ${file.name}`);
            console.log(`ID: ${file.id}`);
            console.log(`Ссылка для скачивания: ${downloadUrl}`);
            console.log(`Тип файла: ${file.mimeType}`);
            console.log('-'.repeat(50));
        }
    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}


// listFilesWithDownloadLinks();


// async function listFilesInFolder(folderId) {
//     const res = await drive.files.list({
//         q: `'${folderId}' in parents and trashed=false`,
//         fields: 'files(id, name)',
//     });
//     console.log(res.data.files);
// }
// listFilesInFolder('11T7jAQ_Hup5lG9oxvcWydXo3GMJpVqqR');


// async function listAllFiles() {
//     let files = [];
//     let nextPageToken = null;

//     do {
//         const res = await drive.files.list({
//             q: 'sharedWithMe',
//             pageSize: 1000,
//             fields: 'nextPageToken, files(id, name, mimeType, webContentLink, webViewLink, owners)',
//             pageToken: nextPageToken
//         });

//         files = files.concat(res.data.files);
//         nextPageToken = res.data.nextPageToken;
//     } while (nextPageToken);

//     return files;
// }

// listAllFiles()
//     .then(files => {
//         console.log(`Всего файлов: ${files.length}\n`);
//         files.forEach(file => {
//             console.log(`Название: ${file.name}`);
//             console.log(`ID: ${file.id}`);
//             console.log(`Тип: ${file.mimeType}`);
//             console.log(`Скачать: ${file.webContentLink || 'Нет прямой ссылки'}`);
//             console.log(`Открыть в браузере: ${file.webViewLink}`);
//             console.log(`Владелец: ${file.owners?.[0]?.emailAddress || 'Неизвестно'}`);
//             console.log('------------------------');
//         });
//     })
//     .catch(err => {
//         console.error('Ошибка при получении файлов:', err);
//     });



// async function findFolderByName(folderName) {
//     try {
//         const res = await drive.files.list({
//             q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
//             fields: 'files(id, name, createdTime, owners)',
//             spaces: 'drive'
//         });

//         const folders = res.data.files;

//         if (folders.length === 0) {
//             console.log(`Папка "${folderName}" не найдена.`);
//         } else {
//             console.log(`Найдено папок: ${folders.length}\n`);
//             folders.forEach(folder => {
//                 console.log(`Название: ${folder.name}`);
//                 console.log(`ID: ${folder.id}`);
//                 console.log(`Создана: ${folder.createdTime}`);
//                 console.log(`Владелец: ${folder.owners?.[0]?.emailAddress || 'Неизвестно'}`);
//                 console.log('------------------------');
//             });
//         }
//     } catch (err) {
//         console.error('Ошибка при поиске папки:', err);
//     }
// }

// findFolderByName('Sisu Factory');


async function findFoldersByPartialName(partialName) {
    try {
        const res = await drive.files.list({
            q: `mimeType = 'application/vnd.google-apps.folder' and name contains '${partialName}' and trashed = false`,
            fields: 'files(id, name, createdTime, owners)',
            spaces: 'drive'
        });

        const folders = res.data.files;

        if (folders.length === 0) {
            console.log(`Папки с фрагментом "${partialName}" не найдены.`);
        } else {
            console.log(`Найдено папок: ${folders.length}\n`);
            folders.forEach(folder => {
                console.log(`Название: ${folder.name}`);
                console.log(`ID: ${folder.id}`);
                console.log(`Создана: ${folder.createdTime}`);
                console.log(`Владелец: ${folder.owners?.[0]?.emailAddress || 'Неизвестно'}`);
                console.log('------------------------');
            });
        }
    } catch (err) {
        console.error('Ошибка при поиске папок:', err);
    }
}


findFoldersByPartialName('For Alisa');