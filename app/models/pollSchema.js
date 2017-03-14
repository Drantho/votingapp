// app/models/poll.js
// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// define the schema for our user model
var pollSchema = new Schema({
    
        user        : String,
        question    : String,
        pollDate    : Date,
        responses    : [],
        votes : [{
                user : String,
                voteDate : Date,
                response : String
        }]
    }, { collection : 'polls' }
    

);

var Poll = mongoose.model('Poll', pollSchema);

// make this available to our users in our Node applications
module.exports = Poll;