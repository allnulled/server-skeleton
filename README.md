# server-skeleton

Write one server app, run it on node.js or browser.

## Installation

```sh
npm i -s @allnulled/server-skeleton
```

Then on node.js:

```js
const ServerSkeleton = require("@allnulled/server-skeleton");
```

Or on browser:

```html
<script src="node_modules/@allnulled/server-skeleton/server-skeleton.js"></script>
```

## Requirements

The script does not import `express` module but it is required to work on server-side. I did not include it to not overload but the URL pattern conventions are based on `express` and everything is polyfilling `express` in this project.

So, have it, or:

```sh
npm install -s express
```

## Idea

The idea is that: to make a polyfill of `express`.

### Step 1. Create an app

```js
const app = ServerSkeleton();
```

### Step 2. Set configurations

```js
app.setHost("http://127.0.0.1");
app.setPort(5000);
```

### Step 3. Add services

This is how you define new services. Note that variables in URL will work as expected.

```js
app.service("/api/v/:version/:model/:operation").browser(function(request, response) {
    const {version, model, operation } = request.params;
    const { others } = request.body;
    // We must in the browser, so:
    window.confirm("You sure?");
    // But still can respond async (or sync too):
    response.status(200).type("wherever").json({ data: [] });
}).server(function(request, response, next) {
    // We must be in the server, so:
    response.json({ msg: "OK!" });
});
```

### Step 4. Listen

To start listening for requests, just:

```js
await app.listen();
```

### Step 5. Send requests

For all this to have sense, we must be able to send requests to this faked server.

For this to happen, we extract the client:

```js
const client = app.createClient();
```

And from there, we can use it as a fetcher:

```js
const response = await client("/hello", { name: "world!" });
```

Note the await is set, but the response is synchronously returned in reality, it is up to you to return a Promise.


## Usage

The test in `example.js` is a demonstration of a cross-environment app definition:

```js
// This is a multienvironment application example.
// It can work in both, node.js or browser.
const main = async function () {
  let app = undefined;
  Multienvironment_app: {
    if(typeof global !== "undefined") {
      require(__dirname + "/server-skeleton.js");
    }
    // Application:
    app = ServerSkeleton();
    app.setHost("http://127.0.0.1");
    app.setPort(5000);
    // Service 1:
    app.service("/hello/:user").browser(function (request, response) {
      const { user } = request.params;
      const { message } = request.body;
      return `Hello, ${user}! It says: ${message}`;
    }).server(function (request, response, next) {
      return response.json({ msg: "OK!" });
    });
    // Service 2:
    app.service("/wherever").browser(function () {
      return "OK!";
    }).server(function (request, response, next) {
      return response.json({ msg: "OK!" });
    });
    // Service 3:
    app.service("/timing").browser(function (request, response) {
      setTimeout(function() {
        response.status(200).type("text/json").json({
          status: "solved asynchronously"
        });
      }, 1000);
      return;
    }).server(function (request, response, next) {
      return response.json({ msg: "OK!" });
    });
    // Deployment:
    await app.listen(5000);
  }
  Only_client_but_can_colive_in_nodejs: {
    const client = app.createClient();
    Response_1: {
      const response_1 = await client("/hello/world", { message: "wherever" });
      if(!response_1.startsWith("Hello, world! It says: wherever")) {
        throw new Error("Response 1 failed");
      }
    }
    Response_2: {
      const response_2 = await client("/wherever", { message: "wherever" });
      if(!response_2.startsWith("OK!")) {
        throw new Error("Response 2 failed");
      }
    }
    Response_3: {
      const response_3 = await client("/timing", { message: "wherever" });
      if(!response_3.status.startsWith("solved asynchronously")) {
        throw new Error("Response 3 failed");
      }
    }
    app.close();
    console.log("[*] Test passed successfully.");
  }
};

main();
```

## Use cases

Applications that:
  - can have similar structure in client and server (or a subset of it)
  - must emulate server capabilities in client

## How it helps

The structure is defined the same way for both environments through the API.

The emulation is carried on by default, so when you listen, you listen in both environments.

