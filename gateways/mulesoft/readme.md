# Integrating Okta with Mulesoft Anypoint

If you're building or managing an API, you're probably using an API gateway to help you manage it. Hopefully, you're also using OAuth and an identity provider (IdP) like [Okta](https://developer.okta.com/) to secure your API through the gateway. Maybe you've also discovered that getting the "OAuth dance" working properly among the gateway, IdP, and application can be tricky.

I've worked with a lot of different API gateways and want to provide some guidance and tools to help you get a reference architecture up and running between an authorization server and your API gateways. I'll start with Mulesoft, but will add more gateways on a regular basis. This sample workflow will give you a working example that you can modify to suit your own use-case.

If you want to skip ahead, you can see sample workflow in action here:

https://youtu.be/n8r-9Gpoods

## Prerequisites for this integration

1. **An Okta account.** If you don't already have one, you can get a free-forever account at [developer.okta.com](https://developer.okta.com/signup/)
2. **An Okta API Token.** Once you've activated your Okta tenant, you can follow the instructions [here](https://developer.okta.com/docs/api/getting_started/getting_a_token) to get an API token.
3. **An API Gateway.** If you don't already have a Mulesoft Anypoint account, you can get a free 30-day trial version [here](https://anypoint.mulesoft.com/login/#/signup).

## What You'll Build

At the end of this setup, you'll have an architecture where:

1. Users will be able to authenticate against Okta and receive an access token (via the app)
2. Users will have different scopes in their access token, depending on their group assignments. The application will send the access token to the API gateway
4. The API gateway will check the validity of the access token - including scopes - against Okta
5. If the token and scopes are valid, the gateway will send the request on to the API
6. The API will send the data payload to the gateway, which will send it on to the application

### Step-by-step
The high-level process we are going to follow is:

1. Set up your Okta tenant
2. Set up your API in Mulesoft
3. Create an Okta developer client via the Mulesoft UI
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
SILVER_PASSWORD=""
GOLD_USERNAME=""
GOLD_PASSWORD=""
SESSION_SECRET="some random phrase"
SESSION_MAX_AGE=60000

# Supported values: aws, kong, mulesoft, swag, tyk
GATEWAY=""
```

There are a couple of values you should fill in now, such as `OKTA_TENANT` and `GATEWAY`. I will point out when we generate the other values along the way; you can either enter them in your `.env` file as you go, or do it all at the end. There is also a helper script that will gather the settings for you at the end.

## Configure your Okta Account

To properly demonstrate OAuth as a Service, you need a number of elements in your Okta tenant: users, groups, an authorization server, scopes, policies, and rules. You have a couple of options to set these up:

* You can use the Okta bootstrap tool. That’s what I’m going to assume for the rest of these instructions.
* You can set up your Okta tenant "manually", with Okta's easy-to-use admin UI. Instructions are available at the end of this article.

To set up your Okta tenant with all of the components needed for this example, such as users, groups, authorization servers, etc., we'll run a couple bootstrap scripts.

The first bootstrap script will configure a number of objects in your Okta tenant. The objects we need right away are an authorization server and an introspection client so that we can set up Okta as an external identity provider in Mulesoft.

Make sure you've added your `OKTA_API_TOKEN` to your `.env` file.

Also, make sure you're OK with the default values for REDIRECT_URI and PORT. You can change these values in the .env file if you need to.

```bash
node okta_bootstrap.js --mulesoft
```

The Okta bootstrap tool will find an input file, which contains the inputs required for initial setup.

```bash
node okta_bootstrap --mulesoft

Found a valid input file at ./okta_bootstrap/input/mulesoft.json
sending a request to Okta to test the api token...
the token works

now, reviewing all values...

