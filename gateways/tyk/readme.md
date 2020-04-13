# Integration guide: Okta + Tyk

Okta integrates with Tyk in several different ways:

* Dashboard SSO
* Developer Portal SSO
* API Authentication 
** OIDC - Open ID Connect
** JWT with scope claims

This guide will describe the API Access Management integration in detail, but we will briefly touch on the Admin SSO integration and the OIDC integration.

### Admin SSO

Tyk supports SSO to the admin dashboard and developer portal via OIDC. Instructions are here: [https://tyk.io/docs/integrate/sso/dashboard-login-okta-tib/](https://tyk.io/docs/integrate/sso/dashboard-login-okta-tib/)

Note: you must install [Tyk Identity Broker](https://tyk.io/docs/integrate/sso/dashboard-login-ldap-tib/) as part of this process

### OIDC

Tyk can enforce a policy that requires a valid OIDC ID Token in order to access an endpoint. Set up Okta as an OIDC provider and Tyk will check for a valid id token before passing on the request to an endpoint.

Instructions are here: [https://tyk.io/docs/basic-config-and-security/security/authentication-authorization/openid-connect/](https://tyk.io/docs/basic-config-and-security/security/authentication-authorization/openid-connect/)

## API Access Management

Tyk supports the evaluation of JSON web tokens (JWTs) to control access to endpoints.

Before going in to the step-by-step process to enable this capability, it’s important to highlight an optional Tyk feature in regards to JWTs, such as OAuth Access Tokens or OIDC ID tokens, which is different from many other API gateways.

A JWT passed to Tyk can include a “policy id” claim. This policy ID tells Tyk which Tyk policy is valid for that JWT. Alternatively, Tyk can extract scopes from the claims and apply policies based on them.  Tyk will use this policy to determine if a JWT has access to the API it is attempting to access.

So, in using Okta with Tyk, you can populate the policy id in a JWT in two primary ways, depending on your needs and your setup. This is just an overview for now, we'll go through the step-by-step a little later on:

1. In the user profile (i.e. user-level): create a custom attribute in the Okta user profile using the Okta Profile editor. This custom attribute must have the same name as the policy id field name in Tyk. Set up a custom claim in your Okta authorization server to always include this claim from the user profile.

2. In an application profile (i.e. group-level): go to the Okta Profile editor and create a custom attribute for the OIDC application that your users are authenticating against. Again, this custom attribute must have the same name as the policy id field name in Tyk. Set up a custom claim in your Okta authorization server to always include this claim from the application profile. Now, when you assign this application to groups in Okta, you can choose different policy IDs for different groups, and then end-users will inherit these policy ids when they are assigned to that group/application.

## What You'll Build

At the end of this setup, you'll have an architecture where:

1. Users will be able to authenticate against Okta and receive an access token (via the app)
2. Users will have a "policy id" claim in their access token. The value of this claim will be derived from the user's group membership in Okta, and the policy id will map to a policy id in Tyk.`
3. The application will send the access token to the Tyk.
4. Tyk will check the validity of the access token locally.
5. If the token and scopes are valid, Tyk will send the request on to the API
6. The API will send the data payload to the gateway, which will send it on to the application


## Prerequisites for integrating Okta + Tyk

1. **An Okta account.** If you don't already have one, you can get a free-forever account at [developer.okta.com](https://developer.okta.com/signup/)
2. **Tyk** If you don't already have a Tyk tenant set up, you can create a forever free developer account on Tyk SaaS [here](https://tyk.io/api-gateway/saas/‎) or use [docker-compose to launch an on-prem stack](https://github.com/TykTechnologies/tyk-pro-docker-demo).

### Step-by-step
The high-level process we are going to follow is:

1. Set up your API in Tyk
2. Set up your Okta tenant
3. Add your JWKS to Tyk
4. Set up and launch your application

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
GOLD_USERNAME=""
FAKE_USER_PASSWORD=""
SESSION_SECRET="some random phrase"
SESSION_MAX_AGE=60000

# Supported values: aws, kong, mulesoft, swag, tyk
GATEWAY=""
```

There are a couple of values you can fill in now, such as `OKTA_TENANT` and `GATEWAY`. I will point out when we generate the other values along the way; you can either enter them in your `.env` file as you go, or do it all at the end.

### Set up your API in Tyk
Go to the Tyk dashboard and click on the APIs section.

Click the **+ Add New API** button.

In the API designer, for API Name, enter `solar-system`

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/tyk/tyk_API_name.png)

scroll down, and in the **Target URL** field, enter:

`https://okta-solar-system.herokuapp.com`

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/tyk/tyk_target_url.png)

Leave the Authentication section as-is for right now; we'll come back to it later.

Click **Save** to save your new API.

At the top of your API home screen you'll now have an API URL. Copy this value and save it for later, it will be the basis of the PROXY_URI we will use when we set up the application. Note: Tyk by default listens on port 8080 for API calls, so your PROXY_URI will be something like this:

http://52.14.100.89:8080/solar-system

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/tyk/tyk_api_url.png)

### Set up policies
We're going to set up two policies in Tyk.

One policy will control access to the /planets resource (which we will create) and the other will control access to the /moons resource (which we will also create).

Click **Policies** to go to the Policies section.

Click the **+ Add Policy** button.

In the *Policy Name* field, enter

`silver - access to /planets`

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/tyk/tyk_silver_policy.png)

