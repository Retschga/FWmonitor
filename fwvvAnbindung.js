module.exports = function () {
	
	
	const fs = require("fs");
	const unzipper = require('unzipper');
	var Parser = require('@episage/dbf-parser');
	
	// siehe https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
	function similarity(s1, s2) {
      var longer = s1;
      var shorter = s2;
      if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
      }
      var longerLength = longer.length;
      if (longerLength == 0) {
        return 1.0;
      }
      return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    function editDistance(s1, s2) {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();

      var costs = new Array();
      for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
          if (i == 0)
            costs[j] = j;
          else {
            if (j > 0) {
              var newValue = costs[j - 1];
              if (s1.charAt(i - 1) != s2.charAt(j - 1))
                newValue = Math.min(Math.min(newValue, lastValue),
                  costs[j]) + 1;
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0)
          costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    }
	
	
	function getNewestFile(files, path) {
		var out = [];
		
		files.forEach(function(file) {
			if(file.indexOf("FWVVSDAT") != -1) {
				var stats = fs.statSync(path + "/" +file);
				if(stats.isFile()) {
					out.push({"file":file, "mtime": stats.mtime.getTime()});
				}
			}
		});
		
		out.sort(function(a,b) {
			return b.mtime - a.mtime;
		})
		
		return (out.length>0) ? out[0].file : "";
	}
	
	
	function getEinsatzZeit(name, vorname) {
		
		return new Promise(resolve => {
			
			console.log("Einsatzzeit:  " + name + "  " + vorname);
		
			var zeit = 0;
			var anzahl = 0;
			
			var filepath = String(process.env.FWVV_DATENSICHERUNG);
			
			console.log("Pfad: " + filepath);
			
			fs.readdir(filepath, function(err, files) {
				if (err) { throw err; }
				var newestFile = getNewestFile(files, filepath);

				console.log("Datei: " + newestFile);
			
		
				fs.createReadStream(filepath + newestFile)
				.pipe(unzipper.Parse())
				.on('entry', function (entry) {
					const fileName = entry.path;
					const type = entry.type; // 'Directory' or 'File'
					const size = entry.vars.uncompressedSize; // There is also compressedSize;
					if (fileName === "E_PERSON.DBF") {
						
					
						var parser = Parser(entry);				
						var diesesJahr = new Date().getFullYear();
						
						parser.on('header', (h) => {
							//console.log('dBase file header has been parsed');
							//console.log(h);
						});
						 
						parser.on('record', (record) => {
							
							var eintragJahr = record.E_DATUM.substring(0,4);						
							
							if(
								record["@deleted"] != true
								&& eintragJahr == diesesJahr
								&& record.NAME == name
								&& similarity(record.VORNAME, vorname) > 0.25								
								
							) {
								
								anzahl++;
								
								if(record.E_VON != "" && record.BIS_DATUM != "" && record.E_BIS != "" ) {
								
									var eintragMonat = record.E_DATUM.substring(4,6);
									var eintragTag = record.E_DATUM.substring(6,8);		

									var bisJahr = record.BIS_DATUM.substring(0,4);
									var bisMonat = record.BIS_DATUM.substring(4,6);
									var bisTag = record.BIS_DATUM.substring(6,8);
									
									var startTime = new Date(eintragJahr+'-'+eintragMonat+'-'+eintragTag+'T' + record.E_VON + 'Z');
									var endTime = new Date(bisJahr+'-'+bisMonat+'-'+bisTag+'T' + record.E_BIS + 'Z');
									
									var diff =(startTime.getTime() - endTime.getTime()) / 1000;
									diff /= 60;	
									
									zeit += Math.abs(Math.round(diff));
									
									
									//console.log(record);
									//console.log(record.E_DATUM + ":  " + Math.abs(Math.round(diff)));
								
								}
								
							}
								
						});
						
						parser.on('end', () => {
							console.log('Gesamt Minuten: ' + zeit + " ( " + Math.floor(zeit/60) + "h " + (zeit%60) + " ) "); 
							resolve([zeit, anzahl]);
						});
						
						
					} else {
						entry.autodrain();
					}
				});
			
			});
		
		});

	}

    return {
        getEinsatzZeit: getEinsatzZeit
    }; 
}