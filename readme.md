# Okta API Center

## Overview

The Okta API Center gives developers tools to see how easily Okta's API Access Management (OAuth as a Service) capabilities integrate with leading API gateways and application proxies.

This project includes:

1. Instructions for setting up various leading API gateways to use Okta as an authorization server
2. Instructions for setting up Okta with users, groups, authorization policies, and custom scopes (an automated Terraform script is also available)
3. A sample Node.js application that will allow sample end-users to get access tokens, and pass those access tokens to protected endpoints in your API gateway

If you want to see what these flows can look like from an end-user perspective, you can check out the [public demo site](https://okta-api-am.herokuapp.com) and [video](https://youtu.be/n8r-9Gpoods).

Okta is a standards-compliant OAuth 2.0 authorization server and a certified OpenID Provider.

## Quick setup
1. use either the automated [Terraform tool](https://okta-terraform.herokuapp.com) or the [step-by-step instructions](okta_setup_manual.md) to set up your Okta tenant with all of the objects that you need to generate access tokens with scopes
2. use the sample application `app.js` to enable sample users to get access tokens (with scopes) from your Okta authorization server
3. set up your API Gateway to validate access tokens issued by Okta
4. test your setup by using the sample application to send access tokens to your API gateway.

## Prerequisites

* __An Okta tenant__ - If you don't already have an Okta tenant, you can sign up for a free-forever [Okta developer edition](https://developer.okta.com/).

* __Node.js__ - the test application for this setup runs on Node.

* __An API Gateway__ - if you want to test the API gateway piece of this setup, you'll need an API gateway. Okta will work with any gateway that supports an external OAuth provider; a list of gateways that have been proven out follows.

## Gateways

Okta is a standards-compliant OAuth 2.0 authorization server and a certified OpenID Provider, so Okta will work with any API gateway or service that supports an external OAuth provider. As of today (July 2020), we have directly proven out compatibility with the following gateways (and reverse proxies):

* Amazon API gateway
* Apigee
* Google Cloud Endpoints
* Kong
* Mulesoft
* NGINX
* Software AG
* Tyk

## Overview of setup

The overall setup has the following components:

1. Set up your Okta tenant
2. Set up the sample application (and test it)
3. Set up your API (a mock API is available) and API Gateway
4. Test the application -> API gateway connection

You may find it helpful to read the following overview before jumping in to the setup steps.

## Overview of API access management & sample application

An API access management workflow typically includes the following components:
* An API
* An API gateway
* An application
* An OAuth authorization server
* An identity provider

And, of course, a use-case to drive the configuration of all of those components.

This setup uses a simple use-case to illustrate how the overall flow works:

* You are managing a "solar system" API and a viewing application.
* You want to control access to the API so that only users with a silver-level subscription (scope) get access to a list of the planets, and only users with a gold-level subscription (scope) get access to a (partial) list of the moons.

With that use-case as context, the detailed setup instructions follow.

### Set up your Okta tenant

To illustrate this use-case, you need to set up a number of different objects (users, groups, clients, policies, etc.) in your Okta tenant. You have a couple options for setting up these objects:

#### Terraform
Use the [automated Terraform tool](https://okta-terraform.herokuapp.com). The Terraform tool is a (non-supported) service that will take a couple of values from you (Okta API token, Okta tenant URL) and set up all of the objects for you automatically.

The Terraform script is here.

#### Step-by-step "manual" instructions
Set up the objects in your Okta tenant using the Okta admin UI. This will take a little longer, but it's still pretty quick, and will also get you more familiar with Okta and how easy it is to configure an authorization server. Instructions for setting up your Okta tenant are [here](okta_setup_manual.md).

After you've set up your Okta tenant, come back here and move on to testing your setup against the test application.

### Set up the test application

The test application allows your end-users to authenticate against your Okta tenant and get an access token (via the authorization code grant flow). The application can then send the access token to protected endpoints on your chosen API Gateway.

If you've used the Terraform tool to set up your Okta tenant, there are just a couple of adjustments that need to be made to your tenant "manually":

* go into your Okta tenant and set passwords (or send activation emails) for the two new users that were created: carl.sagan and jodie.foster.
* add the domain of your redirect_uri as a [trusted origin](https://developer.okta.com/docs/guides/enable-cors/overview/#granting-cross-origin-access-to-websites)

### Prerequisites for the sample application

You'll need the following values from setting up your Okta tenant:

OKTA_TENANT

	example: https://dev-399486.okta.com

ISSUER

	example: https://dev-399486.okta.com/oauth2/default

	this value will be `{{OKTA_TENANT}}/oauth2/default` unless you've set up a different authorization server in Okta.

CLIENT_ID

CLIENT_SECRET

### Setup for sample application

1. Download this repo:

`git clone https://github.com/tom-smith-okta/okta-api-center`

2. Change to the application directory:

`cd okta-api-center`

3. Install the node modules:

`npm install`

4. This app uses the `dotenv` npm package to manage configuration settings.

Copy the `.env_example` file to a file called

`.env`

Open the `.env` file and update the settings for your environment. If you've followed all of the instructions so far and accepted all of the defaults (or if you've used the Terraform interface), then you'll only need to update the following values:

OKTA_TENANT

ISSUER

CLIENT_ID

CLIENT_SECRET

If you're using Tyk as your gateway, change GATEWAY_IS_TYK to `true`.

There is a sample value for `GATEWAY_URI` that you can ignore for now; you'll update that after you set up your API Gateway.

Save the `.env` file.

#### Launch and test the application

With your settings updated in the `.env` file, go ahead and launch the application:

`node app.js`

Open a web browser and go to

`http://localhost:8080`

The happy path is to click the `authenticate` button in the "silver access" box and authenticate as carl.sagan. If all goes well, you will see a decoded access token in the access token box.

Similarly, if you click the authenticate button in the "gold access" box and authenticate as jodie.foster, you will see a decoded access token in the access token box.

The "raw" access token is available in the developer console if you want to inspect it.

> Note: a "real world" web application that is using the authorization code grant flow would not typically send the access token to the browser, but would rather keep it server-side. We're sending it back to the browser here for demo purposes.

> Note: if you authenticate as carl.sagan when you click on the authenticate button in the "gold access" box, you will successfully authenticate (get an Okta session) but you will not get an access token because the requested scopes do not line up with the policy you've set up in the authorization server.

> Note: if you've followed the default Okta setup instructions, or used the Terraform setup tool, your default access policy will still be active in your tenant. The default access policy actually allows any user to be granted any scope (as long as the scope is requested in the authorization request). If you want to see if the authorization policies are "really" working, then just make the default policy for the authorization server inactive.

If you click on the "show me" links now, they won't work, because we haven't set up the `gateway_uri` in our app yet. That's the next step.

### Set up your API Gateway + API

Each API Gateway accommodates external OAuth providers slightly differently. Follow the instructions in the 'gateways' folder of this repo for the gateway that you are using. Instructions are available for the following gateways:

* Apigee
* Amazon API gateway
* Kong
* Mulesoft
* Software AG
* Tyk

Please note that I have provided a very simple solar system API here: https://okta-solar-system.herokuapp.com

This API echoes a list (json object) of the planets: https://okta-solar-system.herokuapp.com/planets

And a (partial!) list of the moons: https://okta-solar-system.herokuapp.com//moons

For demo purposes, the API is wide open. In a real-world use-case you would of course lock down the API so that it could be accessed only through your gateway.

When you have finished setting up your API Gateway, come back to this doc to test your application and access tokens.

You will need the URI of your gateway for the next step.

### Test your application and access tokens

Now that you have set up your API Gateway, you should have a gateway uri. Enter that value in the `.env` file and restart the Node application.

Now, after you authenticate, you should be able to click on one of the "show me" buttons and get a list of the moons and/or planets, depending on the scopes in your access token.
