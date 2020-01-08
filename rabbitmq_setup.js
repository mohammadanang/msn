require("dotenv").config()
const amqp = require("amqplib")

// RabbitMQ connection string
const messageQueueConnection = process.env.CLOUDAMQP_URL

const setup = async () => {
    console.log("Setting up RabbitMQ Exchanges/Queues")

    // connect to RabbitMQ instance
    let connection = await amqp.connect(messageQueueConnection)

    // create a channel
    let channel = await connection.createChannel()

    // create exchange
    await channel.assertExchange("processing", "direct", { durable: true })

    // create queues
    await channel.assertQueue("processing.requests", { durable: true })
    await channel.assertQueue("processing.results", { durable: true })

    // bind queues
    await channel.bindQueue("processing.requests", "processing", "request")
    await channel.bindQueue("processing.results", "processing", "result")

    console.log("Setup DONE")
    process.exit()
}

setup()
