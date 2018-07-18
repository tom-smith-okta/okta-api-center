// Okta API Access Management

////////////////////////////////////////////////////
require('dotenv').config()

var fs = require("fs")

var output = {}

var sources = {}

///////////////////////////////////////////////////////

get_template()
.then((msg) => process.exit())
.catch((error) => console.log(error))

function get_template() {

	return new Promise((resolve, reject) => {

		var msg = ""
		if (!(process.argv[2])) {
			msg += "Sorry, you must provide the name of a template like this:"
			msg += "\n   node update_app_settings.js --app"
			msg += "\n   where /config/app_settings_template.json"
			msg += "\n   is the template you want to use."
			reject(msg)
		}

		var g = process.argv[2]

		var arr = g.split("--")

		var template = arr[1]

		if (template === "app" || template === "mulesoft") {
			sources.app = ["mulesoft_idp", "mulesoft_policy"]

			sources.mulesoft = ["mulesoft_idp"]
		}
		else {
			sources[template] = [template]
		}

		var file_path = './config/templates/' + template + '_settings_template.json'

		fs.readFile(file_path, 'utf8', (error, data) => {
			if (error) { reject(error) }

			var my_sources = {}

			for (var i in sources[template]) {

				var src = sources[template][i]
				console.log("the source is: " + sources[template][i])

				my_sources[src] = require("./okta_bootstrap/output/" + src + ".json")
			}

			var template_obj = JSON.parse(data)

			for (var key in template_obj) {
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
				else if (key in process.env) {
					output[key] = process.env[key]
					console.log("found value " + key + " in process.env")
					found = true
				}
				else {
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

			console.log("Settings for " + template)

			console.log("===========================\n")

			for (var key in output) {
				console.log(key + ":")
				console.log(output[key])
			}

			console.log("-----------------------------")

			fs.writeFile("./config/instances/app_settings.json", JSON.stringify(output, null, 2), "utf8", (err) => {

				if (err) console.log(err)

				else { console.log("updated config/instances/app_settings.json")}
			})
		})
	})
}