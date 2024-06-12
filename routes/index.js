var express = require('express');
var router = express.Router();

/* GET home page routing */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Express',
    protocol: req.protocol,
    host: req.get('host')
  });
});


module.exports = router;
