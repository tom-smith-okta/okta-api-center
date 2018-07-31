// Okta API Access Management

////////////////////////////////////////////////////
require('dotenv').config()

var bodyParser = require('body-parser')

const express = require('express')

var fs = require("fs")

var session = require("express-session")

///////////////////////////////////////////////////

const app = express()

app.use(session({
	secret: process.env.SESSION_SECRET,
	cookie: { maxAge: parseInt(process.env.SESSION_MAX_AGE) },
	resave: true,
	saveUninitialized: true
}))

app.use(bodyParser.json())

require('./routes.js')(app)

app.listen(process.env.PORT, function () {
	console.log('App listening on port ' + process.env.PORT + "...")
})