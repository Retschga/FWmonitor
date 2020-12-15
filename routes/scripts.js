'use strict';

// ----------------  STANDARD LIBRARIES ---------------- 
var express = require('express');
var router = express.Router();
var fs = require('fs');

// ---- Dateien ----
router.get('/scripts/:file', function (req, res) {
    res.sendFile(req.params.file, { root: './scripts' });
});

module.exports = router;
