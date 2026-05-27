import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  Video, 
  Radio, 
  Unlock, 
  Lock, 
  Pause, 
  X, 
  SidebarOpen, 
  SidebarClose,
  Laptop
} from 'lucide-react';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';
import { API_ROUTES } from '../../constants/apiRoutes';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useRoomStore } from '../../store/useRoomStore';

// Subcomponents
import ProblemPanel from '../../components/room/ProblemPanel';
import CodeEditorPanel from '../../components/room/CodeEditorPanel';
import VideoInsightsPanel from '../../components/room/VideoInsightsPanel';
import ControlDock from '../../components/room/ControlDock';

const DEFAULT_CODE = `function solution(input) {
  return input;
}

console.log(solution('hello interview'));`;

const stopStream = (stream) => stream?.getTracks?.().forEach((track) => track.stop());
const attachStream = (videoRef, stream) => {
  if (!videoRef.current || videoRef.current.srcObject === stream) return;
  videoRef.current.srcObject = stream || null;
  if (stream && typeof videoRef.current.play === 'function') {
    videoRef.current.play().catch(() => {});
  }
};

const RoomPage = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  // Custom Room Visual Store
  const { resetRoomUi, setParticipantMedia } = useRoomStore();

  // Sidemenu layout toggles for advanced flexibility
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Sockets, WebRTC, Media Refs
  const socketRef = useRef(null);
  const mainPeerRef = useRef(null);
  const screenPeerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraVideoSenderRef = useRef(null);
  const audioSenderRef = useRef(null);
  const screenSenderRef = useRef(null);
  const editorRef = useRef(null);
  const editorContentDisposableRef = useRef(null);
  const editorCursorDisposableRef = useRef(null);
  const editorSelectionDisposableRef = useRef(null);
  const codeSyncTimerRef = useRef(null);
  const cursorSyncTimerRef = useRef(null);
  const typingStateTimerRef = useRef(null);
  const remoteCodeUpdateRef = useRef(false);
  const currentRoomRoleRef = useRef(user?.role || 'candidate');
  const remoteCameraStreamRef = useRef(new MediaStream());
  const remoteScreenStreamRef = useRef(new MediaStream());
  const localVideoRef = useRef(null);
  const remoteWebcamVideoRef = useRef(null);
  const remoteScreenVideoRef = useRef(null);
  const codeVersionRef = useRef(0);
  const rtcConfigRef = useRef({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });
  const negotiationStateRef = useRef({
    main: { makingOffer: false, ignoreOffer: false, isSettingRemoteAnswerPending: false },
    screen: { makingOffer: false, ignoreOffer: false, isSettingRemoteAnswerPending: false }
  });
  const pendingCandidatesRef = useRef({ main: [], screen: [] });
  const joinedRef = useRef(false);
  const joinInFlightRef = useRef(false);

  // Local State Synchronizations
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomReady, setRoomReady] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState('');
  const [roomRole, setRoomRole] = useState(user?.role || 'candidate');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [executionStatus, setExecutionStatus] = useState('idle');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const [editorLocked, setEditorLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remoteCursor, setRemoteCursor] = useState(null);
  const [remoteTyping, setRemoteTyping] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [quality, setQuality] = useState('unknown');

  const lastBytesReceivedRef = useRef(0);
  const lastStatsTimeRef = useRef(Date.now());
  const [webrtcDiagnostics, setWebrtcDiagnostics] = useState({
    mainIceState: 'new',
    mainSignalingState: 'stable',
    screenIceState: 'new',
    screenSignalingState: 'stable',
    rtt: 0,
    packetLoss: 0,
    bitrate: 0,
    candidatePair: 'Pending connection...',
    localType: 'Unknown',
    remoteType: 'Unknown',
    protocol: 'UDP'
  });

  const effectiveUserRole = user?.role || roomRole || 'candidate';
  const isRecruiter = effectiveUserRole === 'recruiter' || effectiveUserRole === 'admin';
  const isPolite = isRecruiter;
  const sessionToken = searchParams.get('token');
  const activeRoomId = room?.roomId || roomId || '';
  const candidate = room?.candidate || {};
  const resume = candidate?.resume || {};
  
  const roomDetailsRoute = useMemo(() => {
    if (sessionToken) {
      return API_ROUTES.interviews.session(sessionToken);
    }
    return effectiveUserRole === 'recruiter' || effectiveUserRole === 'admin'
      ? API_ROUTES.recruiter.liveInterviewDetails(roomId)
      : API_ROUTES.candidate.liveInterviewDetails(roomId);
  }, [effectiveUserRole, roomId, sessionToken]);

  const getPeerRef = useCallback((channel) => channel === 'screen' ? screenPeerRef : mainPeerRef, []);
  const isSignalingStable = useCallback((peer, state) => peer.signalingState === 'stable' || state.isSettingRemoteAnswerPending, []);
  
  const syncEditorValue = useCallback((nextCode, nextLanguage, version) => {
    const editor = editorRef.current;
    remoteCodeUpdateRef.current = true;
    codeVersionRef.current = Number(version || 0);
    setCode(nextCode || '');
    if (nextLanguage) {
      setLanguage(nextLanguage);
    }

    if (editor) {
      const position = editor.getPosition();
      const selection = editor.getSelection();
      editor.setValue(nextCode || '');
      if (selection) {
        editor.setSelection(selection);
      } else if (position) {
        editor.setPosition(position);
      }
      editor.focus();
    }

    window.requestAnimationFrame(() => {
      remoteCodeUpdateRef.current = false;
    });
  }, []);

  useEffect(() => {
    currentRoomRoleRef.current = roomRole;
  }, [roomRole]);

  const emitSignalWithAck = useCallback(async (eventName, payload) => {
    const socket = socketRef.current;
    if (!socket?.connected) return false;
    try {
      const response = await socket.timeout(5000).emitWithAck(eventName, payload);
      return Boolean(response?.success);
    } catch {
      return false;
    }
  }, []);

  const emitDescription = useCallback((channel, description) => {
    if (!socketRef.current || !description) return;
    console.info('[NEGOTIATION]', channel, 'emit', description.type, 'state', getPeerRef(channel).current?.signalingState);
    const event = description.type === 'offer' ? 'webrtc_offer' : 'webrtc_answer';
    void emitSignalWithAck(event, { roomId: activeRoomId, channel, [description.type]: description }).then((ok) => {
      if (!ok) console.warn('[NEGOTIATION]', channel, event, 'ack failed');
    });
  }, [activeRoomId, emitSignalWithAck, getPeerRef]);

  const flushIceQueue = useCallback(async (channel) => {
    const peer = getPeerRef(channel).current;
    if (!peer?.remoteDescription) return;
    const queue = pendingCandidatesRef.current[channel];
    while (queue.length) {
      await peer.addIceCandidate(new RTCIceCandidate(queue.shift()));
      console.info('[ICE]', channel, 'flushed pending candidate');
    }
  }, [getPeerRef]);

  const destroyScreenPeer = useCallback(() => {
    screenPeerRef.current?.close();
    screenPeerRef.current = null;
    pendingCandidatesRef.current.screen = [];
    negotiationStateRef.current.screen = { makingOffer: false, ignoreOffer: false, isSettingRemoteAnswerPending: false };
    screenSenderRef.current = null;
    remoteScreenStreamRef.current = new MediaStream();
    attachStream(remoteScreenVideoRef, null);
    setRemoteScreenSharing(false);
  }, []);

  const createPeer = useCallback((channel) => {
    const peerRef = getPeerRef(channel);
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection(rtcConfigRef.current);
    peerRef.current = peer;
    console.info(channel === 'screen' ? '[WEBRTC_SCREEN] peer created' : '[WEBRTC_MAIN] peer created');
    
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      console.info('[ICE]', channel, 'local candidate generated');
      void emitSignalWithAck('webrtc_ice_candidate', { roomId: activeRoomId, channel, candidate: event.candidate }).then((ok) => {
        if (!ok) console.warn('[ICE]', channel, 'candidate ack failed');
      });
    };

    peer.ontrack = (event) => {
      // Clean, reactive track diagnostic log:
      console.info('[DIAGNOSTICS] RTCPeerConnection track received:', {
        channel,
        kind: event.track.kind,
        readyState: event.track.readyState,
        enabled: event.track.enabled,
        streamId: event.streams?.[0]?.id,
        transceiverMid: event.transceiver?.mid,
        connectionState: peer.connectionState,
        iceConnectionState: peer.iceConnectionState,
        signalingState: peer.signalingState
      });

      const stream = event.streams?.[0] || new MediaStream([event.track]);

      if (channel === 'screen' && event.track.kind === 'video') {
        console.info('[WEBRTC_SCREEN] remote screen track attached');
        remoteScreenStreamRef.current = stream;
        
        // Force attachment (no early return) to prevent browser freezes
        if (remoteScreenVideoRef.current) {
          remoteScreenVideoRef.current.srcObject = null;
          remoteScreenVideoRef.current.srcObject = stream;
          remoteScreenVideoRef.current.play().catch(() => {});
        }
        
        event.track.onended = () => {
          if (remoteScreenVideoRef.current) remoteScreenVideoRef.current.srcObject = null;
          setRemoteScreenSharing(false);
        };
        setRemoteScreenSharing(true);
        return;
      }
      
      // For main channel (webcam/mic)
      if (event.track.kind === 'audio') {
        console.info('[WEBRTC_MAIN] remote audio track attached');
        if (!remoteCameraStreamRef.current.getAudioTracks().includes(event.track)) {
          remoteCameraStreamRef.current.addTrack(event.track);
        }
      } else if (event.track.kind === 'video') {
        console.info('[WEBRTC_MAIN] remote webcam track attached');
        if (!remoteCameraStreamRef.current.getVideoTracks().includes(event.track)) {
          remoteCameraStreamRef.current.addTrack(event.track);
        }
      }

      // Force-reattach the remote webcam stream to ensure video renders even if audio was bound first!
      if (remoteWebcamVideoRef.current) {
        const targetStream = remoteCameraStreamRef.current;
        console.info('[WEBRTC_MAIN] reattaching remote stream to video element', {
          audioTracks: targetStream.getAudioTracks().length,
          videoTracks: targetStream.getVideoTracks().length
        });
        remoteWebcamVideoRef.current.srcObject = null; // Reset first
        remoteWebcamVideoRef.current.srcObject = targetStream;
        remoteWebcamVideoRef.current.play().catch(() => {});
      }

      event.track.onended = () => {
        remoteCameraStreamRef.current.removeTrack(event.track);
        if (remoteWebcamVideoRef.current) {
          remoteWebcamVideoRef.current.srcObject = null;
          remoteWebcamVideoRef.current.srcObject = remoteCameraStreamRef.current;
          remoteWebcamVideoRef.current.play().catch(() => {});
        }
      };
      
      event.track.onmute = () => console.info('[WEBRTC_MAIN] webcam track muted');
      event.track.onunmute = () => console.info('[WEBRTC_MAIN] webcam track unmuted');
    };

    peer.onconnectionstatechange = async () => {
      const state = peer.connectionState;
      console.info('[WEBRTC]', channel, 'connectionState=', state);
      if (channel === 'main') {
        setStatus(state === 'connected' ? 'Live' : state);
        if (state === 'connected') setQuality('good');
      }
      if (state === 'failed') {
        console.warn('[ICE]', channel, 'connection failed, restarting ICE');
        await peer.restartIce().catch(() => {});
      }
      if (['disconnected', 'closed'].includes(state) && channel === 'screen') setRemoteScreenSharing(false);
    };

    peer.onsignalingstatechange = () => {
      console.info('[NEGOTIATION]', channel, 'signalingState=', peer.signalingState);
    };
    peer.oniceconnectionstatechange = () => {
      console.info('[ICE]', channel, 'iceConnectionState=', peer.iceConnectionState);
    };
    
    peer.onnegotiationneeded = async () => {
      const state = negotiationStateRef.current[channel];
      if (state.makingOffer || !peerRef.current) return;
      try {
        state.makingOffer = true;
        console.info('[NEGOTIATION]', channel, 'onnegotiationneeded');
        await peer.setLocalDescription(await peer.createOffer());
        emitDescription(channel, peer.localDescription);
      } finally {
        state.makingOffer = false;
      }
    };
    return peer;
  }, [activeRoomId, emitDescription, emitSignalWithAck, getPeerRef]);

  const applyRemoteDescription = useCallback(async (channel, description) => {
    const peer = createPeer(channel);
    const state = negotiationStateRef.current[channel];
    const readyForOffer = isSignalingStable(peer, state);
    const offerCollision = description.type === 'offer' && (state.makingOffer || !readyForOffer);
    state.ignoreOffer = !isPolite && offerCollision;
    if (state.ignoreOffer) {
      console.warn('[NEGOTIATION]', channel, 'offer ignored due to collision (impolite peer)');
      return;
    }
    if (description.type === 'offer' && offerCollision && isPolite && peer.signalingState === 'have-local-offer') {
      console.warn('[NEGOTIATION]', channel, 'collision detected, rolling back local offer');
      await peer.setLocalDescription({ type: 'rollback' });
    }
    console.info('[NEGOTIATION]', channel, 'apply remote', description.type);
    state.isSettingRemoteAnswerPending = description.type === 'answer';
    try {
      await peer.setRemoteDescription(new RTCSessionDescription(description));
    } finally {
      state.isSettingRemoteAnswerPending = false;
    }
    await flushIceQueue(channel);
    if (description.type === 'offer') {
      await peer.setLocalDescription(await peer.createAnswer());
      emitDescription(channel, peer.localDescription);
    }
  }, [createPeer, emitDescription, flushIceQueue, isPolite, isSignalingStable]);

  const addIceCandidate = useCallback(async (channel, candidate) => {
    const peer = getPeerRef(channel).current;
    if (!peer || !peer.remoteDescription) {
      pendingCandidatesRef.current[channel].push(candidate);
      console.info('[ICE]', channel, 'candidate queued until remoteDescription is set');
      return;
    }
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
    console.info('[ICE]', channel, 'remote candidate added');
  }, [getPeerRef]);

  const cleanupMedia = useCallback(() => {
    window.clearTimeout(codeSyncTimerRef.current);
    window.clearTimeout(cursorSyncTimerRef.current);
    window.clearTimeout(typingStateTimerRef.current);
    editorContentDisposableRef.current?.dispose?.();
    editorCursorDisposableRef.current?.dispose?.();
    editorSelectionDisposableRef.current?.dispose?.();
    stopStream(cameraStreamRef.current);
    stopStream(screenStreamRef.current);
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    mainPeerRef.current?.close();
    mainPeerRef.current = null;
    destroyScreenPeer();
    cameraVideoSenderRef.current = null;
    audioSenderRef.current = null;
    pendingCandidatesRef.current.main = [];
    negotiationStateRef.current.main = { makingOffer: false, ignoreOffer: false, isSettingRemoteAnswerPending: false };
    attachStream(localVideoRef, null);
    attachStream(remoteWebcamVideoRef, null);
    remoteCameraStreamRef.current = new MediaStream();
    remoteScreenStreamRef.current = new MediaStream();
    setRemoteTyping(null);
    setScreenSharing(false);
  }, [destroyScreenPeer]);

  const fetchRtcConfig = useCallback(async () => {
    try {
      const response = await api.get(API_ROUTES.webrtc.config);
      if (Array.isArray(response.data?.iceServers) && response.data.iceServers.length) {
        rtcConfigRef.current = {
          iceServers: response.data.iceServers,
          iceTransportPolicy: response.data.iceTransportPolicy || 'all',
          iceCandidatePoolSize: Number(response.data.iceCandidatePoolSize || 8)
        };
      }
    } catch (error) {
      console.warn('[RTC] Failed to load ICE config', error?.message || error);
    }
  }, []);

  const startMainMedia = useCallback(async () => {
    if (!window.isSecureContext) {
      throw new Error('Media access requires HTTPS secure context.');
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('mediaDevices.getUserMedia is unavailable in this browser/context.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    cameraStreamRef.current = stream;
    attachStream(localVideoRef, stream);
    const peer = createPeer('main');
    const [videoTrack] = stream.getVideoTracks();
    const [audioTrack] = stream.getAudioTracks();
    
    if (audioTrack) {
      audioSenderRef.current = peer.addTransceiver(audioTrack, { direction: 'sendrecv', streams: [stream] }).sender;
    } else {
      peer.addTransceiver('audio', { direction: 'recvonly' });
    }
    
    if (videoTrack) {
      cameraVideoSenderRef.current = peer.addTransceiver(videoTrack, { direction: 'sendrecv', streams: [stream] }).sender;
    } else {
      peer.addTransceiver('video', { direction: 'recvonly' });
    }
  }, [createPeer]);

  const fetchRoom = useCallback(async () => {
    setLoading(true);
    setRoomReady(false);
    try {
      const response = await api.get(roomDetailsRoute);
      const payload = response.data?.room || {};
      setRoom(payload);
      setRoomRole(payload.role || user?.role || 'candidate');
      setCode(payload.codeState?.code || DEFAULT_CODE);
      setLanguage(payload.codeState?.language || 'javascript');
      setRemoteScreenSharing(Boolean(payload.mediaState?.candidateScreenSharing));
      setEditorLocked(Boolean(payload.controls?.editorLocked));
      setPaused(Boolean(payload.controls?.paused));
      setOutput((payload.executionHistory || []).slice(-1)[0]?.output || '');
      setRoomReady(true);
      setError('');
    } catch (fetchError) {
      if (fetchError.response?.status === 410) {
        navigate('/interview/ended', { replace: true });
        return;
      }
      setError(fetchError.response?.data?.message || 'You do not have access to this interview room.');
      setRoomReady(false);
    } finally {
      setLoading(false);
    }
  }, [roomDetailsRoute, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      const fallbackTimer = window.setTimeout(() => {
        setLoading(false);
        setError('Please log in to join this interview room.');
      }, 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    const fetchTimer = window.setTimeout(() => {
      void fetchRoom();
    }, 0);

    return () => window.clearTimeout(fetchTimer);
  }, [fetchRoom, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || loading || !roomReady) return undefined;
    const socket = connectSocket();
    socketRef.current = socket;
    
    void (async () => {
      try {
        await fetchRtcConfig();
        await startMainMedia();
      } catch (mediaError) {
        setError(`Media setup failed: ${mediaError.message}`);
        setMicEnabled(false);
        setCameraEnabled(false);
      }
    })();

    const joinInterview = () => {
      if (joinInFlightRef.current || joinedRef.current || !socket.connected) return;
      joinInFlightRef.current = true;
      socket.emit('join_interview', { roomId: activeRoomId }, (ack) => {
        joinInFlightRef.current = false;
        joinedRef.current = Boolean(ack?.success);
        if (!ack?.success && ack?.message) {
          setError(ack.message);
        }
      });
    };

    const handleSocketConnect = () => {
      console.info('[SOCKET] connected, rejoining interview room');
      joinInterview();
      mainPeerRef.current?.restartIce();
      screenPeerRef.current?.restartIce();
    };

    const handleSocketConnectError = (err) => {
      console.warn('[SOCKET] connect_error', err?.message || 'unknown');
    };

    if (socket.connected) {
      joinInterview();
    }

    socket.off('connect', handleSocketConnect);
    socket.off('connect_error', handleSocketConnectError);
    socket.on('connect', handleSocketConnect);
    socket.on('connect_error', handleSocketConnectError);

    socket.on('interview_state', ({ room: nextRoom }) => {
      setRoom(nextRoom);
      setRoomRole(nextRoom.role || user?.role || 'candidate');
      setEditorLocked(Boolean(nextRoom.controls?.editorLocked));
      setPaused(Boolean(nextRoom.controls?.paused));
      setRemoteScreenSharing(Boolean(nextRoom.mediaState?.candidateScreenSharing));
      
      // Hydrate active participant media states from DB!
      if (nextRoom.mediaState) {
        setParticipantMedia('candidate', {
          cameraEnabled: nextRoom.mediaState.candidateVideoEnabled ?? true,
          micEnabled: nextRoom.mediaState.candidateAudioEnabled ?? true,
          screenSharing: nextRoom.mediaState.candidateScreenSharing ?? false
        });
        setParticipantMedia('recruiter', {
          cameraEnabled: nextRoom.mediaState.recruiterVideoEnabled ?? true,
          micEnabled: nextRoom.mediaState.recruiterAudioEnabled ?? true
        });
      }
      setStatus('Joined');
    });

    socket.on('interview_peers', ({ peers }) => {
      if (peers?.length && mainPeerRef.current && mainPeerRef.current.signalingState === 'stable') {
        void mainPeerRef.current.setLocalDescription(mainPeerRef.current.createOffer()).then(() => emitDescription('main', mainPeerRef.current.localDescription));
      }
    });

    socket.on('webrtc_offer', async ({ offer, channel = 'main' }) => applyRemoteDescription(channel, offer).catch((error) => console.warn('[NEGOTIATION]', channel, 'offer handling failed', error)));
    socket.on('webrtc_answer', async ({ answer, channel = 'main' }) => applyRemoteDescription(channel, answer).catch((error) => console.warn('[NEGOTIATION]', channel, 'answer handling failed', error)));
    socket.on('webrtc_ice_candidate', async ({ candidate, channel = 'main' }) => addIceCandidate(channel, candidate).catch((error) => console.warn('[ICE]', channel, 'candidate handling failed', error)));

    const handleCodeUpdate = ({ code: nextCode, language: nextLanguage, version }) => {
      if (version <= codeVersionRef.current) return;
      syncEditorValue(nextCode, nextLanguage, version);
    };

    const handleCursorUpdate = ({ cursor, role: cursorRole }) => setRemoteCursor({ ...cursor, role: cursorRole });
    
    const handleTypingState = ({ isTyping, cursor, role: typingRole }) => {
      const localRole = user?.role || currentRoomRoleRef.current || 'candidate';
      if (typingRole && typingRole === localRole) {
        return;
      }
      setRemoteTyping(isTyping ? {
        role: typingRole,
        cursor: cursor || null
      } : null);
    };

    const handleLanguageUpdate = ({ language: nextLanguage }) => setLanguage(nextLanguage);
    const handleExecutionStatus = ({ status: nextStatus }) => setExecutionStatus(nextStatus);
    const handleExecutionResult = (result) => { 
      setExecutionStatus(result.status || 'completed'); 
      setOutput(`${result.success ? 'Success' : 'Failed'}\n\n${result.output || ''}${result.error ? `\n${result.error}` : ''}`); 
    };
    
    const handleScreenShareStarted = () => setRemoteScreenSharing(true);
    const handleScreenShareStopped = () => { setRemoteScreenSharing(false); attachStream(remoteScreenVideoRef, null); };
    
    const handlePeerDisconnected = ({ socketId }) => {
      console.warn('[WEBRTC] remote peer disconnected', socketId);
      attachStream(remoteWebcamVideoRef, null);
      attachStream(remoteScreenVideoRef, null);
      remoteCameraStreamRef.current = new MediaStream();
      remoteScreenStreamRef.current = new MediaStream();
      setRemoteScreenSharing(false);
      setStatus('Peer disconnected');
    };

    const handleScreenShareRequested = ({ by }) => setMessages((items) => [...items, `${by} requested screen share.`].slice(-5));
    const handleAudioToggled = ({ role: mediaRole, enabled }) => mediaRole === (user?.role || currentRoomRoleRef.current) && setMicEnabled(enabled);
    const handleVideoToggled = ({ role: mediaRole, enabled }) => mediaRole === (user?.role || currentRoomRoleRef.current) && setCameraEnabled(enabled);

    const handleParticipantMediaState = ({ role: mediaRole, mediaState }) => {
      if (mediaRole) {
        setParticipantMedia(mediaRole, mediaState);
        
        // Remote triggers support (if recruiter mutesthe candidate remotely)
        const localRole = user?.role || currentRoomRoleRef.current || 'candidate';
        if (mediaRole === localRole) {
          if (mediaState.cameraEnabled !== undefined) {
            setCameraEnabled(mediaState.cameraEnabled);
            cameraStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = mediaState.cameraEnabled; });
          }
          if (mediaState.micEnabled !== undefined) {
            setMicEnabled(mediaState.micEnabled);
            cameraStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = mediaState.micEnabled; });
          }
        }
      }
    };

    const handleEditorLockChanged = ({ locked }) => setEditorLocked(locked);
    const handleInterviewPaused = ({ paused: nextPaused }) => setPaused(nextPaused);
    const handlePromptReceived = ({ prompt: nextPrompt, by }) => setMessages((items) => [...items, `${by}: ${nextPrompt}`].slice(-5));
    
    const handleInterviewEnded = () => {
      cleanupMedia();
      setStatus('Ended');
      resetRoomUi(); // Wipe custom store UI variables on unmount
      const localRole = user?.role || currentRoomRoleRef.current || 'candidate';
      navigate(localRole === 'recruiter' || localRole === 'admin' ? '/recruiter/interviews' : '/interview/ended', { replace: true });
    };

    const handleInterviewError = ({ message }) => setError(message);

    socket.on('code_update', handleCodeUpdate);
    socket.on('cursor_update', handleCursorUpdate);
    socket.on('typing_state', handleTypingState);
    socket.on('language_update', handleLanguageUpdate);
    socket.on('execution_status', handleExecutionStatus);
    socket.on('execution_result', handleExecutionResult);
    socket.on('screen_share_started', handleScreenShareStarted);
    socket.on('screen_share_stopped', handleScreenShareStopped);
    socket.on('webrtc_peer_disconnected', handlePeerDisconnected);
    socket.on('screen_share_requested', handleScreenShareRequested);
    socket.on('audio_toggled', handleAudioToggled);
    socket.on('video_toggled', handleVideoToggled);
    socket.on('participant_media_state', handleParticipantMediaState);
    socket.on('editor_lock_changed', handleEditorLockChanged);
    socket.on('interview_paused', handleInterviewPaused);
    socket.on('prompt_received', handlePromptReceived);
    socket.on('interview_ended', handleInterviewEnded);
    socket.on('interview_error', handleInterviewError);

    const diagnosticsInterval = setInterval(async () => {
      const mainPeer = mainPeerRef.current;
      const screenPeer = screenPeerRef.current;

      const newDiag = {
        mainIceState: mainPeer ? mainPeer.iceConnectionState : 'closed',
        mainSignalingState: mainPeer ? mainPeer.signalingState : 'closed',
        screenIceState: screenPeer ? screenPeer.iceConnectionState : 'closed',
        screenSignalingState: screenPeer ? screenPeer.signalingState : 'closed',
        rtt: 0,
        packetLoss: 0,
        bitrate: 0,
        candidatePair: 'No active pair',
        localType: 'Unknown',
        remoteType: 'Unknown',
        protocol: 'UDP'
      };

      if (!mainPeer) {
        setWebrtcDiagnostics(newDiag);
        return;
      }

      try {
        const stats = await mainPeer.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let bytesReceived = 0;
        let now = Date.now();

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
            bytesReceived += report.bytesReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            newDiag.rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
            const localCand = stats.get(report.localCandidateId);
            const remoteCand = stats.get(report.remoteCandidateId);
            if (localCand && remoteCand) {
              newDiag.localType = localCand.candidateType || 'Unknown';
              newDiag.remoteType = remoteCand.candidateType || 'Unknown';
              newDiag.protocol = (localCand.protocol || 'UDP').toUpperCase();
              newDiag.candidatePair = `${localCand.ip || localCand.ipAddress || 'Local'}:${localCand.port} ↔ ${remoteCand.ip || remoteCand.ipAddress || 'Remote'}:${remoteCand.port}`;
            }
          }
        });

        // Calculate packet loss
        const loss = (packetsReceived + packetsLost) ? packetsLost / (packetsReceived + packetsLost) : 0;
        newDiag.packetLoss = Math.round(loss * 1000) / 10; // e.g. 1.2%

        // Calculate bitrate
        const timeDiff = (now - lastStatsTimeRef.current) / 1000; // seconds
        if (timeDiff > 0 && lastBytesReceivedRef.current > 0) {
          const byteDiff = bytesReceived - lastBytesReceivedRef.current;
          newDiag.bitrate = Math.round((byteDiff * 8) / timeDiff / 1000); // kbps
        }

        lastBytesReceivedRef.current = bytesReceived;
        lastStatsTimeRef.current = now;

        setWebrtcDiagnostics(newDiag);
        setQuality(loss > 0.08 ? 'poor' : loss > 0.03 ? 'fair' : 'good');
      } catch (err) {
        console.warn('[RTC] Failed to collect stats', err);
      }
    }, 2000);

    return () => {
      clearInterval(diagnosticsInterval);
      if (joinedRef.current) {
        socket.emit('leave_interview', { roomId: activeRoomId });
      }
      joinedRef.current = false;
      joinInFlightRef.current = false;
      
      socket.off('interview_state');
      socket.off('interview_peers');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('code_update', handleCodeUpdate);
      socket.off('cursor_update', handleCursorUpdate);
      socket.off('typing_state', handleTypingState);
      socket.off('language_update', handleLanguageUpdate);
      socket.off('execution_status', handleExecutionStatus);
      socket.off('execution_result', handleExecutionResult);
      socket.off('screen_share_started', handleScreenShareStarted);
      socket.off('screen_share_stopped', handleScreenShareStopped);
      socket.off('webrtc_peer_disconnected', handlePeerDisconnected);
      socket.off('screen_share_requested', handleScreenShareRequested);
      socket.off('audio_toggled', handleAudioToggled);
      socket.off('video_toggled', handleVideoToggled);
      socket.off('participant_media_state', handleParticipantMediaState);
      socket.off('editor_lock_changed', handleEditorLockChanged);
      socket.off('interview_paused', handleInterviewPaused);
      socket.off('prompt_received', handlePromptReceived);
      socket.off('interview_ended', handleInterviewEnded);
      socket.off('interview_error', handleInterviewError);
      socket.off('connect', handleSocketConnect);
      socket.off('connect_error', handleSocketConnectError);
      
      cleanupMedia();
      resetRoomUi(); // Clean up store UI variables on unmount
    };
  }, [activeRoomId, addIceCandidate, applyRemoteDescription, cleanupMedia, emitDescription, fetchRtcConfig, isAuthenticated, loading, navigate, roomReady, startMainMedia, syncEditorValue, user?.role, resetRoomUi]);

  const queueCodeSync = useCallback((value = '', nextLanguage = language) => {
    if (remoteCodeUpdateRef.current) return;
    setCode(value);
    codeVersionRef.current += 1;
    const version = codeVersionRef.current;
    window.clearTimeout(codeSyncTimerRef.current);
    window.clearTimeout(typingStateTimerRef.current);
    codeSyncTimerRef.current = window.setTimeout(() => {
      socketRef.current?.emit('code_change', { roomId: activeRoomId, code: value, language: nextLanguage, version });
      socketRef.current?.emit('typing_state', {
        roomId: activeRoomId,
        isTyping: true,
        cursor: editorRef.current?.getPosition() || null
      });
      typingStateTimerRef.current = window.setTimeout(() => {
        socketRef.current?.emit('typing_state', {
          roomId: activeRoomId,
          isTyping: false,
          cursor: editorRef.current?.getPosition() || null
        });
      }, 900);
    }, 90);
  }, [activeRoomId, language]);

  const queueCursorSync = useCallback((cursor) => {
    window.clearTimeout(cursorSyncTimerRef.current);
    cursorSyncTimerRef.current = window.setTimeout(() => {
      socketRef.current?.emit('cursor_change', { roomId: activeRoomId, cursor });
      socketRef.current?.emit('typing_state', {
        roomId: activeRoomId,
        isTyping: Boolean(cursor),
        cursor
      });
    }, 50);
  }, [activeRoomId]);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    editorContentDisposableRef.current?.dispose?.();
    editorCursorDisposableRef.current?.dispose?.();
    editorSelectionDisposableRef.current?.dispose?.();

    editorContentDisposableRef.current = editor.onDidChangeModelContent(() => {
      if (remoteCodeUpdateRef.current) return;
      queueCodeSync(editor.getValue(), editor.getModel()?.getLanguageId?.() || language);
    });

    editorCursorDisposableRef.current = editor.onDidChangeCursorPosition((event) => {
      queueCursorSync(event.position);
    });

    editorSelectionDisposableRef.current = editor.onDidChangeCursorSelection((event) => {
      queueCursorSync({
        lineNumber: event.selection.positionLineNumber,
        column: event.selection.positionColumn,
        selection: {
          startLineNumber: event.selection.startLineNumber,
          startColumn: event.selection.startColumn,
          endLineNumber: event.selection.endLineNumber,
          endColumn: event.selection.endColumn
        }
      });
    });
  }, [language, queueCodeSync, queueCursorSync]);

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    queueCodeSync(code, nextLanguage);
    socketRef.current?.emit('language_change', { roomId: activeRoomId, language: nextLanguage });
  };

  const toggleMic = () => { 
    const next = !micEnabled; 
    cameraStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; }); 
    setMicEnabled(next); 
    
    const localRole = user?.role || currentRoomRoleRef.current || 'candidate';
    setParticipantMedia(localRole, { micEnabled: next });
    socketRef.current?.emit('media_state_changed', { roomId: activeRoomId, role: localRole, micEnabled: next }); 
  };

  const toggleCamera = () => { 
    const next = !cameraEnabled; 
    cameraStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; }); 
    setCameraEnabled(next); 
    
    const localRole = user?.role || currentRoomRoleRef.current || 'candidate';
    setParticipantMedia(localRole, { cameraEnabled: next });
    socketRef.current?.emit('media_state_changed', { roomId: activeRoomId, role: localRole, cameraEnabled: next }); 
  };

  const stopScreenShare = useCallback(async (fromBrowserStop = false) => {
    if (!screenStreamRef.current) return;
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setScreenSharing(false);
    destroyScreenPeer();
    
    setParticipantMedia('candidate', { screenSharing: false });
    socketRef.current?.emit('media_state_changed', { roomId: activeRoomId, role: 'candidate', screenSharing: false });
    socketRef.current?.emit('stop_screen_share', { roomId: activeRoomId, fromBrowserStop });
  }, [activeRoomId, destroyScreenPeer, setParticipantMedia]);

  const startScreenShare = async () => {
    try {
      if (screenPeerRef.current) return;
      if (!window.isSecureContext) {
        throw new Error('Screen share requires HTTPS secure context.');
      }
      if (!navigator?.mediaDevices?.getDisplayMedia) {
        throw new Error('mediaDevices.getDisplayMedia is unavailable in this browser/context.');
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { frameRate: { ideal: 15, max: 24 }, width: { ideal: 1920 }, height: { ideal: 1080 } }, 
        audio: false 
      });
      const [screenTrack] = stream.getVideoTracks();
      if (!screenTrack) throw new Error('No screen track returned');
      const peer = createPeer('screen');
      screenSenderRef.current = peer.addTransceiver(screenTrack, { direction: 'sendonly', streams: [stream] }).sender;
      screenStreamRef.current = stream;
      screenTrack.onended = () => { void stopScreenShare(true); };
      setScreenSharing(true);
      
      setParticipantMedia('candidate', { screenSharing: true });
      socketRef.current?.emit('media_state_changed', { roomId: activeRoomId, role: 'candidate', screenSharing: true });
      socketRef.current?.emit('start_screen_share', { roomId: activeRoomId });
    } catch (shareError) {
      setError(`Screen share failed: ${shareError.message}`);
    }
  };

  const toggleHandRaised = () => {
    const { handRaised, setHandRaised } = useRoomStore.getState();
    const next = !handRaised;
    setHandRaised(next);
    const localRole = user?.role || currentRoomRoleRef.current || 'candidate';
    setParticipantMedia(localRole, { handRaised: next });
    socketRef.current?.emit('media_state_changed', { roomId: activeRoomId, role: localRole, handRaised: next });
  };

  const runCode = () => { 
    setExecutionStatus('running'); 
    setOutput('Running...'); 
    socketRef.current?.emit('run_code', { roomId: activeRoomId, code, language }); 
  };

  const recruiterAction = (event, payload = {}) => socketRef.current?.emit(event, { roomId: activeRoomId, ...payload });

  const leaveRoom = () => { 
    socketRef.current?.emit('leave_interview', { roomId: activeRoomId }); 
    cleanupMedia(); 
    navigate(isRecruiter ? '/recruiter/interviews' : '/candidate/dashboard'); 
  };

  const sendPromptMessage = () => {
    if (!prompt.trim()) return;
    recruiterAction('send_prompt', { prompt });
    setPrompt('');
  };

  // Screen/Track binders to DOM elements
  useEffect(() => {
    if (roomReady) {
      if (cameraStreamRef.current) attachStream(localVideoRef, cameraStreamRef.current);
      if (remoteCameraStreamRef.current) attachStream(remoteWebcamVideoRef, remoteCameraStreamRef.current);
      if (remoteScreenStreamRef.current && remoteScreenSharing) attachStream(remoteScreenVideoRef, remoteScreenStreamRef.current);
    }
  }, [roomReady, remoteScreenSharing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center gap-3.5 text-sm text-gray-400 select-none">
        <div className="h-10 w-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <span className="font-medium tracking-wide">Preparing secure collaborative room...</span>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-6 select-none">
        <div className="max-w-md w-full rounded-3xl border border-red-500/20 bg-red-500/[0.02] p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="text-red-200 font-bold text-base mb-1.5">Security Context Failure</div>
          <p className="text-xs text-red-100/60 leading-relaxed mb-6">{error}</p>
          <Button className="w-full h-10" onClick={() => navigate('/login')}>Return to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#070A12] text-slate-100 flex flex-col font-sans relative">
      
      {/* Mobile Observer Mode Restriction Overlay */}
      <div className="hidden max-md:flex fixed inset-0 bg-[#060910]/95 z-50 flex-col items-center justify-center p-6 text-center select-none">
        <div className="p-6 rounded-3xl border border-white/5 bg-[#0D1222]/80 shadow-2xl max-w-sm flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
            <Laptop size={20} />
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-bold text-white">Observer Mode Active</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Mobile viewports are locked to Observer Mode. Please connect from a desktop environment for writing code and full WebRTC video collaboration.
            </p>
          </div>
        </div>
      </div>

      {/* Modern Slick Header */}
      <header className="h-14 border-b border-white/10 bg-[#0D1322]/80 backdrop-blur px-4 flex items-center justify-between select-none z-10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <Video size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              {room?.job?.roleTitle || room?.problem?.title || 'Live Interview Workspace'}
            </div>
            <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5 font-medium">
              <span className="capitalize">{effectiveUserRole}</span>
              <span className="text-white/10">•</span>
              <span>{activeRoomId ? `Session ${activeRoomId.slice(0, 8)}` : 'Secure channel'}</span>
              <span className="text-white/10">•</span>
              <span className="flex items-center gap-1">
                <Radio size={10} className="text-cyan-400 animate-pulse" />
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar panel visibility controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/[0.02] border border-white/5 p-0.5 rounded-lg max-lg:hidden">
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              title={leftPanelOpen ? "Collapse Problem Panel" : "Expand Problem Panel"}
              className={`p-1.5 rounded-md transition-colors ${
                leftPanelOpen ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {leftPanelOpen ? <SidebarClose size={14} /> : <SidebarOpen size={14} />}
            </button>
            <button
              onClick={() => setRightTab(activeRightTab === 'ai' ? 'chat' : 'ai')} // toggles focus
              title="Toggle Insights Panel"
              className="p-1.5 rounded-md text-gray-400 hover:text-white transition-colors"
            >
              <SidebarOpen size={14} className="rotate-180" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Quick Header Leave */}
          <button
            onClick={leaveRoom}
            className="h-8 px-3.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white border border-white/5 transition-all flex items-center gap-1.5"
          >
            <X size={12} />
            Leave
          </button>
        </div>
      </header>

      {/* Danger/Warning status alerts */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-200 flex items-center gap-1.5 flex-shrink-0 animate-pulse select-none">
          <X size={12} className="text-red-400" />
          <span>{error}</span>
        </div>
      )}
      {paused && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-200 flex items-center gap-1.5 flex-shrink-0 select-none">
          <Lock size={12} className="text-amber-400" />
          <span>The interview is currently paused by the Recruiter. Visual outputs are halted.</span>
        </div>
      )}

      {/* Main 3-Column Responsive Workspace Grid */}
      <main className="flex-1 flex min-h-0 relative overflow-hidden">
        
        {/* LEFT PANEL — PROBLEM */}
        {leftPanelOpen && (
          <ProblemPanel 
            problem={room?.problem} 
            role={effectiveUserRole} 
            executionHistory={room?.executionHistory || []}
          />
        )}

        {/* CENTER PANEL — CODE EDITOR */}
        <CodeEditorPanel 
          code={code}
          language={language}
          onLanguageChange={handleLanguageChange}
          executionStatus={executionStatus}
          output={output}
          onRunCode={runCode}
          onEditorMount={handleEditorMount}
          editorLocked={editorLocked}
          isRecruiter={isRecruiter}
          remoteCursor={remoteCursor}
          remoteTyping={remoteTyping}
        />

        {/* RIGHT PANEL — VIDEO + AI INSIGHTS */}
        {rightPanelOpen && (
          <VideoInsightsPanel 
            localVideoRef={localVideoRef}
            remoteWebcamVideoRef={remoteWebcamVideoRef}
            remoteScreenVideoRef={remoteScreenVideoRef}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            screenSharing={screenSharing}
            remoteScreenSharing={remoteScreenSharing}
            isRecruiter={isRecruiter}
            candidate={candidate}
            resume={resume}
            messages={messages}
            prompt={prompt}
            setPrompt={setPrompt}
            onSendPrompt={sendPromptMessage}
            quality={quality}
            status={status}
            webrtcDiagnostics={webrtcDiagnostics}
          />
        )}

      </main>

      {/* BOTTOM FLOATING CONTROL BAR */}
      <ControlDock 
        micEnabled={micEnabled}
        toggleMic={toggleMic}
        cameraEnabled={cameraEnabled}
        toggleCamera={toggleCamera}
        screenSharing={screenSharing}
        startScreenShare={startScreenShare}
        stopScreenShare={stopScreenShare}
        isRecruiter={isRecruiter}
        editorLocked={editorLocked}
        paused={paused}
        onRecruiterAction={recruiterAction}
        onLeaveRoom={leaveRoom}
        onEndRoom={() => recruiterAction('end_interview')}
        onToggleHandRaised={toggleHandRaised}
      />

    </div>
  );
};

export default RoomPage;
