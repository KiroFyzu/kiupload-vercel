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
var uploadDir = path.join(__dirname, '../../tmp/');

// Untuk hosting di localhost/dedicated server (VPS) 
// var uploadDir = path.join(__dirname, './tmp/');


fs.ensureDirSync(uploadDir);

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

var upload = multer({ storage });
// view setup
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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