import Jimp from 'jimp';
import moveFile from 'move-file';

/**
 * Erstellt ein Thumbnail zum angegebenen Bild
 * @param path
 * @param file
 * @returns
 */
export async function createThumbnail(path: string, file: string): Promise<void> {
    const img = await Jimp.read(path + '/' + file).catch((err) => {
        throw err;
    });
    img.scaleToFit(512, 256) // resize
        .quality(60) // set JPEG quality
        .write(path + '/thumbnail-' + file); // save

    /*     return new Promise(async (resolve, reject) => {
        sharp(path + '/' + file)
            .resize(200)
            .toFile(path + '/thumbnail-' + file, (err, resizeImage) => {
                if (err) {
                    reject('Thumbnail generation ERROR: ' + err);
                } else {
                    resolve(resizeImage);
                }
            });
    }); */
}

/**
 * Gibt die Größe des Bildes zurück
 * @param path
 * @param file
 * @returns
 */
export async function getImageSize(
    path: string,
    file: string
): Promise<{
    width: number;
    height: number;
}> {
    const img = await Jimp.read(path + '/' + file).catch((err) => {
        throw err;
    });
    img.getWidth();
    const dims = { width: img.getWidth(), height: img.getHeight() };
    return dims;

    /*     return new Promise(async (resolve, reject) => {
        sharp(path + '/' + file)
            .metadata()
            .then((info) => {
                const dims = { width: info.width, height: info.height };
                // Interact with dims here
                // Or return it and interact in the next then
                resolve(dims);
            })
            .catch((error) => reject(error));
    }); */
}

export async function createHd(path: string, file: string): Promise<void> {
    await moveFile(path + '/' + file, path + '/' + file + '.org');

    const img = await Jimp.read(path + '/' + file + '.org').catch((err) => {
        throw err;
    });
    img.scaleToFit(1920, 1080) // resize
        .quality(60) // set JPEG quality
        .write(path + '/' + file); // save

    /* return new Promise(async (resolve, reject) => {
        await moveFile(path + '/' + file, path + '/' + file + '.org');
        sharp(path + '/' + file + '.org')
            .resize(1920)
            .toFile(path + '/' + file, (err, resizeImage) => {
                if (err) {
                    reject('HD generation ERROR: ' + err);
                } else {
                    resolve(resizeImage);
                }
            });
    }); */
}

export async function rotate(path: string, file: string, deg: number): Promise<void> {
    const img = await Jimp.read(path + '/' + file).catch((err) => {
        throw err;
    });
    img.rotate(deg).write(path + '/' + file); // save

    const img_thumb = await Jimp.read(path + '/thumbnail-' + file).catch((err) => {
        throw err;
    });
    img_thumb.rotate(deg).write(path + '/thumbnail-' + file); // save
}
