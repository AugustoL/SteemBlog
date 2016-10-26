pragma solidity ^0.4.1;

contract BKCBlog {

    address public owner;

    struct Post {
        uint id;
        bytes32 titleEs;
    	bytes32 titleEn;
    	bytes32 category;
        bytes32 month;
    	string imgURL;
    	uint blockTime;
    	bool draft;
        string descriptionEn;
        string descriptionEs;
    	string[] bodyEs;
    	string[] bodyEn;
    }

    event postAdded(bytes32, bytes32);
    event error(uint);

    uint public postsLength;
    mapping(uint => Post) posts;
    uint public nextId;

    bytes32[] public catNames;
    mapping(bytes32 => uint) public categories;

    bytes32[] public monthNames;
    mapping(bytes32 => uint) public months;

    modifier fromOwner() {
        if (owner == msg.sender) {
            _;
        } else {
            error(0);
        }
    }

    function BKCBlog() {
       owner = msg.sender;
       postsLength ++;
       nextId ++;
    }

    function addPost(bytes32 _titleEs, bytes32 _titleEn, bytes32 _category, bytes32 _month, string _imgURL, string _descriptionEn, string _descriptionEs, bool _draft) fromOwner() returns (bool){
        string[] memory _body = new string[](0);
        posts[postsLength] = Post(nextId, _titleEs, _titleEn, _category, _month, _imgURL, block.timestamp, _draft, _descriptionEn, _descriptionEs, _body, _body);
        postsLength ++;
        nextId ++;
        if (!_draft){
            _addCat(_category);
            _addMonth(_month);
        }
        postAdded(_titleEn, _titleEs);
        return (true);
    }

    function editPost(uint _pos, bytes32 _titleEs, bytes32 _titleEn, bytes32 _category, string _imgURL, string _descriptionEn, string _descriptionEs, bool _draft) fromOwner() returns (bool){
        if (posts[_pos].category != _category){
            _removeCat(posts[_pos].category);
            _addCat(_category);
            posts[_pos].category = _category;
        }
        if (posts[_pos].draft != _draft){
            if (_draft){
                _removeCat(posts[_pos].category);
                _removeMonth(posts[_pos].month);
            } else{
                _addCat(posts[_pos].category);
                _addMonth(posts[_pos].month);
            }
            posts[_pos].draft = _draft;
        }
        posts[_pos].titleEs = _titleEs;
        posts[_pos].titleEn = _titleEn;
        posts[_pos].descriptionEn = _descriptionEn;
        posts[_pos].descriptionEs = _descriptionEs;
        posts[_pos].imgURL = _imgURL;
        return (true);
    }

    function addBodyEs(uint _pos, string _bodyEs) fromOwner() returns (bool){
        posts[_pos].bodyEs.push(_bodyEs);
        return (true);
    }

    function addBodyEn(uint _pos, string _bodyEn) fromOwner() returns (bool){
        posts[_pos].bodyEn.push(_bodyEn);
        return (true);
    }

    function cleanBodyEs(uint _pos) fromOwner() returns (bool){
        posts[_pos].bodyEs = new string[](0);
        return (true);
    }

    function cleanBodyEn(uint _pos) fromOwner() returns (bool){
        posts[_pos].bodyEn = new string[](0);
        return (true);
    }

    function removePost(uint _posPost) fromOwner() returns (bool) {
        if (_posPost >= postsLength){
            error(1);
            return (false);
        } else {
            _removeCat(posts[_posPost].category);
            _removeMonth(posts[_posPost].month);
            delete posts[_posPost];
			if (_posPost == (postsLength-1)){
				delete posts[_posPost];
			} else {
				for( uint z = _posPost; z < postsLength; z ++)
					posts[z] = posts[z+1];
                delete posts[postsLength-1];
			}
			postsLength --;
			return (true);
        }
    }

    function _addCat(bytes32 _catName) internal{
        categories[_catName] ++;
        bool addCat = true;
        for( uint i = 0; i < catNames.length; i ++)
            if (catNames[i] == _catName)
                addCat = false;
        if (addCat)
            catNames.push(_catName);
    }

    function _removeCat(bytes32 _catName) internal{
        categories[_catName] --;
        if (categories[_catName] == 0){
            for( uint i = 0; i < catNames.length; i ++)
                if (catNames[i] == _catName)
                    delete catNames[i];
            delete categories[_catName];
        }
    }

    function _addMonth(bytes32 _monthName) internal{
        months[_monthName] ++;
        bool addMonth = true;
        for( uint i = 0; i < monthNames.length; i ++)
            if (monthNames[i] == _monthName)
                addMonth = false;
        if (addMonth)
            monthNames.push(_monthName);
    }

    function _removeMonth(bytes32 _monthName) internal{
        months[_monthName] --;
        if (months[_monthName] == 0)
            for( uint i = 0; i < monthNames.length; i ++)
                if (monthNames[i] == _monthName)
                    delete monthNames[i];
    }

    function getPostById(uint _id) returns(uint){
        for( uint i = 0; i < postsLength; i ++)
            if (posts[i].id == _id)
                return(i);
        return(0);
    }

    function getPostData(uint _pos) returns(uint, bytes32, bytes32, bytes32, string, uint, bool){
        if (_pos > postsLength){
            error(1);
            return (0, "", "", "", "", 0, false);
        } else {
            return (
                posts[_pos].id,
                posts[_pos].titleEn,
                posts[_pos].titleEs,
                posts[_pos].category,
                posts[_pos].imgURL,
                posts[_pos].blockTime,
                posts[_pos].draft
            );
        }
    }

    function getPostDescription(uint _pos) returns(string, string){
        if (_pos > postsLength){
            error(1);
            return ("", "");
        } else {
            return (
                posts[_pos].descriptionEn,
                posts[_pos].descriptionEs
            );
        }
    }

    function getPostBodyData(uint _pos) returns(uint, uint){
        if (_pos >= postsLength){
            error(1);
            return (0, 0);
        } else {
            return (posts[_pos].bodyEn.length, posts[_pos].bodyEs.length);
        }
    }

    function getPostBodyEn(uint _posPost, uint _posBody) returns(string){
        if ((_posPost >= postsLength) || (_posBody > posts[_posPost].bodyEn.length)){
            error(1);
            return ("");
        } else {
            return (posts[_posPost].bodyEn[_posBody]);
        }
    }

    function getPostBodyEs(uint _posPost, uint _posBody) returns(string){
        if ((_posPost >= postsLength) || (_posBody > posts[_posPost].bodyEs.length)){
            error(1);
            return ("");
        } else {
            return (posts[_posPost].bodyEs[_posBody]);
        }
    }

    function getCatsLength() constant returns(uint){
        return catNames.length;
    }

    function getMonthsLength() constant returns(uint){
        return monthNames.length;
    }

    function claimDonations() fromOwner(){
        if ((this.balance == 0) || !owner.send(this.balance))
            throw;
    }
}