looking for TAG...
cannot find a final value for TAG yet
calculating/retrieving default value...
this is a generated value...
'autogen20180625-1247'
Do you want to:
(C) continue with this value
(p) provide a new value
(a) auto-accept and generate all remaining values
(q) quit
```

To just accept all default values automatically, enter `a`

Or, you can press C (or enter) to continue. In this case the bootstrap tool iterates through the values in the input file, pausing to ask if you want to accept each value. You can enter "a" to accept all remaining values without pausing.

We now have values that we can enter into Mulesoft Anypoint to set up Okta as an identity provider.

We'll use a tool to pull out these settings from the bootstrap output file in a moment.

## Configure your Mulesoft Account
In your Mulesoft Anypoint tenant, go to:
Management Center->Access Management->External Identity->Client Management->OpenID Connect Dynamic Client Registration

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_external_identity.png)

Click on "advanced settings" to expose the Authorization Header field.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_advanced_settings.png)

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_dynamic_client_registration.png)

You can retrieve the values needed for this screen with the following command:

```bash
node get_settings --mulesoft_introspect
```

Paste the values into the form. Note: For the *authorization header* field, use this value: `SSWS OKTA_API_TOKEN` and replace `OKTA_API_TOKEN` with your actual token.

Click **Save**.

Keep the values for `AUTHORIZE_URL` and `TOKEN_URL` handy, because you will need them in a moment.

## Deploy Your Mulesoft API

In your Mulesoft Anypoint tenant, go to:

Design Center->Create->API Specification

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_new_api_specification.png)

Give your API a name (like "okta solar system") and click "Create".

You now have an (almost) empty RAML file to design your API.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_empty_raml.png)

Next, copy the RAML template from the Okta API Center repo into the Mulesoft editor.

```
/gateways/mulesoft/mulesoft.raml
```

Update the values for `AUTHORIZE_URL` and `TOKEN_URL`.

The file should save automatically; you can do command-s to force the save.

Now click the “Publish to Exchange” icon in the upper right.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_publish_to_exchange.png)

And click publish again:

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_publish_to_exchange_detail.png)

Now go to the Anypoint API Manager: Management Center->API Manager

Click the “Manage API" dropdown, and then “Manage API from Exchange”

Start typing your API name (“okta-solar-system”) in the API name field to search for it.

Choose the following options and click "Save". (Note that you might need to click somewhere in the Path field to activate the Save button.)

```
Asset type: RAML/OAS
API version: 1
Asset version: 1.0.0
Managing type: Endpoint with Proxy
Implementation URI: https://okta-solar-system.herokuapp.com
Proxy deployment target: CloudHub
Path: /
```

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_manage_api_from_exchange.png)

You now have a Settings screen for your API. Scroll down to the Deployment Configuration section, choose a runtime version (3.9.x works well), and enter a unique name for your cloudhub deployment. Make sure you save this url now.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_deployment_config.png)

Click "deploy" to deploy your API to cloudhub. The deployment can take a few seconds or sometimes longer. You should see a successful deployment message when you are done:

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_deployment_successful.png)

Save the path of your cloudhub.io deployment (example: "http://my-api.cloudhub.io") - you'll need it later.

## Set up Mulesoft Access Policies for Your API

On the main settings screen of your API, click on "Policies",

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_click_policies.png)

Then, click on “Apply New Policy” and select "OpenID Connect access token enforcement".

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_openid_access_token_enforcement.png)

Click **Configure Policy**

On the *Apply OpenId Connect access token enforcement policy* screen, add one scope to the list of scopes:
`http://myapp.com/scp/silver`.

Select "Apply configurations to specific methods & resources".

For Methods, choose GET and for the URI template regex, enter:

```
/planets
```

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_apply_access_policy.png)

Be sure to click "Apply". 

We need to set up one more policy to show how different users get different access. Click **Apply New Policy** and this time use the scope `http://myapp.com/scp/gold` and the resource:

```
/moons
```

## Set up a Mulesoft Authentication Client

Any access tokens sent to Mulesoft need to be minted by a client that Mulesoft recognizes. Mulesoft supports dynamic client registration with Okta, which is pretty cool.

In Mulesoft Anypoint, go to Exchange, where you will see a list of assets. Generally, the quickest way to find your API is to click on your organization name in the left-hand column.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_assets.png)

Click on your REST API (not the connector).

You will see the portal home screen of your API. Click on the menu drop-down in the upper right and select "Request access".

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_request_access.png)

You will now see the *Request API access* screen:

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_request_API_access.png)

Click *Create a new application* and enter the following values when prompted:

Name: Solar System Auth
OAuth 2.0 Grant type: Authorization Code Grant
OAuth 2.0 redirect URIs: http://localhost:8080 (or whatever REDIRECT_URI you established at the beginning of the process).

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_create_new_app.png)

Click **Create** to create your new client.

You will see the *Request API access* screen. Select your API instance and click **Request API access**.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_req_API_access.png)

You will see an "API Access has been successful!" message.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_api_access_successful.png)

Add the `Client ID` and `Client secret` to your `.env` file (in the `AUTHN_CLIENT_ID` and `AUTHN_CLIENT_SECRET` fields).

And, while you have the `.env` file open, copy your Mulesoft Cloudhub url to the `PROXY_URI` field. (You can find your Cloudhub URL - listed as Proxy URL - on your API settings home page if you didn't save it earlier). If your Proxy URL does not begin with http:// (or https://), make sure you add http:// (or https://) to the beginning of the URL when you paste it into your `.env` file.

## Configure your Okta Account (Part 2)

Now that we have our authentication client_id and secret, we can set up our policies and rules in the Okta tenant. To do so, run the following bootstrap script:

```bash
node okta_bootstrap.js --mulesoft_policy
```

Two steps need to be done manually in your Okta tenant before launching your app.

1) Add your `REDIRECT_URI` as a Trusted Origin in your Okta tenant:

Go to API->Trusted Origins->Add Origin (if you are using the classic UI, go to Security->API->Trusted Origins->Add Origin).

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta_trusted_origin.png)

2) Assign the Okta client (`AUTHN_CLIENT_ID`) that you created via the Mulesoft UI to Okta users/groups

For the purposes of this demo, we're going to assign this client to the Everyone group, but in a production environment, you would assign it to only the groups that need to use it.

