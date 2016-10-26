
//React ,router and history
import React from "react";
import ReactDOM from "react-dom";
import { Router, Route, IndexRoute } from "react-router";
import createHashHistory from 'history/lib/createHashHistory';

//Views
import Layout from "./Layout";
import Home from "./views/Home";
import Admin from "./views/Admin";
import Configure from "./views/Configure";

//Actions
import * as Actions from "./actions";

import Store from "./Store";
var appConfig = JSON.parse(require('./config.json'));

Actions.Config.configure(Store.web3Provider || appConfig.web3Provider);

//CSS
require('../node_modules/bootstrap/dist/css/bootstrap.css');
require('../node_modules/bootstrap/dist/css/bootstrap-theme.css');
require('../node_modules/react-select/dist/react-select.css');
require('font-awesome-webpack');
require('url');
require('./css/all.css');

//Set history
const history = createHashHistory({ queryKey: false })
const app = document.getElementById('app');

//Set router
ReactDOM.render(
  <Router history={history}>
    <Route path="/" component={Layout}>

        <IndexRoute component={Home}></IndexRoute>
        
        <Route path="/admin" name="admin" component={Admin}></Route>
        <Route path="/configure" name="configure" component={Configure}></Route>

    </Route>
  </Router>,
app);
