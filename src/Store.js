import { EventEmitter } from "events";
import dispatcher from "./Dispatcher";

var appConfig = JSON.parse(require('./config.json'));
var contracts = JSON.parse(require('./contracts.json'));

class AppStore extends EventEmitter {
	constructor() {

		super();
		this.contract = {
			address: appConfig.contractAddress,
			ABI: JSON.parse(contracts.BKCBlog.interface)
		}

		this.web3Provider = appConfig.web3Provider;

		this.web3 = null;

		if (window.localStorage.getItem('lang'))
			this.lang = window.localStorage.lang;
		else
			this.lang = navigator.language;
		console.log('Local storage', window.localStorage);
	}

	setWeb3Provider(provider) {
		this.web3Provider = provider;
		window.localStorage.setItem('web3Provider', provider);
	}

	handleActions(action) {
		switch(action.type) {
			case "SET_WEB3": {
		        this.web3 = action.web3;
		        this.emit("web3Ready");
		        break;
		    }
			case "SET_LANGUAGE": {
		        this.lang = action.lang;
				window.localStorage.setItem('lang', action.lang);
		        this.emit("languageChanged");
		        break;
		    }
		}
	}

}

const Store = new AppStore;
dispatcher.register(Store.handleActions.bind(Store));

export default Store;
