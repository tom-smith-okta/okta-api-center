# Integrating Okta with Amazon API Gateway

This integration guide describes how to integrate Okta's API Access Management (OAuth as a Service) with Amazon API Gateway.

## What You'll Build

At the end of this setup, you'll have an architecture where:

1. End-users will be able to authenticate against Okta and receive an access token (via the app)
2. End-users will have different scopes in their access token, depending on their group assignments
3. The application will send the access token to the Amazon API Gateway
4. AWS will check the validity of the access token locally
5. If the token and scopes are valid, AWS will send the request on to the API
6. The API will send the data payload to the gateway, which will send it on to the application

## Prerequisites for integrating Okta + Amazon API Gateway

1. **An Okta account.** If you don't already have one, you can get a free-forever account at [developer.okta.com](https://developer.okta.com/signup/)
2. **An AWS account.** If you don't already have an AWS account, you can get a free one [here](https://aws.amazon.com/Sign-Up‎).

### Step-by-step
The high-level process we are going to follow is:

1. Set up your API in Amazon API Gateway
* key outputs: PROXY_URI / Audience
2. Set up your Okta tenant
* key outputs: OKTA_AZ_SERVER_ISSUER
3. Add a Lambda function to your AWS account to handle authorization (this step includes setting up an IAM role)
* key outputs: Lambda authorizer
4. Add the Lambda authorization function to selected resources in your API Gateway
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
GATEWAY=""
```

There are a couple of values you should fill in now, such as `OKTA_TENANT` and `GATEWAY`. I will point out when we generate the other values along the way; you can either enter them in your `.env` file as you go, or do it all at the end. There is a helper script that will gather the settings for you at the end.

## Configure Amazon API Gateway

In your AWS Management Console, go to API Gateway.

Click “Create API”

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_create_api.png)

Select *New API* and choose a name and description for your API:

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_new_api_settings.png)

Click **Create API**

We now have an “empty” API

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_empty.png)

Now create a method: Actions->Create Method->GET

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_create_method_get.png)

Click the checkmark to save the new method.

In the GET - Setup screen, choose the following options:

* Integration type: HTTP
* Use HTTP Proxy integration: yes
* HTTP method: GET
* Endpoint URL: https://okta-solar-system.herokuapp.com
* Content Handling: Passthrough
* Use Default Timeout: yes

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_get_setup.png)

Click **Save**.

Your GET request should now look like this:

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_get_method_execution.png)

At this point, test the gateway to ensure that it's properly proxying requests.

Click the **Actions** button, then *Deploy API*.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_deploy_api.png)

For *Deployment Stage*, choose **[New Stage]**, and for *Stage name*, enter `test`

You don't need to enter anything for the *Stage description* and *Deployment description* fields, but you can if you wish.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_new_stage.png)

Now click **Deploy**

You will now have an *Invoke URL* where you can test the proxy.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_invoke_url.png)

Click the Invoke URL, and you should arrive at a simple page with the text "Okta solar system api":

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_solar-system_home.png)

This Invoke URL is important; we're going to use it as the PROXY_URI for our sample application, and also as the Audience value for our Authorization Server.

Add it to your `.env` file now as your PROXY_URI.

Now, let's add a couple of "real" endpoints to the proxy.

Go back to the API Gateway, and under your API name in the left-hand side, click *Resources*.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_resources.png)

Click the **Actions** button and select *Create Resource*.

Leave the *Configure as proxy resource* box unchecked.
*Resource Name*: `planets`
*Resource Path*: `planets`

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_planets.png)

Click **Create Resource**.

Now let's add a method to that Resource. Click Actions -> Create Method -> GET->checkmark.

Just as we did for the previous definition of GET, we're going to choose:

*Integration type*: HTTP

*Use HTTP Proxy integration*: **Yes**

*HTTP Method*: GET

*Endpoint URL*: `https://okta-solar-system.herokuapp.com/planets`

*Content Handling*: Passthrough

*Use Default Timeout*: Yes

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_planets_setup.png)

Click **Save**.

The sample application will test two endpoints:

`/planets`
and
`/moons`

If you would like to add the `/moons` endpoint, go ahead and do that now, using the same steps you did for `/planets`. We'll assign the different scopes required to access these endpoints when we set up our Lambda authorization function later.

## Set up your Okta tenant

To properly demonstrate OAuth as a Service, you need a number of elements in your Okta tenant: a client, users, groups, an authorization server, scopes, policies, and rules. And, you need to establish the proper relationships among them.

