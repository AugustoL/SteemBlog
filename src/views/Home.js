import React from 'react';
import {Link} from "react-router";

import async from 'async';

import Store from "../Store";
import * as Actions from "../actions";
import Loader from "../components/Loader";
import ReactSocial from "react-social";

var TwitterButton = ReactSocial.TwitterButton;

const languages = require('../languages.json');
const config = JSON.parse(require('../config.json'));

export default class Home extends React.Component {

    constructor() {
        super();
        function getParameter(paramName) {
            var searchString = window.location.hash.substring(3),
            i, val, params = searchString.split("&");

            for (i=0;i<params.length;i++) {
                val = params[i].split("=");
                if (val[0] == paramName) {
                    return val[1].replace('%20', ' ');
                }
            }
            return null;
        }
        this.state = {
            loading: true,
            postID: getParameter('id') || 0,
            isDraft: true,
            page: getParameter('page') || 0,
            category: getParameter('cat') || 'all',
            month: getParameter('month') || 'all',
            info: {},
            posts: [],
            categories: [],
            nodeInfo: Actions.Ethereum.getNodeInfo(),
            strings: JSON.parse(languages)[Store.lang]
        }
    }

    componentWillMount(){
        var self = this;
        if ((self.state.nodeInfo.connected) && (self.state.postID == 0))
            self.loadPosts(self.state.page, self.state.category, self.state.month);
        else if (self.state.nodeInfo.connected)
            self.loadPost(self.state.postID);
        else
            self.setState({loading: false});
        Store.on("languageChanged", function(){
            self.setState({strings: JSON.parse(languages)[Store.lang]});
        });
    }

