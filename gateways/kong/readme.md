# Integrating Okta + Kong

This integration guide describes how to integrate Okta's API Access Management (OAuth as a Service) with Kong API Gateway.

The integration described here is an authorization-tier integration; authentication will be happening outside of Kong. A web application will handle authentication vs. Okta, acquiring an access token, and sending that access token to Kong on behalf of the end-user.

If you are instead interested in a scenario where Kong itself handles authentication vs. Okta, and passes user info to upstream apps, please see the blog post [here](https://developer.okta.com/blog/2017/12/04/use-kong-gateway-to-centralize-authentication).

## What You'll Build

At the end of this setup, you'll have an architecture where:

1. Users will be able to authenticate against Okta and receive an access token (via the app)
2. Users will have different scopes in their access token, depending on their group assignments
3. The application will send the access token to the Kong
4. Kong will check the validity of the access token locally
5. If the token and scopes are valid, Kong will send the request on to the API
6. The API will send the data payload to the gateway, which will send it on to the application

## Prerequisites for integrating Okta + Kong

1. **An Okta account.** If you don't already have one, you can get a free-forever account at [developer.okta.com](https://developer.okta.com/signup/)
2. **Kong Enterprise.** In this example we'll be using the OIDC plug-in for Kong, which is only available for Kong Enterprise. If you don't already have a Kong Enterprise account, you can get a 30-day trial [here](https://konghq.com/free-trial/‎).

### Step-by-step
The high-level process we are going to follow is:

1. Set up your Okta tenant
2. Set up your API in Kong
3. Set up and launch your application

In the last step, we'll launch the sample application that will show the end-to-end flow. This sample application requires a few settings - environment variables - to launch. To manage these environment variables, the application uses the [dotenv npm package](https://www.npmjs.com/package/dotenv). There is an example .env file in the repo called `.env_example`. Copy the `.env_example` file now to a file called `.env`.

This is what the .env_example file looks like:

```
# Okta settings

# example: https://dev-511902.oktapreview.com
OKTA_TENANT=""

OKTA_API_TOKEN=""
AUTHN_CLIENT_ID=""
AUTHN_CLIENT_SECRET=""

# example: https://dev-511902.oktapreview.com/oauth2/ausfqw42xrkmpfDHI0h7
OKTA_AZ_SERVER_ISSUER=""

# Gateway/Proxy base url
# example: http://52.14.100.89:8080/solar-system
PROXY_URI=""

# App settings
PORT="8080"
REDIRECT_URI="http://localhost:8080"
SILVER_USERNAME=""
GOLD_USERNAME=""
FAKE_USER_PASSWORD=""
SESSION_SECRET="some random phrase"
SESSION_MAX_AGE=60000

# Supported values: kong, mulesoft, tyk
GATEWAY=""
```

There are a couple of values you should fill in now, such as `OKTA_TENANT` and `GATEWAY`. I will point out when we generate the other values along the way; you can either enter them in your `.env` file as you go, or do it all at the end. There is a helper script that will gather the settings for you at the end.

## Set up Kong

Make sure you have Kong up and running. If you have not yet set up your Kong tenant, you might want to check out their [5-minute quickstart](https://docs.konghq.com/enterprise/0.33-x/getting-started/quickstart/).

For now, you just need the URL of your Kong instance. The Kong API gateway typically runs on port 8000, so your url should look something like this:

http://localhost:8000

or

http://ec2-18-24-32-111.us-east-2.compute.amazonaws.com:8000

This is the `PROXY_URI` that you need to enter in the `.env` file.

## Set up your Okta tenant

To properly demonstrate OAuth as a Service, you need a number of elements in your Okta tenant: users, groups, an authorization server, scopes, policies, and rules. You have a couple of options to set these up:

* You can use the Okta bootstrap tool. That’s what I’m going to assume for the rest of these instructions.
* You can set up your Okta tenant "manually", with Okta's easy-to-use admin UI. Instructions are provided at the end of this guide.

If you're going to use the Okta bootstrap tool, add your Okta API token to your `.env` file.

To get an Okta API token, you can follow the instructions [here](https://developer.okta.com/docs/api/getting_started/getting_a_token).

## Configure your Okta Account

To set up your Okta tenant with all of the components needed for this example such as users, groups, authorization servers, etc., we'll run a bootstrap script.

Make sure you've added an Okta API token to the `.env` file, and make sure you're OK with the default values for REDIRECT_URI and PORT. These values will be used to set up the OIDC client and launch the node app.

> NOTE: again, if you'd like to set up your tenant manually, rather than using the bootstrap tool, there are step-by-step instructions at the end of this article.

To set up your Okta tenant for this example, you can just use the "standard" Okta API Access Management setup.

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

Press C (or enter) to continue.

The bootstrap tool iterates through the values in the input file, pausing to ask if you want to accept each value. You can enter "a" to accept all remaining values without pausing.

When the bootstrap process completes, we have Okta objects - most importantly a client_id and and authorization server - that we can use with Kong to ensure that access tokens are checked properly.

These values are stored in the file `/okta_bootstrap/output/standard.json`. You can take a look at that file now if you're curious about the output. Later on we'll run a script to extract the values we need for your `.env` file.

### Whitelist your redirect_uri
One step needs to be done manually in your Okta tenant before launching your app: whitelisting your redirect_uri.

The default value for redirect_uri used in the bootstrap script is:

http://localhost:8080

if you are using a different uri, you should use that one instead.

To add your `REDIRECT_URI` as a Trusted Origin in your Okta tenant:

Go to API->Trusted Origins->Add Origin (if you are using the classic UI, go to Security->API->Trusted Origins->Add Origin).

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta_trusted_origin.png)

## Configure Kong

To set up your API on Kong, it's easiest to use curl commands. Issue the following commands to set up your API with the example endpoints and scopes.

### Create the service (API)
```
curl -i -X POST \
  --url http://localhost:8001/services/ \
  --data 'name=solar-system' \
  --data 'url=https://okta-solar-system.herokuapp.com'
```
### Add a route (resource) - /planets
```
curl -i -X POST \
  --url http://localhost:8001/services/solar-system/routes/ \
  --data 'paths[]=/planets' \
  --data 'strip_path=false'
```
You will get a json object as a result:
```
{"created_at":1531761136,"strip_path":false,"hosts":null,"preserve_host":false,"regex_priority":0,"updated_at":1531761136,"paths":["\/planets"],"service":{"id":"950db7a0-ae97-48ac-9327-89c8ee71034b"},"methods":null,"protocols":["http","https"],"id":"64640aa5-14ab-47a2-a75d-a93fa447be26"}
```
Copy the `id` value from the result. Note: make sure you copy the _route_ id, which is the last value, and not the _service_ id.

### Add the OIDC plugin to the /planets route
Update the values for route_id, config.issuer, and config.client_id in the command below. You can find the OKTA_AZ_SERVER_ISSUER and the AUTHN_CLIENT_ID values in the bootstrap output file:
`/okta_bootstrap/output/standard.json`

and then execute this command:
```
curl -i -X POST \
  --url http://localhost:8001/services/solar-system/plugins/ \
  --data 'name=openid-connect' \
  --data 'route_id={{ROUTE_ID}}' \
  --data 'config.issuer={{OKTA_AZ_SERVER_ISSUER}}' \
  --data 'config.client_id={{AUTHN_CLIENT_ID}}' \
  --data 'config.ssl_verify=false' \
  --data 'config.cache_ttl=60' \
  --data 'config.scopes_required=http://myapp.com/scp/silver' \
  --data 'config.scopes_claim=scp'
```
Note: we're disabling the `ssl_verify` option here for demo purposes, but you would not do that in production.

### Add another route - /moons
```
curl -i -X POST \
  --url http://localhost:8001/services/solar-system/routes/ \
  --data 'paths[]=/moons' \
  --data 'strip_path=false'
```
again, capture the route id from the result.

### Add the OIDC plugin to the /moons route
Use the same command as above, but make sure you update the `route_id` and `scopes_required` values.

```
curl -i -X POST \
  --url http://localhost:8001/services/solar-system/plugins/ \
  --data 'name=openid-connect' \
  --data 'route_id={{ROUTE_ID}}' \
  --data 'config.issuer={{OKTA_AZ_SERVER_ISSUER}}' \
  --data 'config.client_id={{AUTHN_CLIENT_ID}}' \
  --data 'config.ssl_verify=false' \
  --data 'config.cache_ttl=60' \
  --data 'config.scopes_required=http://myapp.com/scp/gold' \
  --data 'config.scopes_claim=scp'
```

That completes the setup for Kong. We now have an API gateway (Service) and two resources (Routes) that are secured with scopes.

## Get the app settings

If you've been using the Okta bootstrap tool, you can run a script to gather the remaining settings that the app will need. In your `.env` file, make sure you've set the value

`GATEWAY="kong"`

Now, run the helper script that will gather your app settings for you. The script will display the settings on the screen and also save them to an output file so that you can refer to them later if you need to.

```bash
node get_settings.js
```

Take these settings and update your `.env` file with any values that still need to be added.

You can now launch your app:

```bash
node app.js
```

When you load the web app, first try clicking on the "show me the planets" and/or the "show me the moons" buttons. You'll get an error notifying you that you need an access token.

Next, try authenticating as one of the users. You'll get an id token and an access token displayed in the browser (in a production environment, you would not do this). The raw tokens are also available in the console if you want to check them out.

Now that the user has a token (actually the token is sitting on the server), you can click on one of the "show me" buttons again to see if you get the requested resource.

----------------

Instructions for those not using the bootstrap tool:

These instructions assume that you are using the Developer Edition of Okta. If you are using the Enterprise version, some of the screen captures and menus may look a little different.

Also, we’re going to use the default authorization server that is built in to the developer edition. If you are using an Enterprise edition of Okta, you will need to set up an authorization server.

### Create an OIDC client

Click “Applications” and then “Add application”.

Choose “Web”, then Next.

Name: Okta Authentication Client

For the Login redirect URIs, add the URI of your application. Throughout this guide, I have been using

`http://localhost:8000`

but you may be using a different URI in your environment.

Click Done.

You’ll get a client id and client secret.

### Create Users and Groups
Set up a group: Users->Groups->Add Group
Name the group “silver subscribers”; you can use the same for the description
Click Add Group
Add a user: Users->People->Add Person
In the Groups field, add “silver subscribers”
Use whatever values you wish for the remaining fields
Click Save

### Add custom scopes
API->Authorization Servers->default
Click the Scopes tab
Click Add Scope
Name: http://myapp.com/scp/silver
Description: Silver scope
Click Create

### Add a policy
API->Authorization Servers->default
Click the Access Policies tab
Click Add New Access Policy
Name: Solar system API access
Description: Solar system API access
It’s OK to leave it assigned to All clients
Click Create

### Add a rule
In your policy, click the Add Rule button
Rule Name: silver access to planets
Change the User clause to “Assigned the app and a member of the following:”
Add the silver subscribers group
Change the Scopes clause to “The following scopes:”
Add these scopes:
http://myapp.com/scp/silver
openid
Click “Create Rule”

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta_add_rule.png)

Your authorization server is now set up so that users in the _silver subscribers_ group who request the “http://myapp.com/scp/silver” scope upon authentication will be granted that scope in their access token. In the API gateway, this scope will give them access to the /planets resource.

The API Center application renders two user authentication/authorization flows: one for a “silver” user (which you’ve just set up) and one for a “gold” user. If you would like to see the flow for a “gold” user (access to /moons) then go through the steps above (starting with the creation of another new group) using “gold” as the keyword in the place of “silver”.

Follow the steps above to add your REDIRECT_URI as a Trusted Origin in your Okta tenant

Update your `.env` and save.

Launch the web app!

```bash
node app.js
```
