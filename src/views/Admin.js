import React from 'react';
import {Link} from "react-router";

import async from 'async';

import Select from 'react-select';

import Store from "../Store";
import * as Actions from "../actions";
import Loader from "../components/Loader";

var contracts = JSON.parse(require('../contracts.json'));

const languages = require('../languages.json');

const bodyLenght = 1000;

export default class Admin extends React.Component {

    constructor() {
        super();
        this.state = {
            loading: false,
            postPos: 0,
            titleEs: "",
            titleEn: "",
            imageURL: "",
            category: "",
            descriptionEn: "",
            descriptionEs: "",
            bodyEs: "",
            bodyEn: "",
            isDraft: false,
            adminAddress: '',
            adminPrivate: '',
            section: 'admin',
            info: {},
            posts: [],
            categories: [],
            strings: JSON.parse(languages)[Store.lang]
        }
    }

    componentWillMount(){
        var self = this;
        self.setState({loading: true});
        this.updateInfo();
        Store.on("languageChanged", function(){
            self.setState({strings: JSON.parse(languages)[Store.lang]});
        });
    }

    updateInfo(){
        var self = this;
        Actions.Ethereum.getBlogInfo(function(err, info){
            if (err)
                console.error(err);
            console.log('Blog info:',info);
            Actions.Ethereum.getPosts(1, info.postsAmount+1, 'all', 'all', true, function(err, posts){
                if (err)
                    console.error(err);
                var categories = [];
                for (var i = 0; i < info.categories.length; i++)
                    if (info.categories[i].name.length > 0)
                        categories.push({value: info.categories[i].name, label: info.categories[i].name+"("+info.categories[i].amount+")"});
                self.setState({loading: false, info: info, posts: posts, categories: categories});
            })
        })
    }

    changeLanguage(lang){
        Actions.Store.setLanguage(lang);
    }

    deploy(){
        console.log("\n Creating new BKCBlog contract \n\n");
        var self = this;
        self.setState({loading: true});
        Actions.Ethereum.deployContract(
            self.state.adminPrivate,
            self.state.adminAddress,
            '0x'+contracts.BKCBlog.bytecode,
            JSON.parse(contracts.BKCBlog.interface),
            [],
            0,
            function(err, receipt){
                if (err)
                    console.error(err);
                else
                    Actions.Store.setContract(receipt.contractAddress, JSON.parse(contracts.BKCBlog.interface));
                self.updateInfo();
            }
        );
    }

    editBody(postPos, body, language, callback){
        var self = this;
        async.eachOfLimit(body, 1, function(bodyPart, key, addBodyCallback){
            var payloadData = Actions.Ethereum.buildFunctionData([
                postPos,
                bodyPart,
            ], 'addBody'+language, Store.contract.ABI);
            var addBodyTx = Actions.Ethereum.buildTX({
                to: Store.contract.address,
                from : self.state.adminAddress,
                data: payloadData
            });
            Actions.Ethereum.sendTXs([Actions.Ethereum.signTX(addBodyTx, self.state.adminPrivate)], addBodyCallback);
        }, function(err){
            callback(err);
        });
    }

    cleanBody(postPos, language, callback){
        var self = this;
        var payloadData = Actions.Ethereum.buildFunctionData([
            postPos
        ], 'cleanBody'+language, Store.contract.ABI);
        var clearBodyTx = Actions.Ethereum.buildTX({
            to: Store.contract.address,
            from : self.state.adminAddress,
            data: payloadData
        });
        Actions.Ethereum.sendTXs([Actions.Ethereum.signTX(clearBodyTx, self.state.adminPrivate)], callback);
    }

    removePost(postPos){
        var self = this;
        self.setState({loading: true});
        console.log("\n Removing post"+postPos+" \n\n");
        console.log(Store.contract);
        var payloadData = Actions.Ethereum.buildFunctionData([
            postPos
        ], 'removePost', Store.contract.ABI);
        var addBodyTx = Actions.Ethereum.buildTX({
            to: Store.contract.address,
            from : self.state.adminAddress,
            data: payloadData
        });
        Actions.Ethereum.sendTXs([Actions.Ethereum.signTX(addBodyTx, self.state.adminPrivate)], function(err){
            self.updateInfo();
        });
    }

