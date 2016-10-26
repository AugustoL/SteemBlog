import { EventEmitter } from "events";
import dispatcher from "./Dispatcher";

var appConfig = JSON.parse(require('./config.json'));
var contracts = JSON.parse(require('./contracts.json'));

class AppStore extends EventEmitter {
	constructor() {

		super();
		if (window.localStorage.getItem('accounts'))
			this.accounts = JSON.parse(window.localStorage.accounts);
		else
			this.accounts = [];
		if (window.localStorage.getItem('contract'))
			this.contract = JSON.parse(window.localStorage.contract);
		else
			this.contract = {
				address: appConfig.contractAddress,
				ABI: JSON.parse(contracts.BKCBlog.interface)
			}
		if (window.localStorage.getItem('web3Provider'))
			this.web3Provider = window.localStorage.web3Provider;
		else
			this.web3Provider = appConfig.web3Provider;

		this.web3 = null;

		if (window.localStorage.getItem('lang'))
			this.lang = window.localStorage.lang;
		else
			this.lang = navigator.language;
		console.log('Navigator language',navigator.language);
		console.log('Local storage', window.localStorage);
	}

	setAccounts(accounts) {
		this.accounts = [];
		for (var i = 0; i < accounts.length; i++)
			this.accounts.push(accounts[i]);
		window.localStorage.setItem('accounts', JSON.stringify(this.accounts));
	}

	setContract(address, ABI) {
		this.contract = {
			address: address,
			ABI: ABI
		}
		window.localStorage.setItem('contract', JSON.stringify(this.contract));
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
		    case "SET_CONTRACT": {
		        this.setContract(action.address, action.ABI)
		        this.emit("contractChanged");
		        break;
		    }
			case "ADD_ACCOUNTS": {
		        this.addAccounts(action.accounts)
		        this.emit("accountsChanged");
		        break;
		    }
		}
	}

}

const Store = new AppStore;
dispatcher.register(Store.handleActions.bind(Store));

export default Store;
