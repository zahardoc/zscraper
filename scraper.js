var startUrl = 'http://scraper.loc/test/';
var casper = require('casper').create(/*{verbose: true, logLevel: 'debug'}*/);
var utils = require('utils');

var crawler = {
    selectors: {
        links: '#links a',
        page: {
            content: '#content',
            title: 'h1',
            hiddenData: '#hidden-data'
        }
    },
    pendingUrls: [],
    visitedUrls: [],
    data: []
};

crawler.crawl = function (startUrl) {
    this.fetchPendingUrls(startUrl);
    casper.then(function(){
        crawler.logUrls();
        crawler.crawlPendingUrls();
    });

    this.crawlPendingUrls();

    casper.then(function () { 
        utils.dump(crawler.data);
    });
};

crawler.crawlPendingUrls = function(){
    if (crawler.pendingUrls.length > 0) {
        var url = crawler.pendingUrls.shift();
        crawler.FetchPageData(url);
        casper.then(crawler.crawlPendingUrls);
    }
};

crawler.logUrls = function(){
    console.log('Found urls for scrapping:');
    utils.dump(crawler.pendingUrls);
};

crawler.fetchPendingUrls = function(startUrl){
    this.openPage(startUrl);
    casper.then(function () {
        var links = this.evaluate(crawler.getLinks),
            baseUrl = crawler.baseUri();

        crawler.pendingUrls = crawler.getAbsoluteUrls(baseUrl, links);
    });
};

crawler.openPage = function(url){
    casper.thenOpen(url);
    casper.then(function(){
        crawler.visitedUrls.push(url);
        crawler.showStatus();
    });
};


crawler.FetchPageData = function (url) {
    crawler.openPage(url);

    casper.then(function(){
        this.click(crawler.selectors.page.hiddenData);
    });
    casper.then(function () {
        var pageData = {};

        Array.prototype.forEach.call(Object.keys(crawler.selectors.page), function(el){
            pageData[el] = casper.evaluate(crawler.getInnerText, crawler.selectors.page[el]);
        });

        crawler.data.push(pageData);
    });
};

crawler.getInnerText = function(context){
    return document.querySelector(context).innerText;
};

crawler.getAbsoluteUrls = function (baseUrl, links) {
    var absoluteUrls = [];
    var self = this;
    Array.prototype.forEach.call(links, function (link) {
        var newUrl = self.absoluteUri(baseUrl, link);
        absoluteUrls.push(newUrl);
    });

    return absoluteUrls;
};

crawler.getLinks = function () {
    var links = [];
    Array.prototype.forEach.call(__utils__.findAll('a'), function (e) {
        links.push(e.getAttribute('href'));
    });
    return links;
};

crawler.baseUri = function () {
    var location = casper.getGlobal('location');
    return location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/'));
};

crawler.absoluteUri = function (baseUri, link) {
    if (-1 === link.indexOf('http')) {
        link = baseUri + '/' + link;
    }
    return link;
};

crawler.showStatus = function () {
    var status = casper.status().currentHTTPStatus;
    console.log(status + ' ' + casper.getCurrentUrl());
};

casper.start(startUrl, function () {
    crawler.crawl(startUrl);
});

casper.run();
