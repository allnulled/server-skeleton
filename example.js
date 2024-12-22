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