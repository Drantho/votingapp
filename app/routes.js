// app/routes.js
module.exports = function(app, passport) {

	var Poll = require('./models/pollSchema');

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		res.render('index.handlebars', {title: 'Home'}); // load the index.ejs file
	});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/login', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('login.handlebars', { title: 'Login', message: req.flash('loginMessage') });
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/login', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('signup.handlebars', { message: req.flash('signupMessage') });
	});

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', isLoggedIn, function(req, res) {
		
		Poll.find({user: req.user.local.email},function(err, polls) {
			if (err) throw err;
				
				res.render('profile.handlebars', {
				user : req.user,
				Polls : polls
				
			});
		});
		
		
	});

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	// =====================================
	// CREATE POLL ==============================
	// =====================================
	// show the create poll form
	
	app.get('/createpoll', isLoggedIn, function(req, res) {
		console.log(req.user);
		res.render('createpoll.handlebars', {
			title : 'Create Poll', 
			user : req.user // get the user out of session and pass to template
		});
	});
	
	// =======================================
	// ADD POLL TO DATABASE
	// =======================================
	
	app.post('/addpoll', function(req, res){
		
		var myResponse = [];
		
		var counter = 1;
		var body = JSON.parse(JSON.stringify(req.body));
		while(body.hasOwnProperty('response' + counter)){
			
			myResponse.push(req.body['response' + counter]);
			
			counter++
		}
		
		var poll = new Poll({
		user: req.user.local.email,
		question: req.body.question,
		pollDate : (new Date()).toGMTString(),
		responses : myResponse
		});
		
		poll.save();
		
		res.redirect('/profile');
	});
	
	// =========================================
	// VIEW/TAKE POLL
	// =========================================
	
	app.get('/poll/:id', function(req, res) {
		console.log(req.user);
		Poll.findById(req.params.id, function(err, foundPoll) {
			if (err){
				res.render('poll.handlebars', { error: 'Poll not found'});
			}
			
			if(foundPoll){
				
				var userfound = true;
				var hasvoted = false;
				var votemessage;
				if(req.user){
					for(var i=0; i<foundPoll.votes.length; i++){
						if(foundPoll.votes[i].user == req.user.local.email){
							//render results of poll
							hasvoted = true; //Submit will be hid if user has already voted
							votemessage = 'You voted "' + foundPoll.votes[i].response + '" in this poll';
						}
					}	
				}
				else{
					userfound = false; //Submit will also be hid if not signed in
				}
				res.render('poll.handlebars', {
					title : 'Poll', 
					user : foundPoll.user,
					pollId : req.params.id,
					question : foundPoll.question,
					responses : foundPoll.responses,
					pollDate : foundPoll.pollDate,
					userFound : userfound,
					hasVoted : hasvoted,
					voteMessage : votemessage,
					dataArr : getChartDataArray(foundPoll)
				});
			}
			else{
				res.render('poll.handlebars', { error: 'Poll not found'});
			}
			
		});
		
	});
	
	// =================================================
	// VOTE 
	// =================================================
	
	app.post('/vote', function(req, res){
		
		Poll.findById(req.body.pollId, function(err, foundPoll) {
			if (err)throw err;
			
			if(foundPoll){
				var poll = foundPoll;
				
				var vote = {
					user : req.user.local.email,
					voteDate : (new Date()).toGMTString(),
					response : req.body.response
				};
				
				poll.votes.push(vote);
				
				poll.save();
			}
			
			res.redirect('/poll/' + req.body.pollId);
			
		});
	});
};

// route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}

function getChartDataArray(poll){
	var dataArr = [];
	for(var i=0; i<poll.responses.length; i++){
		dataArr.push(0);
		for(var j=0; j<poll.votes.length; j++){
			if(poll.responses[i] == poll.votes[j].response){
				dataArr[i] += 1;
			}
		}
	}
	return dataArr;
}
