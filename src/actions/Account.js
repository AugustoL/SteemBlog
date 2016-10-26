
import * as Tx from "ethereumjs-tx";
import async from 'async';
import ethLightwallet from 'eth-lightwallet';
import moreEntropy from 'more-entropy'
var keyStore = ethLightwallet.keyStore;

var Web3 = require('web3');
var HookedWeb3Provider = require("hooked-web3-provider");
var qrImage = require('qr-image');

import * as Ethereum from './Ethereum';
import Store from "../Store";

export default class Account {

    static createAccount(options, callback){
        console.log('Creating new account');
        var c = new moreEntropy.Generator({
          'loop_delay':        10, // how many milliseconds to pause between each operation loop. A lower value will generate entropy faster, but will also be harder on the CPU
          'work_min':           1, // milliseconds per loop; a higher value blocks the CPU more, so 1 is recommended
          'auto_stop_bits':  4096, // the generator prepares entropy for you before you request it; if it reaches this much unclaimed entropy it will stop working
          'max_bits_per_delta': 12, // a safety cap on how much entropy it can claim per value; 4 (default) is very conservative. a larger value will allow faster entropy generation
        });
        c.generate(options.extraEntropy || 1024, function(extraEntropy) {
            const seedPhrase = ethLightwallet.keystore.generateRandomSeed(extraEntropy.toString());
            ethLightwallet.keystore.createVault({
                password: options.password,
                seedPhrase: seedPhrase
            }, function(err, ks) {
                if (err){
                    callback(err, null);
                } else {
                    ks.keyFromPassword(options.password, function (err, pwDerivedKey) {
                        if (err)
                            console.error(err);
                        ks.generateNewAddress(pwDerivedKey, 1);
                        const addr = ks.getAddresses();
                        const seed = ks.getSeed(pwDerivedKey)
                        const data = new Buffer(ks.getSeed(pwDerivedKey)+";"+ks.salt).toString('base64');
                        var fileURL = window.URL.createObjectURL(
                            new Blob([
                                "<div style=\"border: 5px solid #000;margin: auto;margin-top: 20px;padding: 20px;text-align: center;font-size: 25px;\"> <div> Your address <br/><strong>0x"+addr[0]+"</strong> </div> <div> Your seed phrase <br/><strong>"+seed+"</strong> </div> <div> <h3><strong> Address QR </strong></h3> <img style=\"width:300px;height:300px\" src=\"data:image/png;base64,"+qrImage.imageSync(addr[0], {type: 'png', margin: 1}).toString('base64')+"\" /> </div> <div> <h3><strong> Account Data QR </strong></h3> <img style=\"width:300px;height:300px\" src=\"data:image/png;base64,"+qrImage.imageSync(data, {type: 'png', margin: 1}).toString('base64')+"\" /> </div> </div>"
                            ], {type: 'html'})
                        );
                        var newAccount = {
                            address: addr[0],
                            private: {
                                password: options.password,
                                seed: ks.getSeed(pwDerivedKey),
                                salt: ks.salt
                            },
                            data: data,
                            file: fileURL
                        }
                        callback(null, newAccount);
                    });
                }
            });
        });
    }

    static unlockAccount(account, callback){
        console.log('Unlocking account');
        ethLightwallet.keystore.createVault({
            password: account.password,
            seedPhrase: new Buffer( account.data , 'base64').toString('ascii').split(';')[0],
            salt: new Buffer( account.data , 'base64').toString('ascii').split(';')[1]
        }, function(err, ks) {
            if (err){
                callback(err, null);
            } else {
                ks.keyFromPassword(account.password, function (err, pwDerivedKey) {
                    if (err)
                        console.error(err);
                    ks.generateNewAddress(pwDerivedKey, 1);
                    const addr = ks.getAddresses();
                    const pvKey = ks.exportPrivateKey(addr, pwDerivedKey);
                    var decryptedAccount = {
                        address: addr[0],
                        privateKey: pvKey,
                        ks: ks
                    }
                    callback(null, decryptedAccount);
                });
            }
        });
    }

    static sign(account, tx, callback){
        console.log('Unlocking account');
        ethLightwallet.keystore.createVault({
            password: account.password,
            seedPhrase: new Buffer( account.data , 'base64').toString('ascii').split(';')[0],
            salt: new Buffer( account.data , 'base64').toString('ascii').split(';')[1]
        }, function(err, ks) {
            if (err){
                callback(err, null);
            } else {
                ks.keyFromPassword(account.password, function (err, pwDerivedKey) {
                    if (err)
                        console.error(err);
                    ks.generateNewAddress(pwDerivedKey, 1);
                    const addr = ks.getAddresses();
                    const pvKey = ks.exportPrivateKey(addr, pwDerivedKey);
                    callback(null, Ethereum.signTX(tx, pvKey));
                });
            }
        });
    }

    static call(account, tx, callback){
        console.log('Unlocking account and making call');
        ethLightwallet.keystore.createVault({
            password: account.password,
            seedPhrase: new Buffer( account.data , 'base64').toString('ascii').split(';')[0],
            salt: new Buffer( account.data , 'base64').toString('ascii').split(';')[1]
        }, function(err, ks) {
            var accountWeb3 = new Web3();
            var web3Provider = new HookedWeb3Provider({
              host: Store.web3.currentProvider.host,
              transaction_signer: ks
            });
            accountWeb3.setProvider(web3Provider);
            accountWeb3.eth.call(tx, callback);
        });
    }

}
