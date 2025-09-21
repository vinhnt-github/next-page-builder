# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json from fe folder
COPY fe/package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy necessary files and folders from fe
COPY fe .

# Build the Next.js app
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "start"]
