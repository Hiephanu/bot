const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const UNSPLASH_ACCESS_KEY = "6u8mpENI08iusPsoRp7IpJUDoTMBbsx-CY-EAieEdxU";

async function searchImage(query) {
  try {
    const response = await fetch(`https://api.unsplash.com/photos/random?query=${query}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const imageUrl = data.urls.full;
    return imageUrl;

  } catch (error) {
    console.error("Error fetching image:", error.message);
    return "";
  }
}

async function main() {
  const client = new MezonClient("564951526a4e36745533437a48522d43");

  await client.authenticate();

  client.on("channel_message", async (event) => {
    console.log("event", event);

    if (event?.content?.t && event.content.t.startsWith("*anh")) {
      const command = event.content.t;
      const parts = command.split(" "); 

      if (parts.length === 2) {
        try {
          const imageUrl = await searchImage(parts[1]);

          if (imageUrl) {
            const imageAttachment = {
              url: imageUrl,
              filename: "image", 
              filetype: "image"
            };

            await client.sendMessage(
              event?.clan_id,
              event?.channel_id,
              2,
              event?.is_public,
              {},
              [],
              [imageAttachment],
              [
                {
                  message_id: '',
                  message_ref_id: event.message_id,
                  ref_type: 0,
                  message_sender_id: event.sender_id,
                  message_sender_username: event.username,
                  mesages_sender_avatar: event.avatar,
                  message_sender_clan_nick: event.clan_nick,
                  message_sender_display_name: event.display_name,
                  content: JSON.stringify(event.content),
                  has_attachment: true,
                },
              ]
            );
          } else {
            console.error("Image URL not found.");
            sendInvalidArgumentResponse(client,event);
          }
        } catch (error) {
          console.error("Error searching for image:", error);
          sendInvalidArgumentResponse(client,event);
        }
      } else {
        console.error("Invalid argument provided.");
        sendInvalidArgumentResponse(client,event);
      }
    }
  });
}

function sendInvalidArgumentResponse(client,event) {
  client.sendMessage(
    event?.clan_id,
    event?.channel_id,
    2,
    event?.is_public,
    { t: "Invalid argument" },
    [],
    [],
    [
      {
        message_id: '',
        message_ref_id: event.message_id,
        ref_type: 0,
        message_sender_id: event.sender_id,
        message_sender_username: event.username,
        mesages_sender_avatar: event.avatar,
        message_sender_clan_nick: event.clan_nick,
        message_sender_display_name: event.display_name,
        content: JSON.stringify(event.content),
        has_attachment: false,
      },
    ]
  );
}


main()
  .then(() => {
    console.log("bot start!");
  })
  .catch((error) => {
    console.error(error);
  });
