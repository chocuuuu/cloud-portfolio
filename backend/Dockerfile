# User a lightweight Node.js base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy API logic
COPY index.js ./

# Expose the port Cloud Run will use 
EXPOSE 8080

# Start the Node server
CMD [ "npm", "start" ]

