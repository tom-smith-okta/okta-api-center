// Okta API Access Management

////////////////////////////////////////////////////
require('dotenv').config()

var bodyParser = require('body-parser')

const express = require('express')

var fs = require("fs")

var session = require("express-session")

var promptly = require("promptly")

///////////////////////////////////////////////////

/************************************************/
/* Load config file */

global.CONFIG = require("./config/app_settings.json")

/************************************************/

const app = express()

app.use(session({
	secret: process.env.SESSION_SECRET,
	cookie: { maxAge: parseInt(process.env.SESSION_MAX_AGE) },
	resave: true,
	saveUninitialized: true
}))

app.use(bodyParser.json())

require('./routes.js')(app)

app.listen(CONFIG.PORT, function () {
	console.log('App listening on port ' + CONFIG.PORT + "...")
})