In your Okta tenant, go to Applications, find your Solar System Auth app, and click the Assignments tab.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta_assign_group.png)

Click the **Assign** button and then select *Assign to Groups*

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta_everyone_group.png)

Click the **Assign** button next to the Everyone group, then click **Done**.

## Launch the Node Application

If you've been using the Okta bootstrap tool, run a script to gather the settings that the app will need:

```bash
node get_settings.js --mulesoft
```

Use these settings to update your `.env` file.

You can now launch your app:

```bash
node app.js
```

When you load the web app, first try clicking on the "show me the planets" and/or the "show me the moons" buttons. You'll get an error notifying you that you need an access token.

Next, try authenticating as one of the users. You'll get an id token and an access token displayed in the browser (you would not do this in prod). The raw tokens are also available in the console if you want to check them out.

Now that the user has a token (actually the token is sitting on the server), you can click on one of the "show me" buttons again to see if you get the requested resource.

## Wrapping up

Hopefully you've found this walk-through helpful. As I mentioned at the start, the OAuth dance among the application, IDP, and API gateway can be tricky. Now that you have a basic working flow, you can experiment with other scopes, clients, groups, etc. to fit your own use-cases.

Enjoy the planets!

## Further Reading
If you want to learn more about OAuth or using Okta with Node.js, you may find these articles interesting:

* What is the OAuth 2.0 Authorization Code Grant Type?
* Build Secure Node Authentication with Passport.js and OpenID Connect
* What the Heck is OAuth?
* Tutorial: Build a Basic CRUD app with Node.js
Head over to Okta’s OIDC/OAuth 2.0 API for more detailed information on how we support OAuth. 
As always, you can follow us on Twitter @oktadev for more content or drop a question in the comments below!

----------------

Instructions for those not using the bootstrap tool:

These instructions assume that you are using the Developer Edition of Okta. If you are using the Enterprise version, some of the screen captures and menus may look a little different.

Also, we’re going to use the default authorization server that is built in to the developer edition. If you are using an Enterprise edition of Okta, you will need to set up an authorization server.

1. Set up an introspection client: Mulesoft uses a dedicated client to introspect all tokens.

Click “Applications” and then “Add application”.

Choose “Service”, then Next.

Name: Token Introspection Client

Click Done.

You’ll get a client id and client secret. Set these aside for Token Introspection.

2. Get your OpenID Connect Authorization URLs

Click API->Authorization Servers

Click default

Click on the Metadata URI

Leave this page open

3. Follow the steps outlined in “Mulesoft tenant: set up Okta as an External Identity Provider”

Client Registration URL = Metadata->registration_endpoint
Authorization Header = SSWS OKTA_API_TOKEN
Client ID = token introspection client
Client Secret = token introspection secret
Authorize URL = Metadata->authorization_endpoint
Token URL = Metadata->token_endpoint
Token Inspection URL = Metadata->introspection_endpoint

4. Finish the Mulesoft set-up:
Mulesoft tenant: set up and deploy your API
Mulesoft tenant: set access policies on your API
Mulesoft tenant: set up an authentication client

At the end of the “set up an authentication client” step, you’ll have a client_id and client_secret to use as your authentication client id and secret.

5. Setting up your Okta tenant

* Set up a group: Users->Groups->Add Group
   * Name the group “silver subscribers”; you can use the same for the description
   * Click Add Group
* Add a user: Users->People->Add Person
   * In the Groups field, add “silver subscribers”
   * Use whatever values you wish for the remaining fields
   * Click Save
* Add a scope: API->Authorization Servers->default
   * Click the Scopes tab
   * Click Add Scope
      * Name: http://myapp.com/scp/silver
      * Description: Silver scope
      * Click Create
* Add a policy
   * Click the Access Policies tab
   * Click Add New Access Policy
      * Name: Solar system API access
      * Description: Solar system API access
      * It’s OK to leave it assigned to All clients
      * Click Create
* Add a rule
   * Click the Add rule button
      * Rule Name: silver access to planets
      * Change the User clause to “Assigned the app and a member of the following:”
         * Add the silver subscribers group
      * Change the Scopes clause to “The following scopes:”
         * Add these scopes:
            * http://myapp.com/scp/silver
            * openid
      * Click “Create Rule”

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta_add_rule.png)

Your authorization server is now set up so that users in the silver subscribers group who request the “http://myapp.com/scp/silver” scope upon authentication will be granted that scope in their access token. In the API gateway, this scope will give them access to the /planets resource.

The API Center application renders two user authentication/authorization flows: one for a “silver” user (which you’ve just set up) and one for a “gold” user. If you would like to see the flow for a “gold” user (access to /moons) then go through the steps above (starting with the creation of another new group) using “gold” as the keyword in the place of “silver”.

6. Follow the steps above to add your REDIRECT_URI as a Trusted Origin in your Okta tenant
7. Follow the steps above to assign the authentication client (created via Mulesoft UI) to Everyone.
8. Update the values in `.env` and save.
9. Launch the web app!

```bash
node app.js
```