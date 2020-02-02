'use strict';
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/print', function (req, res) {
    
	res.render('print', {
		page: 'index',
		data: {
		   
		}
	});
    
});

module.exports = router;
