# Okta API Access Management + Apigee

These instructions will explain how to set up Okta as an external OAuth authorization server for Apigee. In this architecture, the application will obtain an access token from Okta's authorization server, and pass that access token to Apigee as a bearer token (jwt). Apigee will evaluate the bearer token to determine whether the token is valid, and whether it contains the proper scopes for the requested resource.

It is also possible to set up Okta as (only) an identity provider and instead use Apigee itself as the authorization server. Instructions for setting up that flow are [here](https://github.com/zeekhoo-okta/generator-okta-oidc-apigee).

## Prerequisites
- An Okta tenant. These instructions assume that you have already set up your Okta tenant and can acquire access tokens from Okta by following the instructions in the [main readme of this repo](readme.md).
- An Apigee tenant. If you do not already have an Apigee tenant, you can get a free trial [here](https://apigee.com/about/cp/apigee-edge-free-trial).
- An API. In this example setup, we'll be using a mock "solar system" API, which is publicly available. You can substitute your own API if you wish.

## Setup: Apigee

* This is an Okta-fied version of the more general Apigee repo created [here](https://github.com/DinoChiesa/ApigeeEdge-JWT-Demonstration). You are encouraged to explore the more comprehensive Apigee repo for more context.

* There is also an excellent accompanying video overview of how Apigee handles JWTs [here](https://community.apigee.com/articles/49280/jwt-policies-in-apigee-edge.html).

### Overview

Setting up the proxy in Apigee is very straightforward. This repo contains an `apiproxy.zip` archive that contains all of the setup info needed for this example.

If you wish, you can make changes to any of the files and values in the `apiproxy` directory, and then zip the directory before uploading. You might want to just start with the pre-built archive first.

The only values that need to be updated in the proxy are the `URL` value in the `SC-RetrieveOktaJwks.xml` file and the `Issuer` value in the `Verify-JWT-1.xml` file.

These values are easily updated in Apigee after uploading the pre-built proxy.

### Steps

- Before you deploy the proxy you need to create a cache on the Apigee environment. The cache should be named `cache1`.

To deploy the proxy to your Apigee tenant:
- in your Apigee tenant, go to "API Proxies" and click the `+Proxy` button
- select "Proxy bundle" then click Next
- upload the `apiproxy.zip` file
- choose a name for the proxy or just keep the default, then click Next
- click Build
- your proxy will load.
- click the link to view the proxy in the API editor
- click the "develop" tab to view the flows and source XML
- open the Verify-JWT-1 policy
  - update the Issuer value with your authorization server URL

![authorization server](https://s3.amazonaws.com/tom-smith-okta-api-center/authz_server.png "Authorization server")

- deploy your proxy to test, dev, or prod, depending on your preference.

you are now deployed!

Your API proxy tenant should now be deployed at {{your Apigee env}}/solar-system

Take note of your API proxy URL.

There are three built-in proxy endpoints that you can test against. All of these endpoints will expect a valid access token minted by your Okta authorization server. The access token must be included in the header of the request. (The sample app will do this for you.)

* {{your Apigee env}}/solar-system/test
  * if the access token is valid, this endpoint will return a 200 status OK
* {{your Apigee env}}/solar-system/planets
  * if the access token is valid AND includes the scope `http://myapp.com/scp/silver`, this proxy endpoint will pass on the request to the target endpoint, which will return a list of planets.
* {{your Apigee env}}/solar-system/moons
  * if the access token is valid AND includes the scope `http://myapp.com/scp/gold`, this proxy endpoint will pass on the request to the target endpoint, which will return a list of moons.

These policies are expressed in the main Apigee proxy flow: `parse + validate a JWT obtained from Okta`.

![main flow](https://s3.amazonaws.com/tom-smith-okta-api-center/main_flow.png "main flow")

You can of course adjust the values here to suit your own use-case.

## Testing

Now that you have set up Apigee as an API proxy, you can test out the whole flow. Take note of the URL of your Apigee deployment, jump back to the main `readme` in this repo, and go to the `Test your application and access tokens` section.
