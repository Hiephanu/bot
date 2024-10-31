const dotenv = require("dotenv");
const {MezonClient} = require("mezon-sdk");
const {GoogleGenerativeAI} = require("@google/generative-ai")
const fs = require('fs');
const path = require('path');
const {v4: uuidv4} = require('uuid');
const axios = require('axios');
const express = require('express');
const app = express();
const PORT = 3000;

app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Start server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

// Config Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: 'dus0xvohp',
    api_key: '257887767838265',
    api_secret: 'wn1bal_uQvFq2f2Vjo2R3MGcL6g'
});
const uploadImage = async (filePath) => {
    try {
        const result = await cloudinary.uploader.upload(path.join(__dirname, filePath), {
            folder: 'mezon-app',
        });

        console.log("URL công khai của ảnh:", result.secure_url); // URL để truy cập ảnh
        return result.secure_url;
    } catch (error) {
        console.error("Lỗi khi tải ảnh lên:", error);
    }
};

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const MEZON_CLIENT_TOKEN = process.env.APPLICATION_TOKEN;
const UNSPLASH_ACCESS_KEY = "6u8mpENI08iusPsoRp7IpJUDoTMBbsx-CY-EAieEdxU";
const GEMINI_API_KEY = "AIzaSyAeWaLxpxUJbb49PO5-k5c2hhGC5VjE5eQ";
const HUGGINGFACE_API_KEY = "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";
const WEATHER_API_KEY = "23abd89ed2127beb4b5ae56bd4a60e67";

async function geminiCallApi(model, prompt) {
    const result = await model.generateContent(prompt);
    return result.response.text();
}

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

async function getWeatherForecast(day, latitude, longitude, possion) {
    const apiKey = WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.list || data.list.length === 0) {
            return "Không có dữ liệu cho ngày yêu cầu.";
        }

        const forecastEntries = [];

        if (day === 1) {
            const now = new Date();
            console.log(now);
            const nowTime = (now.getHours()) * 3600 + now.getMinutes() * 60;
            const startIndex = Math.floor(nowTime / 21600);

            let x = 1;
            for (let i = 0; i < 2; i++) {
                const forecastIndex = Math.floor(startIndex / 3) + i;
                if (forecastIndex < data.list.length) {
                    const forecast = data.list[forecastIndex];
                    const evaluationResult = evaluateWeather(forecast);
                    const date = new Date(forecast.dt * 1000);
                    const airQualityResult = await getAirQuality(latitude, longitude);


                    const formattedTime = date.toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        hour: '2-digit',
                        minute: '2-digit'
                    }); // Thời gian theo múi giờ địa phương
                    if (x === 1) {
                        forecastEntries.push(`Thời gian: Hiện tại\n${evaluationResult}\n- ${airQualityResult}\n`);
                    } else {
                        forecastEntries.push(`Thời gian: ${formattedTime}\n${evaluationResult}\n- ${airQualityResult}\n`);
                    }
                    x++;
                }
            }

            const formattedDate = now.toLocaleDateString('en-GB');
            const result = `Dự báo thời tiết ${possion} ngày ${formattedDate}:\n` +
                `-------------------------------------\n` +
                forecastEntries.join('-------------------------------------\n');
            return result;
        } else {

            const startIndex = (day - 1) * 8;
            const endIndex = startIndex + 1;
            const date = new Date(data.list[startIndex].dt * 1000);
            for (let index = startIndex; index < endIndex; index += 2) {
                if (index < data.list.length) {
                    const forecast = data.list[index];
                    const evaluationResult = evaluateWeather(forecast);
                    const date = new Date(forecast.dt * 1000);
                    const airQualityResult = await getAirQuality(latitude, longitude);
                    forecastEntries.push(`${evaluationResult}\n- ${airQualityResult}\n`);
                }
            }
            const formattedDate = date.toLocaleDateString();
            const result = `Dự báo thời tiết ${possion} ngày ${formattedDate}:\n` +
                `-------------------------------------\n` +
                forecastEntries.join('-------------------------------------\n');
            return result;
        }
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        return "Lỗi khi lấy dữ liệu";
    }
}

