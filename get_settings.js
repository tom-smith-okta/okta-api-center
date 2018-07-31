// Okta API Access Management

////////////////////////////////////////////////////
require('dotenv').config()

var fs = require("fs")

var sources = {}

var err = "Please provide the name of the settings you want to retrieve:"
err += "\n   node get_settings.js --mulesoft_idp"

if (!(process.argv[2])) {
	console.log(err)
	process.exit()
}

var g = process.argv[2]

var arr = g.split("--")

var settings = arr[1]

if (settings === "") {
	console.log(err)
	process.exit()
}

var my_source

var output = {}

var keys

var gateway

var standard_source_path = "./okta_bootstrap/output/standard.json"

var standard_app_keys = ["OKTA_TENANT", "AUTHN_CLIENT_ID", "AUTHN_CLIENT_SECRET", "OKTA_AZ_SERVER_ISSUER", "PROXY_URI", "PORT", "REDIRECT_URI", "SILVER_USERNAME", "SILVER_PASSWORD", "GOLD_USERNAME", "GOLD_PASSWORD", "SESSION_SECRET", "SESSION_MAX_AGE", "GATEWAY"]

if (settings === "aws" || settings === "swag") {
	gateway = settings

	keys = ["ISSUER", "AUDIENCE", "JWKS_URI"].concat(standard_app_keys)

	my_source = require(standard_source_path)
}
else if (settings === "kong") {
	gateway = settings

	keys = standard_app_keys

	my_source = require(standard_source_path)

}
else if (settings === "mulesoft") {
	gateway = settings

	keys = standard_app_keys

	my_source = require("./okta_bootstrap/output/mulesoft.json")
}
else if (settings === "mulesoft_introspect") {
	gateway = "mulesoft"

	my_source = require("./okta_bootstrap/output/mulesoft.json")

	keys = ["CLIENT_REGISTRATION_URL", "INTROSPECT_CLIENT_ID", "INTROSPECT_CLIENT_SECRET", "AUTHORIZE_URL", "TOKEN_URL", "TOKEN_INTROSPECTION_URL"]
}
else {
	console.log("Could not find settings for " + settings)
	process.exit()
}

for (var i in keys) {

	var key = keys[i]

	console.log("looking for: " + key + "...")

	var found = false

	// ugh, this bit of logic is a hack with no easy workaround atm
	if (key === "SILVER_USERNAME" || key === "GOLD_USERNAME") {
		var login
		if (key === "SILVER_USERNAME") {
			login = my_source.SILVER_USER.profile.login
		}
		else {
			login = my_source.GOLD_USER.profile.login
		}

		var arr = login.split("@")
		output[key] = arr[0]

		console.log("found (and shortened) the username to " + output[key])
		found = true
	}
	else if ((key in process.env) && (process.env[key] != "")) {
		output[key] = process.env[key]
		console.log("found value " + key + " in process.env")
		found = true
	}
	else { // check the bootstrap output file(s) for values
		if (key in my_source) {
			output[key] = my_source[key]
			console.log("found value " + key)
			found = true
		}
	}

	if (!(found)) {
		console.log("Warning: could not find a value for " + key)
	}
}

console.log("\n===========================")

console.log("Settings for " + settings)

console.log("===========================\n")

for (var key in output) {
	console.log(key + ":")
	console.log(output[key])
}

console.log("-----------------------------")

var datetime = new Date()
var d = datetime.toJSON()
var arr = d.split("T")
var day = arr[0].replace(/-/g, "") // 20180312
var x = arr[1].split(":")
var DATE_STAMP = day + "-" + x[0] + x[1]

var output_path = "./gateways/" + gateway + "/" + settings + "_snapshot_" + DATE_STAMP + ".json"

fs.writeFile(output_path, JSON.stringify(output, null, 2), "utf8", (err) => {

	if (err) console.log(err)

	else { console.log("created new snapshot at " + output_path)}
})