FROM mhart/alpine-node 

WORKDIR /app

ADD app .

# Expose node port
EXPOSE 80

# Install app dependencies
RUN npm install express

# Run node
CMD [ "node", "chess-server.js" ]
