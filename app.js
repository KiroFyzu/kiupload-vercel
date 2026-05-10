var createError = require('http-errors');
var express = require('express');
var multer = require('multer');
var { v4: uuidv4 } = require('uuid');
var path = require('path');
var fs = require('fs-extra');
var schedule = require('node-schedule');
var dayjs = require('dayjs');
var axios = require('axios');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');

var app = express();
// // Untuk hosting di Vercel || temporary storage manager with vercel Fix: https://github.com/orgs/vercel/discussions/314
// var uploadDir = path.join(__dirname, '../../tmp/');

// Untuk hosting di localhost/dedicated server (VPS) 
var uploadDir = path.join(__dirname, './tmp/');
var chunkDir = path.join(uploadDir, 'chunks');


fs.ensureDirSync(uploadDir);
fs.ensureDirSync(chunkDir);

//menyimpan file dengan nama unik
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    var ext = path.extname(file.originalname);
    var filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

var upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});

var chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    var uploadId = req.query.uploadId;
    if (!uploadId) {
      return cb(new Error('uploadId missing'));
    }
    var uploadPath = path.join(chunkDir, uploadId);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    var chunkIndex = req.query.chunkIndex;
    cb(null, `${chunkIndex}.part`);
  }
});

var chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});
// view setup
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '210mb' }));
app.use(express.urlencoded({ extended: false, limit: '210mb' }));
app.use(cookieParser());
app.use(cors());

app.use('/', indexRouter);

// upload file via form
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file yang di upload atau media tidak support' });
  }

  res.json({ 
    credit: 'https://github.com/KiroFyzu/',
    message: 'File uploaded successfully',
    fileUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
  });
});

app.post('/upload-init', (req, res) => {
  var fileName = req.body.fileName;
  var totalChunks = Number(req.body.totalChunks);
  var fileSize = Number(req.body.fileSize || 0);

  if (!fileName || !totalChunks) {
    return res.status(400).json({ error: 'Data upload tidak lengkap' });
  }

  var uploadId = uuidv4();
  var uploadPath = path.join(chunkDir, uploadId);
  fs.ensureDirSync(uploadPath);
  fs.writeJsonSync(path.join(uploadPath, 'meta.json'), {
    fileName,
    totalChunks,
    fileSize,
    createdAt: new Date().toISOString()
  });

  return res.json({ uploadId });
});

app.get('/upload-status', (req, res) => {
  var uploadId = req.query.uploadId;
  if (!uploadId) {
    return res.status(400).json({ error: 'uploadId tidak ada' });
  }

  var uploadPath = path.join(chunkDir, uploadId);
  if (!fs.existsSync(uploadPath)) {
    return res.json({ uploaded: [] });
  }

  var files = fs.readdirSync(uploadPath);
  var uploaded = files
    .filter(file => file.endsWith('.part'))
    .map(file => parseInt(file, 10))
    .filter(Number.isFinite);

  return res.json({ uploaded });
});

app.post('/upload-chunk', chunkUpload.single('chunk'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Chunk tidak ditemukan' });
  }
  return res.json({ received: Number(req.query.chunkIndex) });
});

app.post('/upload-complete', async (req, res) => {
  try {
    var uploadId = req.body.uploadId;
    var totalChunks = Number(req.body.totalChunks);
    var fileName = req.body.fileName || '';

    if (!uploadId || !totalChunks) {
      return res.status(400).json({ error: 'Data upload tidak lengkap' });
    }

    var uploadPath = path.join(chunkDir, uploadId);
    if (!fs.existsSync(uploadPath)) {
      return res.status(404).json({ error: 'Upload tidak ditemukan' });
    }

    var missing = [];
    for (var i = 0; i < totalChunks; i += 1) {
      var chunkPath = path.join(uploadPath, `${i}.part`);
      if (!fs.existsSync(chunkPath)) {
        missing.push(i);
      }
    }

    if (missing.length) {
      return res.status(400).json({ error: 'Chunk belum lengkap', missing });
    }

    var ext = path.extname(fileName);
    var finalName = `${uuidv4()}${ext}`;
    var finalPath = path.join(uploadDir, finalName);

    var writeStream = fs.createWriteStream(finalPath);
    var appendChunk = (chunkPath) => {
      return new Promise((resolve, reject) => {
        var readStream = fs.createReadStream(chunkPath);
        readStream.on('error', reject);
        readStream.on('end', resolve);
        readStream.pipe(writeStream, { end: false });
      });
    };

    for (var j = 0; j < totalChunks; j += 1) {
      await appendChunk(path.join(uploadPath, `${j}.part`));
    }

    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    await fs.remove(uploadPath);

    return res.json({
      credit: 'https://github.com/KiroFyzu/',
      message: 'File uploaded successfully',
      fileUrl: `${req.protocol}://${req.get('host')}/uploads/${finalName}`
    });
  } catch (error) {
    console.error('Failed to finalize upload', error);
    return res.status(500).json({ error: 'Failed to finalize upload' });
  }
});

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Ukuran file melebihi batas' });
  }
  return next(err);
});

// upload file via URL
app.get('/upload-url', async (req, res) => {
  var fileUrl = req.query.url;
  if (!fileUrl) {
    return res.status(400).json({ error: 'URL tidak valid' });
  }

  try {
    var response = await axios.get(fileUrl, { responseType: 'stream' });
    var ext = path.extname(fileUrl);
    var filename = `${uuidv4()}${ext}`;
    var filePath = path.join(uploadDir, filename);

    var writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      res.json({ 
        credit: 'https://github.com/KiroFyzu/',
        message: 'File uploaded successfully',
        fileUrl: `${req.protocol}://${req.get('host')}/uploads/${filename}`
      });
    });

    writer.on('error', (err) => {
      console.error('Failed to save the file', err);
      res.status(500).json({ error: 'Failed to save the file' });
    });

  } catch (error) {
    console.error('Failed to download the file', error);
    res.status(500).json({ error: 'Failed to download the file' });
  }
});

// file uploads
app.use('/uploads', express.static(uploadDir));

// menghapus file yang lebih dari 12 jam (internal)
var deleteOldFiles = () => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Failed to read directory', err);
      return;
    }

    files.forEach(file => {
      var filePath = path.join(uploadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Failed to get file stats', err);
          return;
        }

        if (stats.isDirectory()) {
          return;
        }

        var now = dayjs();
        var fileTime = dayjs(stats.ctime);
        var diff = now.diff(fileTime, 'hour');

        if (diff >= 12) {
          fs.remove(filePath, err => {
            if (err) {
              console.error('Failed to delete file', err);
            } else {
              console.log(`Deleted file: ${file}`);
            }
          });
        }
      });
    });
  });
};

// Endpoint untuk menampilkan daftar file yang diupload
app.get('/uploads-list', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Gagal membaca direktori', err);
      return res.status(500).json({ error: 'Gagal membaca direktori' });
    }

    var fileData = files.map(file => {
      return {
        name: file,
        url: `${req.protocol}://${req.get('host')}/uploads/${file}`
      };
    });

    res.render('history', { files: fileData });
  });
});

// penghapusan file setiap jam
schedule.scheduleJob('0 * * * *', deleteOldFiles);

// forward 404 ke error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error di development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;