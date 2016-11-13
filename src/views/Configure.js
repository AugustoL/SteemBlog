import React from 'react';
import {Link} from "react-router";

import async from 'async';

import Store from "../Store";
import * as Actions from "../actions";
import Loader from "../components/Loader";

var config = JSON.parse(require('../config.json'));

var contracts = JSON.parse(require('../contracts.json'));

export default class Configure extends React.Component {

    constructor() {
        super();
        this.state = {
            loading: false,
            contractAddress: Store.contract.address || config.contractAddress || '',
            web3Provider: Store.web3Provider || config.web3Provider || '',
        }
    }

    componentWillMount() {
    }

    configure(){
        var self = this;
        Actions.Config.configure(self.state.web3Provider);
        Actions.Store.setContract(self.state.contractAddress, JSON.parse(contracts.BKCBlog.interface));
        window.location.reload();
    }

    clearStorage(){
        window.localStorage.clear();
        window.location.reload();
    }

    render() {
        var self = this;
        return(
            <div class="container">
                { self.state.loading ?
                    <div class="whiteBox">
                        <Loader />
                    </div>
                :
                    <div class="row whiteBox">
                        <div class="col-xs-12 text-center">
                            <h1>Configuration</h1>
                        </div>
                        <form class="col-xs-8 col-xs-offset-2 col-md-6 col-md-offset-3">
                            <div class="form-group">
                                <label for="web3HostINput">Web3 Provider</label>
                                <input
                                    type="text"
                                    class="form-control"
                                    id="web3HostINput"
                                    value={self.state.web3Provider}
                                    onChange={(event) => self.setState({web3Provider: event.target.value})}
                                    placeholder="URL"
                                />
                            </div>
                            <div class="row margin-bottom margin-top text-center">
                                <button type='submit' class="btn btn-md btn-default" onClick={() => this.configure()}>Configure</button>
                            </div>
                            <div class="row margin-bottom margin-top text-center">
                                <button class="btn btn-md btn-default" onClick={() => {this.clearStorage()}}>Clear Storage</button>
                            </div>
                        </form>
                        <div class="col-xs-12 text-center">
                            <Link to="/" class="cursor-pointer"><h4 class="title">Go Back</h4></Link>
                        </div>
                    </div>
                }
            </div>
        )
    }

}
