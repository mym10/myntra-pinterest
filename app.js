const express = require('express');
const bodyParser = require("body-parser");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { Client } = require('pg')

// Create an instance of the Google Cloud Vision API client
const client = new ImageAnnotatorClient();
const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "myntra",
  password: "password@1010",
  port: 5432
});
db.connect();


const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Configure multer for file upload handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.render("home");
});

app.post("/results", upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    async function detectSimilarImages(imagePath) {
      // Perform web detection on the input image
      const [result] = await client.webDetection(imagePath);
      const webDetection = result.webDetection;
      console.log(webDetection.webEntities);

      let similarImages = [];
      // Check for web entities
      if (webDetection.webEntities) {
        const entities = webDetection.webEntities.map(entity => entity.description);

        //query clothes table
        const query = 'SELECT * FROM clothes';
        const {rows} = await db.query(query)
        rows.forEach(row => {
          const descriptions = [row.description_1, row.description_2, row.description_3, row.description_4, row.description_5]
          const matchcount = descriptions.filter(descriptions => entities.includes(descriptions)).length;

          if (matchcount >= 2) {
            similarImages.push(row.image)
          }
        });
      }
      return similarImages;
    }

    detectSimilarImages(imagePath).then(similarImages => {
      res.json({ similarImages });
    }).catch(err => {
      console.error("Error detecting similar images:", err);
      res.status(500).json({ error: 'Error detecting similar images' });
    });

  } catch (error) {
    console.log("Failed to make a request:", error);
    res.status(500).json({ error: 'Failed to process the request' });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
