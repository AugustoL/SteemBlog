import React from "react";
import Navbar from "./components/Navbar";

export default class Layout extends React.Component {

	constructor() {
        super();
    }

	render() {
		return (
			<div>

				{this.props.children}
			</div>
		);
	}
}
