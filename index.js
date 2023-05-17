require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { s3Uploadv2, s3Uploadv3 } = require("./s3Service");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const uuid = require("uuid").v4;
const hbs = require("hbs");
const path = require("path");
const bodyparser = require("body-parser");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const app = express();

const template_path = path.join(__dirname, "./views");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyparser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.set("view engine", "hbs");

app.set("views", template_path);
const storage = multer.memoryStorage();
const upload = multer({
  storage,
});



app.get("/", async(req, res) => {
  const bucketName = process.env.AWS_BUCKET_NAME;

  // Fetch the list of objects from the bucket
  const params = {
    Bucket: bucketName,
    Prefix: "uploads/cms",
  };

  s3.listObjects(params, (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving images');
    } else {
      const images = data.Contents.map((obj) => {
        // Generate a pre-signed URL for each image
        const imageUrl = s3.getSignedUrl('getObject', {
          Bucket: bucketName,
          Key: obj.Key,
        });
        return { key: obj.Key, url: imageUrl };
      });

      // Render the images in the HBS template
      res.render('formpost', { images });
    }
  });
  // try {
  //   const images = await getImagesFromS3Bucket();
  //   console.log(images);
  //   res.render("formpost", { images });
  // } catch (error) {
  //   console.error(error);
  //   res.status(500).send("Internal Server Error");
  // }
});

const s3Clients = new S3Client({
  region: "ap-southeast-1", // Replace with your actual AWS region, e.g., "us-east-1"
});

const getImagesFromS3Bucket = async () => {
  const s3Client = new S3Client();

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Prefix: "uploads/cms",
  };

  const command = new ListObjectsV2Command(params);
  const response = await s3Clients.send(command);

  return response.Contents;
};


app.post("/", upload.array("filess"), async (req, res) => {
  var files = req.body.filess;
  console.log(files);
  try {
    const results = await s3Uploadv2(req.files);
    console.log(results);
    return res.json({ status: "success" });
  } catch (err) {
    console.log(err);
  }
});
//single file upload
// const upload = multer({ dest: "uploads/" });
// app.post("/upload", upload.single("file"), (req, res) => {
//   res.json({ status: "success" });
// });

// multiple file uploads
// const upload = multer({ dest: "uploads/" });
// app.post("/upload", upload.array("file", 2), (req, res) => {
//   res.json({ status: "success" });
// });

// custom filename

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads");
//   },
//   filename: (req, file, cb) => {
//     const { originalname } = file;
//     cb(null, `${uuid()}-${originalname}`);
//   },
// });

// multiple file uploads
// const upload = multer({ storage });
// app.post("/upload", upload.array("file", 2), (req, res) => {
//   res.json({ status: "success" });
// });

// multiple fields upload
// const upload = multer({ dest: "uploads/" });

// const multiUpload = upload.fields([
//   { name: "image" },
//   { name: "documents"},
// ]);
// app.post("/upload", multiUpload, (req, res) => {
//   console.log(req.files);
//   res.json({ status: "success" });
// });





// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.split("/")[0] === "image") {
//     cb(null, true);
//   } else {
//     cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
//   }
// };

// ["image", "jpeg"]





// app.post("/upload", upload.array("file"), async (req, res) => {
//   try {
//     const results = await s3Uploadv3(req.files);
//     console.log(results);
//     return res.json({ status: "success" });
//   } catch (err) {
//     console.log(err);
//   }
// });

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "file is too large",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "File limit reached",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "File must be an image",
      });
    }
  }
});

app.listen(4000, () => console.log("listening on port https://localhost:4000/"));
