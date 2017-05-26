# SteemBlog

## Install

`git clone https://github.com/AugustoL/SteemBlog`

`npm install`

## Config

Edit the config file with the blog title, social media urls and username in steemit inside the src folder.

Example:
```
{
  "blogTitle": "AugustoL SteemBlog",
  "facebookLink": "https://fb.com/augusto8",
  "twitterLink": "https://twitter.com/LembleAugusto",
  "linkedinLink": "https://ar.linkedin.com/in/augustolemble",
  "githubLink": "https://github.com/AugustoL",
  "steem": {
    "username": "augustol",
    "fromPost": 10000
  }
}
```

Edit the index.html file on src folder with teh correct values on header tag.

## Develop

Run `npm start` to develop and enable the hot reloading.

## Build

Run `npm run build` to build the production version.
