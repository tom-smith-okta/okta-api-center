# Setting up your Okta tenant for the Solar System API

These instructions assume that you are using the Developer Edition of Okta. If you are using the Enterprise version, some of the screen captures and menus may look a little different.

Also, we’re going to use the default authorization server that is built in to the developer edition. If you are using an Enterprise edition of Okta, you will need to set up an authorization server.

### Create an OIDC client

Click “Applications” and then “Add application”.

Choose “Web”, then Next.

Name: Okta Authentication Client

For the Login redirect URIs, add the URI of your application. Throughout this guide, I have been using

`http://localhost:8000`

but you may be using a different URI in your environment.

Click Done.

You’ll get a client id and client secret.

### Create Users and Groups
Set up a group: Users->Groups->Add Group
Name the group “silver subscribers”; you can use the same for the description
Click Add Group
Add a user: Users->People->Add Person
In the Groups field, add “silver subscribers”
Use whatever values you wish for the remaining fields
Click Save

### Add custom scopes
API->Authorization Servers->default
Click the Scopes tab
Click Add Scope
Name: http://myapp.com/scp/silver
Description: Silver scope
Click Create

### Add a policy
API->Authorization Servers->default
Click the Access Policies tab
Click Add New Access Policy
Name: Solar system API access
Description: Solar system API access
It’s OK to leave it assigned to All clients
Click Create

### Add a rule
In your policy, click the Add Rule button
Rule Name: silver access to planets
Change the User clause to “Assigned the app and a member of the following:”
Add the silver subscribers group
Change the Scopes clause to “The following scopes:”
Add these scopes:
http://myapp.com/scp/silver
openid
Click “Create Rule”

![alt text](https://s3.us-east-2.amazonaws.com/tom-smith-okta-api-center-images/okta_add_rule.png)

Your authorization server is now set up so that users in the _silver subscribers_ group who request the “http://myapp.com/scp/silver” scope upon authentication will be granted that scope in their access token. In the API gateway, this scope will give them access to the /planets resource.

The API Center application renders two user authentication/authorization flows: one for a “silver” user (which you’ve just set up) and one for a “gold” user. If you would like to see the flow for a “gold” user (access to `/moons`) then go through the steps above (starting with the creation of another new group) using *gold* as the keyword in the place of *silver*.

Make sure you've added your REDIRECT_URI as a Trusted Origin in your Okta tenant.

Update your `.env` and save.