const path = require("path")
require("dotenv").config({path: path.resolve(process.cwd(), '../.env')})

const amqp = require("amqplib")
const express = require("express")
const app = express()
const http = require('http')
const bodyParser = require("body-parser")

// Middleware
app.use(bodyParser.json())

// simulate request id
let last_request_id = 1

// RabbitMQ connection string
const messageQueueConnection = process.env.CLOUDAMQP_URL

// handle the request
app.post('/api/v1/process', async (req, res) => {
    // save request id and increment
    let request_id =  last_request_id
    last_request_id++

    // connect to RabbitMQ and create a channel
    let connection = await amqp.connect(messageQueueConnection)
    let channel = await connection.createConfirmChannel()

    // publish the data to RabbitMQ
    let request_data = req.body.data
    console.log(`Published a request message, request id: ${request_id}`)

    await publishToChannel(channel, { 
        routingKey: "request",
        exchangeName: "processing",
        data: { request_id, request_data }
    })

    // send the request id in the response
    res.send({ request_id })
})

// utility function to publish message to a channel
const publishToChannel = (channel, { routingKey, exchangeName, data }) => {
    return new Promise((resolve, reject) => {
        channel.publish(
            exchangeName,
            routingKey,
            Buffer.from(JSON.stringify(data), 'utf-8'),
            { persistent: true },
            function (err, ok) {
                if (err) {
                    return reject(err)
                }

                resolve()
            }
        )
    })
}

const listen = async () => {
    // connect to RabbitMQ
    let connection = await amqp.connect(messageQueueConnection)

    // create a channel and prefetch one message at a time
    let channel = await connection.createChannel()
    await channel.prefetch(1)

    // start consuming messages
    await consume({ connection, channel })
}

// consume messages from RabbitMQ
const consume = ({ connection, channel, resultsChannel }) => {
    return new Promise((resolve, reject) => {
        channel.consume("processing.results", async function(msg) {
            // parse message
            let msg_body = msg.content.toString()
            let data = JSON.parse(msg_body)
            let request_id = data.request_id
            let processing_results = data.processing_results
            console.log(`Received a result message, request id: ${request_id} processing results: ${processing_results}`)

            // acknowledge message as received
            await channel.ack(msg)
        })

        // handle connection closed
        connection.on("close", (err) => {
            return reject(err)
        })

        // handle errors
        connection.on("error", (err) => {
            return reject(err)
        })
    })
}

// start the server
const PORT = 3000
server = http.createServer(app)
server.listen(PORT, "localhost", function(err) {
    if(err) {
        console.error(err)
    } else {
        console.info(`Listening on port ${PORT}`)
    }
})

// listen for results on RabbitMQ
listen()
