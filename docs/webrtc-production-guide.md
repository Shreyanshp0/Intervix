# WebRTC Production Guide (EC2 + NGINX + Socket.IO)

## Files To Modify
- `Frontend/src/pages/room/RoomPage.jsx`
- `Frontend/src/services/socket.js`
- `Frontend/.env.example`
- `Backend/src/sockets/interview.socket.js`
- `Backend/src/controllers/webrtc.controller.js`
- `Backend/.env.example`
- `nginx.production.conf`

## Frontend WebRTC Architecture
- Two peer connections:
  - `mainPeerRef` for webcam + microphone only
  - `screenPeerRef` for screen-share video only
- Perfect negotiation per channel:
  - `makingOffer`
  - `ignoreOffer`
  - `isSettingRemoteAnswerPending`
  - polite peer strategy (`recruiter/admin` polite)
  - rollback on offer collision
- ICE handling:
  - queue remote candidates until `remoteDescription`
  - `restartIce()` on reconnect and failed connection state
  - ack-backed signaling emit for `offer/answer/candidate`
- Cleanup:
  - stop all tracks
  - close both PCs
  - reset senders/streams
  - remove all socket listeners

## Backend Socket.IO Architecture
- Room-scoped signaling events:
  - `webrtc_offer`
  - `webrtc_answer`
  - `webrtc_ice_candidate`
- Each signaling event now supports ack responses for delivery feedback.
- On disconnect:
  - participant cleanup persists
  - emits `webrtc_peer_disconnected` for frontend media reset

## TURN + ICE Configuration
- `/api/webrtc/config` returns:
  - `iceServers`
  - `iceTransportPolicy`
  - `iceCandidatePoolSize`
- Supports env inputs:
  - `STUN_URLS`
  - `TURN_URL` or `TURN_URLS`
  - `TURN_USERNAME`
  - `TURN_PASSWORD`

## NGINX Requirements
Your `nginx.production.conf` must include for `/socket.io/`:
- `proxy_http_version 1.1`
- `Upgrade` and `Connection` headers
- `proxy_read_timeout 3600s`
- `proxy_send_timeout 3600s`
- `proxy_buffering off`
- `proxy_request_buffering off`
- HTTPS reverse proxy with forwarded proto headers

## Recommended Folder Structure
```txt
Frontend/src/pages/room/RoomPage.jsx
Frontend/src/services/socket.js
Backend/src/sockets/interview.socket.js
Backend/src/controllers/webrtc.controller.js
infra/coturn/turnserver.conf
nginx.production.conf
```

## Debugging Checklist
- `GET /api/webrtc/config` includes both STUN and TURN entries.
- Browser logs show:
  - `[NEGOTIATION]`
  - `[ICE]`
  - `[WEBRTC_MAIN]`
  - `[WEBRTC_SCREEN]`
- Confirm `connectionState` and `iceConnectionState` transitions to `connected`/`completed`.
- Confirm candidates are received for both `main` and `screen` channels.
- Confirm screen share stop triggers:
  - `screenTrack.onended`
  - `stop_screen_share`
  - `destroyScreenPeer()` cleanup
- Validate reconnect flow:
  - socket reconnects
  - re-joins room
  - ICE restart is attempted
- Use `chrome://webrtc-internals`:
  - verify selected candidate pair
  - verify relay candidate is used when symmetric NAT blocks direct paths

## Deployment Checklist
1. Set backend env:
   - `TRUSTED_ORIGINS=https://intervix.duckdns.org`
   - `STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302`
   - `TURN_URLS=turn:YOUR_TURN_HOST:3478?transport=udp,turn:YOUR_TURN_HOST:3478?transport=tcp`
   - `TURN_USERNAME=...`
   - `TURN_PASSWORD=...`
   - `ICE_TRANSPORT_POLICY=all`
   - `ICE_CANDIDATE_POOL_SIZE=8`
2. Set frontend env:
   - `VITE_API_URL=/api`
   - `VITE_SOCKET_URL=` (blank for same-origin HTTPS/WSS)
3. Rebuild and restart:
   - `docker compose build --no-cache`
   - `docker compose up -d`
4. Validate NGINX:
   - `nginx -t`
   - reload NGINX
5. Validate from two different public networks (not same LAN) with webcam + mic + screen share.
