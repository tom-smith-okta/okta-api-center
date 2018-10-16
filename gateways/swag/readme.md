# Integrating Okta with Software AG

Okta can integrate with Software AG in several different ways:

* End-user authentication (OIDC)
* JWT validation
* OAuth 2

Software AG's OAuth 2 integration is relatively broad and deep, including capabilities such as dynamic client registration, and creating scopes in Okta via the Software AG UI. Okta is a predefined third-party OAuth 2 provider in Software AG.

That integration is most likely the integration you would want to use in production, and it is described [here](http://techcommunity.softwareag.com/web/guest/pwiki/-/wiki/Main/Securing+APIs+using+thirdparty+OAuth2+identity+provider+in+API+Gateway).

If you want to get familiar with the basics of Software AG and Okta, this guide will describe the lighter-weight jwt validation integration. Software AG will be evaluating an access token (jwt) minted by Okta, to see whether the access token is valid before granting access to the requested endpoint.

>*Note*: in a production environment, it is extremely important that the API itself also check the validity of the access token when it is passed on from Software AG. The API must inspect the access token for scopes (if applicable), and also at minimum check the values in the `exp` and `aud` fields.

Again, if you are more interested in the full capabilities of the OAuth 2 integration between Software AG and Okta, please see their tutorial: [Securing APIs using thirdparty OAuth2 identity provider in API Gateway](http://techcommunity.softwareag.com/web/guest/pwiki/-/wiki/Main/Securing+APIs+using+thirdparty+OAuth2+identity+provider+in+API+Gateway).

## What You'll Build

At the end of this setup, you'll have an architecture where:

1. End-users will be able to authenticate against Okta and receive an access token (via the app)
2. End-users will have different scopes in their access token, depending on their group assignments
3. The application will send the access token to the Software AG Gateway
4. Software AG will check the structural validity and signature of the access token
5. If the token is valid, Software AG will send the request on to the API
6. The API must also check the token for validity, and determine whether it has the appropriate scopes for the requested endpoint
7. The API will send the data payload to the gateway, which will send it on to the application

Please note that step 6 is not actually shown in the code or in the demo, but it's something that should be applied in production.

## Prerequisites for integrating Okta + Software AG API Gateway

1. **An Okta account.** If you don't already have one, you can get a free-forever account at [developer.okta.com](https://developer.okta.com/signup/)
2. **A Software AG account.** If you don't already have a Software AG account, you can get a free trial [here](https://www.softwareag.com/corporate/products/downloads/free_downloads/default.html‎).

### Step-by-step
The high-level process we are going to follow is:

1. Set up your API in Software AG
* key outputs: PROXY_URI / Audience
2. Set up your Okta tenant
* key outputs: OKTA_AZ_SERVER_ISSUER
3. Set up Okta as a JWT provider in your Software AG tenant
5. Set up and launch your application

In the last step, we'll launch a sample application that will show the end-to-end flow. This sample application requires a few settings - environment variables - to launch. To manage these environment variables, the application uses the [dotenv npm package](https://www.npmjs.com/package/dotenv). There is an example .env file in the repo called `.env_example`. Copy the `.env_example` file now to a file called `.env`.

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
# swag = Software AG
GATEWAY=""
```

There are a couple of values you should fill in now, such as `OKTA_TENANT` and `GATEWAY`. I will point out when we generate the other values along the way; you can either enter them in your `.env` file as you go, or do it all at the end. There is a helper script that will gather the settings for you at the end.

## Configure Software AG

### API details

Go to your Software AG webMethods API Gateway console

Click *APIs*

Click **Create APIs**

Choose *Create API from scratch*, then **Create**

In the API details screen, enter:

*Name*: solar-system

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/swag/swag_api_details.png)

Click *Continue to provide Technical information for this API*

For the *Protocol* choices, select *HTTPS*

In the *Host* field, enter the value for the Okta solar system API:

`okta-solar-system.herokuapp.com`

>*Note*: don't put the protocol in the host field

and

*Base path*: `/`

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/swag/swag_api_tech_information.png)

Then, click *Continue to provide Resource & Methods for this API*

We are going to add two resources to this API: `/planets` and `/moons`

*Resource name*: Planets
*Resource path*: /planets
*Supported methods*: GET

Click **Add**

Click the **Add Resources** button to add the `/moons` resource:

*Resource name*: Moons
*Resource path*: /moons
*Supported methods*: GET

Click **Add**

Now, scroll to the bottom of the page and click 

*Continue to provide Mocking information for this API*

You'll see a screen that says "API mocking is not enabled".

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/swag/swag_api_mocking_enabled.png)

Click the **Save** button to save your API.

Now click the **Activate** button to activate your API.

Click **Yes** on the "are you sure?" prompt.

You now have a Gateway endpoint for your API.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/swag/swag_api_gateway_endpoint.png)

Enter the value of your Gateway endpoint in your `.env` file as the `PROXY_URI` value.

### Scopes

Software AG does not check for scopes in access tokens, so we're going to skip the Scopes section and move straight to Policies.

### Policies

Click on the *Policies* tab

If necessary, click **Deactivate**

Click **Edit**

Click *Identify & Access*, then *Inbound Authentication - Transport*

In the menu that pops up in the right-hand column, check the box for *JWT Authentication*

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/swag/swag_add_jwt_auth.png)

Click **Save**

That finishes setting up the Software AG API for the moment. Now we need to set up our Okta tenant, and then we'll come back to Software AG to add Okta as a JWT provider.

## Set up your Okta tenant

To properly demonstrate OAuth as a Service, you need a number of elements in your Okta tenant: a client, users, groups, an authorization server, scopes, policies, and rules. And, you need to establish the proper relationships among them.

You have a couple of options to set these up:

* You can use the Okta bootstrap tool. The Okta bootstrap tool is a "labs" type project. It is the fastest and easiest way to get your tenant set up. Instructions are [here](../../okta_setup/okta_setup_bootstrap.md).
* You can set up your Okta tenant "manually", with Okta's easy-to-use admin UI. Instructions are available [here](../../okta_setup/okta_setup_manual.md).

Go ahead and set up your Okta tenant, then come back to these instructions.

### Get your `issuer` value

If you used the Okta bootstrap tool to set up your Okta tenant, you can run a helper script to get you the settings you'll need the rest of the way:

```bash
node get_settings.js --swag
```

This will output some values to the screen. For the next step in our set-up, we'll need the following values:

* `ISSUER`
* `JWKS_URI`
* `AUDIENCE`

## Add Okta as JWT Issuer to Software AG

Now that you've set up your Okta tenant with an authorization server, we can set up your Software AG tenant with Okta as a recognized JWT issuer.

Go to the Administration section of Software AG.

Click on the *Security* tab.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/swag/swag_add_jwt.png)

In the left-hand column, click on *JWT*.

In the *External JWT configuration* section, click **Add issuer**

In the *Issuer* field, enter your value for `ISSUER`

In the JWKS URI field, enter your value for `JWKS_URI`

In the Audience field, enter your value for `AUDIENCE`

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/swag/swag_external_jwt_configuration.png)

Click **Save** to save the configuration.

That completes setting up Okta as an authorizer for your API. Now we can launch the sample application to test.

## Get the app settings

If you used the bootstrap tool for setup, and you haven't run the helper script yet to extract the relevant settings, go ahead and run it now:

```bash
node get_settings.js --swag
```

The script will display the settings on the screen, and also save them to an output file so that you can refer to them later if you need to.

Take these settings and update your `.env` file with any values that still need to be added.
>Note: you don't need to copy every setting from the output, but it's no harm if you do.

If you did not user the bootstrap tool for setup, refer to your Okta tenant for the appropriate values to enter into the `.env` file.

## Launch the app

You can now launch your app:

```bash
node app.js
```

When you load the web app, first try clicking on the "show me the planets" and/or the "show me the moons" buttons. You'll get an error from the API Gateway.

Next, try authenticating as one of the users. You'll get an id token and an access token displayed in the browser (in a production environment, you would not do this). The raw tokens are also available in the console if you want to check them out.

Now that the user has a token (actually the token is sitting on the server), you can click on one of the "show me" buttons again to see if you get the requested resource.

Enjoy the solar system!

----------------