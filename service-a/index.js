const path = require("path")
require("dotenv").config({path: path.resolve(process.cwd(), '../.env')})

const amqp = require("amqplib")

// RabbitMQ connection string
const messageQueueConnection = process.env.CLOUDAMQP_URL

const listen = async () => {
    // connect to RabbitMQ
    let connection = await amqp.connect(messageQueueConnection)

    // create a channel and prefetch one message at a time
    let channel = await connection.createChannel()
    await channel.prefetch(1)

    // create a second channel to send back the results
    let resultsChannel = await connection.createConfirmChannel()

    // start consuming message
    await consume({
        connection,
        channel,
        resultsChannel
    })
}

// utility function to publish message to a channel
const publishToChannel = (channel, { routingKey, exchangeName, data }) => {
    return new Promise((resolve, reject) => {
        channel.publish(
            exchangeName, 
            routingKey, 
            Buffer.from(JSON.stringify(data), 'utf-8'),
            { persistent: true },
            function (err, ok) {
                if(err) {
                    return reject(err)
                }

                resolve()
            }
        )
    })
}

// consume messages from RabbitMQ
const consume = ({ connection, channel, resultsChannel }) => {
    return new Promise((resolve, reject) => {
        channel.consume("processing.requests", async function(msg) {
            // parse message
            let msg_body = msg.content.toString()
            let data = JSON.parse(msg_body)
            let request_id = data.request_id
            let request_data = data.request_data
            console.log(`Received a request message, request id: ${request_id}`)

            // process data
            let processing_results = await processMessage(request_data)

            // publish results to channel
            await publishToChannel(resultsChannel, {
                exchangeName: "processing",
                routingKey: "result",
                data: { request_id, processing_results }
            })
            console.log(`Published results for request id: ${request_id}`)

            // acknowledge message as processed successfully
            await channel.ack(msg)
        })

        // handle conncetion closed
        connection.on("close", (err) => {
            return reject(err)
        })

        // handle errors
        connection.on("error", (err) => {
            return reject(err)
        })
    })
}

// simulate data processing that takes five seconds
const processMessage = (request_data) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(`${request_data}-processed`)
        }, 5000)
    })
}

listen()
