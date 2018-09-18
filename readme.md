# Okta API Center

The Okta API Center gives developers a tool to see how easily Okta's API Access Management (OAuth as a Service) capabiltiies integrate with leading API gateways and application proxies.

Okta is a standards-compliant OAuth 2.0 authorization server and a certified OpenID Provider.

## Installing

The Okta API Center is a Node.js/Express application.

```bash
npm install
```

## How it works
When the API Center application launches, it looks for its config settings in the environment.

To establish the values for the app, follow the instructions for your particular API gateway, available in the `/gateways` folder.

To launch the app

```bash
node app.js
```

## Gateways

As of today (July 2018) the API Center supports:

* Amazon API gateway
* Kong
* Mulesoft
* Software AG
* Tyk

## Overview

An API access management workflow typically includes the following components:
* An API
* An API gateway
* An application
* An OAuth server
* An identity provider

And, of course, a use-case to drive the configuration of all of those components.

This tool uses a simple use-case to illustrate how the overall flow works:

* You are managing a "solar system" API.
* You want to control access to the API so that only users with a "silver" scope get access to a list of the planets, and only users with a "gold" scope get access to a list of the moons.

With that use-case as context, the components are set up as follows:

### API
Okta provides a very simple solar system API on heroku: https://okta-api-am.herokuapp.com
This API echoes a list (json object) of the planets: https://okta-api-am.herokuapp.com/planets
And a (partial!) list of the moons: https://okta-api-am.herokuapp.com/moons
For demo purposes, the API is wide open. In a real-world use-case you would of course lock down the API so that it could only be accessed through your gateway.

### API Gateway
To set up Okta as an authorization server for your gateway, follow the instructions for your gateway in the /gateways directory.

### Application
The application that coordinates all of the components and UI is the node app.js application included in this repo. The application loads all of the configuration values and launches a web server (Express) to present an end-user UI.

### OAuth server, identity provider
In this case, Okta will be the OAuth server and the identity provider.