In the *Access Rights* section, go to the *Add access rule* dropdown and select

`SOLAR-SYSTEM: DEFAULT`

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/tyk/tyk_access_rights.png)

Now, under the *Path-based permissions* section, click **+ Add Path**

In the *URL* field, enter

`/planets`

and in the *Allowed methods* field, choose

`GET`

Click the gray **Add** button next to the GET method.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/tyk/tyk_path_permissions.png)

Click the green **Add** button to add the path.

>**IMPORTANT**: in the *Trial period* section, set the *ExpiresAfter* value to "Do not expire key". This essentially tells Tyk that we want to use the session length in the access token (jwt) rather than the internal token that Tyk generates.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/tyk/tyk_do_not_expire_key.png)

Click **Create** to create this policy.

You will now have a Policy ID for this policy. Copy it so you can use it later. (We don't need this value in the .env file.)

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/tyk/tyk_silver_access.png)

If you want to follow along fully with the sample application, create another policy, using the same steps, with a couple of exceptions:

* In the *Name* field, enter

`gold - access to /moons`

* and in the *URL* field add *both*
`/planets`

and

`/moons`

(and use the GET method for /moons as well)

Don't forget to set the *ExpiresAfter* value to "Do not expire key", and after you click **Create**, copy the Policy ID.

That's it for now for Tyk. We're going to come back to Tyk later to set up Okta as a jwt provider. But, now that we have our policy IDs, we can set up our Okta tenant.

### Set up your Okta Tenant

#### Add an OIDC application

Applications->Add Application->Web->Next

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_create_new_application.png)

Use the following settings for your application:

*Name*: solar system client app

*Base URIs*: http://localhost:8080 (leave as-is)

*Login redirect URIs*: http://localhost:8080 (important!)
If you plan on using a different home page for the application, enter the url here. For this integration, we'll set up an application that assumes your application lives at http://localhost:8080

*Group Assignments*: None (remove the "Everyone" group)

*Grant Type Allowed*: Authorization code

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_oidc_app_settings.png)

Click **Done** to save your application.

You will now have a client id and client secret. In your `.env` file, these are:

* AUTHN_CLIENT_ID
* AUTHN_CLIENT_SECRET

#### Add a custom attribute to the Okta user profile

We need to add a custom attribute to the user profile to store the Tyk policy_id.

Users->Profile Editor

Click the **Profile** button next to the application that you just created.

Click **Add Attribute**

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_profile_editor_add_attribute.png)

