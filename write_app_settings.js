// Okta API Access Management

////////////////////////////////////////////////////
require('dotenv').config()

var fs = require("fs")

var app_settings = require("./config/app_settings_template.json")

var mulesoft_idp = require("./okta_bootstrap/output/mulesoft_idp.json")
var mulesoft_policy = require("./okta_bootstrap/output/mulesoft_policy.json")

var output = {}

///////////////////////////////////////////////////////

for (var key in app_settings) {
	console.log("looking for: " + key + "...")

	// this first clause is a hack to get around bootstrap inability to handle
	// deep values in objects
	if (key === "SILVER_USERNAME" || key === "GOLD_USERNAME") {
		var login
		if (key === "SILVER_USERNAME") {
			login = mulesoft_idp.SILVER_USER.profile.login
		}
		else {
			login = mulesoft_idp.GOLD_USER.profile.login
		}

		var arr = login.split("@")
		output[key] = arr[0]

		console.log("found (and shortened) the username to " + output[key])
	}
	else if (key in process.env) {
		output[key] = process.env[key]
		console.log("found value " + key + " in process.env")
	}
	else if (key in mulesoft_idp) {
		output[key] = mulesoft_idp[key]
		console.log("found value " + key + " in mulesoft_idp")
	}
	else if (key in mulesoft_policy) {
		output[key] = mulesoft_policy[key]
		console.log("found value " + key + " in mulesoft_policy")
	}
	else {
		console.log("could not find a value for " + key)
	}
}

fs.writeFile("./config/app_settings.json", JSON.stringify(output, null, 2), "utf8", (err) => {

	if (err) console.log(err)

	else { console.log("updated app_settings.json")}
})