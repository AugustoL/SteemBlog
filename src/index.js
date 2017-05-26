
//React ,router and history
import React from "react";
import ReactDOM from "react-dom";
import { Router, Route, IndexRoute } from "react-router";
import createHashHistory from 'history/lib/createHashHistory';

//Views
import Home from "./views/Home";
import Tools from "./views/Tools";
import GetURL from "./views/GetURL";

import Store from "./Store";
var appConfig = require('./config.json');

//CSS
require('../node_modules/bootstrap/dist/css/bootstrap.css');
require('../node_modules/font-awesome/css/font-awesome.css');
require('./css/all.css');

//Set history
const history = createHashHistory({ queryKey: false })
const app = document.getElementById('app');

//Set router
ReactDOM.render(
  <Router history={history}>

    <Route path="/" name="home" component={Home}></Route>
    <Route path="/tools" name="tools" component={Tools}></Route>
    <Route path="/getUrl" name="getUrl" component={GetURL}></Route>

  </Router>,
app);
