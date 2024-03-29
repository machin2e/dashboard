var express = require('express');
var passport = require('passport');
var util = require('util');
var session = require('express-session');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var GitHubStrategy = require('passport-github2').Strategy;
var partials = require('express-partials');

const https = require('https');
const request = require('request');

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID // "--insert-github-client-id-here--";
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET // "--insert-github-client-secret-here--";


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete GitHub profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});


// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
passport.use(new GitHubStrategy({
		clientID: GITHUB_CLIENT_ID,
		clientSecret: GITHUB_CLIENT_SECRET,
		callbackURL: "http://127.0.0.1:3000/auth/github/callback"
	},
	function(accessToken, refreshToken, profile, done) {
		// asynchronous verification, for effect...
		// TODO: Look up user in Machineee database by ID or authenticated token.
		// TODO: Load profile from Machineee database and return it instead of the Passport profile.


		// TODO: Replace this with the tokens stored in the user's DB record.
		profile.oauth = {
			accessToken: accessToken,
			refreshToken: refreshToken
		};


		process.nextTick(function() {

			// To keep the example simple, the user's GitHub profile is returned to
			// represent the logged-in user.  In a typical application, you would want
			// to associate the GitHub account with a user record in your database,
			// and return that user instead.
			return done(null, profile);
		});
	}
));




var app = express();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: false
}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
	console.log(req.user);
	res.render('index', {
		user: req.user
	});
});

app.get('/projects', ensureAuthenticated, function(req, res) {



	// TODO: Move this into the /projects request handler.
	request.get({
		// url: 'https://api.github.com/users/mgub/repos', 
		url: 'https://api.github.com/user/repos',
		headers: {
			'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
			'Authorization': 'token ' + req.user.oauth.accessToken
		},
		//,
		//oauth: {
		////callback: 'http://127.0.0.1:3000/auth/github/callback',
		//consumer_key: GITHUB_CLIENT_ID,
		//consumer_secret: GITHUB_CLIENT_SECRET,
		//token: accessToken,
		//token_secret: refreshToken,
		//verifier: profile.provider
		//},
		json: true
	}, function(err, github_response, body) {
		if (!err && github_response.statusCode == 200) {

			// Body is already parsed since request optoin 'json:true' was used.
			var repos = [];
			body.forEach(function(repo) {
				repos.push({
					name: repo.name,
					description: repo.description
				});
			});
			console.log('the repos are  ' + JSON.stringify(repos));
			req.user.repos = repos;




			// Pipe to view rendering function.
			// TODO: Pipe this in a better way?
			res.render('projects', {
				user: req.user
			});
		}
	});


	//res.render('projects', {
	//user: req.user
	//});
});

app.get('/account', ensureAuthenticated, function(req, res) {
	res.render('account', {
		user: req.user
	});
});

app.get('/login', function(req, res) {
	res.render('login', {
		user: req.user
	});
});

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHub will redirect the user
//   back to this application at /auth/github/callback
app.get('/auth/github',
	passport.authenticate('github', {
		scope: ['user:email']
	}),
	function(req, res) {
		// The request will be redirected to GitHub for authentication, so this
		// function will not be called.
	});

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback',
	passport.authenticate('github', {
		failureRedirect: '/login'
	}),
	function(req, res) {
		res.redirect('/');
	});

app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});


console.log('Starting to listen.');
app.listen(3000);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login')
}
