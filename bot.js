import { Relay, finalizeEvent, getPublicKey } from 'nostr-tools';
import 'websocket-polyfill';
import { request, gql } from 'graphql-request';
import fs from 'fs';
import { relayUrl, endpoint, imageUrlBase } from './config/config.js';

const processedIdsFilePath = 'processed-activity-ids.json';
let processedActivityIds = [];

const recentActivityQuery = gql`
  query {
    recentactivity(
      where: {
        type: { _neq: "royalty" }
      }
      limit: 20
    ) {
      id
      type
      amount
      created_at
      artwork {
        slug
        artist {
          username
        }
        asset
        edition
        editions
        asking_asset
        title
        filename
        created_at
      }
    }
  }
`;


function logError(error) {
    const logMessage = `[${new Date().toISOString()}] ${error}\n`;
  
    const logFilePath = './error-logs.txt';

    fs.appendFileSync(logFilePath, logMessage);
    console.error(logMessage);
  }  
  
async function getRecentActivities() {
  try {
    const data = await request(endpoint, recentActivityQuery);
    return data.recentactivity;
  } catch (error) {
    logError('Error fetching recent activities:', error);
    throw error;
  }
}

async function processRecentActivity(activity) {
  try {
    const { id, type, artwork } = activity;

    if (processedActivityIds.includes(id)) {
      console.log(`Skipping already processed activity with ID ${id}`);
      return;
    }

    const artistName = artwork.artist.username;
    const artworkTitle = artwork.title;
    const artworkSlug = artwork.slug;

    let eventText;

    if (type.toLowerCase() === 'creation') {
      eventText = `${artistName} has just published the artwork "${artworkTitle}" on raretoshi.com/a/${artworkSlug}.`;
    } else {
      const amount = activity.amount;
      const saleAmount = amount / 100000000; // Convert Satoshis to BTC
      eventText = `The artwork "${artworkTitle}" by ${artistName} was just sold for ${amount} Satoshis (${saleAmount}L-BTC) on raretoshi.com/a/${artworkSlug}.`;
    }

    const imageUrl = `${imageUrlBase}${artwork.filename}`;

    const sk = process.env.SEC_K;

    const relay = await Relay.connect(relayUrl); 
    const pk = getPublicKey(sk);

    relay.subscribe([
      {
        kinds: [1],
        authors: [pk],
      },
    ], {
      onevent(event) {
        console.log('Got event from Relay:', event); 
      }
    });

    const eventTemplate = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: `${eventText}\n\n${imageUrl}`,
    };

    const signedEvent = finalizeEvent(eventTemplate, sk);
    console.log(signedEvent);

    processedActivityIds.push(id);

    fs.writeFileSync(processedIdsFilePath, JSON.stringify(processedActivityIds));

    await relay.publish(signedEvent);
    relay.close();

    console.log(`Event created and published for activity with ID ${artworkTitle}`);
  } catch (error) {
    logError('Error processing recent activity:', error);
  }
}

if (fs.existsSync(processedIdsFilePath)) {
  const fileContent = fs.readFileSync(processedIdsFilePath, 'utf-8');
  processedActivityIds = JSON.parse(fileContent);
}

async function main() {
    try {
      while (true) {
        const recentActivities = await getRecentActivities();
  
        for (const activity of recentActivities) {
          await processRecentActivity(activity);
        }
  
        console.log('Bot execution completed');
  
        await delay(60000);
      }
    } catch (error) {
      logError('Bot error:', error);
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  main();
  
