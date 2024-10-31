## Create your Mezon application

Visit the [Developers Portal](https://dev-developers.nccsoft.vn/) to create your application.

## Add bot to your clan

Use your install link in a browser to add your bot to your desired clan.

## Installation

```bash
$ yarn
```

Copy `.env.example` to `.env` and replace it with your application token.

## Running the app

```bash
# development
$ yarn start
```
# bot
## Main function

### 1. Bot write poems describing images
```
syntax: *lam-tho + file image
```
eg: 

![image](https://github.com/user-attachments/assets/e07b8e36-3888-4862-92ac-24d14f10d775)

### 2. Bot AI chat
```
syntax: *meai + message
```
eg:

![image](https://github.com/user-attachments/assets/7172d9c3-ebad-4add-9be0-6a513e4e0d48)

### 3. Bot text to image prompt (use English)
```
syntax: *text-to-image-v1 + message
```
eg:

![image](https://github.com/user-attachments/assets/ac325781-9800-4329-8ddd-b590ad750955)

### 4. Bot text to image prompt (use English)
```
syntax: *text-to-image-v2 + message
```
eg:

![image](https://github.com/user-attachments/assets/d72d8e33-8164-458b-8b1c-e4a76f726594)

### bot weather forecast
```
syntax:
days included: homnay || ngaymai || ngaykia
location included: hn1 || hn2 || hn3 || dn || v || qn || sg
*tt + days + location
```
eg:

![image](https://github.com/user-attachments/assets/aca49fe3-5cdb-4e2a-ab97-c57097d25685)
