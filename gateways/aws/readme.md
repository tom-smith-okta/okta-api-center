# Integrating Okta with Amazon API Gateway - JWT authorizer

This integration guide describes how to integrate Okta's API Access Management (OAuth as a Service) with Amazon API Gateway.

AWS has recently (Spring 2020) released a new way to integrate Amazon API Gateway with external OAuth providers such as Okta: [JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html).

These setup instructions will use this new way of integrating Okta, which is much simpler than setting up a custom authorizer using a Lambda function. The [Lambda authorizer approach](lambda.md) is of course much more powerful and flexible, but you should start with the JWT authorizer approach unless you're certain that you need a Lambda authorizer.

We'll be using a mock "solar system" API that is publicly available, so you don't need to worry about setting up the API itself.

## Prerequisites

### Okta

These instructions assume that you have already set up your Okta tenant and can acquire access tokens from Okta by following the instructions in the [main readme of this repo](/readme.md).

As a result of those setup steps, you should have the following values on hand before proceeding:

ISSUER

example: https://dev-399486.okta.com/oauth2/default

this value will be `{{OKTA_TENANT}}/oauth2/default` unless you've set up a different authorization server in Okta.

### AWS

You will also of course need an AWS account.

### Overview

We are going to set up an "HTTP" type API in API gateway, and add Okta as a JWT source for authorization.

We will also add JWT policies to the API gateway so that specific endpoints will be protected by specific scopes.

## Set up your API in Amazon API Gateway

In your AWS Management Console, go to API Gateway and click **Create API**.

On the "Choose an API type" screen:

We are going to build an HTTP API, so click **Build** inside the HTTP API box.

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/01_http_api.png)

In the **Create and configure integrations** box, click **Add integration**, then assign the following values:

Integrations: HTTP

Method: ANY

URL endpoint: https://okta-solar-system.herokuapp.com

API name: okta solar system

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/02_create_and_configure.png)

Click **Review and Create**.

You should now see an overview screen of your API.

Click **Create**.

Wait a second for a value to appear in the "Attached deployment" column, so you know that your API is deployed.

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/05_api_details.png)

At this point, you can click on the **Invoke URL** and you will see that you are successfully proxying the solar system API home page:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/06_proxy_works.png)

>Note: stash your **Invoke URL** somewhere handy.

>Note: throughout this project, we are just going to use the default Stage for this API, which means that updates will deploy automatically. So, you should not have to click the **Deploy** button to successfully complete this setup.

### Add a route

Now let's add a route to our solar system API, so we can start getting some actual data back and see how authorization works.

For this first route, we're just going to do some validation of the access token. We'll add scopes to the equation later, after we know that our authorization integration is working.

Click on Develop->Routes, then **Create**.

On the **Create a route** screen, choose GET as your method, and enter

`/asteroids`

in the path field:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/07_create_route_asteroids.png)

Click **Create** to create the route.

On the **Routes** screen, click on **GET** underneath the `/asteroids` path, and you will see options to **Attach authorizer** and **Attach integration**:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/08_route_details_asteroids.png)

Click **Attach authorizer** and you will go to the Authorization screen:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/09_first_authorizer.png)

Click **Create and attach an authorizer**

On the **Create JWT authorizer** screen, populate the **Authorizer settings** with the following values:

Name: Okta

Identity source: $request.header.Authorization

Issuer URL: {{ISSUER}}

(example: https://dev-399486.okta.com/oauth2/default)

Audience: api://default

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/10_authorizer_settings.png)

Click **Create and attach**.

Your **Authorization** screen should look something like this:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/11_authorizer_details.png)

Now, we need to attach an "integration" to the `/asteroids` route.

Click Develop->Routes and select the **GET** method of your `/asteroids` route (it may already be selected.)

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/12_routes_attach_integration_asteroids.png)

Click **Attach integration**.

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/13_routes_attach_integration_asteroids.png)

Click **Create and attach an integration**.

On the **Create an integration** screen, populate the form with the following values:

Integration with: HTTP URI

HTTP method: GET

URL: https://okta-solar-system.herokuapp.com/asteroids

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/14_create_an_integration.png)

Click **Create**.

Your integration should look something like this:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/15_asteroid_integration_complete.png)

### Test the first route

When we initially set up the API, we verified that the **Invoke URL** loads the home page of the target solar system API.

Now, if we try to get data from a route (/asteroids) that we've attached an authorizer to (without including an access token), we should get an "Unauthorized" error:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/16_asteroids_unauthorized.png)

So, the API gateway is successfully blocking the request because it doesn't have an access token.

Let's get an access token and see if the authorization process works.

In the `.env` file of the test application, add "AWS_JWT" as the value for GATEWAY, and add your Invoke URL as the value for GATEWAY_URI.

Restart the node app.

Load the web page again, and click on "authenticate" in the Bronze access box to get an access token. Then, click on the **show me some asteroids!** button to get a selected list of asteroids.

Once you're able to successfully get a list of asteroids, we can move on to adding more routes to the gateway, and these new routes will require scopes to allow access.

### Add the /planets route

Go to your API Gateway and click Develop->Routes.

On the **Routes** screen, click **Create**.

On the **Create a route** screen, add a new route with:

Method: GET

Route: /planets

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/17_create_route_planets.png)

Click **Create**.

On the **Routes** screen, select the GET method of the `/planets` endpoint.

Click **Attach authorizer**.

On the **Authorization** screen, click on the **Select existing authorizer** box, and choose Okta.

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/18_select_existing_authorizer.png)

Click **Attach authorizer**.

The **Authorization** screen should now look something like this:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/19_authorizer_details.png)

Now, let's add a scope to further protect this route.

Click **Add scope**.

Enter http://myapp.com/scp/silver in the scope field, then click **Save**.

We still need to add an "integration" for this route, so click on Develop->Routes.

Select the GET method of the `/planets` endpoint.

Click **Attach integration**.

On the **Integrations** screen, click **Create and attach an integration**.

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/20_attach_integration.png)

On the **Create an integration** screen, enter the following values:

Integration target: HTTP URI

HTTP method: GET

URL: https://okta-solar-system.herokuapp.com/planets

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/amazon_api_gateway/jwt_authorizer/21_add_integration_planets.png)

Click **Create**.

You now have another route set up for your API gateway. The `/planets` route points to https://okta-solar-system.herokuapp.com/planets. Okta is the authorizer for this route, and the access token must include the http://myapp.com/scp/silver scope for the request to be honored.

### Add the /moons route

To see how different scopes can align with Okta groups, routes, and scopes, you can add another route: `/moons`.

Follow the same steps as the `/planets` route, but for the integration use the URI https://okta-solar-system.herokuapp.com/moons, and for the scope use http://myapp.com/scp/gold.

## Testing

Now you can go back to the test application and see if the "show me the planets!" and "show me some moons!" buttons work.
