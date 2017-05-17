import React from 'react';
import {Link} from "react-router";

import steem from 'steem';
import _ from 'lodash';

import Dispatcher from "../Dispatcher";
import Store from "../Store";
import Loader from "../components/Loader";
import ReactSocial from "react-social";

var TwitterButton = ReactSocial.TwitterButton;

const languages = require('../languages.json');
const config = require('../config.json');
var showdown  = require('showdown');
var converter = new showdown.Converter();

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
        page: getParameter('page') || 1,
        category: getParameter('cat') || 'all',
        month: getParameter('month') || 'all',
        info: {},
        posts: [],
        allPosts: [],
        months: [],
        categories: [],
        nodeInfo: {},
        strings: languages[Store.lang]
      }
    }

    componentWillMount(){
      var self = this;

      Store.on("languageChanged", function(){
        self.setState({strings: languages[Store.lang]});
      });

      self.loadData().then(function([allPosts, categories, months]){
        console.log(allPosts, categories, months);
        self.setState({allPosts: allPosts, months: months, categories: categories, strings: languages[Store.lang]});
        if (self.state.postID.length > 0)
          self.loadPost(self.state.postID);
        else
          self.loadPosts(self.state.page, self.state.category, self.state.month);
      });

    }

    loadData(){
      var postsPermLinks = [];
      var postsData = [];
      var categories = [];
      return new Promise(function(resolve, reject){
        steem.api.getAccounts([config.steemUsername], function(err, accounts) {

          console.log('Account',config.steemUsername,'data:',accounts[0]);
          console.log('Account',config.steemUsername,'profile:', JSON.parse(accounts[0].json_metadata));

          steem.api.getAccountHistory(config.steemUsername, 200, 100, function(err, history) {
            console.log('Account',config.steemUsername,'history:',history);
            for (var i = 0; i < history.length; i++) {
              if ((history[i][1].op[0] == 'comment') && (history[i][1].op[1].parent_author == "") && (history[i][1].op[1].author == config.steemUsername))
                if (postsPermLinks.indexOf(history[i][1].op[1].permlink) < 0)
                  postsPermLinks.push(history[i][1].op[1].permlink);
            }
            console.log('Account post permlinks',postsPermLinks);

            // Get all posts
            Promise.all(postsPermLinks.map( function(permLink, index){
              return new Promise(function(resolvePost, rejectPost){
                steem.api.getContent(config.steemUsername, permLink, function(err, post) {
                  if (err)
                    rejectPost(err);
                  else
                    resolvePost(post);
                });
              })
            })).then(function(posts){

              posts = _.filter(posts, function(o) { return o.category != 'test'; });

              var months = [];
              var categories = [];
              for (var i = 0; i < posts.length; i++) {
                if (!_.find(categories, {name : posts[i].category}))
                  categories.push({name: posts[i].category, quantity: 1});
                else
                  _.find(categories, {name : posts[i].category}).quantity ++;
              }

              for (var i = 0; i < posts.length; i++) {
                var month = new Date(posts[i].created).getMonth()+1;
                var year = new Date(posts[i].created).getFullYear();
                if (!_.find(months, {month : month, year: year}))
                  months.push({month : month, year: year, quantity: 1});
                else
                  _.find(months, {month : month, year: year}).quantity ++;
              }

              resolve([posts, categories, months]);
            }).catch(function(err){
              reject(err)
            })

          });
        });
      })
    }

    loadPost(id){
      window.location.hash = '#/?id='+id;
      var posts = this.state.allPosts;
      posts = _.filter(posts, function(o) { return o.permlink == id; });
      console.log(posts);
      this.setState({postID: id, page: 1, category: 'all', month: 'all', posts: posts, loading: false});
    }

    loadPosts(page, category, month){
      if (page > 1 || category != 'all' || month != 'all')
        window.location.hash = '#/?page='+page+'&category='+category+'&month='+month;
      else
        window.location.hash = '#/';
      console.log(page, category, month);
      var posts = this.state.allPosts;

      if (category != 'all')
        posts = _.filter(posts, function(o) { return o.category == category; });

      if (month != 'all')
        posts = _.filter(posts, function(o) {
          return (new Date(o.created).getMonth()+1 == month.split('/')[1]) && (new Date(o.created).getFullYear() == month.split('/')[0])
        });

      posts = posts.slice( (page-1)*10, (page)*10);

      this.setState({postID: '', page: page, category: category, month: month, posts: posts, loading: false});
    }

    changeLanguage(lang){
      Dispatcher.dispatch({
    		"type": "SET_LANGUAGE",
    		"lang": lang
    	});
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
          :
            <div class="container">
              <div class="row">
                <div class="col-xs-12 col-sm-9">
                  <div class="row post whiteBox titlebox">
                    <h1><a  class="titleLink" onClick={() => self.loadPosts(1, 'all', 'all')}>{config.blogTitle || ""}</a>
                      <a href={"https://steemit.com/@"+config.steemUsername} target="_blank" class="fa iconTitle pull-right">
                        <img src="assets/steemit-black.png" class="steemit-icon-big"></img>
                      </a>
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
                          <h2>{post.title}</h2>
                          <h4>{STRINGS.posted} {post.created} {STRINGS.in} {post.category}</h4>
                        </div>
                        { self.state.postID.length > 0 ?
                          <div>
                            <div class="col-xs-12 bodyPost" dangerouslySetInnerHTML={{"__html": converter.makeHtml(post.body)}} ></div>
                            <div class="col-xs-12 text-center margin-top">
                              <TwitterButton title="Share via Twitter"
                                message={post.title}
                                url={'http://augustolemble.com/?id='+post.permlink} element="a" className=""
                              >
                                Share <span className="fa fa-twitter"/>
                              </TwitterButton>
                              <div class="row">
                                <div class="col-xs-6 text-center">
                                  <a onClick={() => self.loadPosts(1, 'all', 'all')}><h3>{STRINGS.goBack}</h3></a>
                                </div>
                                <div class="col-xs-6 text-center">
                                  <a href={"https://steemit.com/@"+config.steemUsername+"/"+post.permlink}>
                                    <h3>{STRINGS.on} Steemit <img src="assets/steemit-black.png" class="steemit-icon-small"></img></h3>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        :
                          <div>
                            <div class="col-xs-12">
                              {post.body.length > 200 ?
                                <h4 dangerouslySetInnerHTML={{"__html": converter.makeHtml(post.body.substring(0,200))}} ></h4>
                              :
                                <h4 dangerouslySetInnerHTML={{"__html": converter.makeHtml(post.body)}} ></h4>
                              }
                            </div>
                            <div class="col-xs-12 text-center">
                              <a onClick={() => self.loadPost(post.permlink)}><h3 class="no-margin margin-bottom">{STRINGS.viewPost}</h3></a>
                            </div>
                          </div>
                        }
                      </div>
                    )
                  })}
                  { self.state.postID.length == 0 ?
                    <nav>
              				<ul class="pager text-center">
              					{self.state.page > 1 ?
                          <li class="pull-left">
                            <a onClick={ ()=> self.loadPosts(self.state.page-1, self.state.category, self.state.month)}>
                              {STRINGS.previous}
                            </a>
                          </li>
                        : <li/>
                        }
              					<li class="text-center"><a href="#">{STRINGS.page} {self.state.page}</a></li>
              					{ (self.state.posts.length == 10) ?
                          <li class="pull-right">
                            <a onClick={ ()=> self.loadPosts(self.state.page+1, self.state.category, self.state.month)}>
                              {STRINGS.next}
                            </a>
                          </li>
                          : <li/>
                        }
              				</ul>
              			</nav>
                  : <div></div>}
                </div>
                <div class="hidden-xs col-sm-3">

                  <div class="whiteBox margin-top text-center">
                    <h3 class="no-margin margin-bottom">{STRINGS.languages}</h3>
                    <h4><a onClick={()=>self.changeLanguage('es')}>{STRINGS.spanish}</a></h4>
                    <h4><a onClick={()=>self.changeLanguage('en')}>{STRINGS.english}</a></h4>
                  </div>
                  <div class="whiteBox margin-top text-center">
                    <h3 class="no-margin margin-bottom">{STRINGS.categories}</h3>
                    {self.state.categories.map( function(cat, index){
                      return(<h4 key={index}><a onClick={() => self.loadPosts(1, cat.name, 'all')}>{cat.name} ({cat.quantity})</a></h4>)
                    })}
                  </div>
                  <div class="whiteBox margin-top text-center">
                    <h3 class="no-margin margin-bottom">{STRINGS.archives}</h3>
                    {self.state.months.map( function(month, index){
                      return(<h4 key={index}><a onClick={() => self.loadPosts(1, 'all', month.year+'/'+month.month)}>{month.year} / {month.month} ({month.quantity})</a></h4>)
                    })}
                  </div>
                </div>
              </div>
            </div>
            }
        </div>
      )
    }

}
