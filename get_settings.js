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
	console.log("Please provide the name of the settings you want to retrieve:")
	console.log("   node get_settings.js --mulesoft_idp")
	process.exit()
}

var my_sources = {}

var output = {}

var template

var keys

var gateway

if (settings === "kong" || settings === "mulesoft") {

	gateway = settings

	template = "standard"

	if (settings === "kong") {
		my_sources[template] = require("./okta_bootstrap/output/standard.json")
	}
	else if (settings === "mulesoft") {
		my_sources[template] = require("./okta_bootstrap/output/mulesoft_idp.json")
	}

	keys = ["OKTA_TENANT","AUTHN_CLIENT_ID", "AUTHN_CLIENT_SECRET", "OKTA_AZ_SERVER_ISSUER", "PROXY_URI", "PORT", "REDIRECT_URI", "SILVER_USERNAME", "SILVER_PASSWORD", "GOLD_USERNAME", "GOLD_PASSWORD", "SESSION_SECRET", "SESSION_MAX_AGE", "GATEWAY"]
}
else if (settings === "mulesoft_idp") {
	gateway = "mulesoft"

	template = "mulesoft_idp"

	my_sources[template] = require("./okta_bootstrap/output/mulesoft_idp.json")

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
			if ("mulesoft_idp" in my_sources) {
				login = my_sources["mulesoft_idp"].SILVER_USER.profile.login
			}
			else {
				login = my_sources[template].SILVER_USER.profile.login
			}
		}
		else {
			if ("mulesoft_idp" in my_sources) {
				login = my_sources["mulesoft_idp"].GOLD_USER.profile.login
			}
			else {
				login = my_sources[template].GOLD_USER.profile.login
			}
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
		for (var s in my_sources) {
			if (key in my_sources[s]) {
				output[key] = my_sources[s][key]
				console.log("found value " + key + " in " + s)
				found = true
			}
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
// 	}
// }
// else {
// 	console.log("Could not find a value for GATEWAY in the env")
// 	process.exit()
// }

// process.exit()


// # Okta settings

// # example: https://dev-511902.oktapreview.com
// OKTA_TENANT=""

// OKTA_API_TOKEN=""
// AUTHN_CLIENT_ID=""
// AUTHN_CLIENT_SECRET=""

// # example: https://dev-511902.oktapreview.com/oauth2/ausfqw42xrkmpfDHI0h7
// OKTA_AZ_SERVER_ISSUER=""

// # Gateway/Proxy base url
// # example: http://52.14.100.89:8080/solar-system
// PROXY_URI=""

// # App settings
// PORT="8080"
// REDIRECT_URI="http://localhost:8080"
// SILVER_USERNAME=""
// SILVER_PASSWORD=""
// GOLD_USERNAME=""
// GOLD_PASSWORD=""
// SESSION_SECRET="some random phrase"
// SESSION_MAX_AGE=60000

// # Supported values: kong, mulesoft, tyk
// GATEWAY=""

///////////////////////////////////////////////////////

// get_template()
// .then((msg) => process.exit())
// .catch((error) => console.log(error))

// function get_template() {

// 	return new Promise((resolve, reject) => {

// 		if (template === "app" || template === "mulesoft") {
// 			sources.app = ["mulesoft_idp", "mulesoft_policy"]

// 			sources.mulesoft = ["mulesoft_idp"]
// 		}
// 		else {
// 			sources[template] = [template]
// 		}

// 		var file_path = './config/templates/' + template + '_settings_template.json'

// 		fs.readFile(file_path, 'utf8', (error, data) => {
// 			if (error) { reject(error) }

// 			var my_sources = {}

// 			for (var i in sources[template]) {

// 				var src = sources[template][i]
// 				console.log("the source is: " + sources[template][i])

// 				my_sources[src] = require("./okta_bootstrap/output/" + src + ".json")
// 			}

// 			var template_obj = JSON.parse(data)

// 			for (var key in template_obj) {
// 				console.log("looking for: " + key + "...")

// 				var found = false

// 				// ugh, this bit of logic is a hack with no easy workaround atm
// 				if (key === "SILVER_USERNAME" || key === "GOLD_USERNAME") {
// 					var login
// 					if (key === "SILVER_USERNAME") {
// 						if ("mulesoft_idp" in my_sources) {
// 							login = my_sources["mulesoft_idp"].SILVER_USER.profile.login
// 						}
// 						else {
// 							login = my_sources[template].SILVER_USER.profile.login
// 						}
// 					}
// 					else {
// 						if ("mulesoft_idp" in my_sources) {
// 							login = my_sources["mulesoft_idp"].GOLD_USER.profile.login
// 						}
// 						else {
// 							login = my_sources[template].GOLD_USER.profile.login
// 						}
// 					}

// 					var arr = login.split("@")
// 					output[key] = arr[0]

// 					console.log("found (and shortened) the username to " + output[key])
// 					found = true
// 				}
// 				else if (key in process.env) {
// 					output[key] = process.env[key]
// 					console.log("found value " + key + " in process.env")
// 					found = true
// 				}
// 				else {
// 					for (var s in my_sources) {
// 						if (key in my_sources[s]) {
// 							output[key] = my_sources[s][key]
// 							console.log("found value " + key + " in " + s)
// 							found = true
// 						}
// 					}
// 				}

// 				if (!(found)) {
// 					console.log("Warning: could not find a value for " + key)
// 				}
// 			}

// 			console.log("\n===========================")

// 			console.log("Settings for " + template)

// 			console.log("===========================\n")

// 			for (var key in output) {
// 				console.log(key + ":")
// 				console.log(output[key])
// 			}

// 			console.log("-----------------------------")

// 			// fs.writeFile("./config/instances/app_settings.json", JSON.stringify(output, null, 2), "utf8", (err) => {

// 			// 	if (err) console.log(err)

// 			// 	else { console.log("updated config/instances/app_settings.json")}
// 			// })
// 		})
// 	})
// }