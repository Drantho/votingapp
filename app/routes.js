// app/routes.js
module.exports = function(app, passport) {

	var Poll = require('./models/pollSchema');
	var User = require("./models/user");
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
	
	app.get('/profile', isLoggedIn, function(req, res) {
		
		Poll.find( { $or:[ {'user':req.user.local.email}, {'votes.user':req.user.local.email} ]},function(err, polls) {
			if (err) throw err;
				
				res.render('profile.handlebars', {
				title: 'Profile',					
				user : req.user,
				polls : CountUsersPolls(polls, req.user.local.email),
				votes : CountUsersVotes(polls, req.user.local.email)
			});
		});
		
		
	});
	
	// =====================================================================
	// USERS LIST
	// ======================================================================
	
	app.get('/users', function(req, res) {
		
		var page = 1;
			
		if(req.query.page){
			page = req.query.page;	
		}
		var skip = (page-1) * 5; 
			
		User.find({},{},{ skip: skip, limit: 5 }).sort({local: -1}).exec(function(err, users) {
			if (err) throw err;
				
				var count = users.length;
				if(count == 5){
					var next =parseInt(page)+1;	
				}else{
					next = false;
				}
				
				var prev;
				if(page == 1){
					prev = false;
				}
				else{
					prev = parseInt(page)-1;	
				}
				
				res.render('users.handlebars', {
				title: 'Users',
				user : req.user,
				users : GetNames(users),
				next : next,
				prev : prev,
				page : page
			});
		});
	});
	
	// =============================================
	// SINGLE USER
	// =============================================
	
	app.get('/user/:name', function(req, res) {
		
		Poll.find({'user':req.params.name},function(err, polls) {
			if (err) throw err;
				
				res.render('user.handlebars', {
				user : req.user,	
				title: req.params.name,					
				searchUser : req.params.name,
				polls : polls
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
							votemessage = foundPoll.votes[i].response;
						}
					}	
				}
				else{
					userfound = false; //Submit will also be hid if not signed in
				}
				
				var date = new Date;
				
				date = foundPoll.pollDate;
				
				res.render('poll.handlebars', {
					title : 'Poll', 
					user : req.user,
					creator : foundPoll.user,
					pollId : req.params.id,
					question : foundPoll.question,
					responses : foundPoll.responses,
					pollDate : date.toDateString(),
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
	
	// ===========================================================
	// My Polls page
	// ===========================================================
	
		app.get('/mypolls', isLoggedIn, function(req, res) {
		
		Poll.find({'user':req.user.local.email},function(err, polls) {
			if (err) throw err;
				
				var emptyMessage = "";
				
				if (polls.length == 0){
					emptyMessage = "You have not created any polls yet ";
				}
				res.render('mypolls.handlebars', {
				emptyMessage : emptyMessage,
				user : req.user,
				title: 'My Polls',					
				polls : polls
			});
		});
	});
	
	
	// ================================================
	// DELETE POLL
	// ================================================
	
	app.get('/deletepoll/:id', isLoggedIn, function(req, res){
		Poll.findOne({_id : req.params.id},function(err, polls) {
			if (err) throw err;
				
				if(req.user.local.email == polls.user){
					
					Poll.findByIdAndRemove(req.params.id, function(err) {
						if (err) throw err;
			
						res.redirect('/profile');
					});
					
				}
				else{
					res.redirect('/profile');
				}
			});
		
	});
	
	// ==================================================
	// UPDATE POLL
	// ==================================================
	
	app.post('/updatepoll/:id', function(req, res){
		
		console.log(req.params.id);
		
		Poll.findOne({'_id':req.params.id},function(err, polls) {
			if (err) throw err;
			
			var response = polls.responses;
			
			var counter = 1;
			var body = JSON.parse(JSON.stringify(req.body));
			while(body.hasOwnProperty('response' + counter)){
			
				response.push(req.body['response' + counter]);
			
				counter++
			}
			
			Poll.findByIdAndUpdate(req.params.id, { responses: response }, function(err, user) {
			if (err) throw err;
			
				res.redirect('/poll/' + req.params.id);
			});	
			
		});
	});
	
	// ===========================================================
	// My Votes page
	// ===========================================================
	
		app.get('/myvotes', isLoggedIn, function(req, res) {
		
		Poll.find({'votes.user':req.user.local.email},function(err, polls) {
			if (err) throw err;
				
				var emptyMessage = "";
				
				if (polls.length == 0){
					emptyMessage = "You have not voted on any polls yet ";
				}
				res.render('myvotes.handlebars', {
				emptyMessage : emptyMessage,
				user : req.user,
				title: 'My Votes',					
				polls : polls
			});
		});
	});
	
	// ===========================================================
	// Browse page
	// ===========================================================
	
	app.get('/browse', function(req, res) {
			
		var page = 1;
			
		if(req.query.page){
			page = req.query.page;	
		}
		var skip = (page-1) * 5; 
			
		Poll.find({},{},{ skip: skip, limit: 5 }).sort({pollDate: -1}).exec(function(err, polls) {
			if (err) throw err;
				
				var count = polls.length;
				if(count == 5){
					var next =parseInt(page)+1;	
				}else{
					next = false;
				}
				
				var prev;
				if(page == 1){
					prev = false;
				}
				else{
					prev = parseInt(page)-1;	
				}
				
				res.render('browse.handlebars', {
				user : req.user,
				title: 'Browse',					
				polls : polls,
				next : next,
				prev : prev,
				page : page
		});
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

function CountUsersPolls(poll, user){
	var count = 0;
	for(var i=0; i<poll.length; i++){
		if(poll[i].user == user){
			count++;
		}
	}
	return count;
}

function CountUsersVotes(poll, user){
	var count = 0;
	for(var i=0; i<poll.length; i++){
		
		if(poll[i].votes){
			for(var j=0; j<poll[i].votes.length; j++){
				if(poll[i].votes[j].user == user){
					count++;
				}	
			}
		}
	}
	return count;
}

function GetNames(users){
	
	var names=[];
	
	for(var i=0; i<users.length; i++){
		names.push(users[i].local.email)
	}
	
	names.sort();
	
	return names;
}
