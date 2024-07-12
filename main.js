//IMAGE DETECTION BASED ON CLOTHES - PRIORITY 3
const fs = require('fs');
const path = require('path');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Creates a client
const client = new ImageAnnotatorClient();

async function detectObjects(imagePath) {
  // Perform object localization on the input image
  const [result] = await client.objectLocalization({ image: { source: { filename: imagePath } } });
  const localizedObjectAnnotations = result.localizedObjectAnnotations;

  // Filter objects to include only 'Dress'
  const dressObjects = localizedObjectAnnotations.filter(object => object.name.toLowerCase() === 'dress');

  return dressObjects;
}

async function detectSimilarImages(testDatabaseDir, databaseImagesDir) {
  // Read test image paths from the test database directory
  const testImagePaths = fs.readdirSync(testDatabaseDir)
    .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
    .map(file => path.join(testDatabaseDir, file));

  // Read database image paths from the database directory
  const databaseImagePaths = fs.readdirSync(databaseImagesDir)
    .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
    .map(file => path.join(databaseImagesDir, file));

  let results = {};

  for (const testImagePath of testImagePaths) {
    console.log(`Processing image: ${testImagePath}`);
    
    // Detect objects in the test image
    const testDetectedObjects = await detectObjects(testImagePath);

    if (testDetectedObjects.length > 0) {
      let similarImages = [];

      // Check each database image for dresses
      for (const dbImagePath of databaseImagePaths) {
        const dbDetectedObjects = await detectObjects(dbImagePath);

        if (dbDetectedObjects.some(obj => obj.name.toLowerCase() === 'dress')) {
          similarImages.push(dbImagePath);
        }
      }

      results[testImagePath] = similarImages;
    }else {
        console.log(`No dresses detected in image: ${testImagePath}`);
        results[testImagePath] = []; // Ensure we still record a result for images with no detected objects
    }
  }

  return results;
}

// Usage example
const testDatabaseDir = './0 test database';
const databaseImagesDir = './0 clothes database';

detectSimilarImages(testDatabaseDir, databaseImagesDir).then(results => {
  for (let [inputImage, similarImages] of Object.entries(results)) {
    console.log(`Similar images for ${inputImage}:`, similarImages);
  }
}).catch(err => {
  console.error("Error detecting similar images:", err);
});