    addPost(){
        var self = this;
        self.setState({loading: true});
        var postPos = 0;
        var bodyEn = [];
        var bodyEs = [];
        var bodyEsText = self.state.bodyEs;
        var bodyEnText = self.state.bodyEn;
        while (bodyEsText.length > bodyLenght){
            bodyEs.push(bodyEsText.substring(0,bodyLenght));
            bodyEsText = bodyEsText.substring(bodyLenght);
        }
        bodyEs.push(bodyEsText);
        while (bodyEnText.length > bodyLenght){
            bodyEn.push(bodyEnText.substring(0,bodyLenght));
            bodyEnText = bodyEnText.substring(bodyLenght);
        }
        bodyEn.push(bodyEnText);
        var month = (new Date().getMonth()+1)+'/'+new Date().getFullYear();
        async.waterfall([
            function(callback){
                console.log("\n Getting new post position \n\n");
                Actions.Ethereum.getBlogInfo(function(err, info){
                    postPos = info.postsAmount+1;
                    callback(err);
                })
            },
            function(callback){
                console.log("\n Adding post \n\n");
                var payloadData = Actions.Ethereum.buildFunctionData([
                    self.state.titleEs,
                    self.state.titleEn,
                    self.state.category,
                    month,
                    self.state.imageURL,
                    self.state.descriptionEn,
                    self.state.descriptionEs,
                    self.state.isDraft,
                ], 'addPost', Store.contract.ABI)
                var addPostTx = Actions.Ethereum.buildTX({
                    to: Store.contract.address,
                    from : self.state.adminAddress,
                    data: payloadData,
                    nonce: Store.web3.toHex(parseInt( Store.web3.eth.getTransactionCount( self.state.adminAddress ) ))
                });
                Actions.Ethereum.sendTXs([Actions.Ethereum.signTX(addPostTx, self.state.adminPrivate)], callback);
            }, function(callback){
                console.log("\n Waiting 1 block \n\n");
                Actions.Ethereum.waitForBlock(Store.web3.eth.blockNumber+1, callback);
            }, function(callback){
                console.log("\n Adding body in english \n\n");
                self.editBody(postPos, bodyEn, 'En', callback);
            }, function(callback){
                console.log("\n Adding body in spanish \n\n");
                self.editBody(postPos, bodyEs, 'Es', callback);
            }
        ], function(error){
            if (error)
                console.error(error);
            self.updateInfo();
        });
    }

    editPost(){
        var self = this;
        self.setState({loading: true});
        var bodyEn = [];
        var bodyEs = [];
        var bodyEsText = self.state.bodyEs;
        var bodyEnText = self.state.bodyEn;
        while (bodyEsText.length > bodyLenght){
            bodyEs.push(bodyEsText.substring(0,bodyLenght));
            bodyEsText = bodyEsText.substring(bodyLenght);
        }
        bodyEs.push(bodyEsText);
        while (bodyEnText.length > bodyLenght){
            bodyEn.push(bodyEnText.substring(0,bodyLenght));
            bodyEnText = bodyEnText.substring(bodyLenght);
        }
        bodyEn.push(bodyEnText);
        async.waterfall([
            function(callback){
                console.log("\n Editing post \n\n");
                var payloadData = Actions.Ethereum.buildFunctionData([
                    self.state.postPos,
                    self.state.titleEs,
                    self.state.titleEn,
                    self.state.category,
                    self.state.imageURL,
                    self.state.descriptionEn,
                    self.state.descriptionEs,
                    self.state.isDraft,
                ], 'editPost', Store.contract.ABI)
                var addPostTx = Actions.Ethereum.buildTX({
                    to: Store.contract.address,
                    from : self.state.adminAddress,
                    data: payloadData,
                    nonce: Store.web3.toHex(parseInt( Store.web3.eth.getTransactionCount( self.state.adminAddress ) ))
                });
                Actions.Ethereum.sendTXs([Actions.Ethereum.signTX(addPostTx, self.state.adminPrivate)], callback);
            }, function(callback){
                console.log("\n Waiting 1 block \n\n");
                Actions.Ethereum.waitForBlock(Store.web3.eth.blockNumber+1, callback);
            }, function(callback){
                console.log("\n Removing body in english \n\n");
                self.cleanBody(self.state.postPos, 'En', callback);
            }, function(callback){
                console.log("\n Adding new body in english \n\n");
                self.editBody(self.state.postPos, bodyEn, 'En', callback);
            }, function(callback){
                console.log("\n Removing body in spanish \n\n");
                self.cleanBody(self.state.postPos, 'Es', callback);
            }, function(callback){
                console.log("\n Adding new body in spanish \n\n");
                self.editBody(self.state.postPos, bodyEs, 'Es', callback);
            }
        ], function(error){
            if (error)
                console.error(error);
            self.updateInfo();
        });
    }

    loadEditor(post){
        console.log('Loading post:',post);
        var self = this;
        Actions.Ethereum.getPostBody(post.info.pos, function(err, body){
            self.setState({
                postPos: post.info.pos,
                titleEs: post.info.titleEs,
                titleEn: post.info.titleEn,
                imageURL: post.info.imageURL,
                category: post.info.category,
                isDraft: post.info.draft,
                descriptionEn: post.info.descriptionEn,
                descriptionEs: post.info.descriptionEs,
                bodyEs: body.es,
                bodyEn: body.en,
                section: 'editor'
            });
        })

    }

