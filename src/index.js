
//React ,router and history
import React from "react";
import ReactDOM from "react-dom";
import { Router, Route, IndexRoute } from "react-router";
import createHashHistory from 'history/lib/createHashHistory';

//Views
import Layout from "./Layout";
import Home from "./views/Home";

import Store from "./Store";
var appConfig = require('./config.json');

//CSS

require('../node_modules/bootstrap/dist/css/bootstrap.css');
require('../node_modules/react-select/dist/react-select.css');
require('../node_modules/font-awesome/css/font-awesome.css');
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
    </Route>
  </Router>,
app);
