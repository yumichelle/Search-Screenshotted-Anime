## CS355 Final Project (Fall 2021)
In this project, students choose two API's and create a mashup that uses them synchronously.

1. When a end user visits the home page, your server send them a form to fill out.
2. When a end user submits the form, use the captured data to send the first API request.
3. Upon receiving the response from the first API request, your server will  parse the response and generate a request to the second API. the user cannot be the driver of this secondary request, if they have to interact with the page at all, (for example clicking a button) this is considered two separate requests and not two synchronous requests.
4. Upon receiving the response from the second API request, your server will parse the response and finally send results back to the end user.

## Restrictions
The point of this project is to demonstrate understanding of low-level Node.js. Third party modules are banned (eg. NPM / github). Promise and Async/Away notation is banned. setTimeout and equivalents are banned.
