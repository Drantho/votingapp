// config/poll.js

// load all the things we need

// load up the poll model
var Poll       		= require('../app/models/pollSchema');

// expose this function to our app using module.exports
module.exports = function(poll) {

    poll.use(new Poll({
        // by default, local strategy uses username and password, we will override with email
        user : 'user',
        question : 'question',
        pollDate : (new Date()).toGMTString(),
        responses : []
    },
    function(req, user, question, pollDate, responses, done) {
        
        Poll.find(function (err, polls) {
            if (err) return console.error(err);
            console.log(polls);
        });
        
        Poll.findOne(function (err, polls) {
            if (err) return console.error(err);
            console.log(polls);
        });
        
    }));


};