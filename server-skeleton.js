(function (factory) {
  const mod = factory();
  if (typeof global !== "undefined") {
    global.ServerSkeleton = mod;
  }
  if (typeof window !== "undefined") {
    window.ServerSkeleton = mod;
  }
  if (typeof module !== "undefined") {
    module.exports = mod;
  }
})(function () {

  const noop = function () { };

  const ResponsePolyfill = class {
    constructor(parameters) {
      const { promise, resolve, reject } = parameters;
      this.promise = promise;
      this.resolve = resolve;
      this.reject = reject;
      this.$type = "text/plain";
      this.$status = 200;
      this.$isSolved = false;
    }

    type(mimetype) {
      this.$type = mimetype;
      return this;
    }

    status(status) {
      this.$status = status;
      return this;
    }

    send(data) {
      if(this.$isSolved) {
        throw new Error("Response is already solved");
      }
      return this.resolve(data);
    }

    json(data) {
      return this.send(data);
    }

  }

  const ServerSkeletonService = function (app, urlPattern) {
    const service = { app, urlPattern };
    app.$initService(urlPattern);
    service.browser = function (callback) {
      service.app.$setService(urlPattern, "browser", callback);
      return service;
    };
    service.server = function (callback) {
      service.app.$setService(urlPattern, "server", callback);
      return service;
    };
    service.service = function (urlPattern, ...args) {
      return ServerSkeletonService(service.app, urlPattern, ...args);
    };
    return service;
  };
  const ServerSkeletonApp = function () {
    const app = {
      $host: "http://127.0.0.1",
      $port: "8080",
      $strategy: "browser",
      $services: [],
    };
    app.$throwIfRepeatedUrlPattern = function (urlPattern) {
      const hasRepetitions = app.$services.filter(service => service.urlPattern === urlPattern).length;
      if (hasRepetitions) {
        throw new Error("Repeated url pattern cannot be added again: " + urlPattern)
      }
    };
    app.$throwIfMissingUrlPattern = function (urlPattern) {
      const hasRepetitions = app.$services.filter(service => service.urlPattern === urlPattern);
      if (!hasRepetitions.length) {
        throw new Error("Missing url pattern: " + urlPattern)
      }
      return hasRepetitions[0];
    };
    app.$matchUrlExtractParameters = function(pattern, url) {
      const regex = new RegExp('^' + pattern.replace(/\/:[^\/]+/g, '/([^/]+)').replace(/\*/g, '.*') + '$');
      // Reemplaza `*` por "cualquier cosa"
      // Reemplaza `/:param` por un grupo de captura
      const match = url.match(regex);
      if (!match) {
        return null;
      }
      const keys = [];
      const paramRegex = /:([^\/]+)/g;
      let paramMatch;
      // Extraer las claves (nombres de parámetros)
      while ((paramMatch = paramRegex.exec(pattern))) {
        keys.push(paramMatch[1]);
      }
      // Crear un objeto con los parámetros capturados
      const params = keys.reduce((acc, key, index) => {
        acc[key] = match[index + 1];
        return acc;
      }, {});
      return { params, match };
    };
    app.$initService = function (urlPattern) {
      app.$throwIfRepeatedUrlPattern(urlPattern);
      app.$services.push({ urlPattern });
    };
    app.$setService = function (urlPattern, environmentId, callback) {
      const service = app.$throwIfMissingUrlPattern(urlPattern);
      service[environmentId] = callback;
    };
    app.service = function (urlPattern, ...args) {
      return ServerSkeletonService(app, urlPattern, ...args);
    };
    app.listen = function (port, callback = noop) {
      if (typeof global !== "undefined") {
        return new Promise((resolve, reject) => {
          const express = require("express");
          const expressApp = express();
          const httpServer = require("http").createServer(expressApp);
          for (let index = 0; index < app.$services.length; index++) {
            const service = app.$services[index];
            expressApp.use(service.urlPattern, service.server);
          }
          app.$expressApp = expressApp;
          app.$httpServer = httpServer;
          app.$httpServer.listen(port, function (error) {
            console.log(`[*] Server listening on port:\n  - ${app.$host}:${app.$port}`);
            for (let index = 0; index < app.$services.length; index++) {
              const service = app.$services[index];
              console.log(`    · ${service.urlPattern}`);
            }
            callback(error);
            if (error) {
              return reject(error);
            }
            return resolve(app);
          });
        });
      }
    };
    app.createClient = function (...args) {
      return function (url, ...args) {
        IteratingServices:
        for(let index=0; index<app.$services.length; index++) {
          const service = app.$services[index];
          const matches = app.$matchUrlExtractParameters(service.urlPattern, url);
          if(!matches) {
            continue IteratingServices;
          }
          const parameters = matches.params;
          if(app.$strategy === "browser") {
            const [ data, options = {} ] = args;
            let requestResolve = undefined;
            let requestReject = undefined;
            const requestPromise = new Promise((resolve, reject) => {
              requestResolve = resolve;
              requestReject = resolve;
            });
            const request = {
              params: parameters,
              body: data,
              options: options
            };
            const response = new ResponsePolyfill({
              promise: requestPromise,
              resolve: requestResolve,
              reject: requestReject,
            });
            try {
              const result = service.browser(request, response);
              if(typeof result !== "undefined") {
                requestResolve(result);
              }
            } catch (error) {
              requestReject(error);
            }
            return requestPromise;
          } else if(app.$strategy === "server") {
            return fetch(url, ...args);
          } else {
            throw new Error("Strategy mode not identified: " + app.$strategy);
          }
        }
      };
    };
    app.setHost = function(host) {
      app.$host = host;
    };
    app.setPort = function(port) {
      app.$port = port;
    };
    // app.setStrategy = function(strategy) {
    //   app.$strategy = strategy;
    // };
    app.close = function() {
      if(app.$httpServer) {
        app.$httpServer.close();
      }
    };
    return app;
  }
  const ServerSkeleton = function () {
    return ServerSkeletonApp();
  };
  ServerSkeleton.default = ServerSkeleton;
  return ServerSkeleton;

});