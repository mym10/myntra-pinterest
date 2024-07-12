const fs = require('fs');
const path = require('path');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Create a client
const client = new ImageAnnotatorClient();

async function detectClothing(imagePath) {
  try {
    // Perform object localization
    const [result] = await client.objectLocalization({ image: { source: { filename: imagePath } } });
    const objects = result.localizedObjectAnnotations;

    // Perform label detection
    const [labelResult] = await client.labelDetection({ image: { source: { filename: imagePath } } });
    const labels = labelResult.labelAnnotations.map(label => label.description.toLowerCase());

    return { objects, labels };
  } catch (err) {
    console.error('Error detecting clothing:', err);
    throw err;
  }
}

async function detectAndMatchClothing(testDatabaseDir, databaseImagesDir) {
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
    
    try {
      // Detect objects and labels in the test image
      const { objects, labels } = await detectClothing(testImagePath);

      let similarImages = [];

      // Match detected clothing type with database images
      for (const dbImagePath of databaseImagePaths) {
        // Skip processing if no objects were detected
        if (!objects || objects.length === 0) {
          continue;
        }

        // Check if the object type matches any labels
        const dbLabels = path.basename(dbImagePath).toLowerCase().replace(path.extname(dbImagePath), '');
        if (labels.some(label => dbLabels.includes(label))) {
          similarImages.push(dbImagePath);
        }
      }

      results[testImagePath] = similarImages;
    } catch (err) {
      console.error(`Error processing image ${testImagePath}:`, err);
      results[testImagePath] = [];
    }
  }

  return results;
}

// Usage example
const testDatabaseDir = './0 test database';
const databaseImagesDir = './0 clothes database';

detectAndMatchClothing(testDatabaseDir, databaseImagesDir).then(results => {
  for (let [inputImage, similarImages] of Object.entries(results)) {
    console.log(`Similar images for ${inputImage}:`, similarImages);
  }
}).catch(err => {
  console.error("Error detecting and matching clothing:", err);
});