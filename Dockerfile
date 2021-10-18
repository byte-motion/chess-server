FROM mhart/alpine-node 

WORKDIR /app

ADD app .

# Expose node port
EXPOSE 80

# install dependencies
RUN npm install

# Run node
CMD [ "node", "chess-server.js" ]
