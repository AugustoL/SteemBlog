
import * as Tx from "ethereumjs-tx";
import * as lodash from "lodash";
import * as web3Func from "../../node_modules/web3/lib/web3/function";
import * as coder from '../../node_modules/web3/lib/solidity/coder';
import async from 'async';

import Store from "../Store";

export function getAccounts(callback) {
    Store.web3.eth.getAccounts(callback);
}

export function getNodeInfo(){
    try {
        return {
            block: Store.web3.eth.blockNumber,
            connected: Store.web3.isConnected(),
            network: Store.web3.version.network,
            version: Store.web3.version.ethereum,
            networkType: (Store.web3.version.network == '1') ? 'Livenet'
                : (Store.web3.version.network == '2') ? 'Testnet' : 'Private',
            hashrate: Store.web3.eth.hashrate,
            peers: Store.web3.net.peerCount,
            syncing: Store.web3.eth.syncing
        }
    } catch (e) {
        return {
            block: 0,
            connected: false,
            network: '',
            version: '',
            hashrate: 0,
            peers: 0,
            syncing: false
        }
    }
}

export function waitForBlock(block, callback) {
    var wait = setInterval( function() {
        if (Store.web3.eth.blockNumber >= block) {
            clearInterval(wait);
            callback(null);
        }
    }, 1000 );
}

function waitForTX(tx, callback) {
    var wait = setInterval( function() {
        try{
            if ( isTXMined(tx)) {
                clearInterval(wait);
                callback();
            }
        } catch(e){};
    }, 1000 );
}

function isTXMined(tx){
    if (!Store.web3.eth.getTransaction(tx))
        return false;
    var txBlock = Store.web3.eth.getTransaction(tx).blockNumber;
    if ((txBlock != null) && (parseInt(txBlock) <= parseInt(Store.web3.eth.blockNumber)))
        return true;
    else
        return false;
}

export function getBalance(address){
    return parseFloat(Store.web3.eth.getBalance(address))/1000000000000000000;
}

export function getBlogEvents(callback){
    Store.web3.eth.filter({fromBlock:0, toBlock: 'latest', address: Store.contract.address, topics: []}).get(function(err, result) {
        if (err)
            console.error(err)
        callback(err, result);
    })
}

export function getBlogInfo(callback) {
    async.series([
        function(callback) {
            Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).owner.call(callback)
        },
        function(callback) {
            Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).postsLength.call(callback)
        },function(callback) {
            getCategories(callback);
        },function(callback) {
            getMonths(callback);
        },
        function(callback) {
            callback(null, getBalance(Store.contract.address))
        },
        function(callback) {
            Store.web3.eth.filter({fromBlock:Store.web3.eth.blockNumber-2000, toBlock: 'latest', address: Store.contract.address, topics: []}).get(callback);
        }
    ],
    function(err, results) {
        if (err)
            callback(err, null);
        else
            callback(null, {
                owner: results[0],
                postsAmount: parseInt(results[1])-1,
                categories: results[2],
                months: results[3],
                balance: results[4],
                events: results[5]
            });
    });
}

export function getPosts(begin, end, category, month, draft, callback){
    var posts = [];
    var toReturn = [];
    async.times(end-begin+1, function(i, postCallback){
        getPostInfo(begin+i, function(err, post){
            if ((post.info.id > 0) &&
                (((category != 'all') && (post.info.category == category)) || (category == 'all')) &&
                (((month != 'all') && (post.info.month == month)) || month == 'all') &&
                ((draft) || (!draft && !post.info.draft))
            )
                toReturn.push(post);
            postCallback(err);
        });
    }, function(err){
        toReturn.sort(function(a,b){return(b.info.pos-a.info.pos)});
        callback(err, toReturn);
    });
}

export function getPost(id, callback){
    Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).getPostById.call(id, function(err, result){
        async.series([
            function(callback) {
                getPostInfo(parseInt(result), callback);
            },
            function(callback) {
                getPostBody(parseInt(result), callback);
            }
        ],
        function(err, results) {
            if (err)
                callback(err, null);
            else {
                callback(null, {
                    info: results[0].info,
                    bodyEn: results[1].en,
                    bodyEs: results[1].es
                })
            }
        });
    });
}

export function getCategories(callback){
    Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).getCatsLength.call(function(err, result){
        if (err)
            console.error(err);
        async.times(parseInt(result), function(n, next) {
            Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).catNames.call(parseInt(n), function(err, catName){
                if (err)
                    console.error(err);
                if (catName && (catName.length > 0))
                    Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).categories.call(catName, function(err, amount){
                        next(err, {name: Store.web3.toAscii(catName).replace(/[^\w\s]/gi, ''), amount: amount});
                    })
                else
                    next(err, null);
            })
        }, function(err, categories) {
            if (err)
                console.error(err);
            categories.sort(function(a,b){return(a.amount-b.amount)});
            callback(err, categories);
        });
    })
}

