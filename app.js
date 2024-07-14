const express = require('express');
const bodyParser = require("body-parser");
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { Client } = require('pg');
const puppeteer = require('puppeteer');
const axios = require('axios');

// Google Cloud Vision API client instance
const client = new ImageAnnotatorClient();
const db = new Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT
});
db.connect();

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Function to scrape Pinterest board for image links
async function getPinterestImageLinks(boardUrl) {
  const browser = await puppeteer.launch({ headless: true }); // Set headless to true for production
  const page = await browser.newPage();

  try {
    await page.goto(boardUrl, { waitUntil: 'networkidle2' });

    // Extract image URLs using a unique Set
    const imageLinks = await page.evaluate(() => {
      const linkElements = document.querySelectorAll('link[as="image"][rel="preload"][href^="https://i.pinimg.com/"]');
      const uniqueLinks = new Set();
      linkElements.forEach(link => uniqueLinks.add(link.href));
      return Array.from(uniqueLinks);
    });

    return imageLinks;
  } catch (error) {
    console.error('Error during scraping:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Function to get image descriptions using Google Cloud Vision API
async function getImageDescriptions(imageUrl) {
  try {
    const [result] = await client.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'WEB_DETECTION' }]
    });
    const webDetection = result.webDetection;
    if (webDetection && webDetection.webEntities) {
      const descriptions = webDetection.webEntities.map(entity => entity.description);
      return descriptions;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching image description:', error);
    return [];
  }
}

app.get("/", (req, res) => {
  res.render("home");
});

app.post("/results", async (req, res) => {
  try {
    const { pinterestUrl } = req.body;

    if (!pinterestUrl) {
      return res.status(400).json({ error: 'Pinterest URL is required' });
    }

    //Get image links from Pinterest board
    const pinterestImageLinks = await getPinterestImageLinks(pinterestUrl);

    //Fetch descriptions for each image from Pinterest and compare with database
    const similarImagesSet = new Set();
    for (const imageUrl of pinterestImageLinks) {
      const imageDescriptions = await getImageDescriptions(imageUrl);

      //Query clothes table and compare descriptions
      const query = 'SELECT * FROM clothes';
      const { rows } = await db.query(query);

      rows.forEach(row => {
        const descriptionsInDb = [row.description_1, row.description_2, row.description_3, row.description_4, row.description_5];
        const matchCount = descriptionsInDb.filter(dbDesc => imageDescriptions.includes(dbDesc)).length;

        if (matchCount >= 3) {
          similarImagesSet.add(row.image);
        }
      });
    }
    const similarImages = Array.from(similarImagesSet);
    res.json({ similarImages });

  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: 'Failed to process the request' });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});