function evaluateWeather(data) {

    let humidityEvaluation;
    if (data.main.humidity < 30) {
        humidityEvaluation = `Độ ẩm thấp (${data.main.humidity}%)`;
    } else if (data.main.humidity <= 60) {
        humidityEvaluation = `Độ ẩm trung bình (${data.main.humidity}%)`;
    } else {
        humidityEvaluation = `Độ ẩm cao (${data.main.humidity}%)`;
    }

    let feelsLikeEvaluation;
    if (data.main.temp < 25) {
        feelsLikeEvaluation = `Mát mẻ (${data.main.temp}°C)`;
    } else if (data.main.feels_like <= 30) {
        feelsLikeEvaluation = `Dễ chịu (${data.main.temp}°C)`;
    } else {
        feelsLikeEvaluation = `Nóng (${data.main.temp}°C)`;
    }

    let visibilityEvaluation;
    if (data.visibility >= 10000) {
        visibilityEvaluation = `Tầm nhìn tốt (${data.visibility / 1000} km)`;
    } else if (data.visibility >= 5000) {
        visibilityEvaluation = `Tầm nhìn trung bình (${data.visibility / 1000} km)`;
    } else {
        visibilityEvaluation = `Tầm nhìn kém (${data.visibility / 1000} km)`;
    }

    let cloudsEvaluation;
    if (data.clouds.all < 20) {
        cloudsEvaluation = `Trời quang đãng (${data.clouds.all}%)`;
    } else if (data.clouds.all <= 50) {
        cloudsEvaluation = `Mây rải rác (${data.clouds.all}%)`;
    } else {
        cloudsEvaluation = `Nhiều mây (${data.clouds.all}%)`;
    }

    let windEvaluation;
    if (data.wind.speed < 1.5) {
        windEvaluation = `Gió nhẹ (${data.wind.speed} m/s)`;
    } else if (data.wind.speed <= 5) {
        windEvaluation = `Gió vừa phải (${data.wind.speed} m/s)`;
    } else {
        windEvaluation = `Gió mạnh (${data.wind.speed} m/s)`;
    }

    const result = `- Nhiệt độ: ${feelsLikeEvaluation}\n` +
        `- ${humidityEvaluation}\n` +
        `- ${visibilityEvaluation}\n` +
        `- ${cloudsEvaluation}\n` +
        `- ${windEvaluation}`;

    return result;
}

async function getAirQuality(lat, lon) {
    const apiKey = WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.list && data.list.length > 0) {
            const airQualityIndex = data.list[0].main.aqi;
            let message;

            switch (airQualityIndex) {
                case 1:
                    message = "Chất lượng không khí tốt (1/5). Không khí trong lành, không ảnh hưởng đến sức khỏe.";
                    break;
                case 2:
                    message = "Chất lượng không khí khá (2/5). Chất lượng không khí chấp nhận được, nhưng nhóm nhạy cảm nên hạn chế các hoạt động ngoài trời.";
                    break;
                case 3:
                    message = "Chất lượng không khí trung bình (3/5). Nhóm nhạy cảm nên hạn chế thời gian ngoài trời, còn người bình thường không bị ảnh hưởng rõ rệt.";
                    break;
                case 4:
                    message = "Chất lượng không khí kém (4/5). Có thể ảnh hưởng sức khỏe cho mọi người, đặc biệt nhóm nhạy cảm nên tránh ra ngoài.";
                    break;
                case 5:
                    message = "Chất lượng không khí rất kém (5/5). Nguy hại cho sức khỏe của tất cả mọi người. Nên ở trong nhà và sử dụng máy lọc không khí nếu có.";
                    break;
                default:
                    message = "Chất lượng không khí không xác định.";
            }

            return `${message}\n`;
        } else {
            return "Không có dữ liệu chất lượng không khí.";
        }
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu chất lượng không khí:', error);
        return "Lỗi khi lấy dữ liệu chất lượng không khí";
    }
}