export function getMonths(callback){
    Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).getMonthsLength.call(function(err, result){
        if (err)
            console.error(err);
        async.times(parseInt(result), function(n, next) {
            Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).monthNames.call(parseInt(n), function(err, monthName){
                if (err)
                    console.error(err);
                if (monthName && (monthName.length > 0))
                    Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).months.call(monthName, function(err, amount){
                        next(err, {name: Store.web3.toAscii(monthName), amount: amount});
                    })
                else
                    next(err, null);
            })
        }, function(err, months) {
            if (err)
                console.error(err);
            months.sort(function(a,b){return(a.name-b.name)});
            callback(err, months);
        });
    })
}

export function getPostInfo(posPost, callback) {
    async.series([
        function(callback) {
            Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).getPostData.call(posPost, callback);
        },
        function(callback) {
            Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).getPostDescription.call(posPost, callback);
        }
    ],
    function(err, results) {
        var monthNames = ["","January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (Store.lang == 'es')
            monthNames = ["","Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        var blockDate = new Date(parseInt(results[0][5])*1000);
        callback(err, {
            info: {
                pos: parseInt(posPost),
                id: parseInt(results[0][0]),
                titleEn: Store.web3.toAscii(results[0][1]).replace(/[^\w\s]/gi, ''),
                titleEs: Store.web3.toAscii(results[0][2]).replace(/[^\w\s]/gi, ''),
                category: Store.web3.toAscii(results[0][3]).replace(/[^\w\s]/gi, ''),
                imageURL: results[0][4],
                descriptionEn: results[1][0],
                descriptionEs: results[1][1],
                date: blockDate.getDay()+"/"+blockDate.getMonth()+1+"/"+blockDate.getFullYear()+" at "+blockDate.getHours()+":"+blockDate.getMinutes(),
                blockDate: blockDate.getTime(),
                month: blockDate.getMonth()+1+"/"+blockDate.getFullYear(),
                draft: results[0][6]
            }
        });
    });
}

export function getPostBody(posPost, callback) {
    Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).getPostBodyData.call(posPost,
        function(err, bodyInfo){
            var enParts = [];
            var esParts = [];
            var bodyEs = [];
            var bodyEn = [];
            for (var i = 0; i < parseInt(bodyInfo[0]); i++)
                enParts.push(i);
            for (var i = 0; i < parseInt(bodyInfo[1]); i++)
                esParts.push(i);
            async.series([
                function(bodyCallback) {
                    async.forEachOf(enParts, function(pos, key, bodyEnCallback){
                        Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).getPostBodyEn.call(posPost, key, function(err, bodyPart){
                            bodyEn.push(bodyPart);
                            bodyEnCallback(err);
                        })
                    }, function(err){
                        bodyCallback(err);
                    });
                },
                function(bodyCallback) {
                    async.forEachOf(esParts, function(pos, key, bodyEsCallback){
                        Store.web3.eth.contract(Store.contract.ABI).at(Store.contract.address).getPostBodyEs.call(posPost, key, function(err, bodyPart){
                            bodyEs.push(bodyPart);
                            bodyEsCallback(err);
                        })
                    }, function(err){
                        bodyCallback(err);
                    });
                }
            ], function(err){
                callback(err, {en: bodyEn.join(""), es: bodyEs.join("")});
            })
        }
    );
}

export function sendContractTX(pvKey, from, to, ABI, functionName, args, value, callback) {
    var payloadData = buildFunctionData(args, functionName, ABI)
    var tx = buildTX({
        to: to,
        from : from,
        value: value,
        data: payloadData
    });
    var serializedTx = signTX(tx, pvKey);
    sendTXs([serializedTx], callback);
}

export function sendToAddress(pvKey, from, to, value, callback) {
    var tx = buildTX({
        to: to,
        from : from,
        value: value,
    });
    var serializedTx = signTX(tx, pvKey);
    sendTXs([serializedTx], callback);
}

export function buildFunctionData(args, functionName, ABI){
    var solidityFunction = new web3Func.default('', lodash.default.find(ABI, { name: functionName }), '');
    var payloadData = solidityFunction.toPayload(args).data;
    return payloadData;
}