You have a couple of options to set these up:

* You can use the Okta bootstrap tool. The Okta bootstrap tool is a "labs" type project. It is the fastest and easiest way to get your tenant set up. Instructions are [here](../../okta_setup/okta_setup_bootstrap.md).
* You can set up your Okta tenant "manually", with Okta's easy-to-use admin UI. Instructions are available [here](../../okta_setup/okta_setup_manual.md).

Go ahead and set up your Okta tenant, then come back to these instructions.

## Set up the Lambda authorizer

Amazon API Gateway uses a Lambda function to inspect access tokens. So, we need to set up a Lambda function as an authorizer for this API.

To set up the Lambda authorization function, we're going to need a couple of settings from our Okta objects.

If you used the bootstrap tool for setup, run a helper script to extract the relevant settings:

```bash
node get_settings.js --aws
```

This will give you the ISSUER and AUDIENCE values that you need in setting up your Lambda function.

You will also need your JSON web key set (JWKS).

Your JWKS can be retrieved from your `jwks_uri`, and your `jwks_uri` can be obtained from the well-known endpoint of your Authorization Server:

{{ISSUER}}/.well-known/openid-configuration

Now we can get started with creating the Lambda authorizer.

Clone the github repo for the Lambda authorizer:

`git clone https://github.com/mcguinness/node-lambda-oauth2-jwt-authorizer.git`

and install it

`npm install`

For the most part, you can just follow the instructions in the `readme` of that repo to set up the authorizer, with the following adjustments:

* Stop when you get to the *Testing* section, and come back to this document.

* In the index.js file, replace the existing policies

```
if (claims.hasScopes('api:read')) {

	policy.allowMethod(AuthPolicy.HttpVerb.GET, "*");

} else if (claims.hasScopes('api:write')) {

	policy.allowMethod(AuthPolicy.HttpVerb.POST, "*");

	policy.allowMethod(AuthPolicy.HttpVerb.PUT, "*");

	policy.allowMethod(AuthPolicy.HttpVerb.PATCH, "*");

	policy.allowMethod(AuthPolicy.HttpVerb.DELETE, "*");

}

```
with these policies:
```
if (claims.hasScopes('http://myapp.com/scp/silver')) {

	policy.allowMethod(AuthPolicy.HttpVerb.GET, "/planets");

}

if (claims.hasScopes('http://myapp.com/scp/gold')) {

	policy.allowMethod(AuthPolicy.HttpVerb.GET, "/moons");

}

```
Now that you have set up your authorizer, we can add it to the `/planets` method we created earlier.

## Add the Lambda Authorizer to API Resources

Click on the *Resources* section of your API, then click on the GET method that is a child of /planets:

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_method_req.png)

Click *Method Request*

In Settings->Authorization, choose the Lambda Authorizer that you set up.

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/amazon_api_gateway/aws_api_gateway_authorizer.png)

Click the checkmark to save the authorizer.

## Deploy the API

Now that we've added authorization to one of our resources, we can deploy the API again and test it.

Click the **Actions** button, then *Deploy API*.

Make sure you keep the *Stage* name the same as in the initial  setup, because that's now the AUDIENCE value for the Authorization server.

Click **Deploy**.

If you click on the *Invoke URL* as-is, then you will again arrive at the home for the solar system API.

If you append */planets* to the Invoke URL, you will get an *Unauthorized* message. This means that our authorizer is doing its job and blocking attempts to reach the `/planets` resource without a valid access token.

## Get the app settings

If you used the bootstrap tool for setup, and you haven't run the helper script yet to extract the relevant settings, go ahead and run it now:

```bash
node get_settings.js --aws
```

The script will display the settings on the screen, and also save them to an output file so that you can refer to them later if you need to.

Take these settings and update your `.env` file with any values that still need to be added.
>Note: you don't need to copy every setting from the output, but it's no harm if you do

You can now launch your app:

```bash
node app.js
```

When you load the web app, first try clicking on the "show me the planets" and/or the "show me the moons" buttons. You'll get an error notifying you that you need an access token.

Next, try authenticating as one of the users. You'll get an id token and an access token displayed in the browser (in a production environment, you would not do this). The raw tokens are also available in the console if you want to check them out.

Now that the user has a token (actually the token is sitting on the server), you can click on one of the "show me" buttons again to see if you get the requested resource.

Enjoy the solar system!