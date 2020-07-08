# Integrating Okta with Amazon API Gateway - Lambda authorizer

This integration guide describes how to integrate Okta's API Access Management (OAuth as a Service) with Amazon API Gateway.

AWS has recently (Spring 2020) released a new way to integrate Amazon API Gateway with external OAuth providers such as Okta: [JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html).

This new way of integrating Okta is much simpler than setting up a custom authorizer using a Lambda function. The lambda authorizer approach is of course much more powerful and flexible, but you should start with the [JWT authorizer approach](readme.md) unless you're certain that you need a lambda authorizer.

The basic flow is that Amazon API Gateway will accept incoming requests and pass them on to a custom Lambda authorizer. The Lambda authorizer (which we will set up) will evaluate the access token included in the request and determine whether the access token is 1) valid and 2) contains the appropriate scopes for the requested resource.

We will set up the Lambda authorizer to validate the access tokens against Okta.

We'll be using a mock "solar system" API that is publicly available, so you don't need to worry about setting up the API itself.

## Prerequisites

### Okta

These instructions assume that you have already set up your Okta tenant and can acquire access tokens from Okta by following the instructions in the [main readme of this repo](readme.md).

As a result of those setup steps, you should have the following values on hand before proceeding:

ISSUER
	example: https://dev-399486.okta.com/oauth2/default
	this value will be `{{OKTA_TENANT}}/oauth2/default` unless you've set up a different authorization server in Okta.

### AWS

You will also of course need an AWS account.

### Overview

The high-level process we are going to follow is:

1. Set up your API in Amazon API Gateway
2. Add a Lambda function to your AWS account to handle authorization (this step includes setting up an IAM role)
3. Add the Lambda authorization function to selected resources in your API Gateway

## Set up your API in Amazon API Gateway

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

At this point, test the gateway to ensure that it's properly proxying requests:

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

This Invoke URL is important; we're going to use it as the GATEWAY_URI for our sample application.

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

If you would like to add the `/moons` endpoint, go ahead and do that now, using the same steps you did for `/planets`. The `/moons` endpoint is not required, but it helps to show how different users can have access to different resources. We'll assign the different scopes required to access these endpoints when we set up the Lambda authorization function.

## Set up the Lambda authorizer

Amazon API Gateway uses a Lambda function to inspect access tokens. So, we need to set up a Lambda function as an authorizer for this API.

Follow the instructions [here](https://github.com/tom-smith-okta/node-lambda-oauth2-jwt-authorizer) to set up the Lambda authorizer.

> Stop when you get to the *Testing* section, and come back to this document.

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

Click **Deploy**.

If you click on the *Invoke URL* as-is, then you will again arrive at the home for the solar system API.

If you append */planets* to the Invoke URL, you will get an *Unauthorized* message. This means that our authorizer is doing its job and blocking attempts to reach the `/planets` resource without a valid access token.

## Testing

Now that you have set up Amazon API Gateway as an API proxy, you can test out the whole flow. Take note of the Invoke URL, jump back to the main `readme` in this repo, and go to the `Test your application and access tokens` section.