export function buildTX(data){
    var estimatedGas = Store.web3.eth.estimateGas({
        nonce: data.nonce ? Store.web3.toHex(data.nonce) : Store.web3.toHex(parseInt(Store.web3.eth.getTransactionCount(data.from))),
        gasPrice: Store.web3.toHex(Store.web3.eth.gasPrice),
        gasLimit: Store.web3.toHex(estimatedGas),
        to: data.to || '0x0000000000000000000000000000000000000000',
        from: data.from,
        value: data.value ? Store.web3.toHex(data.value) : '0x0',
        data: data.data ? Store.web3.toHex(data.data) : '0x'
    }) + 100000;
    var rawTx = {
        nonce: data.nonce ? Store.web3.toHex(data.nonce) : Store.web3.toHex(parseInt(Store.web3.eth.getTransactionCount(data.from))),
        gasPrice: Store.web3.toHex(Store.web3.eth.gasPrice),
        gasLimit: Store.web3.toHex(estimatedGas),
        to: data.to || '0x0000000000000000000000000000000000000000',
        from: data.from,
        value: data.value ? Store.web3.toHex(data.value) : '0x0',
        data: data.data ? Store.web3.toHex(data.data) : '0x'
    };
    console.log('TX:',rawTx);
    var tx = new Tx.default(rawTx);
    return tx;
}

export function signTX(tx, pvKey){
    tx.sign(new Buffer(pvKey, 'hex'));
    var serializedTx = '0x'+tx.serialize().toString('hex');
    console.log('Serialized TX:',serializedTx);
    return serializedTx;
}

export function sendTXs(txs, callback){
    async.eachOfLimit(txs, 50, function(tx, key, sendCallback){
        Store.web3.eth.sendRawTransaction(tx, function(err, hash){
            if (err){
                console.error(err);
                sendCallback(err, null);
            } else {
                console.log('Hash:', hash);
                waitForTX(hash, function(){
                    Store.web3.eth.getTransactionReceipt(hash, function(err, receipt){
                        console.log('Receipt:', receipt);
                        if (receipt.logs.length > 0)
                            switch (receipt.logs[0].data) {
                                case '0x0000000000000000000000000000000000000000000000000000000000000000':
                                    sendCallback('Unauthorized Access', receipt);
                                break;
                                case '0x0000000000000000000000000000000000000000000000000000000000000001':
                                    sendCallback('Invalid Post Position', receipt);
                                break;
                                case '0x0000000000000000000000000000000000000000000000000000000000000002':
                                    sendCallback('Invalid Address', receipt);
                                break;
                                case '0x0000000000000000000000000000000000000000000000000000000000000003':
                                    sendCallback('Insufficent Balance', receipt);
                                break;
                                case '0x0000000000000000000000000000000000000000000000000000000000000004':
                                    sendCallback('Vote aldready done', receipt);
                                break;
                                case '0x0000000000000000000000000000000000000000000000000000000000000005':
                                    sendCallback('Vote already verified', receipt);
                                break;
                                case '0x0000000000000000000000000000000000000000000000000000000000000006':
                                    sendCallback('Vote not done', receipt);
                                break;
                                case '0x0000000000000000000000000000000000000000000000000000000000000007':
                                    sendCallback('Verifier not set', receipt);
                                break;
                                default:
                                    sendCallback(null, receipt);
                                break;
                            }
                        else
                            sendCallback(null, receipt);
                    })
                })
            }
        });
    },
    callback);
}

export function deployContract(pvKey, from, contractData, abi, params, value, callback) {
    var bytes = abi.filter(function (json) {
        return json.type === 'constructor' && json.inputs.length === params.length;
    }).map(function (json) {
        return json.inputs.map(function (input) {
            return input.type;
        });
    }).map(function (types) {
        return coder.default.encodeParams(types, params);
    })[0] || '';
    contractData += bytes;
    var estimatedGas = Store.web3.eth.estimateGas({
        data : contractData
    }) + 50000;
    var rawTx = {
        nonce: Store.web3.toHex(parseInt(Store.web3.eth.getTransactionCount(from))),
        gasPrice: Store.web3.toHex(Store.web3.eth.gasPrice),
        gasLimit: Store.web3.toHex(estimatedGas),
        from: from,
        value: Store.web3.toHex(value),
        data: contractData
    };
    console.log('TX:',rawTx);
    var tx = new Tx.default(rawTx);
    var serializedTx = signTX(tx, pvKey);
    Store.web3.eth.sendRawTransaction(serializedTx, function(err, hash){
        if (err){
            console.error(err);
            callback(err, null);
        } else {
            console.log('Hash:', hash);
            waitForTX(hash, function(){
                Store.web3.eth.getTransactionReceipt(hash, function(err, receipt){
                    console.log('Receipt:', receipt);
                    callback(err, receipt);
                })
            })
        }
    });
}
