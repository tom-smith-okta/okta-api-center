# Okta API Access Management + Apigee

These instructions will explain how to set up Okta as an external OAuth authorization server for Apigee. In this architecture, the application will obtain an access token from Okta's authorization server, and pass that access token to Apigee as a bearer token (jwt). Apigee will evaluate the bearer token to determine whether the token is valid, and whether it contains the proper scopes for the requested resource.

It is also possible to set up Okta as an identity provider and instead use Apigee itself as the authorization server. Instructions for setting up that flow are [here](https://github.com/zeekhoo-okta/generator-okta-oidc-apigee).

## Prerequisites
- An Okta tenant. If you do not already have an Okta tenant, you can get a free-forever developer edition of Okta [here](https://developer.okta.com).
- An Apigee tenant. If you do not already have an Apigee tenant, you can get a free trial [here](https://apigee.com/about/cp/apigee-edge-free-trial).
- An API. In this example setup, we'll be using a "solar system" API, which is publicly available. You can substitute your own API if you wish.
- An application. Once you have set up Okta and Apigee, you can use the sample app available [here](https://github.com/tom-smith-okta/okta-api-am) to test it, or you can use your own app (or Postman, e.g.) to get access tokens from Okta and send them to Apigee.

## Setup: Okta
- Follow the Okta setup instructions in this repo: `/okta_setup/okta_setup_manual.md`

## Setup: Apigee

* This is an Okta-specific version of the more comprehensive Apigee repo created [here](https://github.com/DinoChiesa/ApigeeEdge-JWT-Demonstration). You are encouraged to explore the more comprehensive Apigee repo for more context.

* There is also an excellent accompanying video overview of how Apigee handles jwts [here](https://community.apigee.com/articles/49280/jwt-policies-in-apigee-edge.html).

### Overview

Setting up the proxy in Apigee is very straightforward. This repo contains an `apiproxy.zip` archive that contains all of the setup info needed for this example.

If you wish, you can make changes to any of the files and values in the `apiproxy` directory, and then zip the directory before uploading. You might want to just start with the pre-built archive first.

The only values that need to be updated in the proxy are the `URL` value in the `SC-RetrieveOktaJwks.xml` file and the `Issuer` value in the `Verify-JWT-1.xml` file.

These values are easily updated in Apigee after uploading the pre-built proxy.

### Steps

- Before you deploy the proxy you need to create a cache on the Apigee environment. The cache should be named 'cache1'.

To deploy the proxy to your Apigee tenant:
- in your Apigee tenant, go to "API Proxies" and click the +Proxy button
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

you are now deployed!

## Testing

Your API proxy tenant should now be deployed at {{your Apigee env}}/solar-system

There are three built-in proxy endpoints that you can test against. All of these endpoints will expect a valid access token minted by your authorization server. The access token must be included in the header of the request.

* {{your Apigee env}}/solar-system/test
  * if the access token is valid, this endpoint will return a 200 status OK
* {{your Apigee env}}/solar-system/planets
  * if the access token is valid AND includes the scope "http://myapp.com/scp/silver", this proxy endpoint will pass on the request to the target endpoint, which will return a list of planets.
* {{your Apigee env}}/solar-system/moons
  * if the access token is valid AND includes the scope "http://myapp.com/scp/gold", this proxy endpoint will pass on the request to the target endpoint, which will return a list of moons.

The logic behind this scheme is in the main proxy flow: parse + validate a JWT obtained from Okta.

![main flow](https://s3.amazonaws.com/tom-smith-okta-api-center/main_flow.png "main flow")

You can adjust the values here to suit your own use-case.

To generate tokens from Okta, you can either use a client like Postman or use the [sample app designed for this example](https://github.com/tom-smith-okta/okta-api-am).

## How it works

The JWT Verification policy in Apigee Edge is smart enough to extract keys from a JWK set. The authorization server on your Okta tenant [exposes a JWK set](https://partnerpoc.oktapreview.com/oauth2/ausce8ii5wBzd0zvQ0h7/v1/keys). This endpoint provides the public keys that correspond to the private keys used by Okta to sign JWT. Each public key is identified by a "key ID", aka "kid". The content available at this endpoint changes as Okta rotates keys, but a typical response looks like this:

```json
{
  "keys":
  [
    {
      "alg":"RS256",
      "e":"AQAB",
      "n":"gRynnM4G-MEzCIh6RXZSderUazMYtgTAfGALStft-K8uA0HuszH0eg3p9lqSyiYP3dXRKXBRZkcvKri_xpkXBihwnXJ24O493gnalCWQ08rsguRclcuG9EHyIPJ1lm93ZWNtImSkwDCZu1ikC6epfVODO6LOBbXRyHNMJrue7Bl2vYoLZeQTw0L5TyEofnIKEjS2-Gk07SqLDe3NlWnWHN88A9fKaZEVsmGkAo9QTyfwtOEZt6ROE0VpNwmyii5CDWFDpGDAzWWFghPD3t_hkANGMX709s3JLMeXZjTSXzaYcDECWwErvMWLx-BUvEbZvOfuFgwl32hVyYpM6aQSsQ",
      "kid":"h4U09qoCKSwyI-G7zustzn68X2eMt8QdV3sU6USTfrk",
      "kty":"RSA",
      "use":"sig"
    },
    {
      "alg":"RS256",
      "e":"AQAB",
      "n":"iLzthtqV18UL1kRNEfAJE_CizNGKnINIPOXqHZ0y1kNOzBkgnaNsqkYj4xkzmITfSqcFdnt-bJQVFzXXsoAsgoa7DLtuYVWSmunMxk806wikqFYD7kwmg1nQHh4pSFsIOtEciGs3ZY7r9dxkR1uN6J68eDscKQc-EM7kiPrXb_ByM_fYYgFUeBhc5ftv4ZEZfUAQrPNnEgI66ZyyUqSLnIJLajDwzypIU4mfVFXioYTzWMvxlnVssu1_Mb6aIob8eXEDFT_XxIRiP869KLporKDPARhFxXNEpgpRNVJ5CzjiIDeIigeIYhzbSDmBjgLjSYm00P25PKuvuYof8Pfs4w",
      "kid":"RFJeRbdOQmLxR_Q5pKe75MxOR_XzoNFkCH7EpzSA50c",
      "kty":"RSA",
      "use":"sig"
    }
  ]
}
```

The API Proxy uses a ServiceCallout to perform a GET on that URL, and then caches the result for one hour. Then, verification can be configured like this:

```xml
<VerifyJWT name="Verify-JWT-1">
    <Algorithm>RS256</Algorithm>
    <Source>inbound.jwt</Source>
    <PublicKey>
      <JWKS ref='cached.okta.jwks'/>
    </PublicKey>
    <Issuer>https://partnerpoc.oktapreview.com/oauth2/ausce8ii5wBzd0zvQ0h7</Issuer>
</VerifyJWT>
```

Just update the <Issuer> value with the appropriate url for you Okta tenant and authorization server ID.
