'use strict';
// ----------------  STANDARD LIBRARIES ---------------- 
var express = require('express');
var router = express.Router();


router.get('/print', function (req, res) {    
	res.render('print', {
		page: 'index',
		data: {		   
		}
	});    
});

module.exports = router;
