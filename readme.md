## Asynchronous Microservices with RabbitMQ

#### Setup

Step to run:
```javascript
 - node rabbitmq_setup.js
 - cd service-a
 - node index.js
 // open new terminal
 - cd service-b
 - node index.js
```

Send request to test the action using **POST** method.
Hit this url: */api/v1/process*.
The request body contain parameter:

Key | Value
--- | ---
"data" | "random string"
