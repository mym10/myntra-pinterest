const fs = require('fs');
const path = require('path');
const vision = require('@google-cloud/vision');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const client = new vision.ImageAnnotatorClient();

async function getImageDescriptions(imageFolder) {
    const imageFiles = fs.readdirSync(imageFolder).filter(file => fs.lstatSync(path.join(imageFolder, file)).isFile());

    const descriptions = [];

    for (const imageFile of imageFiles) {
        const imagePath = path.join(imageFolder, imageFile);

        // Performs web detection on the image file
        const [result] = await client.webDetection(imagePath);
        const webDetection = result.webDetection;

        let imageDescriptions = { image: imageFile };
        
        if (webDetection.webEntities) {
            for (let i = 0; i < 5; i++) {
                if (webDetection.webEntities[i]) {
                    imageDescriptions[`description${i + 1}`] = webDetection.webEntities[i].description || '';
                } else {
                    imageDescriptions[`description${i + 1}`] = '';
                }
            }
        }

        descriptions.push(imageDescriptions);
    }

    return descriptions;
}

async function saveToCSV(data, outputFile) {
    const csvWriter = createCsvWriter({
        path: outputFile,
        header: [
            { id: 'image', title: 'Image' },
            { id: 'description1', title: 'Description_1' },
            { id: 'description2', title: 'Description_2' },
            { id: 'description3', title: 'Description_3' },
            { id: 'description4', title: 'Description_4' },
            { id: 'description5', title: 'Description_5' },
        ]
    });

    await csvWriter.writeRecords(data);
    console.log('CSV file written successfully');
}

async function main() {
    const imageFolder = './0 clothes database'; // replace with your image folder path
    const outputFile = 'descriptions.csv'; // replace with your desired output file name

    try {
        const descriptions = await getImageDescriptions(imageFolder);
        await saveToCSV(descriptions, outputFile);
    } catch (error) {
        console.error('Error during image processing:', error);
    }
}

main();
