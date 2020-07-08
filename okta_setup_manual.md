# Setting up your Okta tenant for the Solar System sample application

If you haven't considered it already, you might choose to use the [Terraform tool](https://okta-terraform.herokuapp.com) to set up your Okta tenant. The Terraform tool is a (non-supported) service that will take a couple of values from you (Okta API token, Okta tenant URL) and set up all of the objects for you automatically.

If you don't want to do that, or you've had trouble with the Terraform tool, here's how to proceed. Again, these instructions are specific to the "solar system" use-case described above, but after completing the setup, hopefully you will see how it can be applied to your own use-case.

## Prerequisites

* An Okta tenant. If you don't already have an Okta tenant, you can sign up for a free-forever [Okta developer edition](https://developer.okta.com/).

> Note: These instructions assume that you are using the developer edition of Okta. If you are using the Enterprise version, some of the menus may be a little different.

> Note: Also, we’re going to use the default authorization server that is built in to the developer edition. This is what the default authorization server looks like on the Okta API screen:

![](https://tom-smith-okta-api-center-images.s3.us-east-2.amazonaws.com/default_authorization_server.png)

If you don't have a default authorization server, you can [set one up](https://developer.okta.com/docs/guides/customize-authz-server/create-authz-server/).

## Outputs

At the end of this setup, you will have the following values, which will be needed to set up the test application and the API gateway:

client_id
client_secret


## Setup

### Create an OIDC client

Click “Applications” and then “Add Application”.

Choose “Web”, then Next.

The following login redirect URI is created for you by default:

`http://localhost:8080/authorization-code/callback`

Add another login redirect URI:

`http://localhost:8080`

Leave all of the other default settings as-is.

Click Done.

You've created an OIDC client in your Okta tenant. Take note of your Client ID and Client secret, because we'll need those later.

### Create groups

Create one group that will contain silver-level subscribers, and another group that will contain gold-level subscribers.

1. Set up a group: Users->Groups->Add Group
2. Name the group “silver subscribers”; you can use the same for the description
3. Click Add Group

Repeat the same steps for the "gold subscribers" group.

### Create users

Create one user who is a member of the silver subscribers group, and another user who is a member of the gold subscribers group.

1. Add a user: Users->People->Add Person
	First name: Carl
	Last name: Sagan
	Username: carl.sagan@mailinator.com
	Primary email: carl.sagan@mailinator.com
	Secondary email: {{your email}}
	Groups: silver subscribers
	Password: you can choose to either set the user's password now (set by admin) or send the user an activation email. The activation email will go to both the primary and secondary email addresses.
2. Add another user: Users->People->Add Person
	First name: Jodie
	Last name: Foster
	Username: jodie.foster@mailinator.com
	Primary email: carl.sagan@mailinator.com
	Secondary email: {{your email}}
	Groups: gold subscribers
	Password: you can choose to either set the user's password now (set by admin) or send the user an activation email. The activation email will go to both the primary and secondary email addresses.

### Add custom scopes

Create custom scopes in your authorization server to represent "gold" privileges and "silver" privileges.

1. API->Authorization Servers->default
2. Click the Scopes tab
3. Click Add Scope
	Name: http://myapp.com/scp/silver
	Description: silver scope
	Default scope: no
	Metadata: yes

4. Click Create

Repeat the same steps for the "gold" scope, using `http://myapp.com/scp/gold` as the name.

### Add an authorization policy

> Important: by default, the authorization server has a Default Policy that honors all requests for all scopes. This is great for development and troubleshooting, but to test that users are being accurately denied access to certain scopes, you need to make the Default Policy inactive.

Create an authorization policy that will govern when scopes are granted.

1. API->Authorization Servers->default
2. Click the Access Policies tab
3. Click Add New Access Policy
	Name: Solar system API access
	Description: Solar system API access
	Assign to: My Web App (also OK to leave assigned to all clients for demo purposes)
4. Click Create Policy

### Add rules

Add rules to your policy.

1. In your policy, click the Add Rule button
	Rule Name: silver access to solar system API
	Grant Type: Authorization Code (also OK to leave all selected for demo purposes)
	User is - Assigned the app and a member of the following:
		Groups: silver subscribers
	Scopes requested - the following scopes:
		click "OIDC default scopes" to populate the OIDC default scopes
		http://myapp.com/scp/silver
2. Click Create Rule

Now the gold access rule. Note that we are adding both silver *and* gold scopes to the gold subscribers group.

1. In your policy, click the Add Rule button
	Rule Name: gold access to solar system API
	Grant Type: Authorization Code (also OK to leave all selected for demo purposes)
	User is - Assigned the app and a member of the following:
		Groups: gold subscribers
	Scopes requested - the following scopes:
		click "OIDC default scopes" to populate the OIDC default scopes
		http://myapp.com/scp/gold
		http://myapp.com/scp/silver
2. Click Create Rule

### What we've done

Your authorization server is now set up so that when an application asks for an access token on behalf of a user:

* if the user is a member of the _silver subscribers_ group and the application requests the `http://myapp.com/scp/silver` scope, then the authorization server will honor the request and include the `http://myapp.com/scp/silver` scope in the access token.

* if the user is a member of the _gold subscribers_ group and the application requests the `http://myapp.com/scp/silver` scope *or* the `http://myapp.com/scp/gold` scope, then the authorization server will honor the request and include the requested scope(s) in the access token.

The application can then send this access token to an API to request resources on behalf of the user. The API (or API gateway) will verify that the access is valid, and ensure that it has the appropriate scope(s) for the resource that is being requested.

You can now return to the main setup and move to "Set up the test application".