    loadPost(id){
        window.location.hash = '#/?id='+id;
        var self = this;
        self.setState({loading: true});
        Actions.Ethereum.getPost(id, function(err, post){
            if (err){
                console.error(err);
                var nodeInfo = self.state.nodeInfo;
                nodeInfo.connected = false;
                self.setState({loading: false, nodeInfo: nodeInfo});
            } else if ((self.state.month.length == 0) || (self.state.categories.length == 0))
                Actions.Ethereum.getBlogInfo(function(err, info){
                    if (err){
                        console.error(err);
                        var nodeInfo = self.state.nodeInfo;
                        nodeInfo.connected = false;
                        self.setState({loading: false, nodeInfo: nodeInfo});
                    } else {
                        var months = [];
                        var categories = [];
                        var monthNames = ["","January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        if (Store.lang == 'es')
                            monthNames = ["","Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                        for (var i = 0; i < info.categories.length; i++)
                            if (info.categories[i].name.length > 0)
                                categories.push({value: info.categories[i].name, label: info.categories[i].name+"("+info.categories[i].amount+")"});
                        for (var i = 0; i < info.months.length; i++)
                            months.push({
                                value: parseInt(info.months[i].name.split('/')[0])+"/"+info.months[i].name.split('/')[1].replace(/[^\w\s]/gi, ''),
                                label: monthNames[parseInt(info.months[i].name.split('/')[0])]+" "+info.months[i].name.split('/')[1].replace(/[^\w\s]/gi, '')+"("+info.months[i].amount+")"
                            });
                        self.setState({loading: false, info: info, posts: [post], categories: categories, months: months});
                    }
                })
            else
                self.setState({loading: false, posts: [post], postID: id});
        });
    }

    loadPosts(page, category, month){
        console.log(page, category, month);
        window.location.hash = '#/?page='+page+'&cat='+category+'&month='+month;
        var self = this;
        self.setState({loading: true, postID: 0});
        var fromPost = parseInt(page)*10;
        var toPost = fromPost+10;
        Actions.Ethereum.getBlogInfo(function(err, info){
            if (err){
                console.error(err);
                var nodeInfo = self.state.nodeInfo;
                nodeInfo.connected = false;
                self.setState({loading: false, nodeInfo: nodeInfo});
            } else {
                if ((info.postsAmount) < fromPost){
                    fromPost = 1;
                    toPost = fromPost+10;
                    page = 0;
                } else if ((category != 'all') || (month != 'all')){
                    fromPost = 1;
                    toPost = info.postsAmount;
                }
                Actions.Ethereum.getPosts(fromPost, toPost, category, month, false, function(err, posts){
                    if (err)
                        console.error(err);
                    var months = [];
                    var categories = [];
                    var monthNames = ["","January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    if (Store.lang == 'es')
                        monthNames = ["","Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                    if (parseInt(page)*10 > posts.length)
                        posts.slice(parseInt(page)*10);
                    for (var i = 0; i < info.categories.length; i++)
                        if (info.categories[i].name.length > 0)
                            categories.push({value: info.categories[i].name, label: info.categories[i].name+"("+info.categories[i].amount+")"});
                    for (var i = 0; i < info.months.length; i++)
                        months.push({
                            value: parseInt(info.months[i].name.split('/')[0])+"/"+info.months[i].name.split('/')[1].replace(/[^\w\s]/gi, ''),
                            label: monthNames[parseInt(info.months[i].name.split('/')[0])]+" "+info.months[i].name.split('/')[1].replace(/[^\w\s]/gi, '')+"("+info.months[i].amount+")"
                        });
                    self.setState({loading: false, info: info, posts: posts, categories: categories, months: months, page: page});
                });
            }
        })
    }

    changeLanguage(lang){
        Actions.Store.setLanguage(lang);
    }

    render() {
        var self = this;
        const STRINGS = this.state.strings;
        return(
            <div>
                { self.state.loading ?
                    <div class="container">
                        <div class="row text-center">
                            <div class="col-xs-3"/>
                            <div class="col-xs-6 whiteBox">
                                <Loader message={STRINGS.loading}/>
                            </div>
                        </div>
                    </div>
                : (!self.state.nodeInfo.connected) ?
                    <div class="container">
                        <div class="row">
                            <div class="col-xs-3"/>
                            <div class="col-xs-6 whiteBox text-center">
                                <h2>{STRINGS.noNetwork}</h2>
                                <h3><a onClick={()=>window.location.reload()}>{STRINGS.reload}</a></h3>
                            </div>
                        </div>
                    </div>
                :
                    <div class="container">
                        <div class="row">
                            <div class="col-xs-12 col-sm-9">
                                <div class="row post whiteBox titlebox">
                                    <h1><a  class="titleLink" onClick={() => self.loadPosts(0, 'all', 'all')}>{config.blogTitle || ""}</a>
                                        { config.facebookLink ? <a href={config.facebookLink} target="_blank" class="fa fa-facebook iconTitle pull-right"></a> : <a/>}
                                        { config.twitterLink ? <a href={config.twitterLink} target="_blank" class="fa fa-twitter iconTitle pull-right"></a> : <a/>}
                                        { config.linkedinLink ? <a href={config.linkedinLink} target="_blank" class="fa fa-linkedin iconTitle pull-right"></a> : <a/>}
                                        { config.githubLink ? <a href={config.githubLink} target="_blank" class="fa fa-github iconTitle pull-right"></a> : <a/>}
                                    </h1>
                                </div>
                                {self.state.posts.length == 0 ?
                                    <div class="row post whiteBox text-center">
                                        {STRINGS.noPosts}
                                    </div>
                                : self.state.posts.map( function(post, index){
                                    return(
                                        <div class="row post whiteBox" key={index}>
                                            <div class="col-xs-12">
                                                <img class="imagePost pull-left" src={post.info.imageURL} />
                                                <h2>{(Store.lang == 'en') ? post.info.titleEn : post.info.titleEs}</h2>
                                                <h4>{STRINGS.posted} {post.info.date} {STRINGS.in} {post.info.category}</h4>
                                            </div>
                                            { self.state.postID > 0 ?

                                                <div>
                                                    <div
                                                        class="col-xs-12 bodyPost"
                                                        dangerouslySetInnerHTML={
                                                            (Store.lang=='en') ? {__html: post.bodyEn} : {__html: post.bodyEs}
                                                        }
                                                    />

                                                    <div class="col-xs-12 text-center margin-top">
                                                        <TwitterButton title="Share via Twitter"
                                                            message={(Store.lang == 'en') ? post.info.titleEn : post.info.titleEs}
                                                            url={'http://augustolemble.com/'+window.location.hash} element="a" className=""
                                                        >
                                                            Share <span className="fa fa-twitter"/>
                                                        </TwitterButton>
                                                        <a onClick={() => self.loadPosts(0, 'all', 'all')}><h3>{STRINGS.goBack}</h3></a>
                                                    </div>
                                                </div>
                                            :
                                                <div>
                                                    <div class="col-xs-12">
                                                        <h4>{
                                                            (Store.lang=='en') ? post.info.descriptionEn : post.info.descriptionEs
                                                        }</h4>
                                                    </div>
                                                    <div class="col-xs-12 text-center">
                                                        <a onClick={() => self.loadPost(post.info.id)}><h3 class="no-margin margin-bottom">{STRINGS.viewPost}</h3></a>
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                    )
                                })}
                                { self.state.postID == 0 ?
                                    <nav>
                        				<ul class="pager text-center">
                        					{self.state.page > 0 ?
                                                <li class="pull-left">
                                                    <a onClick={ ()=> self.loadPosts(self.state.page-1, self.state.category, 'all')}>
                                                        {STRINGS.previous}
                                                    </a>
                                                </li>
                                                : <li/>
                                            }
                        					<li class="text-center"><a href="#">{STRINGS.page} {self.state.page}</a></li>
                        					{ (self.state.posts.length == 10) ?
                                                <li class="pull-right">
                                                    <a onClick={ ()=> self.loadPosts(self.state.page+1, self.state.category, 'all')}>
                                                        {STRINGS.next}
                                                    </a>
                                                </li>
                                                : <li/>
                                            }
                        				</ul>
                        			</nav>
                                :   <div></div>}
                            </div>
                            <div class="hidden-xs col-sm-3">
                                <div class="whiteBox text-center">
                                    <h3 class="no-margin">{STRINGS.networkStatus}</h3>
                                    <h4 class="text-center">{STRINGS[self.state.nodeInfo.networkType]}</h4>
                                    <h4 class="text-center margin-top">{STRINGS.block} #{self.state.nodeInfo.block}</h4>
                                    <h4 class="text-center">{self.state.nodeInfo.peers} {STRINGS.peers}</h4>
                                    <h4 class="text-center">Hashrate {self.state.nodeInfo.hashrate}</h4>

                                </div>
                                <div class="whiteBox margin-top text-center">
                                    <h3 class="no-margin margin-bottom">{STRINGS.languages}</h3>
                                    <h4><a onClick={()=>self.changeLanguage('es')}>{STRINGS.spanish}</a></h4>
                                    <h4><a onClick={()=>self.changeLanguage('en')}>{STRINGS.english}</a></h4>
                                </div>
                                <div class="whiteBox margin-top text-center">
                                    <h3 class="no-margin margin-bottom">{STRINGS.categories}</h3>
                                    {self.state.categories.map( function(cat, index){
                                        return(<h4 key={index}><a onClick={() => self.loadPosts(0, cat.value, 'all')}>{cat.label}</a></h4>)
                                    })}
                                </div>
                                <div class="whiteBox margin-top text-center">
                                    <h3 class="no-margin margin-bottom">{STRINGS.archives}</h3>
                                    {self.state.months.map( function(month, index){
                                        return(<h4 key={index}><a onClick={() => self.loadPosts(0, 'all', month.value)}>{month.label}</a></h4>)
                                    })}
                                </div>
                                <div class="whiteBox margin-top text-center">
                                    <h2 class="margin-bottom"><a>{STRINGS.contact}</a></h2>
                                    <h5 class="margin-bottom" href={'emailto:'+config.contactEmail}><a>{config.contactEmail}</a></h5>
                                    <h2 class="margin-top margin-bottom">
                                        <a href={config.file.url} download={config.file.name} >{STRINGS[config.file.title]}</a>
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div>
        )
    }

}
