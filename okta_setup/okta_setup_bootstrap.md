# Set up your Okta tenant

To properly demonstrate OAuth as a Service, you need a number of elements in your Okta tenant: a client, users, groups, an authorization server, scopes, policies, and rules. And, you need to establish the proper relationships among them.

You have a couple of options to set these up:

* You can use the Okta bootstrap tool. The Okta bootstrap tool is a "labs" type project. It is the fastest and easiest way to get your tenant set up. Instructions are [here](../okta_setup/okta_setup_bootstrap.md).
* You can set up your Okta tenant "manually", with Okta's easy-to-use admin UI. Instructions are available [here](../okta_setup/okta_setup_manual.md).

If you're going to use the Okta bootstrap tool, add your Okta API token to your `.env` file now.

If you don't have an Okta API token, you can follow the instructions [here](https://developer.okta.com/docs/api/getting_started/getting_a_token).

Make sure you're OK with the default values for REDIRECT_URI and PORT in your `.env` file. These values will be used to set up the OIDC client and launch the node app.

To set up your Okta tenant for this example, use the following command:

```bash
node okta_bootstrap.js --standard
```

The Okta bootstrap tool will find an input file, which contains the inputs required for initial setup.

```bash
C02QW118G8WL:okta-api-center tomsmith$ node okta_bootstrap --standard
Found a valid input file at ./okta_bootstrap/input/standard.json
sending a request to Okta to test the api token...
the token works

now, reviewing all values...

looking for TAG...
cannot find a final value for TAG yet
calculating/retrieving default value...
looking at string {{GENERATE_TAG}}
this is a generated value...
'autogen20180716-1634'
Do you want to:
(C) continue with this value
(p) provide a new value
(a) auto-accept and generate all remaining values
(q) quit
: c
```

To generate all of your Okta objects automatically, enter `a`

If you would like to see more of what's going on as the bootstrap tool operates, press `C` (or `enter`) to continue. The bootstrap tool will iterate through all of the values in the input file, pausing to ask if you want to accept each value. (You can enter `a` at any point to automatically generate all remaining values.)

When the bootstrap process completes, we have Okta objects - most importantly a client_id and and authorization server - that we can use with Amazon API Gateway to ensure that access tokens are checked properly.

These values are stored in the file `/okta_bootstrap/output/standard.json`. You can take a peek at that file now if you're curious about the output. Later on we'll run a script to extract the values we need for your `.env` file.

### Whitelist your redirect_uri
One step needs to be done manually in your Okta tenant before launching your app: whitelisting your redirect_uri.

The default value for redirect_uri used in the bootstrap script is:

http://localhost:8080

if you want to use a different uri, you should use that one instead.

To add your `REDIRECT_URI` as a Trusted Origin in your Okta tenant:

Go to API->Trusted Origins->Add Origin (if you are using the classic UI, go to Security->API->Trusted Origins->Add Origin).

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta_trusted_origin.png)