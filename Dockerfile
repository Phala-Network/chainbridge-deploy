FROM phalanetwork/chainbridge-solidity AS solidity

FROM node:16-alpine

COPY --from=solidity /app/chainbridge-solidity /app/chainbridge-solidity

ADD ./cb-sol-cli /app/

WORKDIR /app

RUN set -ex \
    && npm install . \
    && npm link .