async function main() {
    const client = new MezonClient(MEZON_CLIENT_TOKEN);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

    await client.authenticate();

    client.on("channel_message", async (event) => {
        console.log(event?.content);

        if (event?.content?.t && event.content.t !== '{}' && event.content.t.startsWith('*meai')) {
            const inputString = event.content.t;
            const secondPart = inputString.substring(6);

            try {
                const message = await geminiCallApi(model, secondPart);
                sendValidArgumentResponse(client, event, message, {});
            }catch (error){
                sendInvalidArgumentResponse(client, event);
            }

        }

        if (event?.content?.t && event.content.t.startsWith("*text-to-image-v1")) {
            const command = event.content.t;
            inputString = command
            // const firstPart = inputString.substring(0, 4);
            const secondPart = inputString.substring(18);

            try {
                const imageUrl = await searchImage(secondPart);
                console.log("Image URL:", imageUrl);
                if (imageUrl) {
                    const imageAttachment = {
                        url: imageUrl,
                        filename: "image",
                        filetype: "image"
                    };
                    sendValidArgumentResponse(client, event, "", imageAttachment);
                } else {
                    sendInvalidArgumentResponse(client, event);
                }
            } catch (error) {
                sendInvalidArgumentResponse(client, event);
            }
        }


        if (event?.content?.t && event.content.t.startsWith("*ketquaxoso")) {
            try {
                const response = await fetch('https://xoso188.net/api/front/open/lottery/history/list/5/miba');
                const data = await response.json();
                var issueList = data.t.issueList[0];
                var date = issueList.turnNum;
                var rawString = issueList.detail;

                const cleanedString = rawString.replace(/\\"/g, '"');
                const resultArray = JSON.parse(cleanedString);

                const formattedArray = resultArray.map(item => item.split(','));

                const finalString = formattedArray
                    .map(arr => `[${arr.join(', ')}]`)
                    .join(',\n');

                const message = date + ": \n" + finalString;
                sendValidArgumentResponse(client, event, message, {});
            } catch (error) {
                sendInvalidArgumentResponse(client, event);
            }
        }

        if (event?.content?.t && event.content.t.startsWith("*text-to-image-v2")) {
            const command = event.content.t;
            const inputString = command;
            const firstPart = inputString.substring(0, 14);
            const secondPart = inputString.substring(18);

            try {
                // Hàm gọi API và trả về blob ảnh
                async function query(data) {
                    const response = await fetch(
                        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large",
                        {
                            headers: {
                                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            method: "POST",
                            body: JSON.stringify(data),
                        }
                    );

                    if (!response.ok) {
                        sendInvalidArgumentResponse(client, event);
                        throw new Error(`API Error: ${response.statusText}`);
                    }
                    return await response.blob();
                }

                let imageAttachment = {};

                async function generateImage() {
                    try {
                        const blob = await query({inputs: secondPart});

                        const arrayBuffer = await blob.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        // const uniqueId = uuidv4().toString();

                        const imagePath = path.join(__dirname, `public/images/image.jpg`);

                        fs.writeFileSync(imagePath, buffer);

                        //upload image to cloudinary
                        const imageUrl = await uploadImage(`public/images/image.jpg`);
                        // const imageUrl = `http://localhost:${PORT}/images/${uniqueId}.jpg`;

                        imageAttachment = {
                            url: imageUrl,
                            filename: "image",
                            filetype: "image",
                        };


                        console.log("Image Attachment:", imageAttachment);
                    } catch (error) {
                        sendInvalidArgumentResponse(client, event);
                    }
                }

                await generateImage();
                sendValidArgumentResponse(client, event, "", imageAttachment);
            } catch (error) {
                sendInvalidArgumentResponse(client, event);
            }
        }

        if (event?.content?.t && event.content.t.startsWith("*lam-tho")) {
            try {
                // Hàm gọi API và trả về blob ảnh
                async function query(filename) {
                    const data = fs.readFileSync(filename);
                    const response = await fetch(
                        "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
                        {
                            headers: {
                                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            method: "POST",
                            body: data,
                        }
                    );
                    const result = await response.json();
                    return result;
                }

                async function generate() {
                    try {
                        const url = event.attachments[0].url;
                        const response = await axios.get(url, {responseType: 'arraybuffer'});
                        const buffer = Buffer.from(response.data);
                        const uniqueId = uuidv4().toString();
                        const imagePath = path.join(__dirname, `public/images/image-lam-tho.jpg`);

                        fs.writeFileSync(imagePath, buffer);
                        // const imageUrl = `http://localhost:${PORT}/images/${uniqueId}.jpg`;
                        const resultText = await query(`public/images/image-lam-tho.jpg`);
                        const message = await geminiCallApi(model, "Hãy làm thơ với chủ đề này giúp tôi: " + resultText[0].generated_text);

                        sendValidArgumentResponse(client, event, message, {});
                    } catch (error) {
                        sendInvalidArgumentResponse(client, event);
                    }
                }

                await generate();

            } catch (error) {
                sendInvalidArgumentResponse(client, event);
            }
        }

        if (event?.content?.t && event.content.t.startsWith("*tt")) {
            try {
                const data = event.content.t.split(" ");
                const dayString = data[0].substring(3);
                const address = data[1];
                let day = 0;
                switch (dayString) {
                    case 'homnay':
                        day = 1;
                        break;
                    case 'ngaymai':
                        day = 2;
                        break;
                    case 'ngaykia':
                        day = 3;
                        break;
                    default:
                        day = 1;
                }
                let latitude = 20.9723;
                let longitude = 105.758;
                let possion = 'HA NOI 1';
                switch (address) {
                    case 'hn1':
                        latitude = 20.9723;
                        longitude = 105.758;
                        break;
                    case 'hn2':
                        latitude = 21.033623362500418;
                        longitude = 105.77964144374387
                        possion = 'HA NOI 2';
                        break;
                    case 'hn3':

                        latitude = 20.97407312842632;
                        longitude = 105.84455978889282;
                        possion = 'HA NOI 3';
                        break;
                    case 'dn':

                        latitude = 16.042448291816587;
                        longitude = 108.22221186365934;
                        possion =
                            'DA NANG';
                        break;
                    case 'v':
                        latitude = 18.693000922704954;
                        longitude = 105.67819050227297;
                        possion = 'VINH';
                        break;
                    case 'qn':
                        latitude = 13.760578636114808;
                        longitude = 109.21311487120941;
                        possion = 'QUY NHON';
                        break;
                    case 'sg':
                        latitude = 10.838093746465644;
                        longitude = 106.73482291171558;
                        possion = 'SAI GON';
                        break;
                    default:
                        latitude = 20.9723;
                        longitude = 105.758;
                }
                const w = await getWeatherForecast(day, latitude, longitude, possion);

                sendValidArgumentResponse(client, event, w, {});
            } catch (error) {
                sendInvalidArgumentResponse(client, event);
            }
        }
    });
}

function sendValidArgumentResponse(client, event, message, attachment) {
    if (!message) message = "";
    if (!attachment) attachment = {};

    client.sendMessage(
        event?.clan_id,
        event?.channel_id,
        2,
        event?.is_public,
        {t: message},
        [],
        [attachment],
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

function sendInvalidArgumentResponse(client, event) {
    client.sendMessage(
        event?.clan_id,
        event?.channel_id,
        2,
        event?.is_public,
        {t: "Invalid argument"},
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