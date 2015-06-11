# RefluxCRUD
A CRUD store for Reflux, with mixins and actions.
Uses [superagent](https://visionmedia.github.io/superagent/) for requests and [immutable](https://facebook.github.io/immutable-js/) data storage.


The source is very small, so poke at it all you want. Does not have any
tests, and is probably not production ready.
 This is just to get this out there.

 If you're looking for a better Flux REST implementation,
 I recommend [NuclearJS]( https://github.com/optimizely/nuclear-js).
 They have a decent Flux REST implementation example in a branch.

Example of use:

    var headers = {X-CSRFToken: "awcals9345mgs5KbV6YB19hH6wYG0K8HP", Authorization: "Token 1459b3d7ac166f8bfd294afb10627d7736000fd0"}  

    var posts = RefluxCRUD.store({headers: headers, label: "posts", endpoint:"/api/posts/"})

    posts.actions.read()

Reads from the endpoint, while

    posts.actions.read(2)

Reads from "/api/posts/2/"

Other examples of actions are:
+  create, which takes in an object and sends a "POST" to endpoint with the data
+  delete, which takes in a id an issues a "DELETE" to '/api/posts/id/'
+  update, which takes in an id and data, and issues a "PUT" to '/api/posts/id/'
   with the given data

+ next, which fetches the next page of data.

Note: if the result body includes a "results", it will be assumed that
there is also a "next"  property in the response body
which is a link to fetch the next page from the API.
(This is the default in CursorPagination in Django REST)


The package exports:

+ actions: An object which can be used with Reflux.createActions to create
  CRUD actions
+ mixin: a mixin for Reflux Stores which implements the CRUD actions with
 requests via superagent
+ store: a function to greate a bare CRUD store. Takes in an object
  with a label and endpoint, and optionally a headers item used to
  set the headers on the request on superagent (useful for token Authorization
  and CSRF)
