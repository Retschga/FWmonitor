import sharp from 'sharp';

export const createThumbnail = async (path: string, file: string) => {
    return new Promise(async (resolve, reject) => {
        sharp(path + '/' + file)
        .resize(200)
        .toFile(path + 'thumbnail-' + file, (err, resizeImage) => {
            if (err) {
                reject("Thumbnail generation ERROR: " + err);
            } else {
                resolve(resizeImage);
            }
        });
    });
}