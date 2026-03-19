cd /Users/dasuncharuka/Documents/projects/chattoapi

# 1. Set your API key
# Edit .env and change API_KEY

# 2. Login to ChatGPT (opens a browser)
npm run login

# 3. Start the server
npm start

# 4. Test it
curl http://localhost:3000/v1/status -H "Authorization: Bearer your-key"