On the *Add Attribute* screen, enter the following values:

*Display name*: Tyk policy id

*Variable name*: pol

Leave the rest of the settings as-is.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_add_attribute.png)

Click **Save**.

#### Add groups

We're going to create two groups in Okta to store users with different authorizations.

Users->Groups->Add Group

enter the name

`silver subscribers`

for the *name* and *description*

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_add_group.png)

Click **Add Group** to create the group.

Now click on the group name to open the group properties page.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_group_properties.png)

Click **Manage Apps** and find your solar system client application.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_assign_application.png)

Click *Assign*, and you will be prompted to add the Tyk policy id to this group.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_custom_group_attrib.png)

Add the "silver" Tyk Policy ID that you created earlier, and click **Save and Go Back**.

Click **Done**.

Now, create a group for the gold subscribers, following the same steps as above, but of course add the gold policy id that you created in Tyk.

#### Create users

Now we can add a sample user to the silver group and another user to the gold group. When these users authenticate, they will get different policy ids in their access token.

Users->People->Add Person

You can use whatever values you want for first name, last name, etc.

*Groups*: add the user to the silver group

Since this is a proof-of-concept, we're going to change the *Password* option to

`Set by Admin`

and we're going to de-select the box "User must change password on first login"

>*Note*: the first time this user logs in, they will be prompted to set up a "forgot password" question. It's just one screen, it only happens once, and the overall flow continues as normal.

Of course, choose a password that you'll remember for demo purposes.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_add_user.png)

In your .env file, the username and password that you've just created correspond to the

SILVER_USERNAME
and
SILVER_PASSWORD

fields. These fields are optional, just for UI convenience.

Click **Save and Add Another**, and follow the same steps to add a sample Gold user.

#### Set up the authorization server

Now we have sample users, sample groups, and a custom user attribute that stores the Tyk policy id based on a user's group membership.

Now we need to tell the authorization server to include the policy id claim in the access token.

API->Authorization Servers->Default

While you're on this screen, take note of the `Issuer URI` of your default authorization server. This corresponds to the

OKTA_AZ_SERVER_ISSUER

value in your `.env` file.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_authorization_servers.png)

First we're going to add a custom scope.

Scopes->Add Scope

*Name*: pol
*Description*: Tyk policy
*Default scope*: yes

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_add_scope.png)

Click **Create** to create this scope.

Now we're going to add a claim.

Click on the *Claims* tab, then **Add Claim**

*Name*: pol
*Mapping*: appuser.pol

Leave the other settings as-is

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_add_claim.png)

Click **Save**.

We need to have at least one access policy in order for the authorization server to work, so we're going to set up a default policy that is open. Obviously, this is for demo purposes only; in a production environment you would lock down your policies to least privilege.

Click on the *Access Policies* tab, then **Add Policy**

*Name*: default
*Description*: default policy

Leave assigned to all clients (again, this is something you would change for prod)

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_add_policy.png)

Click **Create Policy**.

Now we just need to add a rule to our policy to make it active.

Click **Add Rule**

*Rule Name*: default

You can leave all of the other settings as-is for demo purposes.

![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_add_rule.png)

Click **Create Rule**.

Now we can test to see if we're going to get that custom claim in the access token.

Click on *Token Preview*

*OAuth/OIDC client*: `solar system client app`

*Grant type*: Authorization Code

*User*: {{your silver user name}}

*Scopes*: pol

Then click **Preview Token** to see what the access token for this user will look like. You should see the correct Tyk policy ID in the `pol` claim for your user.


![](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta/okta_token_preview.png)

Next, we're going to add your Okta authorization server as a jwt provider for your Tyk API instance. We're going to need the JSON Web Key Set (JWKS) from your authorization server, so while you're in your authorization server:

Click *Settings*, then click on the Metadata URI. You'll get a list of settings. Click on the jwks_uri, and you'll see something like this:

```
{"keys":[{"alg":"RS256","e":"AQAB","n":"zGLom7s1dsiYQwo-ckNKUt6c1eEeqT-yvHc4a-3Hg1hbNUKhzFA42Yadzzlr-TobSrkjgtzUfxd3U7LiiKyXheFfmW5MGZlSrJ-SWk1ZfU_TY0BjnFY3_yxnppG8IYEh66xgXqz25d0adwUDweskSq4Z_YVJoZArHXKaXHdr00tar3LRpWyTldQyhQsQNFMjEE_F4ER83xJPKyr3HxRjz_mkMysGndBQHiXTi-kGNzOKVz3KRqMZjhG_h0ShctwzK2ox3n6giq2sRQJGN94PB2K88vHgsYhdW-axitpEcrbTL3I-r-zGLfBp3xOciDCZ_8sIyKRgtwo2ZIbYHIK7OQ","kid":"jh0M4QndoJU531l-17x_WGjw88SXxlZu9kdW8IGdpkI","kty":"RSA","use":"sig"}]}
```

You might have one or two keys. Using one of these keys, we need to create a public key (.pem format) for Tyk to use.

We strongly recommend using the [jwk-to-pem npm library](https://www.npmjs.com/package/jwk-to-pem) to create your .pem.

Your mileage may vary if you use another library.

#### Add Okta as a jwt provider for your Tyk API

Go to your API and scroll to the “Authentication” section.

*Authentication mode*: JSON Web Token (JWT)
*JWT Signing method*: RSA public Key
*Public Key*: your .pem file
*Identity Source*: sub (note that you need to actually key this in)
*Policy Field name*: pol (note that you need to actually key this in)

![](https://lh4.googleusercontent.com/6WbnCtDgKC9mMQzVLzX98BEWgrzNhIoivo7fJ5XhZSCQ0QvIt2GkFHOQ_b8lOlKLPs_QtpViu2rzwqb-tcKb8KpOmK7w2nVJ2iHpPPWtUIEf9KqMtCFptOh3LZj8SYXfm4d2zziO)

Click **Update** to update your API.

Now, we have our Okta tenant set up, and the Tyk API Gateway is set up to accept jwts from Okta. We just need an application to coordinate the flow among the end-user, Okta, and Tyk.

### Setting up the application

At this point, if you haven't been updating your `.env` file as you've gone through these instructions, it's time to update the file now.

This is the file, with fields indicated as to whether they are required for the app:

```
# Okta settings

# example: https://dev-511902.oktapreview.com
OKTA_TENANT="" # required

OKTA_API_TOKEN="" # not necessary
AUTHN_CLIENT_ID="" # required
AUTHN_CLIENT_SECRET="" # required

# example: https://dev-511902.oktapreview.com/oauth2/default
OKTA_AZ_SERVER_ISSUER="" # required

# Gateway/Proxy base url
# example: http://52.14.100.89:8080/solar-system
PROXY_URI="" # required

# App settings
PORT="8080" # required
REDIRECT_URI="http://localhost:8080" # required
SILVER_USERNAME="" # optional
SILVER_PASSWORD="" # optional
GOLD_USERNAME="" # optional
GOLD_PASSWORD="" # optional
SESSION_SECRET="some random phrase" # required
SESSION_MAX_AGE=60000 # required

# Supported values: kong, mulesoft, tyk
GATEWAY="" # required
```

Refer to the instructions above if you can't find a value.

If you haven't already installed the Node application, go ahead and install:

```
npm install
```

Now you can launch the application:

```
node app.js
```

When you load the web app, first try clicking on the "show me the planets" and/or the "show me the moons" buttons. You'll get an error notifying you that you need an access token, or that the request is forbidden.

Next, try authenticating as one of the users. You'll get an id token and an access token displayed in the browser (in a production environment, you would not do this). The raw tokens are also available in the console if you want to check them out.

Now that the user has a token (actually the token is sitting on the server), you can click on one of the "show me" buttons again to see if you get the requested resource.
