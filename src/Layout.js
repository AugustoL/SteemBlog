import React from "react";

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
