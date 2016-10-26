
import React from 'react';

export default class Loader extends React.Component {

    render() {
        return(
            <div class="col-xs-12 text-center">
                <br></br>
                <br></br>
                <h1 class="loading">{this.props.message || 'Loading'}</h1>
                <h1><i class="fa fa-refresh fa-spin"></i></h1>
                <br></br>
                <br></br>
            </div>
        )
    }

}
