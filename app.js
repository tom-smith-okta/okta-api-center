// Okta API Access Management

////////////////////////////////////////////////////
require('dotenv').config()

var bodyParser = require('body-parser')

const express = require('express')

var fs = require("fs")

var session = require("express-session")

///////////////////////////////////////////////////

var config_path = "./config/instances/app_settings.json"
var template_path = "./config/templates/app_settings_template.json"

/************************************************/
/* Load config file */

if (fs.existsSync(config_path)) {
	global.CONFIG = require(config_path)
}
else {
	console.log("Error: there must be a config file at " + config_path)
	console.log("Copy the template file at " + template_path + " to make the config file.")
	process.exit()
}

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