    render() {
        const STRINGS = this.state.strings;
        var self = this;
        return(<div class="container">
            { self.state.loading ? <div class="row whiteBox"><Loader message={STRINGS.loading}/></div>
            :
                <div class="row whiteBox">
                    {(self.state.section == 'admin') ?
                        <div>
                            <div class="col-xs-12 text-center">
                                <h1 class="margin-top margin-bottom">Admin</h1>
                            </div>
                            <div class="col-xs-6 text-center">
                                <a onClick={() => self.setState({section: 'createBlog'})} class="cursor-pointer"><h2 class="margin-top margin-bottom">{STRINGS.createBlog}</h2></a>
                            </div>
                            <div class="col-xs-6 text-center">
                                <a onClick={() => self.setState({section: 'newPost'})} class="cursor-pointer"><h2 class="margin-top margin-bottom">{STRINGS.addPost}</h2></a>
                            </div>
                            <div class="col-xs-12 text-center">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th># ID</th>
                                            <th class="text-center">{STRINGS.title}</th>
                                            <th class="text-center">{STRINGS.category}</th>
                                            <th class="text-center">{STRINGS.date}</th>
                                            <th class="text-center">{STRINGS.draft}</th>
                                            <th class="text-center"></th>
                                            <th class="text-center"></th>
                                        </tr>
                                    </thead>
                                        <tbody>
                                        {self.state.posts.map(function(post, index){
                                            return (
                                                <tr key={index}>
                                                    <th>{post.info.id}</th>
                                                    <td>{post.info.titleEn}</td>
                                                    <td>{post.info.category}</td>
                                                    <td>{post.info.date}</td>
                                                    <td>{post.info.draft ? STRINGS.yes : STRINGS.no }</td>
                                                    <td>
                                                        <a class="cursor-pointer" onClick={() => self.loadEditor(post)}>{STRINGS.edit}</a>
                                                    </td>
                                                    <td>
                                                        <a class="cursor-pointer" onClick={() => self.removePost(post.info.pos)}>{STRINGS.remove}</a>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    : ((self.state.section == 'editor') || (self.state.section == 'newPost')) ?
                        <div>
                            <div class="col-xs-12 text-center">
                                <h1>{STRINGS.editor}</h1>
                            </div>
                            <form class="row">
                                <div class="form-group col-xs-12 col-md-6">
                                    <label for="titleEsInput">{STRINGS.title} {STRINGS.spanish}</label>
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="titleEsInput"
                                        value={self.state.titleEs}
                                        onChange={(event) => self.setState({titleEs: event.target.value})}
                                        placeholder=""
                                    />
                                </div>
                                <div class="form-group col-xs-12 col-md-6">
                                    <label for="titleEnInput">{STRINGS.title} {STRINGS.english}</label>
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="titleEnInput"
                                        value={self.state.titleEn}
                                        onChange={(event) => self.setState({titleEn: event.target.value})}
                                        placeholder=""
                                    />
                                </div>
                                <div class="form-group col-xs-12 col-md-6">
                                    <label for="imageInput">{STRINGS.imageURL}</label>
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="imageInput"
                                        value={self.state.imageURL}
                                        onChange={(event) => self.setState({imageURL: event.target.value})}
                                        placeholder=""
                                    />
                                </div>
                                <div class="form-group col-xs-8 col-md-4">
                                    <label for="categoryInput">{STRINGS.category}</label>
                                    <Select
                                        name="categoryInput"
                                        value={self.state.category}
                                        options={self.state.categories}
                                        onChange={(val) => self.setState({category: (val) ? val.value : ''})}
                                    />
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="categoryInput"
                                        value={self.state.category}
                                        onChange={(event) => self.setState({category: event.target.value})}
                                        placeholder=""
                                    />
                                </div>
                                <div class="form-group col-xs-4 col-md-2">
                                    <div class="checkbox">
                                        <label>
                                            <br></br>
                                            <input
                                            type="checkbox"
                                            checked={self.state.isDraft}
                                            onClick={() => self.setState({isDraft: !self.state.isDraft})}
                                            onChange={() => {}}
                                            ></input>{STRINGS.draft}
                                        </label>
                                    </div>
                                </div>
                                <div class="form-group col-xs-12">
                                    <label for="descriptionEsInput">{STRINGS.description} {STRINGS.spanish}</label>
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="descriptionEsInput"
                                        value={self.state.descriptionEs}
                                        onChange={(event) => self.setState({descriptionEs: event.target.value})}
                                        placeholder=""
                                    />
                                </div>
                                <div class="form-group col-xs-12">
                                    <label for="descriptionEnInput">{STRINGS.description} {STRINGS.english}</label>
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="descriptionEnInput"
                                        value={self.state.descriptionEn}
                                        onChange={(event) => self.setState({descriptionEn: event.target.value})}
                                        placeholder=""
                                    />
                                </div>
                                <div class="form-group col-xs-12">
                                    <label for="bodyEsInput">{STRINGS.body} {STRINGS.spanish}</label>
                                    <textarea
                                        class="form-control"
                                        id="bodyEsInput"
                                        value={self.state.bodyEs}
                                        onChange={(event) => self.setState({bodyEs: event.target.value})}
                                        placeholder=""
                                        rows="10"
                                    ></textarea>
                                </div>
                                <div class="form-group col-xs-12">
                                    <label for="bodyEnInput">{STRINGS.body} {STRINGS.english}</label>
                                    <textarea
                                        class="form-control"
                                        id="bodyEnInput"
                                        value={self.state.bodyEn}
                                        onChange={(event) => self.setState({bodyEn: event.target.value})}
                                        placeholder=""
                                        rows="10"
                                    ></textarea>
                                </div>
                                <div class="col-xs-8 col-sm-9">
                                    <div class="col-xs-12">
                                        <h1>{STRINGS.preview}
                                            <h3 class="pull-right"><a onClick={()=>self.changeLanguage('en')}> {STRINGS.english} </a></h3>
                                            <h3 class="pull-right"><a onClick={()=>self.changeLanguage('es')}> {STRINGS.spanish} -</a></h3>
                                        </h1>
                                    </div>
                                    <div class="col-xs-12">
                                        <img class="imagePost pull-left" src={self.state.imageURL} />
                                        <h2>{(Store.lang == 'en') ? self.state.titleEn : self.state.titleEs}</h2>
                                        <h4>{STRINGS.posted} DD/MM/YYY {STRINGS.in} {self.state.category}</h4>
                                    </div>
                                    <div class="col-xs-12">
                                        <h4>{
                                            (Store.lang =='en') ? self.state.descriptionEn : self.state.descriptionEs
                                        }</h4>
                                    </div>
                                    <div
                                        class="col-xs-12 bodyPost"
                                        dangerouslySetInnerHTML={
                                            (Store.lang =='en') ? {__html: self.state.bodyEn} : {__html: self.state.bodyEs}
                                        }
                                    />
                                </div>
                            </form>
                        </div>
                    :
                        <div class="col-xs-12 text-center">
                            <h1>{STRINGS.createBlog}</h1>
                        </div>
                    }
                    <form class="row">
                        <h3 class="col-xs-12 text-center">{STRINGS.adminInfo}</h3>
                        <div class="form-group col-md-6 col-md-offset-3 col-xs-12">
                            <label for="addressInput">{STRINGS.address}</label>
                            <input
                                type="text"
                                class="form-control"
                                id="addressInput"
                                value={self.state.adminAddress}
                                onChange={(event) => self.setState({adminAddress: event.target.value})}
                                placeholder=""
                            />
                        </div>
                        <div class="form-group col-md-6 col-md-offset-3 col-xs-12">
                            <label for="adminPrivateInput">{STRINGS.privateKey}</label>
                            <input
                                type="text"
                                class="form-control"
                                id="adminPrivateInput"
                                value={self.state.adminPrivate}
                                onChange={(event) => self.setState({adminPrivate: event.target.value})}
                                placeholder=""
                            />
                        </div>
                    </form>
                    {(self.state.section == 'editor') ?
                        <div>
                            <div class="col-xs-6 margin-top margin-bottom text-center">
                                <button class="btn btn-md btn-default" onClick={() => self.setState({section: 'admin'})}>{STRINGS.backAdmin}</button>
                            </div>
                            <div class="col-xs-6 margin-top margin-bottom text-center">
                                <button class="btn btn-md btn-default" onClick={() => this.editPost()}>{STRINGS.editPost}</button>
                            </div>
                        </div>
                    : (self.state.section == 'newPost') ?
                        <div>
                            <div class="col-xs-6 margin-top margin-bottom text-center">
                                <button class="btn btn-md btn-default" onClick={() => self.setState({section: 'admin'})}>{STRINGS.backAdmin}</button>
                            </div>
                            <div class="col-xs-6 margin-top margin-bottom text-center">
                                <button  class="btn btn-md btn-default" onClick={() => this.addPost()}>{STRINGS.addPost}</button>
                            </div>
                        </div>
                    : self.state.section == 'createBlog' ?
                        <div>
                            <div class="col-xs-6 margin-top margin-bottom text-center">
                                <button class="btn btn-md btn-default" onClick={() => self.setState({section: 'admin'})}>{STRINGS.backAdmin}</button>
                            </div>
                            <div class="col-xs-6 margin-top margin-bottom text-center">
                                <button class="btn btn-md btn-default" onClick={() => this.deploy()}>{STRINGS.submit}</button>
                            </div>
                        </div>
                    : <div/>}
                </div>
            }
        </div>)
    }

}
