
var fs = require('fs');

console.log('Fixing node_modules.');

fs.readFile('./node_modules/bitcore-lib/lib/crypto/hash.js', function (err,data) {
	if (err) {
		console.error(err);
	} else {
        var newFile = data.toString().replace("createHash('ripemd160')", "createHash('rmd160')");
        fs.writeFile('./node_modules/bitcore-lib/lib/crypto/hash.js', newFile, function (err,data) {
        	if (err) {
        		console.error(err);
        	} else {
        		console.log('bitcore-lib/lib/crypto/hash.js file fixed');
        	}
        });
	}
});
