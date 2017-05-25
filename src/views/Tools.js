import React from 'react';
import {Link} from "react-router";

import steem from 'steem';
import moment from 'moment';
import http from 'http';
import _ from 'lodash';
import until from 'async/until';

import Dispatcher from "../Dispatcher";
import Store from "../Store";
import Loader from "../components/Loader";

const languages = require('../languages.json');
const config = require('../config.json');

export default class Tools extends React.Component {

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
        username: '',
        password: '',
        author: '',
        permlink: '',
        strings: (Store.lang && Store.lang == 'es') ? languages.es : languages.en
      }
    }

    componentWillMount(){
      var self = this;

      Store.on("languageChanged", function(){
        self.setState({strings: languages[Store.lang]});
      });

      self.setState({loading: false});

    }

    signTx(){
      console.log('yeddfsdf')
      steem.api.getState('/what-are-steem-witnesses-and-why-you-should-support-them', function(err, result) {
        console.log(err, result);
      });
      // steem.broadcast.vote(wif, username, 'teamsteem', 'what-are-steem-witnesses-and-why-you-should-support-them', 10000, function(err, result) {
      //   console.log(err, result);
      // });
    }

    votePost(username, password, author, permlink, up){
      var self = this;
      self.setState({loading: true});
      const wif = steem.auth.toWif(self.state.username, self.state.password, 'posting');
      steem.broadcast.vote(wif, self.state.username, self.state.author, self.state.permlink, 10000, function(err, result) {
        self.setState({loading: false, result: result});
      });
    }

    sendTx(){
      var self = this;
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

      const loader =
        <div class="container">
          <div class="row text-center">
            <div class="col-xs-3"/>
            <div class="col-xs-6 whiteBox">
              <Loader message={STRINGS.loading}/>
            </div>
          </div>
        </div>;

      const header =
        <div class="row whiteBox">
          <div class="col-xs-12 text-center">
            <h1>
              Steem Tools
            </h1>
          </div>
        </div>;

      const signer =
        <div class="row post whiteBox titlebox">
          <div class="col-xs-12 text-center">
            <h2>
              User Information
            </h2>
          </div>
          <div class="col-xs-4">
            <div class="form-group">
              <label>Username</label>
              <input
                type="text"
                class="form-control"
                value={self.state.username}
                onChange={(event) => {
                  self.setState({ username: event.target.value });
                }}
                placeholder={'Username'}
              />
            </div>
          </div>
          <div class="col-xs-8">
            <div class="form-group">
              <label>Password</label>
              <input
                type="password"
                class="form-control"
                value={self.state.password}
                onChange={(event) => {
                  self.setState({ password: event.target.value });
                }}
                placeholder={'Password'}
              />
            </div>
          </div>
        </div>;

        const vote =
          <div class="row post whiteBox titlebox">
            <div class="col-xs-12 text-center">
              <h2>
                Vote Post
              </h2>
            </div>
            <div class="col-xs-4">
              <div class="form-group">
                <label>Author</label>
                <input
                  type="text"
                  class="form-control"
                  value={self.state.author}
                  onChange={(event) => {
                    self.setState({ author: event.target.value });
                  }}
                  placeholder={'Author'}
                />
              </div>
            </div>
            <div class="col-xs-8">
              <div class="form-group">
                <label>Permlink</label>
                <input
                  type="text"
                  class="form-control"
                  value={self.state.permlink}
                  onChange={(event) => {
                    self.setState({ permlink: event.target.value });
                  }}
                  placeholder={'Permlink'}
                />
              </div>
            </div>
            <div class="col-xs-12 text-center">
              <div class="btn btn-default" onClick={() => self.votePost()}> Vote </div>
            </div>
          </div>;

      return(
        <div>
          { self.state.loading ?
            <div>{loader}</div>
          :
            <div class="container">
              {header}
              {signer}
              {vote}
            </div>
            }
        </div>
      )
    }

}
