
var bodyParser = require("body-parser")

var fs = require("fs")

const OktaJwtVerifier = require('@okta/jwt-verifier')

var axios = require("axios").default
var qs = require('qs')

//*******************************************/

const oktaJwtVerifier = new OktaJwtVerifier({
	issuer: process.env.ISSUER
})

module.exports = function (app) {

	app.get('/', function(req, res, next) {

		fs.readFile('./html/index.html', 'utf8', (error, page) => {

			evaluate_vars(page, (error, page) => {
				if (error) { throw new Error(error) }

				res.send(page)

			})
		})
	})

	app.post('/endSession', function(req, res, next) {

		delete req.session.access_token

		res.send("removed access token from server-side session");
	})

	app.post('/getAccessToken', function(req, res, next) {
		var code = req.body.code;

		console.log("the authorization code is: " + code);

		// exchange the authorization code
		// for an access token

		var data = qs.stringify({
			'grant_type': 'authorization_code',
			'redirect_uri': process.env.REDIRECT_URI,
			'code': code 
		});

		var config = {
			method: 'post',
			url: process.env.ISSUER + "/v1/token",
			headers: { 
			  'Accept': 'application/json', 
			  'Authorization': 'Basic ' + getBasicAuthString(), 
			  'Content-Type': 'application/x-www-form-urlencoded'
			},
			data : data
		};

		axios(config).then(response => {

			var obj = response.data;

			if (obj.hasOwnProperty("access_token")) {
				req.session.access_token = obj.access_token;
				console.log("the access token is: " + req.session.access_token);
			}
			if (obj.hasOwnProperty("id_token")) {
				req.session.id_token = obj.id_token;
			}

			var response_to_browser = {}

			response_to_browser.access_token = obj.access_token
			response_to_browser.id_token = obj.id_token

			oktaJwtVerifier.verifyAccessToken(obj.id_token, process.env.CLIENT_ID)
			.then(jwt => {
				response_to_browser.id_token_decoded = jwt.claims
				console.log(jwt.claims)

				oktaJwtVerifier.verifyAccessToken(obj.access_token, process.env.AUD)
				.then(jwt => {
					response_to_browser.access_token_decoded = jwt.claims

					console.log(jwt.claims)

					console.log("the response to the browser is: ")
					console.dir(response_to_browser)

					res.json(JSON.stringify(response_to_browser))
				})
				.catch(err => {
					console.log("something went wrong with the access_token validation")
					console.log(err)

				})
			})
			.catch(err => {
				console.log("something went wrong with the id_token validation")
				console.log(err)
			})
		}).catch(err=>{
			console.log("something went wrong to get authorization")
				console.log(err)
		})
	})

	app.post('/getData', function(req, res, next) {
		var endpoint = req.body.endpoint;

		console.log("the requested endpoint is: " + endpoint);

		console.log("the access_token token is: \n" + req.session.access_token + "\n");

		// send the access token to the requested API endpoint

		if (process.env.hasOwnProperty("GATEWAY_URI") && process.env.GATEWAY_URI != "") {

			var url = process.env.GATEWAY_URI + "/" + req.body.endpoint

			console.log("sending request to: " + url)
	
			var config = {
				method: 'get',
				url: url,
				headers: { 
				  'Accept': 'application/json', 
				  'Authorization': 'Basic ' + req.session.access_token, 
				  'Content-Type': 'application/x-www-form-urlencoded'
				}
			};

			axios(config).then(response => {

				console.log("******\nresponse from API gateway: ")
				console.log("the status code is: " + response.status)

				console.log("the body is:")
				console.log(body)

				if (response.status == 403) {
					res.json({message: 'forbidden'})
					console.log("the request is forbidden")
				}
				else if (response.status == 401) {
					res.json({ message: 'unauthorized' })
					console.log("the request is unauthorized")
				}
				// Add ec here for 504
				else {
					res.json(response.data)
				}
			}).catch(err=>{
				console.log("something went wrong to get authorization")
					console.log(err)
			})
		}
		else {
			res.json({message: 'gateway_uri not yet defined.'})
		}
	})

	function getBasicAuthString() {

		var x = process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET

		var y = new Buffer(x).toString('base64')

		return y
	}
}

function evaluate_vars(page, callback) {
	var regex
	for (var key in process.env) {
		regex = new RegExp('{{' + key + '}}', 'g')

		page = page.replace(regex, process.env[key])
	}
	return callback(null, page)
}
