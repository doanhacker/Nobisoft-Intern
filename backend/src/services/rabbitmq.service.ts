import * as amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const INDEXING_QUEUE = 'image_indexing_queue';

let channel: any = null;
let connection: any = null;

export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(INDEXING_QUEUE, { durable: true });
    console.log('Connected to RabbitMQ successfully');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
  }
}

export async function publishToIndexingQueue(images: { id: string; path: string }[]) {
  if (!channel) {
    console.warn('RabbitMQ channel is not open, trying to reconnect...');
    await connectRabbitMQ();
  }

  if (channel) {
    const message = JSON.stringify(images);
    // persistent: true saves message to disk
    channel.sendToQueue(INDEXING_QUEUE, Buffer.from(message), { persistent: true });
    console.log(`Successfully published batch of ${images.length} images to RabbitMQ queue.`);
  } else {
    throw new Error('RabbitMQ channel could not be established');
  }
}

export async function closeRabbitMQ() {
  try {
    await channel?.close();
    await connection?.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}
