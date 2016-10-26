import Dispatcher from "../Dispatcher";

export function addAccounts(accounts) {
	Dispatcher.dispatch({
		"type": "ADD_ACCOUNTS",
		"accounts": accounts,
	});
}

export function setContract(address, ABI) {
	Dispatcher.dispatch({
		"type": "SET_CONTRACT",
		"address": address,
		"ABI": ABI
	});
}

export function setLanguage(lang) {
	Dispatcher.dispatch({
		"type": "SET_LANGUAGE",
		"lang": lang
	});
}
