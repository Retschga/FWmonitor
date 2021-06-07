import sharp from 'sharp';

/**
 * Erstellt ein Thumbnail zum angegebenen Bild
 * @param path
 * @param file
 * @returns
 */
export const createThumbnail = async (path: string, file: string) => {
    return new Promise(async (resolve, reject) => {
        sharp(path + '/' + file)
            .resize(200)
            .toFile(path + 'thumbnail-' + file, (err, resizeImage) => {
                if (err) {
                    reject('Thumbnail generation ERROR: ' + err);
                } else {
                    resolve(resizeImage);
                }
            });
    });
};

/**
 * Gibt die Größe des Bildes zurück
 * @param path
 * @param file
 * @returns
 */
export const getImageSize = async (path: string, file: string) => {
    return new Promise(async (resolve, reject) => {
        sharp(path + '/' + file)
            .metadata()
            .then((info) => {
                const dims = { width: info.width, height: info.height };
                // Interact with dims here
                // Or return it and interact in the next then
                resolve(dims);
            })
            .catch((error) => reject(error));
    });
};
