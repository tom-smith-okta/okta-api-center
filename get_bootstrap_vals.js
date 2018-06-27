// Okta API Access Management

// retrieve a list of values from an Okta bootstrap output file

var fs = require("fs")

get_image()
.then((msg) => process.exit())
.catch((error) => console.log(error))


function get_image() {

	return new Promise((resolve, reject) => {

		var msg = ""
		if (!(process.argv[2])) {
			msg += "Sorry, you must provide the name of a bootstrap image like this:"
			msg += "\n   node get_vals.js --mulesoft_idp"
			reject(msg)
		}

		var g = process.argv[2]

		var arr = g.split("--")

		var image = arr[1]

		var file_path = './okta_bootstrap/output/' + image + '.json'

		fs.readFile(file_path, 'utf8', (error, data) => {
			if (error) {
				msg += "Warning: could not find a bootstrap image at " + file_path
				msg += "\nproceeding without it..."
			}

			var bootstrap_obj = JSON.parse(data)

			var settings_path = './config/show_settings.json'

			fs.readFile(settings_path, 'utf8', (error, settings) => {
				if (error) {
					reject("could not open " + settings_path)
				}

				console.log("\n===========================")

				console.log("Settings for " + image)

				console.log("===========================\n")

				var obj = JSON.parse(settings)

				var this_image = obj[image]

				for (var i in this_image) {
					for (var key in this_image[i]) {

						var bootstrap_key = this_image[i][key]

						console.log(key  + ":")

						if (key === "Authorization Header") {
							console.log("SSWS OKTA_API_TOKEN")
						}
						else {
							console.log(bootstrap_obj[bootstrap_key])
						}
						console.log("\n")
					}
				}

				resolve()
			})
		})
	})
}