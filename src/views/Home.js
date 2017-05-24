import React from 'react';
import {Link} from "react-router";

import steem from 'steem';
import _ from 'lodash';

import Dispatcher from "../Dispatcher";
import Store from "../Store";
import Loader from "../components/Loader";
import ReactSocial from "react-social";

var TwitterButton = ReactSocial.TwitterButton;
var FacebookButton = ReactSocial.FacebookButton;

const languages = require('../languages.json');
const config = require('../config.json');
var showdown  = require('showdown');
showdown.setFlavor('github');
require('showdown-youtube');
var converter = new showdown.Converter({extensions: ['youtube']});

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
        profile: {},
        strings: languages[Store.lang]
      }
    }

    componentWillMount(){
      var self = this;

      Store.on("languageChanged", function(){
        self.setState({strings: languages[Store.lang]});
      });

      self.loadData().then(function([allPosts, categories, months, profile]){
        self.setState({allPosts: allPosts, months: months, categories: categories, profile: profile, strings: languages[Store.lang]});
        if (self.state.postID.length > 0)
          self.loadPost(self.state.postID);
        else
          self.loadPosts(self.state.page, self.state.category, self.state.month);
      });

    }

    loadData(){
      var self = this;
      var postsPermLinks = [];
      var posts = [];
      var categories = [];
      return new Promise(function(resolve, reject){
        steem.api.getAccounts([config.steem.username], function(err, accounts) {
          var profile = {};
          console.log('Account',config.steem.username,'data:',accounts[0]);
          console.log('Account',config.steem.username,'profile:', JSON.parse(accounts[0].json_metadata));
          profile = JSON.parse(accounts[0].json_metadata).profile;

          steem.api.getDynamicGlobalProperties(function(err, result) {
            console.log('Chain', result);
          });

          steem.api.getAccountReferences(149361 ,function(err, result) {
            console.log('Refs', result);
          });

          function getHistory(from, limit){
            console.log('Getting posts from',from,', limit',limit);
            return new Promise(function(resolveHistory, rejectHistory){
              steem.api.getAccountHistory(config.steem.username, from, limit, function(err, history) {
                if (err)
                  rejectHistory(err);
                else{
                  resolveHistory(history);
                }
              })
            });
          }

          getHistory(config.steem.fromPost, 10000).then(function(history){
            console.log('Account',config.steem.username,'history:',history);
            for (var i = 0; i < history.length; i++) {
              if ((history[i][1].op[0] == 'comment') && (history[i][1].op[1].parent_author == "") && (history[i][1].op[1].author == config.steem.username))
                if ( _.findIndex(posts, {permlink: history[i][1].op[1].permlink }) < 0){
                  var cats = JSON.parse(history[i][1].op[1].json_metadata).tags;
                  // Capitalize first letter
                  cats.forEach(function(tag, i){
                    cats[i] = tag.charAt(0).toUpperCase() + tag.slice(1);;
                  });
                  posts.push({
                    permlink: history[i][1].op[1].permlink,
                    categories: cats,
                    created: history[i][1].timestamp
                  })
                }
            }

            // Remove tests posts and reverse array to order by date
            posts = _.filter(posts, function(o) { return o.categories.indexOf('Test') < 0; }).reverse();

            console.log('All account posts',posts);

            // Get all categories
            var categories = [];
            for (var i = 0; i < posts.length; i++)
              for (var z = 0; z < posts[i].categories.length; z++)
                if (!_.find(categories, {name : posts[i].categories[z]}))
                  categories.push({name: posts[i].categories[z], quantity: 1});
                else
                  _.find(categories, {name : posts[i].categories[z]}).quantity ++;

            categories = _.orderBy(categories, ['quantity', 'name'] , ['desc', 'asc']);

            // Get all months
            var months = [];
            for (var i = 0; i < posts.length; i++) {
              var month = new Date(posts[i].created).getMonth()+1;
              var year = new Date(posts[i].created).getFullYear();
              if (!_.find(months, {month : month, year: year}))
                months.push({month : month, year: year, quantity: 1});
              else
                _.find(months, {month : month, year: year}).quantity ++;
            }

            resolve([posts, categories, months, profile]);

          });
        });
      })
    }

    loadPost(id){
      var self = this;
      window.location.hash = '#/?id='+id;
      var posts = this.state.allPosts;
      steem.api.getContent(config.steem.username, id, function(err, post) {
        if (err)
          rejectPost(err);
        else{
          post.body = self.convertVideos(post.body);
          self.setState({postID: id, page: 1, category: 'all', month: 'all', posts: [post], loading: false});
        }
      });
    }

    // Function to convert video and youtube links to video player
    convertVideos(html){
      var pattern1 = /(?:http?s?:\/\/)?(?:www\.)?(?:vimeo\.com)\/?(.+)/g;
      var pattern2 = /(?:http?s?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g;
      if (pattern1.test(html)) {
        var replacement = '<div class="row text-center"><iframe width="420" height="345" src="//player.vimeo.com/video/$1" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div>';
        var html = html.replace(pattern1, replacement);
      }
      if (pattern2.test(html)) {
        var replacement = '<div class="row text-center"><iframe width="420" height="345" src="http://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>';
        var html = html.replace(pattern2, replacement);
      }
      return html;
    }

    loadPosts(page, category, month){
      var self = this;

      if (page > 1 || category != 'all' || month != 'all')
        window.location.hash = '#/?page='+page+'&category='+category+'&month='+month;
      else
        window.location.hash = '#/';

      var posts = self.state.allPosts;

      // Filter by category
      if (category != 'all')
        posts = _.filter(posts, function(o) { return o.categories.indexOf(category) > -1 });

      // Filer by month
      if (month != 'all')
        posts = _.filter(posts, function(o) {
          return (new Date(o.created).getMonth()+1 == month.split('/')[1]) && (new Date(o.created).getFullYear() == month.split('/')[0])
        });

      posts = posts.slice( (page-1)*10, (page)*10);

      // Get all posts content
      Promise.all(posts.map( function(post, index){
        return new Promise(function(resolvePost, rejectPost){
          steem.api.getContent(config.steem.username, post.permlink, function(err, post) {
            if (err)
              rejectPost(err);
            else
              resolvePost(post);
          });
        })
      })).then(function(posts){

        // Convert video in all posts
        posts.map(function(post, i){
          post.body = self.convertVideos(post.body);;
        })
        console.log('Posts to show:', posts);
        self.setState({postID: '', page: page, category: category, month: month, posts: posts, loading: false});
      }).catch(function(err){
        console.error(err);
      });

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
                    <h1>
                      <a  class="titleLink" onClick={() => self.loadPosts(1, 'all', 'all')}>
                        {config.blogTitle}
                      </a>
                      <a href={"https://steemit.com/@"+config.steem.username} target="_blank" class="fa iconTitle pull-right">
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
                                url={'/?id='+post.permlink} element="a" className=""
                              >
                                Share <span className="fa fa-twitter"/>
                              </TwitterButton>
                            </div>
                            <div class="row">
                              <div class="col-xs-3 text-center">
                                <a onClick={() => self.loadPosts(1, 'all', 'all')}><h3><span class="fa fa-arrow-left"></span> {STRINGS.goBack}</h3></a>
                              </div>
                              <div class="col-xs-3 text-center">
                                <h3>{post.net_votes} <span class="fa fa-thumbs-up"></span></h3>
                              </div>
                              <div class="col-xs-3 text-center">
                                <h3>{post.children} <span class="fa fa-comments"></span></h3>
                              </div>
                              <div class="col-xs-3 text-center">
                                <a href={"https://steemit.com/@"+config.steem.username+"/"+post.permlink}>
                                  <h3>{STRINGS.on} Steemit <img src="assets/steemit-black.png" class="steemit-icon-small"></img></h3>
                                </a>
                              </div>
                            </div>
                          </div>
                        :
                          <div>
                            <div class="col-xs-12">
                              {post.body.length > 250 ?
                                <h4 dangerouslySetInnerHTML={{"__html": converter.makeHtml(post.body.substring(0,250)+' ...')}} ></h4>
                              :
                                <h4 dangerouslySetInnerHTML={{"__html": converter.makeHtml(post.body)}} ></h4>
                              }
                            </div>
                            <div class="col-xs-4 text-center">
                              <h3>{post.net_votes} <span class="fa fa-thumbs-up"></span></h3>
                            </div>
                            <div class="col-xs-4 text-center">
                              <h3>{post.children} <span class="fa fa-comments"></span></h3>
                            </div>
                            <div class="col-xs-4 text-center">
                              <a onClick={() => self.loadPost(post.permlink)}><h3>{STRINGS.viewPost}</h3></a>
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
                    <h3 class="no-margin margin-bottom">{STRINGS.about}</h3>
                    <h4>{self.state.profile.about}</h4>
                    <h4>{self.state.allPosts.length} Posts</h4>
                  </div>
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
