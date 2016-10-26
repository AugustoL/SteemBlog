
var async = require('async');
var fs = require('fs');
var child = require('child_process');
var args = process.argv.slice(2);
var fetch = require('node-fetch');
var ethLightwallet = require('eth-lightwallet');
var moreEntropy = require('more-entropy');
var keyStore = ethLightwallet.keyStore;

const blockchainPath = __dirname+'/blockchain';

var debug = false;

if (args.indexOf('--debug') > 0)
    debug = true;

function spanwChild(process, args, callback){
    var callbackCalled = false;
    var _spanwChild = child.spawn(process, args);
    _spanwChild.stdout.on('data', function(data){
        console.log(`${data}`);
    });
    _spanwChild.stderr.on('data', function(data) {
        console.log(`${data}`);
        if (callback && !callbackCalled){
            callback(null);
            callbackCalled = true;
        }
    });
    _spanwChild.on('close', function(code) {
        if (debug)
            console.log(`child process exited with code ${code}`);
    });
    _spanwChild.on('exit', function(code) {
        if (debug)
            console.log(`child process exited.`);
    });
}

function getUserIP(callback){
    fetch('http://api.ipify.org:80/',{
        method: 'GET'
    }).then(function(response) {
        return response.text();
    }).then(function(text) {
        callback(text);
    }).catch(function(err) {
        if (err)
            console.error(err);
    });
};

switch (args[0]) {
    case 'mine':
        getUserIP(function(ip){
            spanwChild(__dirname+'/go-ethereum/build/bin/geth', [
                "--datadir="+blockchainPath,
                "--networkid", "12345",
                "--nodiscover", "--maxpeers=0",
                "--fast",
                "--rpc",
                "--rpcaddr", "localhost",
                "--rpcport", "8545",
                "--rpccorsdomain", "*",
                "--verbosity=6",
                "--nat", "extip:"+ip,
                "--etherbase", require('./blockchain/accounts').admin.address,
                "--mine",
                "--minerthreads", "1"
            ])
        });
    break;
    case 'init':
        getUserIP(function(ip){
            spanwChild(__dirname+'/go-ethereum/build/bin/geth', [
                "--datadir="+blockchainPath,
                "--networkid", "12345",
                "--fast",
                "--nodiscover",
                "--rpc",
                "--rpcaddr", "localhost",
                "--rpcport", "8545",
                "--rpccorsdomain", "*",
                "--verbosity=5",
                "--maxpeers=0",
                "--nat", "extip:"+ip,
                "--mine",
                "init", blockchainPath+"/genesis.json"
            ])
        });
    break;
    case 'accounts':
        async.waterfall([
            function(finalCallback){
                var number = parseInt(args[1]);
                var numbers = []
                console.log('Creating '+number+' accounts');
                for (var i = 0; i <= number; i++)
                    numbers.push(i)
                var accountKeys = [];
                async.eachOfLimit(numbers, 1, function(number, key, accountCallback){
                    const password = 'StrongPassword'+key+'!';
                    ethLightwallet.keystore.createVault({
                        password: password
                    }, function(err, ks) {
                        if (err){
                            callback(err, null);
                        } else {
                            ks.keyFromPassword(password, function (err, pwDerivedKey) {
                                if (err)
                                    console.error(err);
                                ks.generateNewAddress(pwDerivedKey, 1);
                                const addr = ks.getAddresses();
                                accountKeys.push({
                                    address: '0x'+addr[0],
                                    password: password,
                                    seed: ks.getSeed(pwDerivedKey),
                                    salt: ks.salt,
                                    data: new Buffer(ks.getSeed(pwDerivedKey)+";"+ks.salt).toString('base64'),
                                    privateKey: ks.exportPrivateKey(addr, pwDerivedKey)
                                });
                                accountCallback(null);
                            });
                        }
                    });
                }, function(err){
                    var accounts = {
                        admin: accountKeys[0],
                        users: accountKeys.splice(1)
                    };
                    fs.writeFile(blockchainPath+'/accounts.json', JSON.stringify(accounts, null, '    '), function (err,data) {
                        if (err) {
                            console.error(err);
                        } else {
                            console.log('accounts file on blockchain folder created.');
                        }
                    })
                    console.log('Creating genesis..');
                    var genesis = {
                    	"nonce": "0x1265616432",
                    	"timestamp": "0x0",
                    	"parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
                    	"extraData": "0x0",
                    	"gasLimit": "0x4a817c800",
                    	"difficulty": "0x200",
                    	"mixhash": "0x0000000000000000000000000000000000000000000000000000000000000000",
                        "coinbase": accounts.admin.address.substring(2),
                        "alloc": {}
                    }
                    genesis.alloc[accounts.admin.address.substring(2)] = { "balance": "1000000000000000000000"};
                    fs.writeFile(blockchainPath+'/genesis.json', JSON.stringify(genesis, null, '    '), function (err,data) {
                    	if (err) {
                    		console.error(err);
                    	} else {
                    		console.log('Genesis file created.');
                    	}
                    });
                })
            },
        ])
    break;
}
