# Use the official Node.js image as a base image
FROM node:18.3.0-alpine3.14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port your app runs on
EXPOSE 3001

# Command to run your application
CMD ["npm", "start"]