
var Web3 = require('web3');
import Dispatcher from "../Dispatcher";

import Store from "../Store";

export function configure(provider) {
	Store.setWeb3Provider(provider);
	var web3 = new Web3(new Web3.providers.HttpProvider(Store.web3Provider));
	console.log('WEB3 :',web3);
	Dispatcher.dispatch({
		"type": "SET_WEB3",
		"web3": web3,
	});
}
