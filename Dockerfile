# Expo dev server (Metro bundler) for the Fudo mobile app.
#
# This does NOT produce an installable APK/IPA - Expo apps are built for
# devices via EAS Build (a cloud service), not Docker. What this container
# gives you is the same thing `npx expo start` gives you locally: a Metro
# bundler you connect to from Expo Go on a phone, or from an iOS/Android
# emulator, over the LAN.
FROM node:20-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Metro's file watcher needs polling to pick up changes through a bind mount
# on Windows/Docker Desktop.
ENV CHOKIDAR_USEPOLLING=true

# 8081: Metro bundler / JS bundle + HMR websocket
# 19000-19002: legacy Expo dev tools / Expo Go handshake ports
EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start", "--host", "lan"]
