# Integrating Okta with Mulesoft Anypoint

If you're building or managing an API, you're probably using an API gateway to help you manage it. Hopefully, you're also using OAuth and an identity provider (IdP) like [Okta](https://developer.okta.com/) to secure your API through the gateway. Maybe you've also discovered that getting the "OAuth dance" working properly among the gateway, IdP, and application can be tricky.

If you want to see what the whole flow looks like end-to-end, you can see a sample workflow in action [here](https://youtu.be/n8r-9Gpoods).

## Prerequisites for this integration

1. **An Okta tenant.** These instructions assume that you have already set up your Okta tenant and can acquire access tokens from Okta by following the instructions in the [main readme of this repo](readme.md).
2. **An API Gateway.** If you don't already have a Mulesoft Anypoint account, you can get a free 30-day trial version [here](https://anypoint.mulesoft.com/login/#/signup).

## Configure your Mulesoft Account
In your Mulesoft Anypoint tenant, go to:
Management Center->Access Management->External Identity->Client Management->OpenID Connect Dynamic Client Registration

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_external_identity.png)

Click on "advanced settings" to expose the Authorization Header field.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_advanced_settings.png)

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_dynamic_client_registration.png)

The `Client Registration URL` is: {{OKTA_TENANT}}/oauth2/v1/clients

The `Authorization Header` is: SSWS {{OKTA_API_KEY}}

You can use the client ID and client secret that you set up during your Okta set-up as the Client ID and Client Secret for the Token Introspection Client.

The Authorize URL, Token URL, and Token Introspection URL are all available from your Okta authorization server settings.

If you are using the default settings, these URLs will look something like this:

https://partnerpoc.oktapreview.com/oauth2/default/v1/token

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

Name: Solar System Authn
OAuth 2.0 Grant type: Authorization Code Grant
OAuth 2.0 redirect URIs: http://localhost:8080 (or whatever REDIRECT_URI you established at the beginning of the process).

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_create_new_app.png)

Click **Create** to create your new client.

You will see the *Request API access* screen. Select your API instance and click **Request API access**.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_req_API_access.png)

You will see an "API Access has been successful!" message.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_api_access_successful.png)

## Wrapping up

You're now almost ready to test the end-to-end flow with the sample app. Before jumping back to the instructions for the sample application, there are just a couple of things to take care of:

* In that last step, you created a new client in Okta via the Mulesoft UI, which, again, is pretty cool.
-- Go to your Okta tenant, find that new client, and assign it to the Everyone group - or at least to the sample users for this app.
-- update the CLIENT_ID and CLIENT_SECRET values in the `.env` file with the client_id and client_secret from the client that you just created via the Mulesoft UI.

* the Mulesoft Cloudbhub URL - this will be the "GATEWAY_URI" value

## Testing

Now that you have set up Mulesoft as an API proxy, you can test out the whole flow. Take note of the Invoke URL, jump back to the main `readme` in this repo, and go to the `Test your application and access tokens` section.
