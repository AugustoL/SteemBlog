import { EventEmitter } from "events";
import dispatcher from "./Dispatcher";

var appConfig = require('./config.json');

class AppStore extends EventEmitter {
	constructor() {

		super();
		if (window.localStorage.getItem('lang'))
			this.lang = window.localStorage.lang;
		else
			this.lang = navigator.language;
		console.log('Local storage', window.localStorage);
	}

	handleActions(action) {
		switch(action.type) {
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
