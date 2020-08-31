# Integrating Okta with MuleSoft Anypoint

There are two ways to integrate Okta as an authorization server with MuleSoft Anypoint:

1. Integrate Okta as an OpenID Connect Client Provider
2. Integrate Okta as an authorization server server via MuleSoft's JWT validation policy (requires Mule 4.1 or above)

Broadly speaking, the OIDC client provider integration is deeper and more robust, including dynamic client registration, while the JWT validation method is lighter weight.

If you're not sure which you need, or are not sure where to start, start with the JWT validation method.

This readme describes the JWT validation method.

The readme for the OIDC Connect Client Provider method is [here](readme.md).

## Prerequisites for this integration

1. **An Okta tenant.** These instructions assume that you have already set up your Okta tenant and can acquire access tokens from Okta by following the instructions in the [main readme of this repo](../readme.md).
2. **An API Gateway.** If you don't already have a Mulesoft Anypoint account, you can get a free 30-day trial version [here](https://anypoint.mulesoft.com/login/#/signup).

## Load the API definition to Exchange

In your MuleSoft Anypoint tenant, click on the three small bars in the top left corner and go to Design Center

![alt text](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/mulesoft_design+center.png)

Click on + Create New and select Create API specification

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/mulesoft_design_center_select.png)

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/new_mulesoft_new_api_specification.png)

Give your API a name (like "okta solar system") and click "Create Specification".

You now have an (almost) empty RAML file to design your API.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/new_mulesoft_empty_raml.png)

Next, copy the RAML template from the Okta API Center repo into the Mulesoft editor.

```
/gateways/mulesoft/jwt_validation.raml
```

Click Publish, then Publish to Exchange

Assign asset version `1.0.0` then click Publish to Exchange

## Ingest API into API Manager

Go to Anypoint API Manager.

Click on Manage API, then Manage API from Exchange.

In the API name field, enter `okta solar system` (or whatever you named your API) and click on the API name to autofill the fields.

For "Managing type:" choose Endpoint with Proxy

For "Mule version:" check the box for "Select if you are managing this API using Mule 4 or above."

Your implementation should be pre-filled to be https://okta-solar-system.herokuapp.com

Click Save.

You should arrive at the Settings screen for your API.

In the Deployment Configuration section:

Runtime version: 4.3.0

Proxy application name: {{some_unique_name}}

Click Deploy.

It will take a couple of minutes for Mule to deploy your API.

After your API has deployed, scroll to the top of the page to find your Proxy URL.

For example: http://my-api.us-e2.cloudhub.io/

>Note: take note now of this cloudhub proxy URL. You'll need it later and it can sometimes be hard to find again.

First, test to see that the API is being proxied correctly.

Load the following url in a web browser:

```
{{cloudhub proxy url}}/visitors
```

We have defined this endpoint in the RAML file to be completely open, so you should see a simple json object listing two of the recent visitors to the solar system.

Now let's see if the authorization layer is working.

Load the following url in a web browser:

```
{{cloudhub proxy url}}/asteroids
```

We have defined this endpoint in the RAML file to be protected by a JWT, so you should see a response like the following:

```
error: "Required header 'authorization' not specified"
```

You can now do a test to see if your proxy has deployed correctly.

## Add Your Okta JWKS URI to Mulesoft

### Get Your JWKS URI

Now we need to add the JSON Web Key Set (JWKS) URL from your Okta authorization server to MuleSoft.

Go to the well-known endpoint of your authorization server, which has the following pattern:

```
https://{{my_okta_domain}}/oauth2/{{authorization_server_id}}/.well-known/oauth-authorization-server
```

If you are using the developer edition of Okta, you're probably using the default authorization server, so your well-known endpoint is:

```
https://{{my_okta_domain}}/oauth2/default/.well-known/oauth-authorization-server
```

Once you have loaded your well-known endpoint, copy the `jwks_uri`.

### Create a JWKS validation policy

On your MuleSoft API Administration screen, click on Policies.

Click on Apply New Policy.

Select JWT Validation->1.1.3 then click Configure Policy.

Use the following values:

(default) JWT origin: HTTP Bearer Authentication Header

(default) JWT Signing Method: RSA

(default) JWT Signing Key Length: 256

JWT Key origin: JWKS

JWKS Url: {{your JWKS URL}}

(default) JWKS Caching TTL (minutes): 60

Skip Client Id Validation: check

Validate Audience Claim: leave blank for now

Expiration Claim Mandatory: leave blank for now

Not Before Claim Mandatory: leave blank for now

Validate Custom Claim: leave blank for now

Method & Resource conditions:
* Apply configurations to specific methods & resources

We're going to do just one endpoint for now.

Method:
GET

URI template regex:
/asteroids

Click Apply

Using Postman or some other API client, you can now try sending a GET request with an access token to the `/asteroids` endpoint.

You should get a list of a few asteroids in return.

If that flow works out, you can add two more policies to your API.

Click on Apply New Policy.

Select JWT Validation->1.1.3 then click Configure Policy.

Use the same values as above, with the exception of:

Validate Custom Claim: check

In the Mandatory Custom Claim Validations section, add the following key-value pair:

```
scp : #[vars.claimSet.scp == ['http://myapp.com/scp/silver']]
```

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/mulesoft/jwt_validation/mulesoft_jwt_validation_define_scope.png)

make sure you click the + button on the right to lock in the key-value pair.

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/mulesoft/jwt_validation/mulesoft_jwt_validation_saved_scope.png)

Method & Resource conditions:
* Apply configurations to specific methods & resources

Method: GET

URI template regex: /planets

Click Apply

Repeat the same procedure for the /moons endpoint, but use the scp:

```
scp : #[vars.claimSet.scp == ['http://myapp.com/scp/gold']]

```

## Testing

Now you can go back to the test application and see if the "show me the planets!" and "show me some moons!" buttons work.
